import ProductModel from '../models/ProductModel.js';


export const listProducts = async (req, res) => {
  try {
    const products = await ProductModel.getProducts(req.query);
    
    res.json({
      success: true,
      data: products
    });
  } catch (err) {
    console.error("Error in listProducts:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch products" 
    });
  }
};


export const getProductById = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await ProductModel.getProductById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (err) {
    console.error("Error in getProductById:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch product" 
    });
  }
};
