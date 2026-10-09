import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AdjustStockPayload,
  CreateItemPayload,
  InventoryCategory,
  InventoryItem,
  StockMovementDto,
  UpdateItemPayload,
  adjustStock,
  createCategory,
  createItem,
  deactivateItem,
  listCategories,
  listItems,
  listStockMovements,
  updateItem,
  updateCategory,
  deleteCategory,
  bulkUpdateTax,
} from "@shared/services/tauri";

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (typeof error === "string" && error.trim()) return error;
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallbackMessage;
}

export function useInventory() {
  // --- STATES ---
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [movements, setMovements] = useState<StockMovementDto[]>([]);
  const [allMovements, setAllMovements] = useState<StockMovementDto[]>([]);
  const [isUpdatingTax, setIsUpdatingTax] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [categoryName, setCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  
  const [form, setForm] = useState<CreateItemPayload>({
    category_id: null, sku: "", barcode: "", name: "", unit: "PCS",
    cost_price: 0, selling_price: 0, stock_qty: 0, min_stock_qty: 0,
  });

  const [editForm, setEditForm] = useState<UpdateItemPayload | null>(null);
  const [stockForm, setStockForm] = useState<AdjustStockPayload>({
    item_id: 0, movement_type: "IN", qty: 1, notes: "",
  });

  // --- DERIVED STATE (Memo) ---
  const totalLowStock = useMemo(
    () => items.filter((item) => item.is_active && item.stock_qty <= item.min_stock_qty).length,
    [items]
  );
  const activeItems = useMemo(() => items.filter((item) => item.is_active), [items]);
  const inactiveItems = useMemo(() => items.filter((item) => !item.is_active), [items]);
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );

  // --- EFFECTS ---
const loadInventory = async () => {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const [itemRows, categoryRows, allMovementRows] = await Promise.all([
        listItems(), 
        listCategories(),
        listStockMovements() 
      ]);
      
      setItems(itemRows);
      setCategories(categoryRows);
      setAllMovements(allMovementRows); 
      
      if (itemRows.length > 0) {
        const nextSelectedId = selectedItemId && itemRows.some((item) => item.id === selectedItemId)
            ? selectedItemId
            : itemRows[0].id;
        setSelectedItemId(nextSelectedId);
      } else {
        setSelectedItemId(null);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Gagal memuat data inventory."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadInventory();
  }, []);

  useEffect(() => {
    if (!selectedItemId) {
      setMovements([]);
      setEditForm(null);
      setStockForm((prev) => ({ ...prev, item_id: 0 }));
      return;
    }
    const item = items.find((row) => row.id === selectedItemId);
    if (!item) return;

    setEditForm({
      id: item.id, category_id: item.category_id, sku: item.sku,
      barcode: item.barcode ?? "", name: item.name, unit: item.unit,
      cost_price: item.cost_price, selling_price: item.selling_price, min_stock_qty: item.min_stock_qty,
    });
    setStockForm((prev) => ({ ...prev, item_id: item.id }));

    const loadMovements = async () => {
      try {
        const rows = await listStockMovements(item.id);
        setMovements(rows);
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Gagal memuat riwayat pergerakan stok."));
      }
    };
    void loadMovements();
  }, [items, selectedItemId]);

  // --- HANDLERS ---
  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!categoryName.trim()) return;
    setErrorMessage("");
    try {
      const createdCategory = await createCategory({ name: categoryName.trim() });
      setCategories((prev) => [...prev, createdCategory].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((prev) => ({ ...prev, category_id: createdCategory.id }));
      setCategoryName("");
      setSuccessMessage("Kategori berhasil ditambahkan.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Gagal menambah kategori."));
    }
  };

  const handleUpdateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCategory || !editingCategory.name.trim()) return;
    setErrorMessage("");
    try {
      const payload = { id: editingCategory.id, name: editingCategory.name.trim(), description: editingCategory.description };
      const updatedCategory = await updateCategory(payload);
      setCategories((prev) => prev.map((cat) => (cat.id === updatedCategory.id ? updatedCategory : cat)).sort((a, b) => a.name.localeCompare(b.name)));
      setItems((prevItems) => prevItems.map((item) => item.category_id === updatedCategory.id ? { ...item, category_name: updatedCategory.name } : item));
      setEditingCategory(null);
      setSuccessMessage("Kategori berhasil diperbarui.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Gagal memperbarui kategori."));
    }
  };

const handleDeleteCategory = async (categoryId: number) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return; 
    
    setErrorMessage("");
    try {
      await deleteCategory( { id: categoryId } ); 
      
      setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
      if (form.category_id === categoryId) setForm((prev) => ({ ...prev, category_id: null }));
      if (editForm?.category_id === categoryId) setEditForm((prev) => (prev ? { ...prev, category_id: null } : null));
      setSuccessMessage("Kategori berhasil dihapus.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Gagal menghapus kategori."));
    }
  };

  const handleSubmitItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const createdItem = await createItem({
        ...form, sku: form.sku.trim(), barcode: form.barcode?.trim() || null,
        name: form.name.trim(), unit: form.unit?.trim() || "PCS",
      });
      setItems((prev) => [createdItem, ...prev]);
      setForm({ category_id: form.category_id, sku: "", barcode: "", name: "", unit: "PCS", cost_price: 0, selling_price: 0, stock_qty: 0, min_stock_qty: 0 });
      setSelectedItemId(createdItem.id);
      setSuccessMessage("Item berhasil ditambahkan.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Gagal menambah item."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editForm) return;
    setIsSavingEdit(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const updatedItem = await updateItem({
        ...editForm, sku: editForm.sku.trim(), barcode: editForm.barcode?.trim() || null,
        name: editForm.name.trim(), unit: editForm.unit?.trim() || "PCS",
      });
      setItems((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
      setSuccessMessage("Item berhasil diperbarui.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Gagal memperbarui item."));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeactivateItem = async () => {
    if (!selectedItem) return;
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const deactivated = await deactivateItem(selectedItem.id);
      setItems((prev) => prev.map((item) => (item.id === deactivated.id ? deactivated : item)));
      setSuccessMessage("Item berhasil dinonaktifkan.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Gagal menonaktifkan item."));
    }
  };

  const handleAdjustStock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedItem) return;
    setIsAdjustingStock(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const updatedItem = await adjustStock({
        item_id: selectedItem.id, movement_type: stockForm.movement_type,
        qty: Number(stockForm.qty), notes: stockForm.notes?.trim() || null,
      });
      setItems((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
      const rows = await listStockMovements(selectedItem.id);
      setMovements(rows);
      setStockForm((prev) => ({ ...prev, qty: 1, notes: "" }));
      setSuccessMessage("Stok berhasil diadjust dan riwayat tersimpan.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Gagal melakukan adjustment stok."));
    } finally {
      setIsAdjustingStock(false);
    }
  };

  const handleBulkUpdateTax = async (itemIds: number[], taxType: string, taxRate: number) => {
    if (itemIds.length === 0) return;
    setIsUpdatingTax(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const updatedCount = await bulkUpdateTax({ 
        item_ids: itemIds, 
        tax_type: taxType, 
        tax_rate: taxRate 
      });
      // Refresh tabel agar data terbaru muncul
      await loadInventory();
      setSuccessMessage(`Berhasil memperbarui pengaturan PPN untuk ${updatedCount} barang.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Gagal memperbarui pengaturan PPN."));
    } finally {
      setIsUpdatingTax(false);
    }
  };

return {
    data: {
      items, categories, movements, allMovements, activeItems, inactiveItems,
      selectedItem, selectedItemId, totalLowStock,
    },
    ui: {
      isLoading, isSubmitting, isAdjustingStock, isSavingEdit,
      errorMessage, successMessage, isUpdatingTax
    },
    forms: {
      categoryName, editingCategory, form, editForm, stockForm,
    },
    setters: {
      setSelectedItemId, setCategoryName, setEditingCategory,
      setForm, setEditForm, setStockForm,
    },
    actions: {
      loadInventory, handleCreateCategory, handleUpdateCategory, handleDeleteCategory,
      handleSubmitItem, handleUpdateItem, handleDeactivateItem, handleAdjustStock,
      handleBulkUpdateTax
    }
  };
}