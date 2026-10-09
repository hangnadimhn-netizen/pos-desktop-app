use sqlx::{Sqlite, SqlitePool, Transaction};

use crate::models::pos::{
    CashierLookupRow, Receipt, SellableItemRow, Transaction as PosTransaction, Shift, Station, PosSession, 
};
use crate::utils::app_error::AppError;

#[derive(Clone)]
pub struct PosRepository {
    pool: SqlitePool,
}

impl PosRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn list_sellable_items(&self) -> Result<Vec<SellableItemRow>, AppError> {
        let items = sqlx::query_as::<_, SellableItemRow>(
            r#"
            SELECT
              id,
              sku,
              barcode,
              name,
              unit,
              CAST(selling_price AS REAL) AS selling_price,
              tax_type, CAST(tax_rate AS REAL) AS tax_rate,
              CAST(stock_qty AS REAL) AS stock_qty
            FROM items
            WHERE is_active = 1
            ORDER BY name ASC, id ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(items)
    }

    pub async fn find_sellable_item_by_id(
        &self,
        item_id: i64,
    ) -> Result<Option<SellableItemRow>, AppError> {
        let item = sqlx::query_as::<_, SellableItemRow>(
            r#"
            SELECT
              id,
              sku,
              barcode,
              name,
              unit,
              CAST(selling_price AS REAL) AS selling_price,
              tax_type, CAST(tax_rate AS REAL) AS tax_rate,
              CAST(stock_qty AS REAL) AS stock_qty
            FROM items
            WHERE id = ?
              AND is_active = 1
            LIMIT 1
            "#,
        )
        .bind(item_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(item)
    }

    pub async fn find_cashier_by_id(
        &self,
        cashier_id: i64,
    ) -> Result<Option<CashierLookupRow>, AppError> {
        let cashier = sqlx::query_as::<_, CashierLookupRow>(
            r#"
            SELECT id, full_name, username
            FROM users
            WHERE id = ?
              AND is_active = 1
            LIMIT 1
            "#,
        )
        .bind(cashier_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(cashier)
    }

    pub async fn begin_transaction(&self) -> Result<Transaction<'_, Sqlite>, AppError> {
        let transaction = self.pool.begin().await?;
        Ok(transaction)
    }

    pub async fn create_transaction_header(
        &self,
        tx: &mut Transaction<'_, Sqlite>,
        transaction_no: &str,
        cashier_id: i64,
        session_id: i64,
        shift_id: i64,
        station_id: i64,
        subtotal: f64,
        tax_total: f64,
        grand_total: f64,
        paid_amount: f64,
        change_amount: f64,
        notes: Option<&str>,
    ) -> Result<PosTransaction, AppError> {
        let result = sqlx::query(
            r#"
            -- PERBAIKAN: Menambahkan session_id, shift_id, station_id dan 10 tanda tanya (?)
            INSERT INTO transactions (
              transaction_no,
              cashier_id,
              session_id,
              shift_id,
              station_id,
              subtotal,
              tax_total,
              grand_total,
              paid_amount,
              change_amount,
              notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(transaction_no)
        .bind(cashier_id)
        .bind(session_id)
        .bind(shift_id)
        .bind(station_id)
        .bind(subtotal)
        .bind(tax_total)
        .bind(grand_total)
        .bind(paid_amount)
        .bind(change_amount)
        .bind(notes)
        .execute(&mut **tx)
        .await?;

        let transaction_id = result.last_insert_rowid();

        let transaction = sqlx::query_as::<_, PosTransaction>(
            r#"
            SELECT
              id,
              transaction_no,
              cashier_id,
              session_id,
              shift_id,
              station_id,
              CAST(subtotal AS REAL) AS subtotal,
              CAST(discount_total AS REAL) AS discount_total,
              CAST(tax_total AS REAL) AS tax_total,
              CAST(grand_total AS REAL) AS grand_total,
              CAST(paid_amount AS REAL) AS paid_amount,
              CAST(change_amount AS REAL) AS change_amount,
              payment_status,
              transaction_status,
              notes,
              created_at
            FROM transactions
            WHERE id = ?
            LIMIT 1
            "#,
        )
        .bind(transaction_id)
        .fetch_one(&mut **tx)
        .await?;

        Ok(transaction)
    }

    pub async fn create_transaction_item(
        &self,
        tx: &mut Transaction<'_, Sqlite>,
        transaction_id: i64,
        item_id: i64,
        item_name: &str,
        item_sku: &str,
        qty: f64,
        unit_price: f64,
        line_total: f64,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            INSERT INTO transaction_items (
              transaction_id,
              item_id,
              item_name,
              item_sku,
              qty,
              unit_price,
              line_total
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(transaction_id)
        .bind(item_id)
        .bind(item_name)
        .bind(item_sku)
        .bind(qty)
        .bind(unit_price)
        .bind(line_total)
        .execute(&mut **tx)
        .await?;

        Ok(())
    }

    pub async fn create_payment(
        &self,
        tx: &mut Transaction<'_, Sqlite>,
        transaction_id: i64,
        payment_method: &str,
        amount: f64,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            INSERT INTO payments (transaction_id, payment_method, amount)
            VALUES (?, ?, ?)
            "#,
        )
        .bind(transaction_id)
        .bind(payment_method)
        .bind(amount)
        .execute(&mut **tx)
        .await?;

        Ok(())
    }

    pub async fn create_receipt(
        &self,
        tx: &mut Transaction<'_, Sqlite>,
        transaction_id: i64,
        receipt_no: &str,
    ) -> Result<Receipt, AppError> {
        let result = sqlx::query(
            r#"
            INSERT INTO receipts (transaction_id, receipt_no)
            VALUES (?, ?)
            "#,
        )
        .bind(transaction_id)
        .bind(receipt_no)
        .execute(&mut **tx)
        .await?;

        let receipt_id = result.last_insert_rowid();

        let receipt = sqlx::query_as::<_, Receipt>(
            r#"
            SELECT id, transaction_id, receipt_no, printed_count, last_printed_at, printed_by
            FROM receipts
            WHERE id = ?
            LIMIT 1
            "#,
        )
        .bind(receipt_id)
        .fetch_one(&mut **tx)
        .await?;

        Ok(receipt)
    }

    pub async fn update_item_stock_after_sale(
        &self,
        tx: &mut Transaction<'_, Sqlite>,
        item_id: i64,
        new_stock_qty: f64,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE items
            SET stock_qty = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#,
        )
        .bind(new_stock_qty)
        .bind(item_id)
        .execute(&mut **tx)
        .await?;

        Ok(())
    }

    pub async fn create_sale_stock_movement(
        &self,
        tx: &mut Transaction<'_, Sqlite>,
        item_id: i64,
        qty: f64,
        transaction_id: i64,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            INSERT INTO stock_movements (
              item_id,
              movement_type,
              qty,
              reference_type,
              reference_id,
              notes
            )
            VALUES (?, 'SALE', ?, 'TRANSACTION', ?, ?)
            "#,
        )
        .bind(item_id)
        .bind(qty)
        .bind(transaction_id)
        .bind("Penjualan POS")
        .execute(&mut **tx)
        .await?;

        Ok(())
    }

    pub async fn get_all_shift_schedules(&self) -> Result<Vec<Shift>, AppError> {
        let shifts = sqlx::query_as::<_, Shift>(
            r#"
            SELECT id, name, start_time, end_time 
            FROM shift_schedules 
            ORDER BY id ASC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(shifts)
    }

    pub async fn get_active_stations(&self) -> Result<Vec<Station>, AppError> {
        let stations = sqlx::query_as::<_, Station>(
            r#"
            SELECT id, name, status 
            FROM stations 
            WHERE status = 'Active'
            ORDER BY name ASC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(stations)
    }

    pub async fn open_shift_and_session(
        &self,
        cashier_id: i64,
        schedule_id: i64,
        station_id: i64,
        opening_cash: f64,
    ) -> Result<PosSession, AppError> {
        let mut tx = self.pool.begin().await?;
        let shift_result = sqlx::query(
            r#"
            INSERT INTO shifts (schedule_id, cashier_id, opening_cash, status, opened_at)
            VALUES (?, ?, ?, 'OPEN', CURRENT_TIMESTAMP)
            "#
        )
        .bind(schedule_id)
        .bind(cashier_id)
        .bind(opening_cash)
        .execute(&mut *tx)
        .await?;

        let new_shift_id = shift_result.last_insert_rowid();

        let session_result = sqlx::query(
            r#"
            INSERT INTO pos_sessions (cashier_id, shift_id, station_id, status, opened_at)
            VALUES (?, ?, ?, 'Open', CURRENT_TIMESTAMP)
            "#
        )
        .bind(cashier_id)
        .bind(new_shift_id) 
        .bind(station_id)
        .execute(&mut *tx)
        .await?;

        let session_id = session_result.last_insert_rowid();

        let session = sqlx::query_as::<_, PosSession>(
            r#"
            SELECT 
                id, cashier_id, shift_id, station_id, status, 
                opened_at, closed_at 
            FROM pos_sessions 
            WHERE id = ? 
            LIMIT 1
            "#
        )
        .bind(session_id)
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok(session)
    }

    pub async fn close_shift_and_session(
        &self,
        shift_id: i64,
        session_id: i64,
        actual_closing_cash: f64,
        notes: Option<&str>,
    ) -> Result<(f64, f64, f64, i64, f64), AppError> {
        let mut tx = self.pool.begin().await?;

        let opening_cash: f64 = sqlx::query_scalar(
            "SELECT CAST(opening_cash AS REAL) FROM shifts WHERE id = ? AND status = 'OPEN'"
        )
        .bind(shift_id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(|| AppError::Validation("Shift tidak ditemukan atau sudah berstatus CLOSED".to_string()))?;

        let total_sales: f64 = sqlx::query_scalar(
            r#"
            SELECT CAST(COALESCE(SUM(grand_total), 0.0) AS REAL) 
            FROM transactions 
            WHERE shift_id = ? AND transaction_status = 'COMPLETED'
            "#
        )
        .bind(shift_id)
        .fetch_one(&mut *tx)
        .await?;

        let total_receipts: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(id)
            FROM transactions
            WHERE shift_id = ? AND transaction_status = 'COMPLETED'
            "#
        )
        .bind(shift_id)
        .fetch_one(&mut *tx)
        .await?;

        let total_tax: f64 = sqlx::query_scalar(
            r#"
            SELECT CAST(COALESCE(SUM(tax_total), 0.0) AS REAL) 
            FROM transactions 
            WHERE shift_id = ? AND transaction_status = 'COMPLETED'
            "#
        )
        .bind(shift_id)
        .fetch_one(&mut *tx)
        .await?;

        let expected_cash = opening_cash + total_sales;
        let cash_difference = actual_closing_cash - expected_cash;
        sqlx::query(
            r#"
            UPDATE shifts 
            SET closing_cash = ?, 
                expected_cash = ?, 
                cash_difference = ?, 
                status = 'CLOSED', 
                closed_at = CURRENT_TIMESTAMP, 
                notes = ?
            WHERE id = ?
            "#
        )
        .bind(actual_closing_cash)
        .bind(expected_cash)
        .bind(cash_difference)
        .bind(notes)
        .bind(shift_id)
        .execute(&mut *tx)
        .await?;

        sqlx::query(
            r#"
            UPDATE pos_sessions 
            SET status = 'Closed', 
                closed_at = CURRENT_TIMESTAMP 
            WHERE id = ? AND shift_id = ?
            "#
        )
        .bind(session_id)
        .bind(shift_id)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok((expected_cash, actual_closing_cash, cash_difference, total_receipts, total_tax))
    }       

    pub async fn delete_hold_cart(&self, session_id: i64) -> Result<(), AppError> {
        let mut tx = self.pool.begin().await?;
        
        sqlx::query("DELETE FROM hold_cart_items WHERE session_id = ?")
            .bind(session_id)
            .execute(&mut *tx)
            .await?;
            
        sqlx::query("DELETE FROM hold_carts WHERE session_id = ?")
            .bind(session_id)
            .execute(&mut *tx)
            .await?;
            
        tx.commit().await?;
        Ok(())
    }

    pub async fn save_hold_cart(
        &self, 
        session_id: i64, 
        notes: Option<&str>, 
        items: &[(i64, f64)]
    ) -> Result<(), AppError> {
        let mut tx = self.pool.begin().await?;

        sqlx::query("DELETE FROM hold_cart_items WHERE session_id = ?").bind(session_id).execute(&mut *tx).await?;
        sqlx::query("DELETE FROM hold_carts WHERE session_id = ?").bind(session_id).execute(&mut *tx).await?;

        sqlx::query("INSERT INTO hold_carts (session_id, notes) VALUES (?, ?)")
            .bind(session_id)
            .bind(notes)
            .execute(&mut *tx)
            .await?;

        for (item_id, qty) in items {
            sqlx::query("INSERT INTO hold_cart_items (session_id, item_id, qty) VALUES (?, ?, ?)")
                .bind(session_id)
                .bind(item_id)
                .bind(qty)
                .execute(&mut *tx)
                .await?;
        }

        tx.commit().await?;
        Ok(())
    }

    pub async fn get_hold_cart_items(&self, session_id: i64) -> Result<Vec<crate::models::pos::HoldCartItemDto>, AppError> {
        let items = sqlx::query_as::<_, crate::models::pos::HoldCartItemDto>(
            r#"
            SELECT item_id, CAST(qty AS REAL) AS qty
            FROM hold_cart_items
            WHERE session_id = ?
            "#
        )
        .bind(session_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(items)
    }

}


