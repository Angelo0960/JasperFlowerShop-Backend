import OrderModel from "../models/OrderModel.js"; 

export const createOrder = async (req, res) => {
  try {
    
    const { 
      customer_name, 
      staff_name,
      payment_method,
      items, 
      total_amount, 
      tax_amount,
      grand_total,
      cash_received,
      change_amount,
      notes 
    } = req.body;

    if (!customer_name || !items || items.length === 0) {
      console.log("❌ Missing required fields");
      return res.status(400).json({ 
        success: false, 
        message: "Missing required order details." 
      });
    }

    console.log("✅ Valid order data received");
    
   
    const order = await OrderModel.createOrder({
      customer_name,
      staff_name,
      payment_method,
      items,
      total_amount,
      tax_amount,
      grand_total,
      cash_received,
      change_amount,
      notes: notes || ''
    });

    console.log("✅ Order created in database:", order);
    
    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order
    });
    
  } catch (err) {
    console.error("❌ Error creating order:", err);
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};


export const listOrders = async (req, res) => {
  try {
    console.log("📋 GET /orders/list called with query:", req.query);
    
    const { status, search, startDate, endDate } = req.query;
    
   
    const orders = await OrderModel.getOrders({
      status,
      search,
      startDate,
      endDate
    });
    
    console.log(`📊 Returning ${orders.length} orders from database`);
    
    res.status(200).json({ 
      success: true, 
      data: orders,
      message: `Found ${orders.length} orders`
    });
  } catch (err) {
    console.error("❌ Error in listOrders:", err);
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error" 
    });
  }
};