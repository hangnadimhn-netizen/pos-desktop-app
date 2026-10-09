use sqlx::SqlitePool;
use crate::models::report::{CashierSalesReportDto, RevenueSummaryDto};
use crate::utils::app_error::AppError;

pub struct ReportRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> ReportRepository<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn get_revenue_summary(
        &self,
        start_date: &str,
        end_date: &str,
    ) -> Result<RevenueSummaryDto, AppError> {
        let result = sqlx::query_as::<_, RevenueSummaryDto>(
            r#"
            SELECT 
                COUNT(id) as total_transactions,
                CAST(COALESCE(SUM(grand_total), 0.0) AS REAL) as total_revenue,
                CAST(COALESCE(SUM(tax_total), 0.0) AS REAL) as total_tax
            FROM transactions
            WHERE transaction_status = 'COMPLETED' 
            AND created_at BETWEEN ? AND ?
            "#,
        )
        .bind(start_date)
        .bind(end_date)
        .fetch_one(self.pool)
        .await?;

        Ok(result)
    }

    pub async fn get_cashier_sales(
        &self,
        start_date: &str,
        end_date: &str,
    ) -> Result<Vec<CashierSalesReportDto>, AppError> {
        let results = sqlx::query_as::<_, CashierSalesReportDto>(
            r#"
            SELECT 
                u.id as cashier_id,
                u.full_name as cashier_name,
                COUNT(t.id) as total_transactions,
                CAST(COALESCE(SUM(t.grand_total), 0.0) AS REAL) as total_revenue,
                CAST(COALESCE(SUM(t.tax_total), 0.0) AS REAL) as total_tax
            FROM transactions t
            JOIN users u ON t.cashier_id = u.id
            WHERE t.transaction_status = 'COMPLETED' 
            AND t.created_at BETWEEN ? AND ?
            GROUP BY u.id, u.full_name
            ORDER BY total_revenue DESC
            "#,
        )
        .bind(start_date)
        .bind(end_date)
        .fetch_all(self.pool)
        .await?;

        Ok(results)
    }

    pub async fn get_station_sales(
        &self,
        start_date: &str,
        end_date: &str,
    ) -> Result<Vec<crate::models::report::StationSalesReportDto>, AppError> {
        let results = sqlx::query_as::<_, crate::models::report::StationSalesReportDto>(
            r#"
            SELECT 
                s.id as station_id,
                s.name as station_name,
                COUNT(t.id) as total_transactions,
                CAST(COALESCE(SUM(t.grand_total), 0.0) AS REAL) as total_revenue,
                CAST(COALESCE(SUM(t.tax_total), 0.0) AS REAL) as total_tax
            FROM transactions t
            JOIN stations s ON t.station_id = s.id
            WHERE t.transaction_status = 'COMPLETED' 
            AND t.created_at BETWEEN ? AND ?
            GROUP BY s.id, s.name
            ORDER BY total_revenue DESC
            "#,
        )
        .bind(start_date)
        .bind(end_date)
        .fetch_all(self.pool)
        .await?;

        Ok(results)
    }

    pub async fn get_shift_sales(
        &self,
        start_date: &str,
        end_date: &str,
    ) -> Result<Vec<crate::models::report::ShiftSalesReportDto>, AppError> {
        let results = sqlx::query_as::<_, crate::models::report::ShiftSalesReportDto>(
            r#"
            SELECT 
                ss.name as schedule_name,
                COUNT(t.id) as total_transactions,
                CAST(COALESCE(SUM(t.grand_total), 0.0) AS REAL) as total_revenue,
                CAST(COALESCE(SUM(t.tax_total), 0.0) AS REAL) as total_tax
            FROM transactions t
            JOIN shifts sh ON t.shift_id = sh.id
            JOIN shift_schedules ss ON sh.schedule_id = ss.id
            WHERE t.transaction_status = 'COMPLETED' 
            AND t.created_at BETWEEN ? AND ?
            GROUP BY ss.id, ss.name
            ORDER BY ss.id ASC
            "#,
        )
        .bind(start_date)
        .bind(end_date)
        .fetch_all(self.pool)
        .await?;

        Ok(results)
    }

    pub async fn get_closed_shifts_history(
        &self,
        start_date: &str,
        end_date: &str,
    ) -> Result<Vec<crate::models::report::ClosedShiftHistoryDto>, AppError> {
        let results = sqlx::query_as::<_, crate::models::report::ClosedShiftHistoryDto>(
            r#"
            SELECT 
                sh.id as shift_id,
                COALESCE((SELECT id FROM pos_sessions WHERE shift_id = sh.id LIMIT 1), 0) as session_id,
                u.full_name as cashier_name,
                ss.name as schedule_name,
                sh.opened_at,
                sh.closed_at,
                CAST(COALESCE(sh.expected_cash, 0.0) AS REAL) as expected_cash,
                CAST(COALESCE(sh.closing_cash, 0.0) AS REAL) as actual_closing_cash,
                CAST(COALESCE(sh.cash_difference, 0.0) AS REAL) as cash_difference,
                (SELECT COUNT(id) FROM transactions WHERE shift_id = sh.id AND transaction_status = 'COMPLETED') as total_receipts,
                (SELECT CAST(COALESCE(SUM(tax_total), 0.0) AS REAL) FROM transactions WHERE shift_id = sh.id AND transaction_status = 'COMPLETED') as total_tax -- BARIS BARU
            FROM shifts sh
            JOIN users u ON sh.cashier_id = u.id
            JOIN shift_schedules ss ON sh.schedule_id = ss.id
            WHERE sh.status = 'CLOSED'
            AND sh.opened_at BETWEEN ? AND ?
            ORDER BY sh.id DESC
            LIMIT 100
            "#,
        )
        .bind(start_date)
        .bind(end_date)
        .fetch_all(self.pool)
        .await?;

        Ok(results)
    }

}