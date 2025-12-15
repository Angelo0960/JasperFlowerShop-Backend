import pool from "./db.js";

export default class SalesModel {

  static async getSales(filters = {}) {
        let query = `SELECT * FROM sales WHERE 1=1`;
        const params = [];
        
        
        if (filters.range) {
            switch(filters.range) {
                case 'today':
                    query += ` AND sale_date = CURDATE()`;
                    break;
                case 'week':
                    query += ` AND YEARWEEK(sale_date) = YEARWEEK(CURDATE())`;
                    break;
                case 'month':
                    query += ` AND MONTH(sale_date) = MONTH(CURDATE()) AND YEAR(sale_date) = YEAR(CURDATE())`;
                    break;
            }
        }
        
        
        if (filters.startDate) {
            query += ` AND sale_date >= ?`;
            params.push(filters.startDate);
        }
        
        if (filters.endDate) {
            query += ` AND sale_date <= ?`;
            params.push(filters.endDate);
        }
        
        query += ` ORDER BY sale_date DESC, sale_time DESC`;
        
        const [rows] = await pool.query(query, params);
        
        return rows.map(sale => ({
            ...sale,
            items: typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items,
            amount: sale.total_amount
        }));
    }

    static async recordSale({ customer_name, items, total_amount, payment_method = 'cash' }) {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            
            const sale_code = await this.generateSaleCode();
            
            const items_count = Array.isArray(items) ? 
                items.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0) : 1;
            
            const [result] = await connection.query(
                `INSERT INTO sales (
                    sale_code, 
                    customer_name, 
                    items, 
                    items_count, 
                    total_amount,
                    payment_method,
                    staff_id, 
                    sale_date, 
                    sale_time
                ) VALUES (?, ?, ?, ?, ?, ?, 1, CURDATE(), CURTIME())`,
                [
                    sale_code, 
                    customer_name, 
                    JSON.stringify(items), 
                    items_count, 
                    total_amount,
                    payment_method
                ]
            );
        
            
            await connection.commit();
            
            return {
                id: result.insertId,
                sale_code,
                customer_name,
                items,
                items_count,
                total_amount,
                payment_method,
                sale_date: new Date().toISOString().split('T')[0],
                sale_time: new Date().toTimeString().split(' ')[0]
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async generateSaleCode() {
        const [result] = await pool.query(
            "SELECT IFNULL(MAX(CAST(SUBSTRING(sale_code, 5) AS UNSIGNED)), 0) AS max_id FROM sales"
        );
        const nextId = (result[0]?.max_id || 0) + 1;
        return `SAL-${String(nextId).padStart(5, "0")}`;
    }

    static async getSalesStats(period = 'today') {
        let dateCondition = '';
        
        switch(period) {
            case 'today':
                dateCondition = "sale_date = CURDATE()";
                break;
            case 'week':
                dateCondition = "YEARWEEK(sale_date) = YEARWEEK(CURDATE())";
                break;
            case 'month':
                dateCondition = "MONTH(sale_date) = MONTH(CURDATE()) AND YEAR(sale_date) = YEAR(CURDATE())";
                break;
            default:
                dateCondition = "1=1";
        }
        
        const [result] = await pool.query(`
            SELECT 
                COUNT(*) as total_sales,
                SUM(total_amount) as total_revenue,
                AVG(total_amount) as average_sale,
                SUM(items_count) as total_items_sold,
                MIN(sale_date) as period_start,
                MAX(sale_date) as period_end
            FROM sales
            WHERE ${dateCondition}
        `);
        
        return result[0] || {
            total_sales: 0,
            total_revenue: 0,
            average_sale: 0,
            total_items_sold: 0,
            period_start: null,
            period_end: null
        };
    }

    
    static async saveToReports(salesData, reportType = 'daily', reportName = 'Sales Report') {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            
            const report_code = `REP-${Date.now()}`;
            
            
            const total_sales = salesData.reduce((sum, sale) => sum + (parseFloat(sale.total_amount) || 0), 0);
            const total_items = salesData.reduce((sum, sale) => sum + (parseInt(sale.items_count) || 0), 0);
            
            
            const [result] = await connection.query(
                `INSERT INTO reports (
                    report_code,
                    report_type,
                    report_name,
                    report_data,
                    summary_data,
                    total_sales,
                    total_items,
                    generated_by,
                    generated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'system', NOW())`,
                [
                    report_code,
                    reportType,
                    reportName,
                    JSON.stringify(salesData),
                    JSON.stringify({
                        total_transactions: salesData.length,
                        total_sales: total_sales,
                        total_items: total_items,
                        average_sale: salesData.length > 0 ? total_sales / salesData.length : 0
                    }),
                    total_sales,
                    total_items
                ]
            );
            
            await connection.commit();
            
            return {
                id: result.insertId,
                report_code,
                report_type: reportType,
                report_name: reportName,
                total_sales,
                total_items,
                generated_at: new Date()
            };
        } catch (error) {
            await connection.rollback();
            console.error('Error saving to reports:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getSalesStats(period = 'today') {
        let dateCondition = '';
        
        switch(period) {
            case 'today':
                dateCondition = "sale_date = CURDATE()";
                break;
            case 'week':
                dateCondition = "YEARWEEK(sale_date) = YEARWEEK(CURDATE())";
                break;
            case 'month':
                dateCondition = "MONTH(sale_date) = MONTH(CURDATE()) AND YEAR(sale_date) = YEAR(CURDATE())";
                break;
            default:
                dateCondition = "1=1";
        }
        
        const [result] = await pool.query(`
            SELECT 
                COUNT(*) as total_sales,
                SUM(total_amount) as total_revenue,
                AVG(total_amount) as average_sale,
                SUM(items_count) as total_items_sold,
                MIN(sale_date) as period_start,
                MAX(sale_date) as period_end
            FROM sales
            WHERE ${dateCondition}
        `);
        
        return result[0] || {
            total_sales: 0,
            total_revenue: 0,
            average_sale: 0,
            total_items_sold: 0,
            period_start: null,
            period_end: null
        };
    }

    static async getReports(filters = {}) {
        let query = `SELECT * FROM reports WHERE 1=1`;
        const params = [];
        
        if (filters.report_type) {
            query += ` AND report_type = ?`;
            params.push(filters.report_type);
        }
        
        if (filters.start_date) {
            query += ` AND DATE(generated_at) >= ?`;
            params.push(filters.start_date);
        }
        
        if (filters.end_date) {
            query += ` AND DATE(generated_at) <= ?`;
            params.push(filters.end_date);
        }
        
        query += ` ORDER BY generated_at DESC`;
        
        const [rows] = await pool.query(query, params);
        
        return rows.map(report => ({
            ...report,
            report_data: typeof report.report_data === 'string' ? JSON.parse(report.report_data) : report.report_data,
            summary_data: typeof report.summary_data === 'string' ? JSON.parse(report.summary_data) : report.summary_data
        }));
    }

}