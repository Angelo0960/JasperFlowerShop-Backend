import pool from "./db.js"

export default class OrderModel {
    static async generateOrderCode() {
    try {
        
        const [maxIdResult] = await pool.query("SELECT MAX(id) as max_id FROM orders");
        const maxId = maxIdResult[0]?.max_id || 0;
       
        const nextNumber = maxId + 1;
        return `ORD-${String(nextNumber).padStart(3, "0")}`;
        
    } catch (error) {
        console.error("❌ Error generating order code:", error);
        
        const [countResult] = await pool.query("SELECT COUNT(*) as total FROM orders");
        const totalOrders = countResult[0]?.total || 0;
        return `ORD-${String(totalOrders + 1).padStart(3, "0")}`;
    }
}
    
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

        static async updateStatus(id, status) {
        const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
        
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status: ${status}`);
        }
        
        const connection = await pool.getConnection(); 
        
        try {
            await connection.beginTransaction(); 
            
        
            const [existing] = await connection.query("SELECT * FROM orders WHERE id = ?", [id]);
            
            if (existing.length === 0) {
                await connection.rollback(); 
                throw new Error('Order not found');
            }
            
            const currentOrder = existing[0];
            
            
            const [result] = await connection.query(
                "UPDATE orders SET status = ? WHERE id = ?",
                [status, id]
            );
            
          
            if (status === 'completed' && currentOrder.status !== 'completed') {
             
                await this.createSaleFromOrder(id, connection, currentOrder);
            }
            
            await connection.commit(); 
            
            return { 
                success: true,
                affectedRows: result.affectedRows,
                changedRows: result.changedRows || 0
            };
        } catch (error) {
            await connection.rollback(); 
            console.error("Update status error:", error);
            throw error;
        } finally {
            connection.release(); 
        }
    }

       static async createSaleFromOrder(orderId, connection, orderData) {
    try {
        const order = orderData;
        
        
        const sale_code = await this.generateSaleCode(connection);
        
        
        const orderDate = new Date(order.created_at);
        
       
        const year = orderDate.getFullYear();
        const month = String(orderDate.getMonth() + 1).padStart(2, '0');
        const day = String(orderDate.getDate()).padStart(2, '0');
        
        const sale_date = `${year}-${month}-${day}`; 
        
        const hours = String(orderDate.getHours()).padStart(2, '0');
        const minutes = String(orderDate.getMinutes()).padStart(2, '0');
        const seconds = String(orderDate.getSeconds()).padStart(2, '0');
        
        const sale_time = `${hours}:${minutes}:${seconds}`; 
  
        
        console.log(`📊 Creating sale for order ${order.order_code} on date: ${sale_date} ${sale_time}`);
        
        const [result] = await connection.query(
            `INSERT INTO sales (
                sale_code, 
                order_id, 
                customer_name,
                staff_name,
                payment_method,
                items, 
                items_count, 
                total_amount,
                tax_amount,
                grand_total,
                cash_received,
                change_amount,
                staff_id, 
                sale_date,  
                sale_time   
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            [
                sale_code, 
                orderId, 
                order.customer_name,
                order.staff_name || '',
                order.payment_method || 'cash',
                JSON.stringify(order.items), 
                order.items_count, 
                order.total_amount,
                order.tax_amount || 0,
                order.grand_total || order.total_amount,
                order.cash_received || 0,
                order.change_amount || 0,
                1,  
                sale_date,  
                sale_time   
            ]
        );

        if (result.affectedRows === 0) {
             throw new Error("Sale insertion failed, 0 rows affected.");
        }
        
        return {
            id: result.insertId,
            sale_code,
            order_id: orderId,
            sale_date,
            sale_time
        };
    } catch (error) {
        console.error("Error creating sale from order:", error);
        throw error;
    }
}


        static async createOrder(orderData) {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
    
            const order_code = await this.generateOrderCode();
            

            const items_count = Array.isArray(orderData.items) ? 
                orderData.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0) : 1;
            

            const [result] = await connection.query(
                `INSERT INTO orders (
                    order_code,
                    customer_name,
                    staff_name,
                    payment_method,
                    items,
                    items_count,
                    total_amount,
                    tax_amount,
                    grand_total,
                    cash_received,
                    change_amount,
                    notes,
                    status,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
                [
                    order_code,
                    orderData.customer_name,
                    orderData.staff_name || '',
                    orderData.payment_method || 'cash',
                    JSON.stringify(orderData.items),
                    items_count,
                    orderData.total_amount || 0,
                    orderData.tax_amount || 0,
                    orderData.grand_total || orderData.total_amount || 0,
                    orderData.cash_received || 0,
                    orderData.change_amount || 0,
                    orderData.notes || ''
                ]
            );

            await connection.commit();
            
            return {
                id: result.insertId,
                order_code: order_code,
                customer_name: orderData.customer_name,
                staff_name: orderData.staff_name || '',
                payment_method: orderData.payment_method || 'cash',
                items: orderData.items,
                items_count: items_count,
                total_amount: orderData.total_amount || 0,
                tax_amount: orderData.tax_amount || 0,
                grand_total: orderData.grand_total || orderData.total_amount || 0,
                cash_received: orderData.cash_received || 0,
                change_amount: orderData.change_amount || 0,
                notes: orderData.notes || '',
                status: 'pending',
                created_at: new Date()
            };
        } catch (error) {
            await connection.rollback();
            console.error('Error creating order:', error);
            throw error;
        } finally {
            connection.release();
        }
    }
    
    static async getOrderSales(orderId) {
        const [sales] = await pool.query(
            "SELECT * FROM sales WHERE order_id = ? ORDER BY sale_date DESC, sale_time DESC",
            [orderId]
        );
        
        return sales.map(sale => ({
            ...sale,
            items: typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items
        }));
    }

        static async getOrderStats(period = 'today') {
        let dateCondition = '';
        
        switch(period) {
            case 'today':
                dateCondition = "DATE(created_at) = CURDATE()";
                break;
            case 'week':
                dateCondition = "YEARWEEK(created_at) = YEARWEEK(CURDATE())";
                break;
            case 'month':
                dateCondition = "MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())";
                break;
            default:
                dateCondition = "1=1";
        }
        
        const [result] = await pool.query(`
            SELECT 
                COUNT(*) as total_orders,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
                SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as in_progress_orders,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
                SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as total_revenue
            FROM orders
            WHERE ${dateCondition}
        `);
        
        return result[0] || {
            total_orders: 0,
            pending_orders: 0,
            in_progress_orders: 0,
            completed_orders: 0,
            cancelled_orders: 0,
            total_revenue: 0
        };
    }

    static async getTodayOrderStats() {
        const [statsResult] = await pool.query(`
            SELECT 
                COUNT(*) as total_orders,
                SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as total_revenue
            FROM orders
            WHERE DATE(created_at) = CURDATE()
        `);
        
        const [itemsResult] = await pool.query(`
            SELECT SUM(items_count) as total_items
            FROM sales
            WHERE sale_date = CURDATE()
        `);
        
        return {
            totalRevenue: statsResult[0]?.total_revenue || 0,
            totalOrders: statsResult[0]?.total_orders || 0,
            itemsSold: itemsResult[0]?.total_items || 0
        };
    }
}