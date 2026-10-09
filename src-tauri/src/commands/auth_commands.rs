use tauri::State;

use crate::models::auth::{
    ActionResponse, CurrentSessionResponse, LoginRequest, LoginResponse, SessionRequest,
    DeleteUserRequest, RegisterRequest, UpdatePasswordRequest, UpdateUserRequest, UserListItem,
};
use crate::services::auth_service::AuthService;
use crate::AppState;

#[tauri::command]
pub async fn login(
    state: State<'_, AppState>,
    payload: LoginRequest,
) -> Result<LoginResponse, String> {
    let service = AuthService::new(state.db.clone());
    service.login(payload).await.map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn logout(
    state: State<'_, AppState>,
    session_token: String,
) -> Result<ActionResponse, String> {
    let service = AuthService::new(state.db.clone());
    service
        .logout(SessionRequest { session_token })
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn get_current_session(
    state: State<'_, AppState>,
    session_token: String,
) -> Result<CurrentSessionResponse, String> {
    let service = AuthService::new(state.db.clone());
    service
        .get_current_session(SessionRequest { session_token })
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn get_all_users(
    state: State<'_, AppState>,
    session_token: String,
) -> Result<Vec<UserListItem>, String> {
    let service = AuthService::new(state.db.clone());
    service.get_all_users(&session_token).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn register_user(
    state: State<'_, AppState>,
    payload: RegisterRequest,
) -> Result<ActionResponse, String> {
    let service = AuthService::new(state.db.clone());
    service.register_new_user(payload).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_user(
    state: State<'_, AppState>,
    payload: UpdateUserRequest,
) -> Result<ActionResponse, String> {
    let service = AuthService::new(state.db.clone());
    service.update_user(payload).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_user_password(
    state: State<'_, AppState>,
    payload: UpdatePasswordRequest,
) -> Result<ActionResponse, String> {
    let service = AuthService::new(state.db.clone());
    service.update_password(payload).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_user(
    state: State<'_, AppState>,
    payload: DeleteUserRequest,
) -> Result<ActionResponse, String> {
    let service = AuthService::new(state.db.clone());
    service.delete_user(payload).await.map_err(|e| e.to_string())
}