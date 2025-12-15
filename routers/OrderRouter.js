
import express from "express";

import { 
  createOrder, 
  listOrders, 
  updateOrderStatus,
  getOrderStats,
  getTodayOrderStats,
  debugOrders,
  getOrderSales  
} from "../controllers/OrderController.js";

const router = express.Router();

router.post("/create", createOrder);
router.get("/list", listOrders);
router.put("/update-status/:id", updateOrderStatus);
router.get("/stats", getOrderStats);
router.get("/stats/today", getTodayOrderStats);
router.get("/debug", debugOrders);
router.get("/:id/sales", getOrderSales); 

export default router;