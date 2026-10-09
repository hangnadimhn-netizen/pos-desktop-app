import React, { FormEvent } from "react";
import { Modal } from "@shared/components/ui/Modal";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { CreateItemPayload, UpdateItemPayload, InventoryCategory } from "@shared/services/tauri";

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  categories: InventoryCategory[];
  
  form: CreateItemPayload;
  editForm: UpdateItemPayload | null;
  
  setForm: React.Dispatch<React.SetStateAction<CreateItemPayload>>;
  setEditForm: React.Dispatch<React.SetStateAction<UpdateItemPayload | null>>;
  
  onSubmitCreate: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  onSubmitEdit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  isSubmitting: boolean;
  isSavingEdit: boolean;
}

export function ItemFormModal({
  isOpen, onClose, mode, categories,
  form, editForm, setForm, setEditForm,
  onSubmitCreate, onSubmitEdit, isSubmitting, isSavingEdit
}: ItemFormModalProps) {

  const isEdit = mode === "edit";
  const currentData = isEdit ? editForm : form;
  const isLoading = isEdit ? isSavingEdit : isSubmitting;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isEdit) {
      await onSubmitEdit(e);
    } else {
      await onSubmitCreate(e);
    }
    onClose(); 
  };

  if (isEdit && !editForm) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEdit ? "Edit Barang" : "Tambah Barang Baru"}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="SKU *"
            maxLength={10}
            value={currentData?.sku ?? ""}
            onChange={(e) => isEdit 
              ? setEditForm(p => p ? { ...p, sku: e.target.value } : p)
              : setForm(p => ({ ...p, sku: e.target.value }))
            }
            placeholder="Contoh: SKU-001"
            required
          />
          <Input
            label="Barcode"
            maxLength={15}
            value={currentData?.barcode ?? ""}
            onChange={(e) => isEdit
              ? setEditForm(p => p ? { ...p, barcode: e.target.value } : p)
              : setForm(p => ({ ...p, barcode: e.target.value }))
            }
            placeholder="Opsional (899...)"
          />
        </div>

        <Input
          label="Nama Barang *"
          maxLength={30}
          value={currentData?.name ?? ""}
          onChange={(e) => isEdit
            ? setEditForm(p => p ? { ...p, name: e.target.value } : p)
            : setForm(p => ({ ...p, name: e.target.value }))
          }
          placeholder="Contoh: Air Mineral 600ml"
          required
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="w-full">
            <label className="mb-1 block text-sm font-medium text-gray-700">Kategori</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={currentData?.category_id ?? ""}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                isEdit 
                  ? setEditForm(p => p ? { ...p, category_id: val } : p)
                  : setForm(p => ({ ...p, category_id: val }));
              }}
            >
              <option value="">Tanpa Kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Unit / Satuan"
            maxLength={10}
            value={currentData?.unit ?? ""}
            onChange={(e) => isEdit
              ? setEditForm(p => p ? { ...p, unit: e.target.value } : p)
              : setForm(p => ({ ...p, unit: e.target.value }))
            }
            placeholder="PCS, BOX, LTR..."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Harga Modal (Rp)"
            type="number" min="0"
            value={currentData?.cost_price ?? 0}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "");
              if (val.length > 7) return;
              isEdit
              ? setEditForm(p => p ? { ...p, cost_price: Number(val) } : p)
              : setForm(p => ({ ...p, cost_price: Number(val) }))
            }}
          />
          <Input
            label="Harga Jual (Rp)"
            type="number" min="0"
            value={currentData?.selling_price ?? 0}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "");
              if (val.length > 7) return;
              isEdit
              ? setEditForm(p => p ? { ...p, selling_price: Number(val) } : p)
              : setForm(p => ({ ...p, selling_price: Number(val) }))
            }}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {!isEdit && (
            <Input
              label="Stok Awal"
              maxLength={5}
              type="number" min="0"
              value={form.stock_qty}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                if (val.length > 5) return;
                setForm(p => ({ ...p, stock_qty: Number(val) }));
              }}
            />
          )}
          <Input
            label="Stok Minimum (Alert)"
            maxLength={5}
            type="number" min="0"
            value={currentData?.min_stock_qty ?? 0}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "");
              if (val.length > 5) return;
              isEdit
                ? setEditForm(p => p ? { ...p, min_stock_qty: Number(val) } : p)
                : setForm(p => ({ ...p, min_stock_qty: Number(val) }))
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {isEdit ? "Simpan Perubahan" : "Simpan Barang"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}