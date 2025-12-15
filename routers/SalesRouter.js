import express from "express";
import { 
  recordSale,
  listSales, 
  exportSales,
  getSalesStats,
  testSalesEndpoint  
} from "../controllers/SalesController.js";

const router = express.Router();

router.get("/", listSales);             
router.get("/export", exportSales);     

router.post("/", recordSale);   