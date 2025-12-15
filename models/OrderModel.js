import pool from "./db.js"

export default class OrderModel {
    // Generate unique order code (Kept the user's uploaded version which includes a transaction)
    static async generateOrderCode() {
    try {
        // Get the maximum ID from orders table (not the code, but the auto-increment ID)
        const [maxIdResult] = await pool.query("SELECT MAX(id) as max_id FROM orders");
        const maxId = maxIdResult[0]?.max_id || 0;
        
        // Use the ID + 1 for the order code
        const nextNumber = maxId + 1;
        return `ORD-${String(nextNumber).padStart(3, "0")}`;
        
    } catch (error) {
        console.error("❌ Error generating order code:", error);
        // Last resort: count total orders
        const [countResult] = await pool.query("SELECT COUNT(*) as total FROM orders");
        const totalOrders = countResult[0]?.total || 0;
        return `ORD-${String(totalOrders + 1).padStart(3, "0")}`;
    }
}
    
    // Get all orders with filtering - UPDATED to include new fields
    static async getOrders(filters = {}) {
        let query = `SELECT * FROM orders WHERE 1=1`;
        const params = [];
        
        if (filters.status) {
            query += ` AND status = ?`;
            params.push(filters.status);
        }
        
        if (filters.startDate) {
            query += ` AND DATE(created_at) >= ?`;
            params.push(filters.startDate);
        }
        
        if (filters.endDate) {
            query += ` AND DATE(created_at) <= ?`;
            params.push(filters.endDate);
        }
        
        if (filters.search) {
            query += ` AND (order_code LIKE ? OR customer_name LIKE ?)`;
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }
        
        query += ` ORDER BY 
            CASE status
                WHEN 'pending' THEN 1
                WHEN 'in-progress' THEN 2
                WHEN 'completed' THEN 3
                WHEN 'cancelled' THEN 4
            END,
            created_at DESC`;
        
        if (filters.limit) {
            query += ` LIMIT ?`;
            params.push(parseInt(filters.limit));
        }
        
        const [rows] = await pool.query(query, params);
        
        return rows.map(row => ({
            id: row.id,
            order_code: row.order_code,
            customer_name: row.customer_name,
            staff_name: row.staff_name || '',
            payment_method: row.payment_method || 'cash',
            total_amount: row.total_amount,
            tax_amount: row.tax_amount || 0,
            grand_total: row.grand_total || row.total_amount,
            cash_received: row.cash_received || 0,
            change_amount: row.change_amount || 0,
            items_count: row.items_count,
            status: row.status,
            notes: row.notes,
            created_at: row.created_at,
            items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items
        }));
    }

    // Get order by ID - UPDATED to include new fields
    static async getOrderById(id) {
        const [rows] = await pool.query("SELECT * FROM orders WHERE id = ?", [id]);
        
        if (rows.length === 0) return null;
        
        const row = rows[0];
        return {
            id: row.id,
            order_code: row.order_code,
            customer_name: row.customer_name,
            staff_name: row.staff_name || '',
            payment_method: row.payment_method || 'cash',
            total_amount: row.total_amount,
            tax_amount: row.tax_amount || 0,
            grand_total: row.grand_total || row.total_amount,
            cash_received: row.cash_received || 0,
            change_amount: row.change_amount || 0,
            items_count: row.items_count,
            status: row.status,
            notes: row.notes,
            created_at: row.created_at,
            items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items
        };
    }
}