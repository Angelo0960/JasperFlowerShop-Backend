import ReportModel from "../models/ReportModel.js";

export const generateSalesReport = async (req, res) => {
  try {
    const { period = 'daily', date } = req.query;
    
    console.log(` Generating ${period} sales report for date: ${date || 'current'}`);
    
    
    const report = await ReportModel.generateSalesReport(period, date);
    
    
    try {
      await ReportModel.ensureReportsTable(); 
      
      const reportCode = `${period}_sales_${date || new Date().toISOString().split('T')[0]}_${Date.now()}`;
      const reportName = `${period.charAt(0).toUpperCase() + period.slice(1)} Sales Report - ${date || 'Current'}`;
      
      const [savedReport] = await pool.query(
        `INSERT INTO reports 
         (report_code, report_type, report_name, report_data, summary_data, total_sales, total_items) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          reportCode,
          'sales',
          reportName,
          JSON.stringify(report.rawData),
          JSON.stringify(report.summary),
          report.summary.total_sales || 0,
          report.summary.total_items || 0
        ]
      );
      
      console.log(` Report saved to database with code: ${reportCode}`);
      
      res.json({
        success: true,
        data: report,
        saved_report: {
          id: savedReport.insertId,
          report_code: reportCode,
          report_name: reportName
        },
        message: `${period.charAt(0).toUpperCase() + period.slice(1)} report generated and saved successfully`
      });
    } catch (saveError) {
      console.warn("Could not save report to database:", saveError.message);
      
      res.json({
        success: true,
        data: report,
        saved_report: null,
        message: `${period.charAt(0).toUpperCase() + period.slice(1)} report generated (not saved to database)`
      });
    }
  } catch (error) {
    console.error("Error generating sales report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate sales report",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


export const getSavedReports = async (req, res) => {
  try {
    const { report_type, start_date, end_date, limit = 50 } = req.query;
    
    let query = "SELECT * FROM reports WHERE 1=1";
    const params = [];
    
    if (report_type) {
      query += " AND report_type = ?";
      params.push(report_type);
    }
    
    if (start_date) {
      query += " AND DATE(generated_at) >= ?";
      params.push(start_date);
    }
    
    if (end_date) {
      query += " AND DATE(generated_at) <= ?";
      params.push(end_date);
    }
    
    query += " ORDER BY generated_at DESC LIMIT ?";
    params.push(parseInt(limit));
    
    await ReportModel.ensureReportsTable();
    
    const [reports] = await pool.query(query, params);
    
    const parsedReports = reports.map(report => ({
      ...report,
      report_data: report.report_data ? JSON.parse(report.report_data) : null,
      summary_data: report.summary_data ? JSON.parse(report.summary_data) : null
    }));
    
    res.json({
      success: true,
      data: parsedReports,
      count: parsedReports.length,
      summary: {
        total_reports: parsedReports.length,
        total_sales: parsedReports.reduce((sum, report) => sum + (parseFloat(report.total_sales) || 0), 0)
      }
    });
  } catch (error) {
    console.error("Error getting saved reports:", error);
    
    if (error.code === 'ER_NO_SUCH_TABLE' || error.message.includes("doesn't exist")) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        message: "Reports database not initialized yet"
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Failed to get saved reports",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};