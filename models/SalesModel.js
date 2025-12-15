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
}