use sqlx::SqlitePool;

use crate::models::inventory::{
    AdjustStockRequest, CreateCategoryRequest, CreateItemRequest, InventoryCategoryDto,
    InventoryItemDto, StockMovementDto, UpdateItemRequest, UpdateCategoryRequest, ImportCsvItemPayload,
    BulkStockInPayload, BulkUpdateTaxRequest
};
use crate::repository::inventory_repository::InventoryRepository;
use crate::utils::app_error::AppError;

#[derive(Clone)]
pub struct InventoryService {
    repository: InventoryRepository,
}

impl InventoryService {
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            repository: InventoryRepository::new(pool),
        }
    }

    pub async fn list_categories(&self) -> Result<Vec<InventoryCategoryDto>, AppError> {
        let categories = self.repository.list_categories().await?;

        Ok(categories
            .into_iter()
            .map(|category| InventoryCategoryDto {
                id: category.id,
                name: category.name,
                description: category.description,
            })
            .collect())
    }

    pub async fn create_category(
        &self,
        payload: CreateCategoryRequest,
    ) -> Result<InventoryCategoryDto, AppError> {
        let name = payload.name.trim().to_string();

        if name.is_empty() {
            return Err(AppError::Validation("Nama kategori wajib diisi".to_string()));
        }

        let category = self
            .repository
            .create_category(CreateCategoryRequest {
                name,
                description: payload.description.and_then(|value| {
                    let trimmed = value.trim().to_string();
                    if trimmed.is_empty() {
                        None
                    } else {
                        Some(trimmed)
                    }
                }),
            })
            .await?;

        Ok(InventoryCategoryDto {
            id: category.id,
            name: category.name,
            description: category.description,
        })
    }

    pub async fn update_category(
        &self,
        payload: UpdateCategoryRequest,
    ) -> Result<InventoryCategoryDto, AppError> {
        let name = payload.name.trim().to_string();

        if name.is_empty() {
            return Err(AppError::Validation("Nama kategori wajib diisi".to_string()));
        }

        let existing_category = self.repository.find_category_by_id(payload.id).await?;
        if existing_category.is_none() {
            return Err(AppError::Validation("Kategori tidak ditemukan".to_string()));
        }

        let category = self
            .repository
            .update_category(UpdateCategoryRequest {
                id: payload.id,
                name,
                description: payload.description.and_then(|value| {
                    let trimmed = value.trim().to_string();
                    if trimmed.is_empty() {
                        None
                    } else {
                        Some(trimmed)
                    }
                }),
            })
            .await?;

        Ok(InventoryCategoryDto {
            id: category.id,
            name: category.name,
            description: category.description,
        })
    }

    pub async fn delete_category(&self, category_id: i64) -> Result<(), AppError> {
        let existing_category = self.repository.find_category_by_id(category_id).await?;
        if existing_category.is_none() {
            return Err(AppError::Validation("Kategori tidak ditemukan".to_string()));
        }

        let items_count = self.repository.count_items_by_category(category_id).await?;
        if items_count > 0 {
            return Err(AppError::Validation(
                "Gagal menghapus! Kategori ini sedang digunakan oleh satu atau beberapa item.".to_string(),
            ));
        }

        self.repository.delete_category(category_id).await?;
        Ok(())
    }

    pub async fn list_items(&self) -> Result<Vec<InventoryItemDto>, AppError> {
        let items = self.repository.list_items().await?;

        Ok(items
            .into_iter()
            .map(|item| InventoryItemDto {
                id: item.id,
                category_id: item.category_id,
                category_name: item.category_name,
                sku: item.sku,
                barcode: item.barcode,
                name: item.name,
                unit: item.unit,
                cost_price: item.cost_price,
                selling_price: item.selling_price,
                tax_type: item.tax_type,
                tax_rate: item.tax_rate,
                stock_qty: item.stock_qty,
                min_stock_qty: item.min_stock_qty,
                is_active: item.is_active == 1,
                created_at: item.created_at,
                updated_at: item.updated_at,
            })
            .collect())
    }

    pub async fn create_item(
        &self,
        payload: CreateItemRequest,
    ) -> Result<InventoryItemDto, AppError> {
        let sku = payload.sku.trim().to_string();
        let name = payload.name.trim().to_string();

        if sku.is_empty() {
            return Err(AppError::Validation("SKU wajib diisi".to_string()));
        }

        if name.is_empty() {
            return Err(AppError::Validation("Nama barang wajib diisi".to_string()));
        }

        if payload.selling_price < 0.0 || payload.cost_price < 0.0 {
            return Err(AppError::Validation(
                "Harga modal dan harga jual tidak boleh negatif".to_string(),
            ));
        }

        if payload.stock_qty < 0.0 || payload.min_stock_qty < 0.0 {
            return Err(AppError::Validation("Stok tidak boleh negatif".to_string()));
        }

        if let Some(category_id) = payload.category_id {
            let category_exists = self.repository.find_category_by_id(category_id).await?;
            if category_exists.is_none() {
                return Err(AppError::Validation("Kategori tidak ditemukan".to_string()));
            }
        }

        if self.repository.find_item_by_sku(&sku).await?.is_some() {
            return Err(AppError::Validation("SKU sudah dipakai item lain".to_string()));
        }

        if let Some(barcode) = payload.barcode.as_deref().map(str::trim).filter(|value| !value.is_empty()) {
            if self.repository.find_item_by_barcode(barcode).await?.is_some() {
                return Err(AppError::Validation("Barcode sudah dipakai item lain".to_string()));
            }
        }

        let unit = payload
            .unit
            .map(|value| value.trim().to_uppercase())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "PCS".to_string());

        let item = self
            .repository
            .create_item(CreateItemRequest {
                category_id: payload.category_id,
                sku,
                barcode: payload.barcode.and_then(|value| {
                    let trimmed = value.trim().to_string();
                    if trimmed.is_empty() {
                        None
                    } else {
                        Some(trimmed)
                    }
                }),
                name,
                unit: Some(unit),
                cost_price: payload.cost_price,
                selling_price: payload.selling_price,
                stock_qty: payload.stock_qty,
                min_stock_qty: payload.min_stock_qty,
            })
            .await?;

        if item.stock_qty > 0.0 {
            self.repository
                .create_stock_movement(item.id, "IN", item.stock_qty, Some("Stok awal item"))
                .await?;
        }

        self.map_item_dto(item).await
    }

    pub async fn update_item(
        &self,
        payload: UpdateItemRequest,
    ) -> Result<InventoryItemDto, AppError> {
        let item_id = payload.id;
        let existing_item = self
            .repository
            .find_item_by_id(item_id)
            .await?
            .ok_or_else(|| AppError::Validation("Item tidak ditemukan".to_string()))?;

        if existing_item.is_active != 1 {
            return Err(AppError::Validation("Item nonaktif tidak bisa diubah".to_string()));
        }

        let sanitized_payload = self.sanitize_update_item_payload(payload).await?;
        let item = self.repository.update_item(sanitized_payload).await?;
        self.map_item_dto(item).await
    }

    pub async fn deactivate_item(&self, item_id: i64) -> Result<InventoryItemDto, AppError> {
        let existing_item = self
            .repository
            .find_item_by_id(item_id)
            .await?
            .ok_or_else(|| AppError::Validation("Item tidak ditemukan".to_string()))?;

        if existing_item.is_active != 1 {
            return Err(AppError::Validation("Item sudah nonaktif".to_string()));
        }

        self.repository.deactivate_item(item_id).await?;

        let item = self
            .repository
            .find_item_by_id(item_id)
            .await?
            .ok_or_else(|| AppError::Validation("Item tidak ditemukan".to_string()))?;

        self.map_item_dto(item).await
    }

    pub async fn bulk_update_tax(
        &self,
        payload: BulkUpdateTaxRequest,
    ) -> Result<usize, AppError> {
        if payload.item_ids.is_empty() {
            return Err(AppError::Validation("Pilih minimal satu item untuk diupdate".to_string()));
        }

        if payload.tax_rate < 0.0 {
            return Err(AppError::Validation("Persentase pajak tidak boleh negatif".to_string()));
        }

        let tax_type = payload.tax_type.trim().to_uppercase();
        if tax_type != "INCLUDE" && tax_type != "NON_TAX" {
            return Err(AppError::Validation(
                "Tipe pajak tidak valid. Gunakan 'INCLUDE' atau 'NON_TAX'".to_string(),
            ));
        }

        self.repository
            .bulk_update_tax(&payload.item_ids, &tax_type, payload.tax_rate)
            .await?;

        Ok(payload.item_ids.len())
    }

    pub async fn adjust_stock(
        &self,
        payload: AdjustStockRequest,
    ) -> Result<InventoryItemDto, AppError> {
        let item = self
            .repository
            .find_item_by_id(payload.item_id)
            .await?
            .ok_or_else(|| AppError::Validation("Item tidak ditemukan".to_string()))?;

        if item.is_active != 1 {
            return Err(AppError::Validation("Item nonaktif tidak bisa diadjust".to_string()));
        }

        let movement_type = payload.movement_type.trim().to_uppercase();
        if movement_type != "IN" && movement_type != "OUT" && movement_type != "ADJUSTMENT" {
            return Err(AppError::Validation(
                "Tipe movement harus IN, OUT, atau ADJUSTMENT".to_string(),
            ));
        }

        if movement_type == "ADJUSTMENT" {
            if payload.qty < 0.0 {
                return Err(AppError::Validation("Qty ADJUSTMENT tidak boleh negatif".to_string()));
            }
        } else {
            if payload.qty <= 0.0 {
                return Err(AppError::Validation(format!("Qty {} harus lebih dari 0", movement_type)));
            }
        }

        let new_stock_qty = match movement_type.as_str() {
            "OUT" => {
                if item.stock_qty < payload.qty {
                    return Err(AppError::Validation(
                        "Stok tidak cukup untuk pengurangan".to_string(),
                    ));
                }
                item.stock_qty - payload.qty
            }
            "IN" => item.stock_qty + payload.qty,
            "ADJUSTMENT" => payload.qty, 
            _ => unreachable!(),
        };

        let notes = payload.notes.and_then(|value| {
            let trimmed = value.trim().to_string();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed)
            }
        });

        self.repository
            .create_stock_movement(payload.item_id, &movement_type, payload.qty, notes.as_deref())
            .await?;
            
        self.repository
            .update_item_stock(payload.item_id, new_stock_qty)
            .await?;

        let updated_item = self
            .repository
            .find_item_by_id(payload.item_id)
            .await?
            .ok_or_else(|| AppError::Validation("Item tidak ditemukan".to_string()))?;

        self.map_item_dto(updated_item).await
    }

    pub async fn import_items(&self, payload: Vec<ImportCsvItemPayload>) -> Result<usize, AppError> {
        let mut success_count = 0;

        for row in payload {
            let sku = row.sku.trim().to_string();
            if sku.is_empty() { continue; }

            let mut category_id = None;
            if let Some(cat_name) = row.category_name.as_deref().map(str::trim).filter(|n| !n.is_empty()) {
                if let Ok(Some(cat)) = self.repository.find_category_by_name(cat_name).await {
                    category_id = Some(cat.id);
                }
            }

            if let Ok(Some(existing_item)) = self.repository.find_item_by_sku(&sku).await {
                let _ = self.repository.update_item(UpdateItemRequest {
                    id: existing_item.id,
                    category_id,
                    sku,
                    barcode: row.barcode.clone(),
                    name: row.name.clone(),
                    unit: row.unit.clone(),
                    cost_price: row.cost_price,
                    selling_price: row.selling_price,
                    min_stock_qty: row.min_stock_qty,
                }).await;
            } else {
                let _ = self.create_item(CreateItemRequest {
                    category_id,
                    sku,
                    barcode: row.barcode.clone(),
                    name: row.name.clone(),
                    unit: row.unit.clone(),
                    cost_price: row.cost_price,
                    selling_price: row.selling_price,
                    stock_qty: row.stock_qty,
                    min_stock_qty: row.min_stock_qty,
                }).await;
            }
            
            success_count += 1;
        }

        Ok(success_count)
    }

    pub async fn bulk_stock_in(&self, payload: Vec<BulkStockInPayload>) -> Result<usize, AppError> {
        let mut success_count = 0;
        for row in &payload {
            if row.qty <= 0.0 {
                return Err(AppError::Validation(format!("Qty untuk SKU {} harus lebih dari 0", row.sku)));
            }
            let existing = self.repository.find_item_by_sku(&row.sku).await?;
            if existing.is_none() {
                return Err(AppError::Validation(format!("Gagal: SKU '{}' tidak terdaftar di sistem.", row.sku)));
            }
        }
        for row in payload {
            if let Ok(Some(item)) = self.repository.find_item_by_sku(&row.sku).await {
                let new_stock = item.stock_qty + row.qty;
                
                self.repository
                    .create_stock_movement(item.id, "IN", row.qty, row.notes.as_deref())
                    .await?;
                    
                self.repository
                    .update_item_stock(item.id, new_stock)
                    .await?;
                    
                success_count += 1;
            }
        }

        Ok(success_count)
    }

    pub async fn list_stock_movements(
        &self,
        item_id: Option<i64>,
    ) -> Result<Vec<StockMovementDto>, AppError> {
        let movements = self.repository.list_stock_movements(item_id).await?;

        Ok(movements
            .into_iter()
            .map(|movement| StockMovementDto {
                id: movement.id,
                item_id: movement.item_id,
                item_name: movement.item_name,
                item_sku: movement.item_sku,
                movement_type: movement.movement_type,
                qty: movement.qty,
                notes: movement.notes,
                created_at: movement.created_at,
            })
            .collect())
    }

    async fn resolve_category_name(
        &self,
        category_id: Option<i64>,
    ) -> Result<Option<String>, AppError> {
        let Some(category_id) = category_id else {
            return Ok(None);
        };

        let category = self.repository.find_category_by_id(category_id).await?;
        Ok(category.map(|value| value.name))
    }

    async fn sanitize_update_item_payload(
        &self,
        payload: UpdateItemRequest,
    ) -> Result<UpdateItemRequest, AppError> {
        let sku = payload.sku.trim().to_string();
        let name = payload.name.trim().to_string();

        if sku.is_empty() {
            return Err(AppError::Validation("SKU wajib diisi".to_string()));
        }

        if name.is_empty() {
            return Err(AppError::Validation("Nama barang wajib diisi".to_string()));
        }

        if payload.selling_price < 0.0 || payload.cost_price < 0.0 {
            return Err(AppError::Validation(
                "Harga modal dan harga jual tidak boleh negatif".to_string(),
            ));
        }

        if payload.min_stock_qty < 0.0 {
            return Err(AppError::Validation("Stok minimum tidak boleh negatif".to_string()));
        }

        if let Some(category_id) = payload.category_id {
            let category_exists = self.repository.find_category_by_id(category_id).await?;
            if category_exists.is_none() {
                return Err(AppError::Validation("Kategori tidak ditemukan".to_string()));
            }
        }

        if let Some(existing_item) = self.repository.find_item_by_sku(&sku).await? {
            if existing_item.id != payload.id {
                return Err(AppError::Validation("SKU sudah dipakai item lain".to_string()));
            }
        }

        if let Some(barcode) = payload.barcode.as_deref().map(str::trim).filter(|value| !value.is_empty()) {
            if let Some(existing_item) = self.repository.find_item_by_barcode(barcode).await? {
                if existing_item.id != payload.id {
                    return Err(AppError::Validation("Barcode sudah dipakai item lain".to_string()));
                }
            }
        }

        let unit = payload
            .unit
            .map(|value| value.trim().to_uppercase())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "PCS".to_string());

        Ok(UpdateItemRequest {
            id: payload.id,
            category_id: payload.category_id,
            sku,
            barcode: payload.barcode.and_then(|value| {
                let trimmed = value.trim().to_string();
                if trimmed.is_empty() {
                    None
                } else {
                    Some(trimmed)
                }
            }),
            name,
            unit: Some(unit),
            cost_price: payload.cost_price,
            selling_price: payload.selling_price,
            min_stock_qty: payload.min_stock_qty,
        })
    }

    async fn map_item_dto(&self, item: crate::models::inventory::Item) -> Result<InventoryItemDto, AppError> {
        Ok(InventoryItemDto {
            id: item.id,
            category_id: item.category_id,
            category_name: self.resolve_category_name(item.category_id).await?,
            sku: item.sku,
            barcode: item.barcode,
            name: item.name,
            unit: item.unit,
            cost_price: item.cost_price,
            selling_price: item.selling_price,
            tax_type: item.tax_type,
            tax_rate: item.tax_rate,
            stock_qty: item.stock_qty,
            min_stock_qty: item.min_stock_qty,
            is_active: item.is_active == 1,
            created_at: item.created_at,
            updated_at: item.updated_at,
        })
    }
}