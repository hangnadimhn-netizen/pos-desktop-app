use tauri::State;

use crate::models::inventory::{
    AdjustStockRequest, CreateCategoryRequest, CreateItemRequest, InventoryCategoryDto,
    InventoryItemDto, StockMovementDto, UpdateItemRequest, ImportCsvItemPayload, BulkStockInPayload
    , BulkUpdateTaxRequest
};
use crate::services::inventory_service::InventoryService;
use crate::AppState;

#[tauri::command]
pub async fn list_categories(state: State<'_, AppState>) -> Result<Vec<InventoryCategoryDto>, String> {
    let service = InventoryService::new(state.db.clone());
    service.list_categories().await.map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn create_category(
    state: State<'_, AppState>,
    payload: CreateCategoryRequest,
) -> Result<InventoryCategoryDto, String> {
    let service = InventoryService::new(state.db.clone());
    service
        .create_category(payload)
        .await
        .map_err(|error| error.to_string())
}

use crate::models::inventory::UpdateCategoryRequest;

#[tauri::command]
pub async fn update_category(
    state: State<'_, AppState>,
    payload: UpdateCategoryRequest,
) -> Result<InventoryCategoryDto, String> {
    let service = InventoryService::new(state.db.clone());
    service
        .update_category(payload)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn delete_category(
    state: State<'_, AppState>,
    id: i64,
) -> Result<(), String> {
    let service = InventoryService::new(state.db.clone());
    service
        .delete_category(id)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn list_items(state: State<'_, AppState>) -> Result<Vec<InventoryItemDto>, String> {
    let service = InventoryService::new(state.db.clone());
    service.list_items().await.map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn create_item(
    state: State<'_, AppState>,
    payload: CreateItemRequest,
) -> Result<InventoryItemDto, String> {
    let service = InventoryService::new(state.db.clone());
    service
        .create_item(payload)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn update_item(
    state: State<'_, AppState>,
    payload: UpdateItemRequest,
) -> Result<InventoryItemDto, String> {
    let service = InventoryService::new(state.db.clone());
    service
        .update_item(payload)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn deactivate_item(
    state: State<'_, AppState>,
    item_id: i64,
) -> Result<InventoryItemDto, String> {
    let service = InventoryService::new(state.db.clone());
    service
        .deactivate_item(item_id)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn bulk_update_tax(
    state: State<'_, AppState>,
    payload: BulkUpdateTaxRequest,
) -> Result<usize, String> {
    let service = InventoryService::new(state.db.clone());
    service
        .bulk_update_tax(payload)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn adjust_stock(
    state: State<'_, AppState>,
    payload: AdjustStockRequest,
) -> Result<InventoryItemDto, String> {
    let service = InventoryService::new(state.db.clone());
    service
        .adjust_stock(payload)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn list_stock_movements(
    state: State<'_, AppState>,
    item_id: Option<i64>,
) -> Result<Vec<StockMovementDto>, String> {
    let service = InventoryService::new(state.db.clone());
    service
        .list_stock_movements(item_id)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn import_items(
    state: State<'_, AppState>,
    payload: Vec<ImportCsvItemPayload>,
) -> Result<usize, String> {
    let service = InventoryService::new(state.db.clone());
    service
        .import_items(payload)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn bulk_stock_in(
    state: State<'_, AppState>,
    payload: Vec<BulkStockInPayload>,
) -> Result<usize, String> {
    let service = InventoryService::new(state.db.clone());
    service
        .bulk_stock_in(payload)
        .await
        .map_err(|error| error.to_string())
}
