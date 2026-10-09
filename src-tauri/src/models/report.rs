use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Deserialize)]
pub struct DateRangeRequest {
    pub start_date: String, 
    pub end_date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RevenueSummaryDto {
    pub total_transactions: i64,
    pub total_revenue: f64,
    pub total_tax: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CashierSalesReportDto {
    pub cashier_id: i64,
    pub cashier_name: String,
    pub total_transactions: i64,
    pub total_revenue: f64,
    pub total_tax: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct StationSalesReportDto {
    pub station_id: i64,
    pub station_name: String,
    pub total_transactions: i64,
    pub total_revenue: f64,
    pub total_tax: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ShiftSalesReportDto {
    pub schedule_name: String,
    pub total_transactions: i64,
    pub total_revenue: f64,
    pub total_tax: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ClosedShiftHistoryDto {
    pub shift_id: i64,
    pub session_id: i64, 
    pub cashier_name: String,
    pub schedule_name: String,
    pub total_tax: f64,
    pub opened_at: String,
    pub closed_at: Option<String>,
    pub expected_cash: f64,
    pub actual_closing_cash: f64,
    pub cash_difference: f64,
    pub total_receipts: i64,
}