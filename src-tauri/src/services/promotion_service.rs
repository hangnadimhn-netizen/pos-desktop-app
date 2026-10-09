use std::collections::{HashMap, HashSet};
use tokio::sync::RwLock;
use sqlx::{Pool, Sqlite};
use thiserror::Error;

use crate::repository::promotion_repo;
use crate::models::promotion::{
    AppliedPromo, CartItemRequest, CartItemResponse, CartPayload, CartResponse, PromoType,
    Promotion,
};

const TAX_RATE: f64 = 0.11;

#[derive(Debug, Error)]
pub enum PromotionError {
    #[error("Item pada keranjang tidak valid: {0}")]
    InvalidItem(String),
    #[error("Gagal memuat data promosi dari database: {0}")]
    Repository(#[from] promotion_repo::PromoError),
}

#[derive(Debug, Default, Clone)]
struct PromotionCache {
    active_promotions: Vec<Promotion>,
    item_promo_map: HashMap<i64, Vec<i64>>,
    item_specific_promos: HashSet<i64>,
}

pub struct PromotionState {
    cache: RwLock<PromotionCache>,
}

impl Default for PromotionState {
    fn default() -> Self {
        Self::new()
    }
}

impl PromotionState {
    pub fn new() -> Self {
        Self {
            cache: RwLock::new(PromotionCache::default()),
        }
    }

    /// Memuat ulang seluruh data promo dari database ke cache in-memory.
    /// Signature tidak diubah (tetap `Result<(), String>`) karena dipanggil
    /// langsung dari `main.rs`.
    pub async fn refresh_promotion_state(&self, pool: &Pool<Sqlite>) -> Result<(), String> {
        let promos = promotion_repo::get_active_promotions(pool)
            .await
            .map_err(|e| e.to_string())?;

        let promo_items = promotion_repo::get_promotion_items(pool)
            .await
            .map_err(|e| e.to_string())?;

        let mut item_promo_map: HashMap<i64, Vec<i64>> = HashMap::new();
        let mut item_specific_promos: HashSet<i64> = HashSet::new();

        for pi in promo_items {
            item_promo_map.entry(pi.item_id).or_default().push(pi.promo_id);
            item_specific_promos.insert(pi.promo_id);
        }

        let new_cache = PromotionCache {
            active_promotions: promos,
            item_promo_map,
            item_specific_promos,
        };

        // Satu write-lock untuk menukar seluruh snapshot -> atomik dari
        // sudut pandang pembaca, tidak ada state antara yang terekspos.
        *self.cache.write().await = new_cache;

        Ok(())
    }

    /// Menghitung total keranjang beserta seluruh diskon yang berlaku.
    ///
    /// Logika bisnis promo sengaja dipindahkan ke layer service ini (dari
    /// sebelumnya berada di Tauri command) agar:
    /// - command layer tetap tipis dan hanya berperan sebagai orkestrator,
    /// - logika ini bisa di-unit-test tanpa perlu Tauri runtime,
    /// - konsisten dengan arsitektur Command -> Service -> Repository yang
    ///   sudah ada di proyek.
    pub async fn calculate_cart(
        &self,
        payload: CartPayload,
    ) -> Result<CartResponse, PromotionError> {
        validate_cart_payload(&payload)?;

        let cache = self.cache.read().await;

        // Promo THRESHOLD ditangani belakangan (level transaksi), jadi
        // dikeluarkan dari daftar yang dicek per-item. Ini juga sekaligus
        // menghindari filter promo yang jelas tidak relevan berulang kali
        // di dalam loop per-item.
        let item_level_promos: Vec<&Promotion> = cache
            .active_promotions
            .iter()
            .filter(|p| p.kind() != PromoType::Threshold)
            .collect();

        let mut response_items = Vec::with_capacity(payload.items.len());
        let mut subtotal = 0.0_f64;
        let mut global_total_discount = 0.0_f64;

        // --- FASE 1: KALKULASI LEVEL ITEM (PERCENTAGE, FLAT, BOGO) ---
        for item in &payload.items {
            let (item_response, line_final_price, item_discount) = calculate_item(
                item,
                &item_level_promos,
                &cache.item_promo_map,
                &cache.item_specific_promos,
            );

            subtotal += line_final_price;
            global_total_discount += item_discount;
            response_items.push(item_response);
        }

        // --- FASE 2: KALKULASI LEVEL TRANSAKSI (THRESHOLD) ---
        let (transaction_discounts, tax_base_amount, threshold_discount_total) =
            apply_threshold_discounts(&cache.active_promotions, subtotal);
        global_total_discount += threshold_discount_total;

        // --- FASE 3: KALKULASI PAJAK (DPP) ---
        let tax_amount = 0.0;
        let grand_total = round2(tax_base_amount);

        Ok(CartResponse {
            items: response_items,
            subtotal: round2(subtotal),
            transaction_discounts,
            total_discount: round2(global_total_discount),
            tax_base_amount: round2(tax_base_amount),
            tax_amount,
            grand_total,
        })
    }
}

fn validate_cart_payload(payload: &CartPayload) -> Result<(), PromotionError> {
    if payload.items.is_empty() {
        return Err(PromotionError::InvalidItem("keranjang kosong".to_string()));
    }

    for item in &payload.items {
        if item.qty <= 0.0 {
            return Err(PromotionError::InvalidItem(format!(
                "item_id {} memiliki qty tidak valid ({})",
                item.item_id, item.qty
            )));
        }
        if item.original_price < 0.0 {
            return Err(PromotionError::InvalidItem(format!(
                "item_id {} memiliki original_price negatif ({})",
                item.item_id, item.original_price
            )));
        }
    }

    Ok(())
}

fn applicable_promos_for_item<'a>(
    item_id: i64,
    all_promos: &'a [&'a Promotion],
    item_promo_map: &HashMap<i64, Vec<i64>>,
    item_specific_promos: &HashSet<i64>,
) -> Vec<&'a Promotion> {
    all_promos
        .iter()
        .filter(|promo| {
            let is_global = !item_specific_promos.contains(&promo.id);
            let is_specific_to_item = item_promo_map
                .get(&item_id)
                .map_or(false, |ids| ids.contains(&promo.id));
            is_global || is_specific_to_item
        })
        .copied()
        .collect()
}

fn calculate_item(
    item: &CartItemRequest,
    item_level_promos: &[&Promotion],
    item_promo_map: &HashMap<i64, Vec<i64>>,
    item_specific_promos: &HashSet<i64>,
) -> (CartItemResponse, f64, f64) {
    let applicable = applicable_promos_for_item(
        item.item_id,
        item_level_promos,
        item_promo_map,
        item_specific_promos,
    );

    let line_total = item.original_price * item.qty;
    let mut current_price = item.original_price;
    let mut item_discount = 0.0_f64;
    let mut applied_promos = Vec::new();

    for promo in applicable {
        let raw_discount = match promo.kind() {
            PromoType::Percentage => current_price * (promo.discount_value / 100.0) * item.qty,
            PromoType::Flat => (promo.discount_value * item.qty).min(current_price * item.qty),
            PromoType::Bogo => {
                compute_bogo_discount(current_price, item.qty, promo.min_qty, promo.reward_qty)
            }
            // THRESHOLD ditangani di fase transaksi, bukan di sini.
            PromoType::Threshold | PromoType::Unknown => 0.0,
        };

        let remaining_room = (line_total - item_discount).max(0.0);
        let discount_amount = raw_discount.max(0.0).min(remaining_room);

        if discount_amount > 0.0 {
            applied_promos.push(AppliedPromo {
                promo_id: promo.id,
                promo_name: promo.name.clone(),
                amount: round2(discount_amount),
            });
            item_discount += discount_amount;
            current_price = ((line_total - item_discount) / item.qty).max(0.0);
        }
    }

    let line_final_price = (line_total - item_discount).max(0.0);

    let response = CartItemResponse {
        item_id: item.item_id,
        qty: item.qty,
        original_price: item.original_price,
        applied_promos,
        item_total_discount: round2(item_discount),
        final_price: round2(line_final_price),
    };

    (response, line_final_price, item_discount)
}

fn compute_bogo_discount(
    current_price: f64,
    qty: f64,
    min_qty: f64,
    reward_qty: f64,
) -> f64 {
    if min_qty <= 0.0 || reward_qty <= 0.0 || qty <= 0.0 {
        return 0.0;
    }
    let group_size = min_qty + reward_qty;
    if group_size <= 0.0 || qty < group_size {
        return 0.0;
    }
    let promo_groups = (qty / group_size).floor();
    let free_units = (promo_groups * reward_qty).min(qty);
    current_price * free_units
}

fn apply_threshold_discounts(
    all_promos: &[Promotion],
    subtotal: f64,
) -> (Vec<AppliedPromo>, f64, f64) {
    let mut transaction_discounts = Vec::new();
    let mut current_subtotal = subtotal;
    let mut total_threshold_discount = 0.0_f64;

    for promo in all_promos.iter().filter(|p| p.kind() == PromoType::Threshold) {
        if subtotal >= promo.min_purchase {
            let discount = promo.discount_value.min(current_subtotal).max(0.0);
            if discount > 0.0 {
                transaction_discounts.push(AppliedPromo {
                    promo_id: promo.id,
                    promo_name: promo.name.clone(),
                    amount: round2(discount),
                });
                current_subtotal -= discount;
                total_threshold_discount += discount;
            }
        }
    }

    (transaction_discounts, current_subtotal, total_threshold_discount)
}

fn round2(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}