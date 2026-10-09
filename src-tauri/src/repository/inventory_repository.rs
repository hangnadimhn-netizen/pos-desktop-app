use sqlx::SqlitePool;

use crate::models::inventory::{
    Category, CreateCategoryRequest, CreateItemRequest, Item, ItemListRow,
    StockMovementListRow, UpdateCategoryRequest, UpdateItemRequest,
};
use crate::utils::app_error::AppError;

#[derive(Clone)]
pub struct InventoryRepository {
    pool: SqlitePool,
}

impl InventoryRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn list_categories(&self) -> Result<Vec<Category>, AppError> {
        let categories = sqlx::query_as::<_, Category>(
            r#"
            SELECT id, name, description, created_at, updated_at
            FROM categories
            ORDER BY name ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(categories)
    }

    pub async fn create_category(
        &self,
        payload: CreateCategoryRequest,
    ) -> Result<Category, AppError> {
        let result = sqlx::query(
            r#"
            INSERT INTO categories (name, description)
            VALUES (?, ?)
            "#,
        )
        .bind(payload.name)
        .bind(payload.description)
        .execute(&self.pool)
        .await?;

        let category_id = result.last_insert_rowid();

        let category = sqlx::query_as::<_, Category>(
            r#"
            SELECT id, name, description, created_at, updated_at
            FROM categories
            WHERE id = ?
            LIMIT 1
            "#,
        )
        .bind(category_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(category)
    }

    pub async fn update_category(&self, payload: UpdateCategoryRequest) -> Result<Category, AppError> {
        sqlx::query(
            r#"
            UPDATE categories
            SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#,
        )
        .bind(&payload.name)
        .bind(&payload.description)
        .bind(payload.id)
        .execute(&self.pool)
        .await?;

        self.find_category_by_id(payload.id)
            .await?
            .ok_or_else(|| AppError::Validation("Kategori tidak ditemukan".to_string()))
    }

    pub async fn count_items_by_category(&self, category_id: i64) -> Result<i64, AppError> {
        let result: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM items WHERE category_id = ?"
        )
        .bind(category_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(result.0)
    }

    pub async fn delete_category(&self, category_id: i64) -> Result<(), AppError> {
        sqlx::query("DELETE FROM categories WHERE id = ?")
            .bind(category_id)
            .execute(&self.pool)
            .await?;
            
        Ok(())
    }

    pub async fn find_category_by_id(&self, category_id: i64) -> Result<Option<Category>, AppError> {
        let category = sqlx::query_as::<_, Category>(
            r#"
            SELECT id, name, description, created_at, updated_at
            FROM categories
            WHERE id = ?
            LIMIT 1
            "#,
        )
        .bind(category_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(category)
    }

    pub async fn find_category_by_name(&self, category_name: &str) -> Result<Option<Category>, AppError> {
        let category = sqlx::query_as::<_, Category>(
            r#"
            SELECT id, name, description, created_at, updated_at
            FROM categories
            WHERE name COLLATE NOCASE = ?
            LIMIT 1
            "#,
        )
        .bind(category_name)
        .fetch_optional(&self.pool)
        .await?;

        Ok(category)
    }

    pub async fn list_items(&self) -> Result<Vec<ItemListRow>, AppError> {
        let items = sqlx::query_as::<_, ItemListRow>(
            r#"
            SELECT
              i.id,
              i.category_id,
              c.name AS category_name,
              i.sku,
              i.barcode,
              i.name,
              i.unit,
              CAST(i.cost_price AS REAL) AS cost_price,
              CAST(i.selling_price AS REAL) AS selling_price,
              i.tax_type,
              CAST(i.tax_rate AS REAL) AS tax_rate,
              CAST(i.stock_qty AS REAL) AS stock_qty,
              CAST(i.min_stock_qty AS REAL) AS min_stock_qty,
              i.is_active,
              i.created_at,
              i.updated_at
            FROM items i
            LEFT JOIN categories c ON c.id = i.category_id
            ORDER BY i.is_active DESC, i.created_at DESC, i.id DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(items)
    }

    pub async fn create_item(&self, payload: CreateItemRequest) -> Result<Item, AppError> {
        let result = sqlx::query(
            r#"
            INSERT INTO items (
              category_id,
              sku,
              barcode,
              name,
              unit,
              cost_price,
              selling_price,
              stock_qty,
              min_stock_qty
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(payload.category_id)
        .bind(payload.sku)
        .bind(payload.barcode)
        .bind(payload.name)
        .bind(payload.unit.unwrap_or_else(|| "PCS".to_string()))
        .bind(payload.cost_price)
        .bind(payload.selling_price)
        .bind(payload.stock_qty)
        .bind(payload.min_stock_qty)
        .execute(&self.pool)
        .await?;

        let item_id = result.last_insert_rowid();

        let item = sqlx::query_as::<_, Item>(
            r#"
            SELECT
              id,
              category_id,
              sku,
              barcode,
              name,
              unit,
              CAST(cost_price AS REAL) AS cost_price,
              CAST(selling_price AS REAL) AS selling_price,
              tax_type,
              CAST(tax_rate AS REAL) AS tax_rate,
              CAST(stock_qty AS REAL) AS stock_qty,
              CAST(min_stock_qty AS REAL) AS min_stock_qty,
              is_active,
              created_at,
              updated_at
            FROM items
            WHERE id = ?
            LIMIT 1
            "#,
        )
        .bind(item_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(item)
    }

    pub async fn find_item_by_sku(&self, sku: &str) -> Result<Option<Item>, AppError> {
        let item = sqlx::query_as::<_, Item>(
            r#"
            SELECT
              id,
              category_id,
              sku,
              barcode,
              name,
              unit,
              CAST(cost_price AS REAL) AS cost_price,
              CAST(selling_price AS REAL) AS selling_price,
              tax_type,
              CAST(tax_rate AS REAL) AS tax_rate,
              CAST(stock_qty AS REAL) AS stock_qty,
              CAST(min_stock_qty AS REAL) AS min_stock_qty,
              is_active,
              created_at,
              updated_at
            FROM items
            WHERE sku = ?
            LIMIT 1
            "#,
        )
        .bind(sku)
        .fetch_optional(&self.pool)
        .await?;

        Ok(item)
    }

    pub async fn find_item_by_barcode(&self, barcode: &str) -> Result<Option<Item>, AppError> {
        let item = sqlx::query_as::<_, Item>(
            r#"
            SELECT
              id,
              category_id,
              sku,
              barcode,
              name,
              unit,
              CAST(cost_price AS REAL) AS cost_price,
              CAST(selling_price AS REAL) AS selling_price,
              tax_type,
              CAST(tax_rate AS REAL) AS tax_rate,
              CAST(stock_qty AS REAL) AS stock_qty,
              CAST(min_stock_qty AS REAL) AS min_stock_qty,
              is_active,
              created_at,
              updated_at
            FROM items
            WHERE barcode = ?
            LIMIT 1
            "#,
        )
        .bind(barcode)
        .fetch_optional(&self.pool)
        .await?;

        Ok(item)
    }

    pub async fn find_item_by_id(&self, item_id: i64) -> Result<Option<Item>, AppError> {
        let item = sqlx::query_as::<_, Item>(
            r#"
            SELECT
              id,
              category_id,
              sku,
              barcode,
              name,
              unit,
              CAST(cost_price AS REAL) AS cost_price,
              CAST(selling_price AS REAL) AS selling_price,
              tax_type,
              CAST(tax_rate AS REAL) AS tax_rate,
              CAST(stock_qty AS REAL) AS stock_qty,
              CAST(min_stock_qty AS REAL) AS min_stock_qty,
              is_active,
              created_at,
              updated_at
            FROM items
            WHERE id = ?
            LIMIT 1
            "#,
        )
        .bind(item_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(item)
    }

    pub async fn update_item(&self, payload: UpdateItemRequest) -> Result<Item, AppError> {
        sqlx::query(
            r#"
            UPDATE items
            SET
              category_id = ?,
              sku = ?,
              barcode = ?,
              name = ?,
              unit = ?,
              cost_price = ?,
              selling_price = ?,
              min_stock_qty = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#,
        )
        .bind(payload.category_id)
        .bind(payload.sku)
        .bind(payload.barcode)
        .bind(payload.name)
        .bind(payload.unit.unwrap_or_else(|| "PCS".to_string()))
        .bind(payload.cost_price)
        .bind(payload.selling_price)
        .bind(payload.min_stock_qty)
        .bind(payload.id)
        .execute(&self.pool)
        .await?;

        self.find_item_by_id(payload.id)
            .await?
            .ok_or_else(|| AppError::Validation("Item tidak ditemukan".to_string()))
    }

    pub async fn deactivate_item(&self, item_id: i64) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE items
            SET is_active = 0,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#,
        )
        .bind(item_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn bulk_update_tax(&self, item_ids: &[i64], tax_type: &str, tax_rate: f64) -> Result<(), AppError> {
        let mut tx = self.pool.begin().await?;       
        for &id in item_ids {
            sqlx::query(
                r#"
                UPDATE items
                SET tax_type = ?, tax_rate = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                "#
            )
            .bind(tax_type)
            .bind(tax_rate)
            .bind(id)
            .execute(&mut *tx)
            .await?;
        }
        
        tx.commit().await?;
        Ok(())
    }

    pub async fn create_stock_movement(
        &self,
        item_id: i64,
        movement_type: &str,
        qty: f64,
        notes: Option<&str>,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            INSERT INTO stock_movements (
              item_id,
              movement_type,
              qty,
              reference_type,
              notes
            )
            VALUES (?, ?, ?, ?, ?)
            "#,
        )
        .bind(item_id)
        .bind(movement_type)
        .bind(qty)
        .bind("MANUAL")
        .bind(notes)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn update_item_stock(&self, item_id: i64, new_stock_qty: f64) -> Result<(), AppError> {
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
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn list_stock_movements(
        &self,
        item_id: Option<i64>,
    ) -> Result<Vec<StockMovementListRow>, AppError> {
        let movements = if let Some(item_id) = item_id {
            sqlx::query_as::<_, StockMovementListRow>(
                r#"
                SELECT
                  sm.id,
                  sm.item_id,
                  i.name AS item_name,
                  i.sku AS item_sku,
                  sm.movement_type,
                  CAST(sm.qty AS REAL) AS qty,
                  sm.notes,
                  sm.created_at
                FROM stock_movements sm
                INNER JOIN items i ON i.id = sm.item_id
                WHERE sm.item_id = ?
                ORDER BY sm.created_at DESC, sm.id DESC
                LIMIT 20
                "#,
            )
            .bind(item_id)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as::<_, StockMovementListRow>(
                r#"
                SELECT
                  sm.id,
                  sm.item_id,
                  i.name AS item_name,
                  i.sku AS item_sku,
                  sm.movement_type,
                  CAST(sm.qty AS REAL) AS qty,
                  sm.notes,
                  sm.created_at
                FROM stock_movements sm
                INNER JOIN items i ON i.id = sm.item_id
                ORDER BY sm.created_at DESC, sm.id DESC
                LIMIT 50
                "#,
            )
            .fetch_all(&self.pool)
            .await?
        };

        Ok(movements)
    }

}