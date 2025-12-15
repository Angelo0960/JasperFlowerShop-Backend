import pool from "./db.js"

export default class ProductModel {
 static async getProducts(filters = {}) {
        let query = `SELECT * FROM products WHERE is_active = TRUE`;
        const params = [];
        
        if (filters.category) {
            query += ` AND category = ?`;
            params.push(filters.category);
        }
        
        if (filters.search) {
            query += ` AND (name LIKE ? OR description LIKE ? OR product_code LIKE ?)`;
            params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
        }
        
        query += ` ORDER BY name`;
        
        const [rows] = await pool.query(query, params);
        return rows;
    }
        static async getProductById(id) {
        const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [id]);
        return rows[0] || null;
    }

    static async createProduct(productData) {
        const { 
            product_code, 
            name, 
            description, 
            category, 
            unit_price
        } = productData;
        
        const [result] = await pool.query(
            `INSERT INTO products (product_code, name, description, category, unit_price)
             VALUES (?, ?, ?, ?, ?)`,
            [product_code, name, description, category, unit_price]
        );
        
        return {
            id: result.insertId,
            ...productData
        };
    }

    static async updateProduct(id, productData) {
        const { 
            name, 
            description, 
            category, 
            unit_price
        } = productData;
        
        const [result] = await pool.query(
            `UPDATE products 
             SET name = ?, description = ?, category = ?, unit_price = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [name, description, category, unit_price, id]
        );
        
        return result.affectedRows > 0;
    }

   
    static async deleteProduct(id) {
        const [result] = await pool.query(
            `UPDATE products 
             SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [id]
        );
        
        return result.affectedRows > 0;
    }
}