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
}