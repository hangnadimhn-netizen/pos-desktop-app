use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::Argon2;
use rand_core::OsRng;
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::auth::{
    ActionResponse, CurrentSessionResponse, LoginRequest, LoginResponse, SessionRequest,
    SessionUserDto, UserListItem, RegisterRequest, UpdatePasswordRequest, UpdateUserRequest,
    DeleteUserRequest,
};
use crate::repository::auth_repository::AuthRepository;
use crate::utils::app_error::AppError;

#[derive(Clone)]
pub struct AuthService {
    repository: AuthRepository,
}

impl AuthService {
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            repository: AuthRepository::new(pool),
        }
    }

    pub async fn bootstrap(&self) -> Result<(), AppError> {
        self.repository.seed_default_roles().await?;
        self.seed_test_users().await?;
        Ok(())
    }

    pub async fn login(&self, payload: LoginRequest) -> Result<LoginResponse, AppError> {
        let username = payload.username.trim();
        let password = payload.password.trim();

        if username.is_empty() || password.is_empty() {
            return Err(AppError::Auth("Username dan password wajib diisi".to_string()));
        }

        let user = self
            .repository
            .find_user_with_role_by_username(username)
            .await?
            .ok_or_else(|| AppError::Auth("Username atau password tidak valid".to_string()))?;

        if user.is_active != 1 {
            return Err(AppError::Auth("Akun pengguna tidak aktif".to_string()));
        }

        verify_password(password, &user.password_hash)?;

        self.repository
            .deactivate_active_sessions_by_user(user.id)
            .await?;

        let session_token = Uuid::new_v4().to_string();
        let session = self
            .repository
            .create_session(user.id, &session_token)
            .await?;

        self.repository.update_last_login(user.id).await?;

        Ok(LoginResponse {
            session_token: session.session_token,
            login_at: session.login_at,
            user: SessionUserDto {
                user_id: user.id,
                full_name: user.full_name,
                username: user.username,
                role_code: user.role_code,
                role_name: user.role_name,
            },
        })
    }

    pub async fn get_current_session(
        &self,
        payload: SessionRequest,
    ) -> Result<CurrentSessionResponse, AppError> {
        let session_token = payload.session_token.trim();

        if session_token.is_empty() {
            return Err(AppError::Auth("Session token wajib diisi".to_string()));
        }

        let session = self
            .repository
            .find_active_session_by_token(session_token)
            .await?
            .ok_or_else(|| AppError::Auth("Session tidak ditemukan atau sudah berakhir".to_string()))?;

        Ok(CurrentSessionResponse {
            session_token: session.session_token,
            login_at: session.login_at,
            user: SessionUserDto {
                user_id: session.user_id,
                full_name: session.full_name,
                username: session.username,
                role_code: session.role_code,
                role_name: session.role_name,
            },
        })
    }

    pub async fn logout(&self, payload: SessionRequest) -> Result<ActionResponse, AppError> {
        let session_token = payload.session_token.trim();

        if session_token.is_empty() {
            return Err(AppError::Auth("Session token wajib diisi".to_string()));
        }

        let success = self.repository.deactivate_session(session_token).await?;

        if !success {
            return Err(AppError::Auth("Session tidak aktif atau tidak ditemukan".to_string()));
        }

        Ok(ActionResponse {
            success: true,
            message: "Logout berhasil".to_string(),
        })
    }

    async fn seed_test_users(&self) -> Result<(), AppError> {
        let admin_count = self.repository.count_users_by_role_code("ADMIN").await?;
        if admin_count == 0 {
            let admin_role_id = self
                .repository
                .find_role_id_by_code("ADMIN")
                .await?
                .ok_or_else(|| AppError::Config("Role ADMIN belum tersedia".to_string()))?;
            let default_password_hash = hash_password("admin123")?;
            self.repository
                .create_user(
                    admin_role_id,
                    "Administrator",
                    "admin",
                    &default_password_hash,
                )
                .await?;
        }

        Ok(())
    }
 
    async fn verify_admin_access(&self, session_token: &str) -> Result<(), AppError> {
        let session = self
            .repository
            .find_active_session_by_token(session_token)
            .await?
            .ok_or_else(|| AppError::Auth("Sesi tidak valid atau sudah kedaluwarsa".to_string()))?;

        if session.role_code != "ADMIN" {
            return Err(AppError::Auth("Akses ditolak: Hanya ADMIN yang dapat melakukan operasi ini".to_string()));
        }
        Ok(())
    }

    pub async fn get_all_users(&self, session_token: &str) -> Result<Vec<crate::models::auth::UserListItem>, AppError> {
        self.verify_admin_access(session_token).await?;
        self.repository.get_all_users().await
    }

    pub async fn register_new_user(&self, payload: RegisterRequest) -> Result<ActionResponse, AppError> {
        self.verify_admin_access(&payload.session_token).await?;

        let username = payload.username.trim();
        if self.repository.is_username_exists(username, None).await? {
            return Err(AppError::Validation("Username sudah digunakan".to_string()));
        }

        let role_id = self.repository.find_role_id_by_code(&payload.role_code).await?
            .ok_or_else(|| AppError::Validation("Role tidak ditemukan".to_string()))?;

        let password_hash = hash_password(payload.password.trim())?;

        self.repository.create_user(role_id, payload.full_name.trim(), username, &password_hash).await?;

        Ok(ActionResponse {
            success: true,
            message: "Pengguna berhasil ditambahkan".to_string(),
        })
    }

    pub async fn update_user(&self, payload: UpdateUserRequest) -> Result<ActionResponse, AppError> {
        self.verify_admin_access(&payload.session_token).await?;

        let username = payload.username.trim();
        if self.repository.is_username_exists(username, Some(payload.id)).await? {
            return Err(AppError::Validation("Username sudah digunakan oleh pengguna lain".to_string()));
        }

        let role_id = self.repository.find_role_id_by_code(&payload.role_code).await?
            .ok_or_else(|| AppError::Validation("Role tidak ditemukan".to_string()))?;

        self.repository.update_user_details(payload.id, role_id, payload.full_name.trim(), username).await?;

        Ok(ActionResponse {
            success: true,
            message: "Data pengguna berhasil diperbarui".to_string(),
        })
    }

    pub async fn update_password(&self, payload: UpdatePasswordRequest) -> Result<ActionResponse, AppError> {
        self.verify_admin_access(&payload.session_token).await?;

        let password_hash = hash_password(payload.new_password.trim())?;
        self.repository.update_user_password(payload.id, &password_hash).await?;

        Ok(ActionResponse {
            success: true,
            message: "Password berhasil diperbarui".to_string(),
        })
    }

    pub async fn delete_user(&self, payload: DeleteUserRequest) -> Result<ActionResponse, AppError> {
        self.verify_admin_access(&payload.session_token).await?;
        self.repository.soft_delete_user(payload.id).await?;
        self.repository.deactivate_active_sessions_by_user(payload.id).await?;

        Ok(ActionResponse {
            success: true,
            message: "Pengguna berhasil dihapus".to_string(),
        })
    }
}

fn hash_password(password: &str) -> Result<String, AppError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|error| AppError::Auth(format!("Gagal membuat password hash: {error}")))?
        .to_string();

    Ok(password_hash)
}

fn verify_password(password: &str, password_hash: &str) -> Result<(), AppError> {
    let parsed_hash = PasswordHash::new(password_hash)
        .map_err(|error| AppError::Auth(format!("Format password hash tidak valid: {error}")))?;

    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::Auth("Username atau password tidak valid".to_string()))?;

    Ok(())
}
