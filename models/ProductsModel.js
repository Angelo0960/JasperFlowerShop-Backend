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
}