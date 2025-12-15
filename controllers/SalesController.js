import SalesModel from "../models/SalesModel.js";


export const recordSale = async (req, res) => {
  try {
    const { customer_name, items, total_amount, payment_method } = req.body;

    if (!customer_name || !items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required sales details." 
      });
    }

    const sale = await SalesModel.recordSale({
      customer_name,
      items,
      total_amount,
      payment_method
    });

    res.status(201).json({
      success: true,
      message: "Sale recorded successfully",
      data: sale
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error"
    });
  }
};

export const listSales = async (req, res) => {
  try {
    const { range, startDate, endDate } = req.query;
    
    console.log(`📋 GET /api/sales called with range: ${range}`);
    
    const filters = {};
    if (range) filters.range = range;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    
    const sales = await SalesModel.getSales(filters);
    
    res.status(200).json({ 
      success: true, 
      data: sales 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error" 
    });
  }
};


export const getSalesStats = async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    
    const stats = await SalesModel.getSalesStats(period);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error getting sales stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get sales statistics"
    });
  }
};

export const testSalesEndpoint = async (req, res) => {
  try {
    
    const [tableCheck] = await pool.query(`
      SELECT COUNT(*) as table_exists 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'sales'
    `);
    
    const salesExists = tableCheck[0].table_exists > 0;
    
    
    let salesCount = 0;
    if (salesExists) {
      const [countResult] = await pool.query("SELECT COUNT(*) as count FROM sales");
      salesCount = countResult[0].count;
    }
    
    res.json({
      success: true,
      data: {
        sales_table_exists: salesExists,
        sales_count: salesCount,
        endpoints: {
          daily_report: "/sales/reports/daily",
          weekly_report: "/sales/reports/weekly",
          monthly_report: "/sales/reports/monthly",
          export: "/sales/export?range=daily|weekly|monthly",
          stats: "/sales/stats?period=today|week|month"
        }
      }
    });
  } catch (error) {
    console.error("Test endpoint error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


