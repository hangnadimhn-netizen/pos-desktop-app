use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
}

#[tauri::command]
pub async fn health_check() -> HealthResponse {
    HealthResponse {
        status: "ok".to_string(),
        service: "pos-kasir-backend".to_string(),
    }
}
