use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Category {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Item {
    pub id: i64,
    pub category_id: Option<i64>,
    pub sku: String,
    pub barcode: Option<String>,
    pub name: String,
    pub unit: String,
    pub cost_price: f64,
    pub selling_price: f64,
    pub tax_type: String,
    pub tax_rate: f64,
    pub stock_qty: f64,
    pub min_stock_qty: f64,
    pub is_active: i64,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ItemListRow {
    pub id: i64,
    pub category_id: Option<i64>,
    pub category_name: Option<String>,
    pub sku: String,
    pub barcode: Option<String>,
    pub name: String,
    pub unit: String,
    pub cost_price: f64,
    pub selling_price: f64,
    pub tax_type: String, 
    pub tax_rate: f64,
    pub stock_qty: f64,
    pub min_stock_qty: f64,
    pub is_active: i64,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BulkUpdateTaxRequest {
    pub item_ids: Vec<i64>,
    pub tax_type: String,
    pub tax_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct StockMovement {
    pub id: i64,
    pub item_id: i64,
    pub movement_type: String,
    pub qty: f64,
    pub reference_type: Option<String>,
    pub reference_id: Option<i64>,
    pub notes: Option<String>,
    pub created_by: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct StockMovementListRow {
    pub id: i64,
    pub item_id: i64,
    pub item_name: String,
    pub item_sku: String,
    pub movement_type: String,
    pub qty: f64,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateCategoryRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCategoryRequest {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateItemRequest {
    pub category_id: Option<i64>,
    pub sku: String,
    pub barcode: Option<String>,
    pub name: String,
    pub unit: Option<String>,
    pub cost_price: f64,
    pub selling_price: f64,
    pub stock_qty: f64,
    pub min_stock_qty: f64,
}

#[derive(Debug, Deserialize)]
pub struct UpdateItemRequest {
    pub id: i64,
    pub category_id: Option<i64>,
    pub sku: String,
    pub barcode: Option<String>,
    pub name: String,
    pub unit: Option<String>,
    pub cost_price: f64,
    pub selling_price: f64,
    pub min_stock_qty: f64,
}

#[derive(Debug, Deserialize)]
pub struct AdjustStockRequest {
    pub item_id: i64,
    pub movement_type: String,
    pub qty: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct InventoryCategoryDto {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct InventoryItemDto {
    pub id: i64,
    pub category_id: Option<i64>,
    pub category_name: Option<String>,
    pub sku: String,
    pub barcode: Option<String>,
    pub name: String,
    pub unit: String,
    pub cost_price: f64,
    pub selling_price: f64,
    pub tax_type: String,
    pub tax_rate: f64,
    pub stock_qty: f64,
    pub min_stock_qty: f64,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ImportCsvItemPayload {
    pub sku: String,
    pub barcode: Option<String>,
    pub name: String,
    pub category_name: Option<String>, 
    pub unit: Option<String>,
    pub cost_price: f64,
    pub selling_price: f64,
    pub stock_qty: f64,
    pub min_stock_qty: f64,
}

#[derive(Debug, Serialize)]
pub struct StockMovementDto {
    pub id: i64,
    pub item_id: i64,
    pub item_name: String,
    pub item_sku: String,
    pub movement_type: String,
    pub qty: f64,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, serde::Deserialize)]
pub struct BulkStockInPayload {
    pub sku: String,
    pub qty: f64,
    pub notes: Option<String>,
}