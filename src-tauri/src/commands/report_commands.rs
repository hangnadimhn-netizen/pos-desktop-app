use tauri::State;
use crate::AppState;
use crate::models::report::{CashierSalesReportDto, DateRangeRequest, 
    RevenueSummaryDto, StationSalesReportDto, ShiftSalesReportDto, 
    ClosedShiftHistoryDto
};
use crate::services::report_service::ReportService;

#[tauri::command]
pub async fn get_revenue_summary_command(
    state: State<'_, AppState>,
    payload: DateRangeRequest,
) -> Result<RevenueSummaryDto, String> {
    let service = ReportService::new(state.db.clone());
    service
        .get_revenue_summary(&payload.start_date, &payload.end_date)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_cashier_sales_command(
    state: State<'_, AppState>,
    payload: DateRangeRequest,
) -> Result<Vec<CashierSalesReportDto>, String> {
    let service = ReportService::new(state.db.clone());
    service
        .get_cashier_sales_report(&payload.start_date, &payload.end_date)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_station_sales_command(
    state: State<'_, AppState>,
    payload: DateRangeRequest,
) -> Result<Vec<StationSalesReportDto>, String> {
    let service = ReportService::new(state.db.clone());
    service
        .get_station_sales_report(&payload.start_date, &payload.end_date)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_shift_sales_command(
    state: State<'_, AppState>,
    payload: DateRangeRequest,
) -> Result<Vec<ShiftSalesReportDto>, String> {
    let service = ReportService::new(state.db.clone());
    service
        .get_shift_sales_report(&payload.start_date, &payload.end_date)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_closed_shifts_history_command(
    state: State<'_, AppState>,
    payload: DateRangeRequest,
) -> Result<Vec<ClosedShiftHistoryDto>, String> {
    let service = ReportService::new(state.db.clone());
    service
        .get_closed_shifts_history(&payload.start_date, &payload.end_date)
        .await
        .map_err(|e| e.to_string())
}