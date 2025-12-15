import pool from "./db.js";

export default class ReportModel {
    
static async generateSalesReport(period = 'daily', specificDate = null) {
    let dateCondition = '';
    let periodLabel = '';
    
    console.log(`Generating ${period} report for date: ${specificDate || 'current'}`);
    
    switch(period) {
        case 'daily':
            if (specificDate) {
            
                dateCondition = "sale_date = ?";
                periodLabel = `Date: ${specificDate}`;
            } else {
                dateCondition = "sale_date = CURDATE()";
                periodLabel = 'Today';
            }
            break;
        case 'weekly':
            dateCondition = "YEARWEEK(sale_date) = YEARWEEK(CURDATE())";
            periodLabel = 'This Week';
            break;
        case 'monthly':
            dateCondition = "MONTH(sale_date) = MONTH(CURDATE()) AND YEAR(sale_date) = YEAR(CURDATE())";
            periodLabel = 'This Month';
            break;
        default:
            dateCondition = "1=1";
            periodLabel = 'All Time';
    }
    
    console.log(`Date condition: ${dateCondition}`);
    
    try {
        
        const [tableCheck] = await pool.query(`
            SELECT COUNT(*) as table_exists 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name = 'sales'
        `);
        
        if (tableCheck[0].table_exists === 0) {
            console.warn("⚠️ Sales table does not exist, returning empty report");
            return this.getEmptyReport(periodLabel);
        }
        
        let summaryResult;
        let dailyResult;
        let rawDataResult;
        let params = [];
        
        
        if (period === 'daily' && specificDate) {
            params.push(specificDate);
        }
        
       
        [summaryResult] = await pool.query(`
            SELECT 
                COUNT(*) as transaction_count,
                SUM(total_amount) as total_sales,
                AVG(total_amount) as average_transaction,
                SUM(items_count) as total_items
            FROM sales
            WHERE ${dateCondition}
        `, params);
        
        const summary = summaryResult[0] || {
            transaction_count: 0,
            total_sales: 0,
            average_transaction: 0,
            total_items: 0
        };
        
        
        [dailyResult] = await pool.query(`
            SELECT 
                sale_date as date,
                COUNT(*) as transactions,
                SUM(items_count) as items_sold,
                SUM(total_amount) as total_sales
            FROM sales
            WHERE ${dateCondition}
            GROUP BY sale_date
            ORDER BY sale_date DESC
        `, params);
        
        
        [rawDataResult] = await pool.query(`
            SELECT * FROM sales
            WHERE ${dateCondition}
            ORDER BY sale_date DESC, sale_time DESC
            LIMIT 1000
        `, params);
        
        const rawData = rawDataResult.map(row => ({
            ...row,
            items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
            amount: row.total_amount
        }));
        
        console.log(`Report generated: ${rawData.length} sales records`);
        
        
        let hourlyBreakdown = [];
        if (period === 'daily') {
            const hourlyParams = specificDate ? [specificDate] : [];
            const [hourlyResult] = await pool.query(`
                SELECT 
                    HOUR(sale_time) as hour,
                    COUNT(*) as transactions,
                    SUM(total_amount) as revenue
                FROM sales
                WHERE ${dateCondition}
                GROUP BY HOUR(sale_time)
                ORDER BY hour ASC
            `, hourlyParams);
            
            hourlyBreakdown = hourlyResult.map(h => ({
                hour: h.hour,
                transactions: h.transactions || 0,
                revenue: h.revenue || 0
            }));
        }
        
        
        let topProducts = await this.getTopProducts(10, period, specificDate);
        
        return {
            summary,
            dailyBreakdown: dailyResult,
            hourlyBreakdown,
            rawData,
            topProducts,
            period: periodLabel,
            generatedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error("Error generating report:", error);
        
        return this.getEmptyReport(periodLabel);
    }
}

    
    static getEmptyReport(periodLabel) {
        return {
            summary: {
                transaction_count: 0,
                total_sales: 0,
                average_transaction: 0,
                total_items: 0
            },
            dailyBreakdown: [],
            rawData: [],
            period: periodLabel,
            generatedAt: new Date().toISOString()
        };
    }

     // Get top products
    static async getTopProducts(limit = 10, period = 'monthly') {
        try {
            let dateCondition = '';
            
            switch(period) {
                case 'daily':
                    dateCondition = "s.sale_date = CURDATE()";
                    break;
                case 'weekly':
                    dateCondition = "YEARWEEK(s.sale_date) = YEARWEEK(CURDATE())";
                    break;
                case 'monthly':
                    dateCondition = "MONTH(s.sale_date) = MONTH(CURDATE()) AND YEAR(s.sale_date) = YEAR(CURDATE())";
                    break;
                default:
                    dateCondition = "1=1";
            }
            
            const [result] = await pool.query(`
                SELECT 
                    p.name as product_name,
                    p.product_code,
                    SUM(
                        CASE 
                            WHEN JSON_EXTRACT(s.items, '$[0].quantity') IS NOT NULL 
                            THEN JSON_EXTRACT(s.items, '$[0].quantity')
                            ELSE 1
                        END
                    ) as total_quantity,
                    SUM(s.total_amount) as total_revenue
                FROM sales s
                JOIN products p ON JSON_EXTRACT(s.items, '$[0].product_id') = p.id
                WHERE ${dateCondition}
                GROUP BY p.id, p.name, p.product_code
                ORDER BY total_quantity DESC
                LIMIT ?
            `, [limit]);
            
            return result;
        } catch (error) {
            console.error("Error getting top products:", error);
            return [];
        }
    }

    // Check if reports table exists and create if not
    static async ensureReportsTable() {
        try {
            const [tableCheck] = await pool.query(`
                SELECT COUNT(*) as table_exists 
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() 
                AND table_name = 'reports'
            `);
            
            if (tableCheck[0].table_exists === 0) {
                console.log("📊 Creating reports table...");
                
                await pool.query(`
                    CREATE TABLE reports (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        report_code VARCHAR(50) UNIQUE NOT NULL,
                        report_type VARCHAR(20) NOT NULL,
                        report_name VARCHAR(255) NOT NULL,
                        report_data JSON,
                        summary_data JSON,
                        total_sales DECIMAL(10, 2) DEFAULT 0,
                        total_items INT DEFAULT 0,
                        generated_by VARCHAR(100) DEFAULT 'system',
                        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_report_type (report_type),
                        INDEX idx_generated_at (generated_at)
                    )
                `);
                
                console.log("✅ Reports table created successfully");
            }
        } catch (error) {
            console.error("❌ Error ensuring reports table exists:", error);
        }
    }
    
}