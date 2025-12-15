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

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`📝 PUT /orders/update-status/${id} called with status:`, status);

    if (!status) {
      return res.status(400).json({ 
        success: false, 
        message: "Status is required" 
      });
    }

    
    const existingOrder = await OrderModel.getOrderById(id);
    
    if (!existingOrder) {
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      });
    }
    
    const oldStatus = existingOrder.status;
    const orderCode = existingOrder.order_code;
    
    console.log(`📋 Order ${orderCode} (ID: ${id}) current status: ${oldStatus}`);
    
    
    const result = await OrderModel.updateStatus(id, status);
    
    console.log(`✅ Order ${orderCode} (ID: ${id}) status updated from ${oldStatus} to ${status}`);
    console.log(`📊 Update affected rows:`, result.affectedRows);
    
    res.json({ 
      success: true, 
      message: `Order ${orderCode} status updated from ${oldStatus} to ${status} successfully`,
      data: {
        id: parseInt(id),
        order_code: orderCode,
        old_status: oldStatus,
        new_status: status
      }
    });
    
  } catch (err) {
    console.error("❌ Update order status error:", err);
    
    res.status(500).json({ 
      success: false, 
      message: err.message || "Failed to update order status" 
    });
  }
};


export const getOrderSales = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📊 Getting sales for order ID: ${id}`);
    
    
    const order = await OrderModel.getOrderById(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
   
    const sales = await OrderModel.getOrderSales(id);
    
    console.log(`📊 Found ${sales.length} sales records for order ${order.order_code}`);
    
    res.json({
      success: true,
      data: {
        order: {
          id: parseInt(id),
          order_code: order.order_code,
          status: order.status,
          staff_name: order.staff_name,
          payment_method: order.payment_method,
          tax_amount: order.tax_amount,
          grand_total: order.grand_total,
          cash_received: order.cash_received,
          change_amount: order.change_amount
        },
        sales: sales
      }
    });
    
  } catch (error) {
    console.error("❌ Error getting order sales:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get sales records"
    });
  }
};

export const getOrderStats = async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    console.log(`📊 Getting order stats for period: ${period}`);
    
    
    const stats = await OrderModel.getOrderStats(period);
    
    console.log("📈 Stats from database:", stats);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("❌ Error getting order stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get order statistics"
    });
  }
};


export const getTodayOrderStats = async (req, res) => {
  try {
    console.log("📅 Getting today's order stats");
    
    
    const stats = await OrderModel.getTodayOrderStats();
    
    console.log("📅 Today's stats:", stats);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("❌ Error getting today's stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get today's statistics"
    });
  }
};
