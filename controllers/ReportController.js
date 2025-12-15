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

export const generateCustomReport = async (req, res) => {
  try {
    const { 
      period, 
      start_date, 
      end_date, 
      report_name,
      include_summary = true,
      include_breakdown = true 
    } = req.body;
    
    let dateCondition = "";
    const params = [];
    
    if (start_date && end_date) {
      dateCondition = "sale_date BETWEEN ? AND ?";
      params.push(start_date, end_date);
    } else if (period) {
      switch(period) {
        case 'today':
          dateCondition = "sale_date = CURDATE()";
          break;
        case 'yesterday':
          dateCondition = "sale_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY)";
          break;
        case 'this_week':
          dateCondition = "YEARWEEK(sale_date) = YEARWEEK(CURDATE())";
          break;
        case 'last_week':
          dateCondition = "YEARWEEK(sale_date) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 1 WEEK))";
          break;
        case 'this_month':
          dateCondition = "MONTH(sale_date) = MONTH(CURDATE()) AND YEAR(sale_date) = YEAR(CURDATE())";
          break;
        case 'last_month':
          dateCondition = "MONTH(sale_date) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND YEAR(sale_date) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))";
          break;
        default:
          dateCondition = "1=1";
      }
    } else {
      dateCondition = "1=1";
    }
    
    const [summaryResult] = await pool.query(`
      SELECT 
        COUNT(*) as transaction_count,
        SUM(total_amount) as total_sales,
        AVG(total_amount) as average_transaction,
        SUM(items_count) as total_items,
        MIN(sale_date) as start_date,
        MAX(sale_date) as end_date
      FROM sales
      WHERE ${dateCondition}
    `, params);
    
    const summary = summaryResult[0] || {
      transaction_count: 0,
      total_sales: 0,
      average_transaction: 0,
      total_items: 0
    };
    
    let dailyBreakdown = [];
    if (include_breakdown) {
      const [dailyResult] = await pool.query(`
        SELECT 
          sale_date as date,
          COUNT(*) as transactions,
          SUM(items_count) as items_sold,
          SUM(total_amount) as total_sales
        FROM sales
        WHERE ${dateCondition}
        GROUP BY sale_date
        ORDER BY sale_date DESC
      `, params);
      dailyBreakdown = dailyResult;
    }
   
    const [rawDataResult] = await pool.query(`
      SELECT * FROM sales
      WHERE ${dateCondition}
      ORDER BY sale_date DESC, sale_time DESC
      LIMIT 1000
    `, params);
    
    const rawData = rawDataResult.map(row => ({
      ...row,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
      amount: row.total_amount
    }));
    
    const report = {
      summary,
      dailyBreakdown,
      rawData,
      filters: {
        period,
        start_date,
        end_date,
        generated_at: new Date().toISOString()
      }
    };
    
    let savedReport = null;
    if (report_name) {
      await ReportModel.ensureReportsTable();
      
      const reportCode = `custom_${Date.now()}`;
      const [saveResult] = await pool.query(
        `INSERT INTO reports 
         (report_code, report_type, report_name, report_data, summary_data, total_sales, total_items) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          reportCode,
          'custom',
          report_name,
          JSON.stringify(rawData),
          JSON.stringify(summary),
          summary.total_sales || 0,
          summary.total_items || 0
        ]
      );
      
      savedReport = {
        id: saveResult.insertId,
        report_code: reportCode,
        report_name: report_name
      };
    }
    
    res.json({
      success: true,
      data: report,
      saved_report: savedReport,
      message: "Custom report generated successfully"
    });
    
  } catch (error) {
    console.error("Error generating custom report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate custom report",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};