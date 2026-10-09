use tauri::State;
use crate::models::pos::{
    CreateTransactionRequest, PosItemDto, PosReceiptDto, Shift,
    Station, PosSession, OpenPosSessionRequest, SaveHoldCartRequest,
    HoldCartItemDto, CloseShiftRequest, CloseShiftResponse
};
use crate::services::pos_service::PosService;
use crate::repository::pos_repository::PosRepository;
use crate::services::promotion_service::PromotionState;
use crate::AppState;

#[tauri::command]
pub async fn list_pos_items(state: State<'_, AppState>) -> Result<Vec<PosItemDto>, String> {
    let service = PosService::new(state.db.clone());
    service
        .list_sellable_items()
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn create_transaction(
    state: State<'_, AppState>,
    promo_state: State<'_, PromotionState>,
    payload: CreateTransactionRequest,
) -> Result<PosReceiptDto, String> {
    let service = PosService::new(state.db.clone());
    service
        .create_transaction(payload, &promo_state)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn get_shifts(state: State<'_, AppState>) -> Result<Vec<Shift>, String> {
    let service = PosService::new(state.db.clone());
    service
        .get_all_shifts()
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn get_stations(state: State<'_, AppState>) -> Result<Vec<Station>, String> {
    let service = PosService::new(state.db.clone());
    service
        .get_active_stations()
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn open_pos_session(
    state: State<'_, AppState>,
    payload: OpenPosSessionRequest,
) -> Result<PosSession, String> {
    // 1. Validasi Username & Password menggunakan Auth Service Mas Imam
    // Silakan sesuaikan dengan nama method dan struct di modul auth Mas Imam.
    // Contoh implementasi:
    /*
    let auth_service = AuthService::new(state.db.clone());
    let user = auth_service
        .verify_credentials(&payload.username, &payload.password)
        .await
        .map_err(|error| error.to_string())?;
    
    let cashier_id = user.id;
    */
    
    // Sebagai placeholder agar tidak error sebelum disambung ke Auth:
    let cashier_id = 1; // TODO: Ganti dengan ID user asli dari hasil validasi Auth di atas

    // 2. Buat Sesi POS Baru
    let pos_service = PosService::new(state.db.clone());
    pos_service
        .open_shift_and_session(cashier_id, payload.schedule_id, payload.station_id, payload.opening_cash)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn close_shift_command(
    state: State<'_, AppState>,
    payload: CloseShiftRequest,
) -> Result<CloseShiftResponse, String> {
    let repo = PosRepository::new(state.db.clone());
    PosService::close_pos_shift(&repo, payload)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_hold_cart(
    state: State<'_, AppState>,
    payload: SaveHoldCartRequest,
) -> Result<(), String> {
    let service = PosService::new(state.db.clone());
    service
        .save_hold_cart(payload)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn get_hold_cart(
    state: State<'_, AppState>,
    session_id: i64,
) -> Result<Vec<HoldCartItemDto>, String> {
    let service = PosService::new(state.db.clone());
    service
        .get_hold_cart(session_id)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn delete_hold_cart(
    state: State<'_, AppState>,
    session_id: i64,
) -> Result<(), String> {
    let service = PosService::new(state.db.clone());
    service
        .delete_hold_cart(session_id)
        .await
        .map_err(|error| error.to_string())
}
