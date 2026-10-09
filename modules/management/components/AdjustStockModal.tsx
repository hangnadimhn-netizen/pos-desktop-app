// file: modules/management/components/AdjustStockModal.tsx
import React, { FormEvent } from "react";
import { Modal } from "@shared/components/ui/Modal";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { AdjustStockPayload, InventoryItem } from "@shared/services/tauri";

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: InventoryItem | null;
  stockForm: AdjustStockPayload;
  setStockForm: React.Dispatch<React.SetStateAction<AdjustStockPayload>>;
  onSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  isLoading: boolean;
}

export function AdjustStockModal({
  isOpen, onClose, selectedItem, stockForm, setStockForm, onSubmit, isLoading
}: AdjustStockModalProps) {
  
  if (!selectedItem) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSubmit(e);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adjustment Stok Barang">
      <div className="mb-6 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
        <p className="font-semibold text-slate-900">{selectedItem.name}</p>
        <p className="mt-1">
          SKU: <span className="font-mono">{selectedItem.sku}</span> • Stok Sistem: 
          <span className="font-bold text-slate-800 ml-1">{selectedItem.stock_qty} {selectedItem.unit}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="w-full">
            <label className="mb-1 block text-sm font-medium text-gray-700">Tipe Pergerakan</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={stockForm.movement_type}
              onChange={(e) => setStockForm(p => ({ ...p, movement_type: e.target.value as AdjustStockPayload["movement_type"] }))}
            >
              <option value="IN">IN </option>
              <option value="OUT">OUT </option>
              <option value="ADJUSTMENT">ADJUSTMENT</option>
            </select>
          </div>

          <Input
            label="Jumlah (Qty)"
            type="number" 
            min="1" 
            step="1"
            value={stockForm.qty}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "");
              if (val.length > 6) return;
              setStockForm(p => ({ ...p, qty: Number(val) }));
            }}
            onWheel={(e) => (e.target as HTMLInputElement).blur()}
            required
          />
        </div>

        <Input
          label="Catatan / Alasan"
          maxLength={20}
          value={stockForm.notes ?? ""}
          onChange={(e) => setStockForm(p => ({ ...p, notes: e.target.value }))}
          placeholder="Contoh: Stok opname, barang rusak, dll"
        />

        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Simpan Stok
          </Button>
        </div>
      </form>
    </Modal>
  );
}