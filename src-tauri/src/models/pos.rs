use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SellableItemRow {
    pub id: i64,
    pub sku: String,
    pub barcode: Option<String>,
    pub name: String,
    pub unit: String,
    pub selling_price: f64,
    pub tax_type: String,
    pub tax_rate: f64,
    pub stock_qty: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CashierLookupRow {
    pub id: i64,
    pub full_name: String,
    pub username: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Transaction {
    pub id: i64,
    pub transaction_no: String,
    pub cashier_id: i64,
    pub session_id: i64,
    pub shift_id: i64,
    pub station_id: i64,
    pub subtotal: f64,
    pub discount_total: f64,
    pub tax_total: f64,
    pub grand_total: f64,
    pub paid_amount: f64,
    pub change_amount: f64,
    pub payment_status: String,
    pub transaction_status: String,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Receipt {
    pub id: i64,
    pub transaction_id: i64,
    pub receipt_no: String,
    pub printed_count: i64,
    pub last_printed_at: Option<String>,
    pub printed_by: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTransactionItemRequest {
    pub item_id: i64,
    pub qty: f64,
}

#[derive(Debug, Deserialize)]
pub struct CreateTransactionRequest {
    pub cashier_id: i64,
    pub session_id: i64,
    pub shift_id: i64,
    pub station_id: i64,
    pub payment_method: String,
    pub paid_amount: f64,
    pub notes: Option<String>,
    pub items: Vec<CreateTransactionItemRequest>,
}

#[derive(Debug, Serialize)]
pub struct PosItemDto {
    pub id: i64,
    pub sku: String,
    pub barcode: Option<String>,
    pub name: String,
    pub unit: String,
    pub selling_price: f64,
    pub tax_type: String,
    pub tax_rate: f64,
    pub stock_qty: f64,
}

#[derive(Debug, Serialize)]
pub struct PosReceiptItemDto {
    pub item_id: i64,
    pub item_name: String,
    pub item_sku: String,
    pub qty: f64,
    pub unit_price: f64,
    pub line_total: f64,
}

#[derive(Debug, Serialize)]
pub struct PosReceiptDto {
    pub transaction_id: i64,
    pub transaction_no: String,
    pub receipt_no: String,
    pub cashier_id: i64,
    pub cashier_name: String,
    pub payment_method: String,
    pub subtotal: f64,
    pub tax_total: f64,
    pub grand_total: f64,
    pub paid_amount: f64,
    pub change_amount: f64,
    pub created_at: String,
    pub items: Vec<PosReceiptItemDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Shift {
    pub id: i64,
    pub name: String,
    pub start_time: String,
    pub end_time: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Station {
    pub id: i64,
    pub name: String, 
    pub status: String, 
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PosSession {
    pub id: i64,
    pub cashier_id: i64,
    pub shift_id: i64,
    pub station_id: i64,
    pub status: String,
    pub opened_at: String,
    pub closed_at: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct OpenPosSessionRequest {
    pub username: String,
    pub password: String,
    pub schedule_id: i64, 
    pub station_id: i64,
    pub opening_cash: f64, 
}

#[derive(Debug, Deserialize)]
pub struct CloseShiftRequest {
    pub shift_id: i64,
    pub session_id: i64,
    pub actual_closing_cash: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CloseShiftResponse {
    pub shift_id: i64,
    pub session_id: i64,
    pub expected_cash: f64,
    pub actual_closing_cash: f64,
    pub cash_difference: f64,
    pub total_receipts: i64,
    pub total_tax: f64,
}

#[derive(Debug, Deserialize)]
pub struct HoldCartItemRequest {
    pub item_id: i64,
    pub qty: f64,
}

#[derive(Debug, Deserialize)]
pub struct SaveHoldCartRequest {
    pub session_id: i64,
    pub notes: Option<String>,
    pub items: Vec<HoldCartItemRequest>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct HoldCartItemDto {
    pub item_id: i64,
    pub qty: f64,
}