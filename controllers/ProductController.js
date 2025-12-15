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
export const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    
    
    if (!productData.name || !productData.unit_price) {
      return res.status(400).json({
        success: false,
        message: "Name and unit price are required"
      });
    }
    
    const newProduct = await ProductModel.createProduct(productData);
    
    res.status(201).json({
      success: true,
      data: newProduct,
      message: "Product created successfully"
    });
  } catch (err) {
    console.error("Error in createProduct:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create product" 
    });
  }
};


export const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const productData = req.body;
    
    
    if (!productData.name || !productData.unit_price) {
      return res.status(400).json({
        success: false,
        message: "Name and unit price are required"
      });
    }
    
    const updated = await ProductModel.updateProduct(productId, productData);
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    
    
    const updatedProduct = await ProductModel.getProductById(productId);
    
    res.json({
      success: true,
      data: updatedProduct,
      message: "Product updated successfully"
    });
  } catch (err) {
    console.error("Error in updateProduct:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update product" 
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    
    
    const product = await ProductModel.getProductById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    
    
    const deleted = await ProductModel.deleteProduct(productId);
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete product"
      });
    }
    
    res.json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (err) {
    console.error("Error in deleteProduct:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete product" 
    });
  }
};



