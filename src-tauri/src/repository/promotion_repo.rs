use sqlx::{Pool, Sqlite};
use crate::models::promotion::{Promotion, PromotionItem, PromoPayload, PromoDetailResponse};
use thiserror::Error;
use sqlx::SqlitePool;

#[derive(Error, Debug)]
pub enum PromoError {
    #[error("Database error while accessing promotion data: {0}")]
    DatabaseError(#[from] sqlx::Error),
}

const PROMOTION_COLUMNS: &str = "id, name, promo_type, priority, discount_value, \
    min_qty, reward_qty, min_purchase, start_date, end_date, is_active";

pub async fn get_active_promotions(pool: &SqlitePool) -> Result<Vec<Promotion>, PromoError> {

    let active_promos = sqlx::query_as::<_, Promotion>(
        r#"
        SELECT 
            id, name, promo_type, priority, 
            CAST(discount_value AS REAL) as discount_value, 
            CAST(min_qty AS REAL) as min_qty, 
            CAST(reward_qty AS REAL) as reward_qty, 
            CAST(min_purchase AS REAL) as min_purchase, 
            start_date, end_date, is_active 
        FROM promotions 
        WHERE is_active = 1 
        AND (start_date IS NULL OR start_date <= datetime('now', 'localtime'))
        AND (end_date IS NULL OR end_date >= datetime('now', 'localtime'))
        ORDER BY priority ASC
        "#
    )
    .fetch_all(pool)
    .await?;

    Ok(active_promos)
}

pub async fn get_promotion_items(pool: &Pool<Sqlite>) -> Result<Vec<PromotionItem>, PromoError> {
    let promo_items = sqlx::query_as::<_, PromotionItem>(
        "SELECT id, promo_id, item_id FROM promotion_items",
    )
    .fetch_all(pool)
    .await?;

    Ok(promo_items)
}

pub async fn save_transaction_item_discount(
    pool: &Pool<Sqlite>,
    transaction_item_id: i64,
    promo_id: i64,
    discount_amount: f64,
) -> Result<(), PromoError> {
    sqlx::query(
        "INSERT INTO transaction_item_discounts (transaction_item_id, promo_id, discount_amount) \
         VALUES (?, ?, ?)",
    )
    .bind(transaction_item_id)
    .bind(promo_id)
    .bind(discount_amount)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn save_transaction_discount(
    pool: &Pool<Sqlite>,
    transaction_id: i64,
    promo_id: i64,
    discount_amount: f64,
) -> Result<(), PromoError> {
    sqlx::query(
        "INSERT INTO transaction_discounts (transaction_id, promo_id, discount_amount) \
         VALUES (?, ?, ?)",
    )
    .bind(transaction_id)
    .bind(promo_id)
    .bind(discount_amount)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn create_promo(pool: &Pool<Sqlite>, payload: PromoPayload) -> Result<i64, PromoError> {
    let mut tx = pool.begin().await?;

    let result = sqlx::query(
        r#"
        INSERT INTO promotions 
        (name, promo_type, priority, discount_value, min_qty, reward_qty, min_purchase, start_date, end_date, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&payload.name)
    .bind(&payload.promo_type)
    .bind(payload.priority)
    .bind(payload.discount_value)
    .bind(payload.min_qty)
    .bind(payload.reward_qty)
    .bind(payload.min_purchase)
    .bind(&payload.start_date)
    .bind(&payload.end_date)
    .bind(payload.is_active)
    .execute(&mut *tx)
    .await?;

    let promo_id = result.last_insert_rowid();

    // Masukkan relasi spesifik item
    for item_id in payload.item_ids {
        sqlx::query("INSERT INTO promotion_items (promo_id, item_id) VALUES (?, ?)")
            .bind(promo_id)
            .bind(item_id)
            .execute(&mut *tx)
            .await?;
    }

    tx.commit().await?;
    Ok(promo_id)
}

pub async fn get_all_promos_admin(pool: &SqlitePool) -> Result<Vec<PromoDetailResponse>, PromoError> {

    let promos = sqlx::query_as::<_, Promotion>(
        r#"
        SELECT 
            id, name, promo_type, priority, 
            CAST(discount_value AS REAL) as discount_value, 
            CAST(min_qty AS REAL) as min_qty, 
            CAST(reward_qty AS REAL) as reward_qty, 
            CAST(min_purchase AS REAL) as min_purchase, 
            start_date, end_date, is_active 
        FROM promotions 
        ORDER BY priority ASC
        "#
    )
    .fetch_all(pool)
    .await?;

    let mut response = Vec::new();
    for promo in promos {
        // Ambil relasi item
        let items: Vec<(i64,)> = sqlx::query_as("SELECT item_id FROM promotion_items WHERE promo_id = ?")
            .bind(promo.id)
            .fetch_all(pool)
            .await?;
            
        let item_ids = items.into_iter().map(|(id,)| id).collect();

        response.push(PromoDetailResponse {
            id: promo.id,
            name: promo.name,
            promo_type: promo.promo_type,
            priority: promo.priority,
            discount_value: promo.discount_value,
            min_qty: promo.min_qty,
            reward_qty: promo.reward_qty,
            min_purchase: promo.min_purchase,
            start_date: promo.start_date,
            end_date: promo.end_date,
            is_active: promo.is_active,
            item_ids,
        });
    }

    Ok(response)
}

pub async fn update_promo(pool: &Pool<Sqlite>, id: i64, payload: PromoPayload) -> Result<(), PromoError> {
    let mut tx = pool.begin().await?;

    sqlx::query(
        r#"
        UPDATE promotions SET 
            name = ?, promo_type = ?, priority = ?, discount_value = ?, 
            min_qty = ?, reward_qty = ?, min_purchase = ?, 
            start_date = ?, end_date = ?, is_active = ?
        WHERE id = ?
        "#
    )
    .bind(&payload.name).bind(&payload.promo_type).bind(payload.priority)
    .bind(payload.discount_value).bind(payload.min_qty).bind(payload.reward_qty)
    .bind(payload.min_purchase).bind(&payload.start_date).bind(&payload.end_date)
    .bind(payload.is_active).bind(id)
    .execute(&mut *tx)
    .await?;

    // Hapus relasi lama, lalu masukkan yang baru
    sqlx::query("DELETE FROM promotion_items WHERE promo_id = ?").bind(id).execute(&mut *tx).await?;

    for item_id in payload.item_ids {
        sqlx::query("INSERT INTO promotion_items (promo_id, item_id) VALUES (?, ?)")
            .bind(id).bind(item_id)
            .execute(&mut *tx)
            .await?;
    }

    tx.commit().await?;
    Ok(())
}

pub async fn delete_promo(pool: &Pool<Sqlite>, id: i64) -> Result<(), PromoError> {
    // Relasi di promotion_items akan otomatis terhapus karena ON DELETE CASCADE di SQLite
    sqlx::query("DELETE FROM promotions WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}