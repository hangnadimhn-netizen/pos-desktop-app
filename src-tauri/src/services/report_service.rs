use sqlx::SqlitePool;
use crate::models::report::{CashierSalesReportDto, RevenueSummaryDto};
use crate::repository::report_repository::ReportRepository;
use crate::utils::app_error::AppError;

pub struct ReportService {
    pool: SqlitePool,
}

impl ReportService {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn get_revenue_summary(
        &self,
        start_date: &str,
        end_date: &str,
    ) -> Result<RevenueSummaryDto, AppError> {
        let repo = ReportRepository::new(&self.pool);
        repo.get_revenue_summary(start_date, end_date).await
    }

    pub async fn get_cashier_sales_report(
        &self,
        start_date: &str,
        end_date: &str,
    ) -> Result<Vec<CashierSalesReportDto>, AppError> {
        let repo = ReportRepository::new(&self.pool);
        repo.get_cashier_sales(start_date, end_date).await
    }

    pub async fn get_station_sales_report(
        &self,
        start_date: &str,
        end_date: &str,
    ) -> Result<Vec<crate::models::report::StationSalesReportDto>, AppError> {
        let repo = ReportRepository::new(&self.pool);
        repo.get_station_sales(start_date, end_date).await
    }

    pub async fn get_shift_sales_report(
        &self,
        start_date: &str,
        end_date: &str,
    ) -> Result<Vec<crate::models::report::ShiftSalesReportDto>, AppError> {
        let repo = ReportRepository::new(&self.pool);
        repo.get_shift_sales(start_date, end_date).await
    }

    pub async fn get_closed_shifts_history(
        &self,
        start_date: &str,
        end_date: &str,
    ) -> Result<Vec<crate::models::report::ClosedShiftHistoryDto>, AppError> {
        let repo = ReportRepository::new(&self.pool);
        repo.get_closed_shifts_history(start_date, end_date).await
    }

}