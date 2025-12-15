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

