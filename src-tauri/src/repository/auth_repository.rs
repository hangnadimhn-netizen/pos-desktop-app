use sqlx::SqlitePool;
use crate::models::auth::{ActiveSessionWithUser, User, UserSession, UserWithRole, UserListItem};
use crate::utils::app_error::AppError;

#[derive(Clone)]
pub struct AuthRepository {
    pool: SqlitePool,
}

impl AuthRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn seed_default_roles(&self) -> Result<(), AppError> {
        let roles = [
            ("CASHIER", "Kasir"),
            ("SUPERVISOR", "Supervisor"),
            ("ADMIN", "Administrator"),
        ];

        for (code, name) in roles {
            sqlx::query(
                r#"
                INSERT INTO roles (code, name)
                VALUES (?, ?)
                ON CONFLICT(code) DO UPDATE SET
                  name = excluded.name
                "#,
            )
            .bind(code)
            .bind(name)
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    pub async fn find_role_id_by_code(&self, role_code: &str) -> Result<Option<i64>, AppError> {
        let role_id = sqlx::query_scalar::<_, i64>("SELECT id FROM roles WHERE code = ? LIMIT 1")
            .bind(role_code)
            .fetch_optional(&self.pool)
            .await?;

        Ok(role_id)
    }

    pub async fn count_users_by_role_code(&self, role_code: &str) -> Result<i64, AppError> {
        let total = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(u.id)
            FROM users u
            INNER JOIN roles r ON r.id = u.role_id
            WHERE r.code = ?
            "#,
        )
        .bind(role_code)
        .fetch_one(&self.pool)
        .await?;

        Ok(total)
    }

    pub async fn create_user(
        &self,
        role_id: i64,
        full_name: &str,
        username: &str,
        password_hash: &str,
    ) -> Result<User, AppError> {
        let result = sqlx::query(
            r#"
            INSERT INTO users (role_id, full_name, username, password_hash, is_active)
            VALUES (?, ?, ?, ?, 1)
            "#,
        )
        .bind(role_id)
        .bind(full_name)
        .bind(username)
        .bind(password_hash)
        .execute(&self.pool)
        .await?;

        let user_id = result.last_insert_rowid();

        let user = sqlx::query_as::<_, User>(
            r#"
            SELECT id, role_id, full_name, username, password_hash, is_active, last_login_at, created_at, updated_at
            FROM users
            WHERE id = ?
            LIMIT 1
            "#,
        )
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn find_user_with_role_by_username(
        &self,
        username: &str,
    ) -> Result<Option<UserWithRole>, AppError> {
        let user = sqlx::query_as::<_, UserWithRole>(
            r#"
            SELECT
              u.id,
              u.role_id,
              u.full_name,
              u.username,
              u.password_hash,
              u.is_active,
              r.code AS role_code,
              r.name AS role_name
            FROM users u
            INNER JOIN roles r ON r.id = u.role_id
            WHERE u.username = ?
            LIMIT 1
            "#,
        )
        .bind(username)
        .fetch_optional(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn update_last_login(&self, user_id: i64) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE users
            SET last_login_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#,
        )
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn deactivate_active_sessions_by_user(&self, user_id: i64) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE user_sessions
            SET is_active = 0,
                logout_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
              AND is_active = 1
            "#,
        )
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn create_session(
        &self,
        user_id: i64,
        session_token: &str,
    ) -> Result<UserSession, AppError> {
        let result = sqlx::query(
            r#"
            INSERT INTO user_sessions (user_id, session_token, is_active)
            VALUES (?, ?, 1)
            "#,
        )
        .bind(user_id)
        .bind(session_token)
        .execute(&self.pool)
        .await?;

        let session_id = result.last_insert_rowid();

        let session = sqlx::query_as::<_, UserSession>(
            r#"
            SELECT id, user_id, session_token, login_at, logout_at, is_active
            FROM user_sessions
            WHERE id = ?
            LIMIT 1
            "#,
        )
        .bind(session_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(session)
    }

    pub async fn find_active_session_by_token(
        &self,
        session_token: &str,
    ) -> Result<Option<ActiveSessionWithUser>, AppError> {
        let session = sqlx::query_as::<_, ActiveSessionWithUser>(
            r#"
            SELECT
              s.session_token,
              s.login_at,
              u.id AS user_id,
              u.full_name,
              u.username,
              r.code AS role_code,
              r.name AS role_name
            FROM user_sessions s
            INNER JOIN users u ON u.id = s.user_id
            INNER JOIN roles r ON r.id = u.role_id
            WHERE s.session_token = ?
              AND s.is_active = 1
              AND u.is_active = 1
            LIMIT 1
            "#,
        )
        .bind(session_token)
        .fetch_optional(&self.pool)
        .await?;

        Ok(session)
    }

    pub async fn deactivate_session(&self, session_token: &str) -> Result<bool, AppError> {
        let result = sqlx::query(
            r#"
            UPDATE user_sessions
            SET is_active = 0,
                logout_at = CURRENT_TIMESTAMP
            WHERE session_token = ?
              AND is_active = 1
            "#,
        )
        .bind(session_token)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn get_all_users(&self) -> Result<Vec<UserListItem>, AppError> {
        let users = sqlx::query_as::<_, UserListItem>(
            r#"
            SELECT 
                u.id, u.full_name, u.username, u.is_active,
                r.code AS role_code, r.name AS role_name
            FROM users u
            INNER JOIN roles r ON r.id = u.role_id
            ORDER BY u.id DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(users)
    }

    pub async fn is_username_exists(&self, username: &str, exclude_user_id: Option<i64>) -> Result<bool, AppError> {
        let mut query = String::from("SELECT COUNT(id) FROM users WHERE username = ?");
        
        if exclude_user_id.is_some() {
            query.push_str(" AND id != ?");
        }

        let mut q = sqlx::query_scalar::<_, i64>(&query).bind(username);
        
        if let Some(id) = exclude_user_id {
            q = q.bind(id);
        }

        let count = q.fetch_one(&self.pool).await?;
        Ok(count > 0)
    }

    pub async fn update_user_details(
        &self,
        user_id: i64,
        role_id: i64,
        full_name: &str,
        username: &str,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE users 
            SET role_id = ?, full_name = ?, username = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#,
        )
        .bind(role_id)
        .bind(full_name)
        .bind(username)
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn update_user_password(&self, user_id: i64, password_hash: &str) -> Result<(), AppError> {
        sqlx::query("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .bind(password_hash)
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn soft_delete_user(&self, user_id: i64) -> Result<(), AppError> {
        // Soft delete: is_active = 0, agar data transaksi lama tidak rusak
        sqlx::query("UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
