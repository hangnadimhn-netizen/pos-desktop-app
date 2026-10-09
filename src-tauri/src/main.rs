#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod commands;
mod database;
mod models;
mod repository;
mod services;
mod utils;

use commands::health::health_check;
use commands::auth_commands::{
    get_current_session, login, logout, get_all_users, register_user, 
    update_user, update_user_password, delete_user
};
use commands::inventory_commands::{
    adjust_stock, create_category, create_item, deactivate_item, list_categories, list_items,
    list_stock_movements, update_item, update_category, delete_category, import_items, bulk_stock_in,
    bulk_update_tax
};
use commands::pos_commands::{
    create_transaction, list_pos_items, get_shifts,
    get_stations, open_pos_session, save_hold_cart,
    get_hold_cart, delete_hold_cart, close_shift_command
};
use commands::report_commands::{
    get_revenue_summary_command, get_station_sales_command, get_shift_sales_command, 
    get_closed_shifts_history_command, get_cashier_sales_command
};
use commands::promotion_commands::{
    calculate_cart, create_promotion, delete_promotion, list_promotions, update_promotion
};

use database::create_sqlite_pool;
use services::auth_service::AuthService;
use services::promotion_service::PromotionState;
use sqlx::SqlitePool;
use tauri::Manager;
use utils::app_error::AppError;

#[derive(Clone)]
pub struct AppState {
    pub db: SqlitePool,
}

impl AppState {
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }
}

#[tokio::main]
async fn main() {
    if let Err(error) = run_app().await {
        eprintln!("failed to start application: {error}");
        std::process::exit(1);
    }
}

async fn run_app() -> Result<(), AppError> {
    dotenvy::dotenv().ok();
    let app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            health_check,
            // Auth commands
            login,
            logout,
            get_current_session,
            get_all_users,       
            register_user,       
            update_user,         
            update_user_password,
            delete_user,
            // Inventory commands
            list_categories,
            create_category,
            list_items,
            create_item,
            update_item,
            deactivate_item,
            bulk_update_tax,
            adjust_stock,
            list_stock_movements,
            list_pos_items,
            create_transaction,
            import_items,
            bulk_stock_in,
           // Promotion commands
            calculate_cart,
            list_promotions,
            create_promotion,
            update_promotion,
            delete_promotion,
            // POS commands
            get_shifts,
            get_stations,
            open_pos_session,
            save_hold_cart,
            get_hold_cart,
            delete_hold_cart,
            update_category,
            delete_category,
            close_shift_command,
            
            get_revenue_summary_command,
            get_station_sales_command,
            get_shift_sales_command,
            get_closed_shifts_history_command,
            get_cashier_sales_command,
        ])
        .build(tauri::generate_context!())
        .map_err(AppError::from)?; 
    let app_handle = app.handle();

    let sqlite_pool = create_sqlite_pool(&app_handle).await?;
    
    AuthService::new(sqlite_pool.clone()).bootstrap().await?;
    
    let state = AppState::new(sqlite_pool.clone());
    let promotion_state = PromotionState::new();

    match promotion_state.refresh_promotion_state(&sqlite_pool).await {
        Ok(_) => println!("✅ Promotion state successfully loaded to memory"),
        Err(e) => eprintln!("❌ Failed to load promotions: {}", e),
    }

    app.manage(state);
    app.manage(promotion_state);

    app.run(|_app_handle, _event| {
        // Event loop Tauri berjalan di sini, tidak perlu diubah.
    });

    Ok(())
}