import React, { useState, useEffect } from "react";
import { Button } from "@shared/components/ui/Button";
import { ConfirmModal } from "@shared/components/ui/ConfirmModal";
import { useInventory } from "../hooks/useInventory";
import { InventoryStats } from "../components/InventoryStats";
import { ItemsTable } from "../components/ItemsTable";
import { ItemFormModal } from "../components/ItemFormModal";
import { AdjustStockModal } from "../components/AdjustStockModal";
import { StockTable } from "../components/StockTable";
import { CategoryManagement } from "../components/CategoryManagement";
import { HistoryTable } from "../components/HistoryTable";
import { ImportTab } from "../components/ImportTab";
import { useAuthStore } from "@modules/auth/store/useAuthStore";
import { TaxManagement } from "../components/TaxManagement";

type TabType = "barang" | "stok" | "kategori" | "ppn" | "riwayat" | "import";

export function InventoryPage() {
  const { data, ui, forms, setters, actions } = useInventory();
  const [activeTab, setActiveTab] = useState<TabType>("barang");
  const user = useAuthStore((state) => state.user);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemModalMode, setItemModalMode] = useState<"create" | "edit">("create");
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const closeConfirmModal = () => setConfirmState(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    void actions.loadInventory();
  }, []);

  const allTabs: { id: TabType; label: string }[] = [
    { id: "barang", label: "Barang" },
    { id: "stok", label: "Stok" },
    { id: "kategori", label: "Kategori" },
    { id: "ppn", label: "PPN" },
    { id: "riwayat", label: "Riwayat" },
    { id: "import", label: "Import" },
  ];

  const tabs = allTabs.filter(tab => {
    if (tab.id === "import" || tab.id === "ppn") {
      return user?.role_code && ["ADMIN", "SUPERVISOR"].includes(user.role_code);
    }
    return true;
  });

  const openCreateModal = () => {
    setItemModalMode("create");
    setters.setSelectedItemId(null); 
    setIsItemModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. Bagian Header Halaman */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
        <p className="mt-1 text-sm text-slate-500">Kelola produk dan persediaan</p>
      </div>

      {/* 2. TAMBAHKAN KOMPONEN STATS DI SINI */}
      <InventoryStats 
        items={data.items} 
        categories={data.categories} 
      />

      {/* 3. Navigasi Tab */}
      <div className="flex space-x-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pesan Error / Success */}
      {ui.errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {ui.errorMessage}
        </div>
      )}
      {ui.successMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {ui.successMessage}
        </div>
      )}

      {activeTab === "kategori" && (
        <div className="space-y-4">
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-slate-800">Manajemen Kategori</h2>
            <p className="text-sm text-slate-500">Kelompokkan barang Anda berdasarkan kategori untuk memudahkan pencarian dan laporan.</p>
          </div>
          
          <CategoryManagement 
            categories={data.categories}
            items={data.items}
            isLoading={ui.isLoading}
            categoryName={forms.categoryName}
            editingCategory={forms.editingCategory}
            setCategoryName={setters.setCategoryName}
            setEditingCategory={setters.setEditingCategory}
            onSubmitCreate={actions.handleCreateCategory}
            onSubmitUpdate={actions.handleUpdateCategory}
            onDelete={(categoryId) => {
              const category = data.categories.find(c => c.id === categoryId);
              if (!category) return;
              
              setConfirmState({
                isOpen: true,
                title: "Hapus Kategori",
                message: `Apakah Anda yakin ingin menghapus kategori "${category.name}"? Pastikan Kategori tidak memiliki item.`,
                isDanger: true,
                onConfirm: async () => {
                  await actions.handleDeleteCategory(categoryId);
                  closeConfirmModal();
                }
              });
            }}
          />
        </div>
      )}

      {activeTab === "ppn" && user?.role_code && ["ADMIN", "SUPERVISOR"].includes(user.role_code) && (
        <div className="space-y-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Manajemen Pajak (PPN)</h2>
            <p className="text-sm text-slate-500">Pilih barang yang ingin Anda terapkan PPN massal (Include).</p>
          </div>
          
          <TaxManagement 
            items={data.items}
            isLoading={ui.isLoading}
            isUpdatingTax={ui.isUpdatingTax}
            onSubmit={actions.handleBulkUpdateTax}
          />
        </div>
      )}

      {activeTab === "import" && user?.role_code && ["ADMIN", "SUPERVISOR"].includes(user.role_code) && (
        <ImportTab 
          items={data.items}
          onSuccess={actions.loadInventory} 
        />
      )}

      {activeTab === "stok" && (
        <div className="space-y-4">
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-slate-800">Manajemen Stok Real-time</h2>
            <p className="text-sm text-slate-500">Gunakan tab ini untuk melakukan penyesuaian (adjustment), retur, atau input barang masuk.</p>
          </div>
          
          <StockTable 
            items={data.items}
            isLoading={ui.isLoading}
            onAdjustStock={(item) => {
              setters.setSelectedItemId(item.id);
              setIsStockModalOpen(true);
            }}
          />
        </div>
      )}

      {activeTab === "barang" && (
        <div className="space-y-4">
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-slate-800">Pencarian barang dan Edit</h2>
            <p className="text-sm text-slate-500">Gunakan tab ini untuk melakukan pencarian dan mengedit informasi barang.</p>
          </div>

          <ItemsTable 
            items={data.items} 
            categories={data.categories}
            isLoading={ui.isLoading}
            onAdd={openCreateModal}
            onEdit={(item) => {
              setters.setSelectedItemId(item.id); 
              setItemModalMode("edit");
              setIsItemModalOpen(true);
            }}
            onDeactivate={(item) => {
              setters.setSelectedItemId(item.id);
              
              setConfirmState({
                isOpen: true,
                title: "Nonaktifkan Item",
                message: `Apakah Anda yakin ingin menonaktifkan item "${item.name}"?`,
                isDanger: true,
                onConfirm: async () => {
                  await actions.handleDeactivateItem();
                  closeConfirmModal();
                }
              });
            }}
          />
        </div>
      )}

      {activeTab === "riwayat" && (
        <div className="space-y-4">
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-slate-800">Riwayat Mutasi Stok</h2>
            <p className="text-sm text-slate-500">Lacak semua aktivitas barang masuk, keluar, dan penyesuaian (adjustment) di sini.</p>
          </div>
          
          <HistoryTable 
            movements={data.allMovements} 
            isLoading={ui.isLoading}
          />
        </div>
      )}

      {/* Render Modal Tambah/Edit */}
      <ItemFormModal 
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        mode={itemModalMode}
        categories={data.categories}
        form={forms.form}
        editForm={forms.editForm}
        setForm={setters.setForm}
        setEditForm={setters.setEditForm}
        onSubmitCreate={actions.handleSubmitItem}
        onSubmitEdit={actions.handleUpdateItem}
        isSubmitting={ui.isSubmitting}
        isSavingEdit={ui.isSavingEdit}
      />

      {/* Render Modal Adjustment Stok */}
      <AdjustStockModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        selectedItem={data.selectedItem}
        stockForm={forms.stockForm}
        setStockForm={setters.setStockForm}
        onSubmit={actions.handleAdjustStock}
        isLoading={ui.isAdjustingStock}
      />
      {/* 5. RENDER CONFIRM MODAL DI PALING BAWAH HALAMAN */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={closeConfirmModal}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        isDanger={confirmState.isDanger}
      />
    </div>
  );
}