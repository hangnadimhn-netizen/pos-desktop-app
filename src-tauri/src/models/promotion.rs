use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::fmt;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Promotion {
    pub id: i64,
    pub name: String,
    pub promo_type: String,
    pub priority: i64,
    pub discount_value: f64,
    pub min_qty: f64,
    pub reward_qty: f64,
    pub min_purchase: f64,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub is_active: i64,
}

impl Promotion {
    pub fn kind(&self) -> PromoType {
        PromoType::from(self.promo_type.as_str())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PromoType {
    Percentage,
    Flat,
    Bogo,
    Threshold,
    Unknown,
}

impl From<&str> for PromoType {
    fn from(value: &str) -> Self {
        match value {
            "PERCENTAGE" => PromoType::Percentage,
            "FLAT" => PromoType::Flat,
            "BOGO" => PromoType::Bogo,
            "THRESHOLD" => PromoType::Threshold,
            _ => PromoType::Unknown,
        }
    }
}

impl fmt::Display for PromoType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            PromoType::Percentage => "PERCENTAGE",
            PromoType::Flat => "FLAT",
            PromoType::Bogo => "BOGO",
            PromoType::Threshold => "THRESHOLD",
            PromoType::Unknown => "UNKNOWN",
        };
        write!(f, "{s}")
    }
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct PromotionItem {
    pub id: i64,
    pub promo_id: i64,
    pub item_id: i64,
}

#[derive(Debug, Deserialize)]
pub struct CartPayload {
    pub items: Vec<CartItemRequest>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct CartItemRequest {
    pub item_id: i64,
    pub qty: f64,
    pub original_price: f64,
}

#[derive(Debug, Serialize)]
pub struct CartResponse {
    pub items: Vec<CartItemResponse>,
    pub subtotal: f64,
    pub transaction_discounts: Vec<AppliedPromo>,
    pub total_discount: f64,
    pub tax_base_amount: f64, 
    pub tax_amount: f64,
    pub grand_total: f64,
}

#[derive(Debug, Serialize, Clone)]
pub struct CartItemResponse {
    pub item_id: i64,
    pub qty: f64,
    pub original_price: f64,
    pub applied_promos: Vec<AppliedPromo>,
    pub item_total_discount: f64,
    pub final_price: f64,
}

#[derive(Debug, Serialize, Clone)]
pub struct AppliedPromo {
    pub promo_id: i64,
    pub promo_name: String,
    pub amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PromoPayload {
    pub name: String,
    pub promo_type: String,
    pub priority: i64,
    pub discount_value: f64,
    pub min_qty: f64,
    pub reward_qty: f64,
    pub min_purchase: f64,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub is_active: i64,
    pub item_ids: Vec<i64>, 
}

#[derive(Debug, Serialize)]
pub struct PromoDetailResponse {
    pub id: i64,
    pub name: String,
    pub promo_type: String,
    pub priority: i64,
    pub discount_value: f64,
    pub min_qty: f64,
    pub reward_qty: f64,
    pub min_purchase: f64,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub is_active: i64,
    pub item_ids: Vec<i64>, 
}