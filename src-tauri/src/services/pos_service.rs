use std::collections::HashMap;

use sqlx::SqlitePool;

use crate::services::promotion_service::PromotionState;
use crate::models::pos::{
    CreateTransactionRequest, PosItemDto, PosReceiptDto, 
    PosReceiptItemDto, Shift, Station, PosSession, HoldCartItemDto,
    SaveHoldCartRequest, CloseShiftRequest, CloseShiftResponse
};
use crate::models::promotion::{CartItemRequest, CartPayload};
use crate::repository::pos_repository::PosRepository;
use crate::utils::app_error::AppError;

#[derive(Clone)]
pub struct PosService {
    repository: PosRepository,
}

#[derive(Clone)]
struct PreparedCartLine {
    item_id: i64,
    item_name: String,
    item_sku: String,
    qty: f64,
    unit_price: f64,
    line_total: f64,
    new_stock_qty: f64,
    tax_type: String,
    tax_rate: f64,
}

struct ConsolidatedCart {
    paid_amount: f64,
    notes: Option<String>,
    items: HashMap<i64, f64>,
}

impl PosService {
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            repository: PosRepository::new(pool),
        }
    }

    pub async fn list_sellable_items(&self) -> Result<Vec<PosItemDto>, AppError> {
        let items = self.repository.list_sellable_items().await?;

        Ok(items
            .into_iter()
            .map(|item| PosItemDto {
                id: item.id,
                sku: item.sku,
                barcode: item.barcode,
                name: item.name,
                unit: item.unit,
                selling_price: item.selling_price,
                tax_type: item.tax_type,
                tax_rate: item.tax_rate,
                stock_qty: item.stock_qty,
            })
            .collect())
    }

    pub async fn create_transaction(
        &self,
        payload: CreateTransactionRequest,
        promo_state: &PromotionState,
    ) -> Result<PosReceiptDto, AppError> {
        if payload.cashier_id <= 0 {
            return Err(AppError::Validation("Kasir tidak valid".to_string()));
        }

        let cashier = self
            .repository
            .find_cashier_by_id(payload.cashier_id)
            .await?
            .ok_or_else(|| AppError::Validation("Data kasir tidak ditemukan".to_string()))?;

        if payload.items.is_empty() {
            return Err(AppError::Validation("Cart masih kosong".to_string()));
        }

        let payment_method = payload.payment_method.trim().to_uppercase();
        if payment_method.is_empty() {
            return Err(AppError::Validation("Metode pembayaran wajib diisi".to_string()));
        }
        let session_id = payload.session_id;
        let shift_id = payload.shift_id;
        let station_id = payload.station_id;

        let consolidated_cart = self.consolidate_cart(payload)?;
        let mut prepared_lines = self.prepare_cart_lines(&consolidated_cart).await?;
        
        let cart_payload = CartPayload {
            items: prepared_lines
                .iter()
                .map(|line| CartItemRequest {
                    item_id: line.item_id,
                    qty: line.qty,
                    original_price: line.unit_price,
                })
                .collect(),
        };

        let calculated_cart = promo_state
            .calculate_cart(cart_payload)
            .await
            .map_err(|e| AppError::Validation(format!("Gagal menghitung promo: {}", e)))?;

        let grand_total = calculated_cart.grand_total;
        let subtotal = calculated_cart.subtotal;

        if subtotal <= 0.0 && grand_total <= 0.0 {
            return Err(AppError::Validation("Total transaksi tidak valid".to_string()));
        }

        let paid_amount = consolidated_cart.paid_amount;
        
        if paid_amount < grand_total {
            return Err(AppError::Validation("Uang bayar kurang dari total belanja".to_string()));
        }

        let change_amount = paid_amount - grand_total;
        let transaction_no = self.generate_transaction_no();
        let receipt_no = format!("RCPT-{}", &transaction_no[4..]);

        let mut extracted_tax_total = 0.0;
        for line in &mut prepared_lines {
            if let Some(calc_item) = calculated_cart.items.iter().find(|i| i.item_id == line.item_id) {
                line.line_total = calc_item.final_price; 
            }

            if line.tax_type == "INCLUDE" && line.tax_rate > 0.0 {
                let tax_fraction = line.tax_rate / (100.0 + line.tax_rate);
                extracted_tax_total += line.line_total * tax_fraction;
            }
        }

        let mut tx = self.repository.begin_transaction().await?;
        let transaction = self
            .repository
            .create_transaction_header(
                &mut tx,
                &transaction_no,
                cashier.id,
                session_id,
                shift_id,
                station_id,
                subtotal, 
                extracted_tax_total,
                grand_total, 
                paid_amount,
                change_amount,
                consolidated_cart.notes.as_deref(),
            )
            .await?;

        for line in &prepared_lines {
            self.repository
                .create_transaction_item(
                    &mut tx,
                    transaction.id,
                    line.item_id,
                    &line.item_name,
                    &line.item_sku,
                    line.qty,
                    line.unit_price,
                    line.line_total, 
                )
                .await?;

            self.repository
                .update_item_stock_after_sale(&mut tx, line.item_id, line.new_stock_qty)
                .await?;

            self.repository
                .create_sale_stock_movement(&mut tx, line.item_id, line.qty, transaction.id)
                .await?;
        }

        self.repository
            .create_payment(&mut tx, transaction.id, &payment_method, paid_amount)
            .await?;

        let receipt = self
            .repository
            .create_receipt(&mut tx, transaction.id, &receipt_no)
            .await?;

        tx.commit().await?;

        Ok(PosReceiptDto {
            transaction_id: transaction.id,
            transaction_no: transaction.transaction_no,
            receipt_no: receipt.receipt_no,
            cashier_id: cashier.id,
            cashier_name: cashier.full_name,
            payment_method,
            subtotal: transaction.subtotal,
            tax_total: transaction.tax_total,
            grand_total: transaction.grand_total,
            paid_amount: transaction.paid_amount,
            change_amount: transaction.change_amount,
            created_at: transaction.created_at,
            items: prepared_lines
                .into_iter()
                .map(|line| PosReceiptItemDto {
                    item_id: line.item_id,
                    item_name: line.item_name,
                    item_sku: line.item_sku,
                    qty: line.qty,
                    unit_price: line.unit_price,
                    line_total: line.line_total,
                })
                .collect(),
        })
    }

    async fn prepare_cart_lines(
        &self,
        consolidated_cart: &ConsolidatedCart,
    ) -> Result<Vec<PreparedCartLine>, AppError> {
        let mut lines = Vec::new();

        for (item_id, qty) in &consolidated_cart.items {
            let item = self
                .repository
                .find_sellable_item_by_id(*item_id)
                .await?
                .ok_or_else(|| AppError::Validation(format!("Item dengan ID {item_id} tidak ditemukan")))?;

            if *qty <= 0.0 {
                return Err(AppError::Validation("Qty item harus lebih dari 0".to_string()));
            }

            if item.stock_qty < *qty {
                return Err(AppError::Validation(format!(
                    "Stok item {} tidak cukup. Tersedia {}, diminta {}",
                    item.name, item.stock_qty, qty
                )));
            }

            let line_total = item.selling_price * qty;

            lines.push(PreparedCartLine {
                item_id: item.id,
                item_name: item.name,
                item_sku: item.sku,
                qty: *qty,
                unit_price: item.selling_price,
                line_total,
                new_stock_qty: item.stock_qty - qty,
                tax_type: item.tax_type,
                tax_rate: item.tax_rate,
            });
        }
        Ok(lines)
    }

    fn consolidate_cart(
        &self,
        payload: CreateTransactionRequest,
    ) -> Result<ConsolidatedCart, AppError> {
        let mut items: HashMap<i64, f64> = HashMap::new();

        for line in payload.items {
            if line.item_id <= 0 {
                return Err(AppError::Validation("Item pada cart tidak valid".to_string()));
            }

            if line.qty <= 0.0 {
                return Err(AppError::Validation("Qty item harus lebih dari 0".to_string()));
            }

            let entry = items.entry(line.item_id).or_insert(0.0);
            *entry += line.qty;
        }

        Ok(ConsolidatedCart {
            paid_amount: payload.paid_amount,
            notes: payload.notes.and_then(|value| {
                let trimmed = value.trim().to_string();
                if trimmed.is_empty() {
                    None
                } else {
                    Some(trimmed)
                }
            }),
            items,
        })
    }

    fn generate_transaction_no(&self) -> String {
        let timestamp = chrono::Local::now().format("%Y%m%d%H%M%S").to_string();
        let suffix = uuid::Uuid::new_v4().simple().to_string();
        format!("TRX-{}-{}", timestamp, &suffix[..6].to_uppercase())
    }

    pub async fn get_all_shifts(&self) -> Result<Vec<Shift>, AppError> {
        self.repository.get_all_shift_schedules().await
    }

    pub async fn get_active_stations(&self) -> Result<Vec<Station>, AppError> {
        self.repository.get_active_stations().await
    }

    pub async fn open_shift_and_session(
        &self,
        cashier_id: i64,
        schedule_id: i64,
        station_id: i64,
        opening_cash: f64,
    ) -> Result<PosSession, AppError> {
        self.repository
            .open_shift_and_session(cashier_id, schedule_id, station_id, opening_cash)
            .await
    }

    pub async fn close_pos_shift(
        repo: &PosRepository,
        req: CloseShiftRequest,
    ) -> Result<CloseShiftResponse, AppError> {
        
    let (expected_cash, actual_closing_cash, cash_difference, total_receipts, total_tax) = repo
        .close_shift_and_session(
            req.shift_id,
            req.session_id,
            req.actual_closing_cash,
            req.notes.as_deref(),
        )
        .await?;

        Ok(CloseShiftResponse {
            shift_id: req.shift_id,
            session_id: req.session_id,
            expected_cash,
            actual_closing_cash,
            cash_difference,
            total_receipts,
            total_tax
        })
    }

    pub async fn save_hold_cart(&self, payload: crate::models::pos::SaveHoldCartRequest) -> Result<(), AppError> {
        if payload.session_id <= 0 {
            return Err(AppError::Validation("Session tidak valid".to_string()));
        }
        if payload.items.is_empty() {
            return Err(AppError::Validation("Cart masih kosong, tidak bisa di-hold".to_string()));
        }

        let items_to_save: Vec<(i64, f64)> = payload.items.into_iter()
            .map(|i| (i.item_id, i.qty))
            .collect();

        self.repository.save_hold_cart(payload.session_id, payload.notes.as_deref(), &items_to_save).await
    }

    pub async fn get_hold_cart(&self, session_id: i64) -> Result<Vec<crate::models::pos::HoldCartItemDto>, AppError> {
        self.repository.get_hold_cart_items(session_id).await
    }

    pub async fn delete_hold_cart(&self, session_id: i64) -> Result<(), AppError> {
        self.repository.delete_hold_cart(session_id).await
    }

    
}
