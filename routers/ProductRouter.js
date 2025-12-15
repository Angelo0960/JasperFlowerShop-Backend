import express from "express";
import { 
  listProducts, 
  getProductById, 
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts 
} from "../controllers/ProductController.js";

const router = express.Router();


router.get("/", listProducts);
router.get("/:id", getProductById);
