use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Role {
    pub id: i64,
    pub code: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: i64,
    pub role_id: i64,
    pub full_name: String,
    pub username: String,
    pub password_hash: String,
    pub is_active: i64,
    pub last_login_at: Option<String>,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserSession {
    pub id: i64,
    pub user_id: i64,
    pub session_token: String,
    pub login_at: String,
    pub logout_at: Option<String>,
    pub is_active: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserWithRole {
    pub id: i64,
    pub role_id: i64,
    pub full_name: String,
    pub username: String,
    pub password_hash: String,
    pub is_active: i64,
    pub role_code: String,
    pub role_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ActiveSessionWithUser {
    pub session_token: String,
    pub login_at: String,
    pub user_id: i64,
    pub full_name: String,
    pub username: String,
    pub role_code: String,
    pub role_name: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct SessionRequest {
    pub session_token: String,
}

#[derive(Debug, Serialize)]
pub struct SessionUserDto {
    pub user_id: i64,
    pub full_name: String,
    pub username: String,
    pub role_code: String,
    pub role_name: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub session_token: String,
    pub login_at: String,
    pub user: SessionUserDto,
}

#[derive(Debug, Serialize)]
pub struct CurrentSessionResponse {
    pub session_token: String,
    pub login_at: String,
    pub user: SessionUserDto,
}

#[derive(Debug, Serialize)]
pub struct ActionResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Serialize, FromRow)]
pub struct UserListItem {
    pub id: i64,
    pub full_name: String,
    pub username: String,
    pub role_code: String,
    pub role_name: String,
    pub is_active: i64,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub session_token: String,
    pub full_name: String,
    pub username: String,
    pub password: String,
    pub role_code: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub session_token: String,
    pub id: i64,
    pub full_name: String,
    pub username: String,
    pub role_code: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePasswordRequest {
    pub session_token: String,
    pub id: i64,
    pub new_password: String,
}

#[derive(Debug, Deserialize)]
pub struct DeleteUserRequest {
    pub session_token: String,
    pub id: i64,
}
