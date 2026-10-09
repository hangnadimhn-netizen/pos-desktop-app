use sqlx::sqlite::{
    SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous,
};
use sqlx::SqlitePool;
use tauri::Manager; 
use crate::utils::app_error::AppError;

pub async fn create_sqlite_pool(app_handle: &tauri::AppHandle) -> Result<SqlitePool, AppError> {
    
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Config(format!("Gagal mendapatkan direktori AppData: {}", e)))?;

    let db_dir = app_data_dir.join("data");
    if !db_dir.exists() {
        std::fs::create_dir_all(&db_dir)
            .map_err(|e| AppError::Config(format!("Gagal membuat folder database: {}", e)))?;
    }

    let db_path = db_dir.join("pos_kasir.db");

    let connect_options = SqliteConnectOptions::new()
        .filename(&db_path)
        .create_if_missing(true)
        .foreign_keys(true)
        .journal_mode(SqliteJournalMode::Wal)
        .synchronous(SqliteSynchronous::Normal);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(connect_options)
        .await
        .map_err(|e| AppError::Config(format!("Gagal membuat koneksi pool: {}", e)))?;
        
    run_migrations(&pool).await?;

    Ok(pool)
}
async fn run_migrations(pool: &SqlitePool) -> Result<(), AppError> {
    sqlx::migrate!("./migrations").run(pool).await?;
    Ok(())
}