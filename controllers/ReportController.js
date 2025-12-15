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