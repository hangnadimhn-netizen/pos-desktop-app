use tauri::State;
use crate::{
    repository::promotion_repo,
    models::promotion::{PromoPayload, PromoDetailResponse, CartPayload, CartResponse},
    services::promotion_service::PromotionState,
    AppState,
};

#[tauri::command]
pub async fn calculate_cart(
    payload: CartPayload,
    state: State<'_, PromotionState>,
) -> Result<CartResponse, String> {
    state
        .calculate_cart(payload)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_promotions(state: State<'_, AppState>) -> Result<Vec<PromoDetailResponse>, String> {
    promotion_repo::get_all_promos_admin(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_promotion(
    payload: PromoPayload,
    app_state: State<'_, AppState>,
    promo_state: State<'_, PromotionState>,
) -> Result<i64, String> {
    let id = promotion_repo::create_promo(&app_state.db, payload)
        .await
        .map_err(|e| e.to_string())?;
    let _ = promo_state.refresh_promotion_state(&app_state.db).await;

    Ok(id)
}

#[tauri::command]
pub async fn update_promotion(
    id: i64,
    payload: PromoPayload,
    app_state: State<'_, AppState>,
    promo_state: State<'_, PromotionState>,
) -> Result<(), String> {
    promotion_repo::update_promo(&app_state.db, id, payload)
        .await
        .map_err(|e| e.to_string())?;
    let _ = promo_state.refresh_promotion_state(&app_state.db).await;
    Ok(())
}

#[tauri::command]
pub async fn delete_promotion(
    id: i64,
    app_state: State<'_, AppState>,
    promo_state: State<'_, PromotionState>,
) -> Result<(), String> {
    promotion_repo::delete_promo(&app_state.db, id)
        .await
        .map_err(|e| e.to_string())?;
    let _ = promo_state.refresh_promotion_state(&app_state.db).await;

    Ok(())
}