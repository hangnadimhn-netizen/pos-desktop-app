import { useState, useEffect, useMemo, FormEvent } from "react";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { 
  PromoPayload, 
  PromoDetailResponse, 
  listPromotions, 
  createPromotion, 
  updatePromotion, 
  deletePromotion,
  listPosItems,
  listCategories, 
  PosItem
} from "@shared/services/tauri";

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function PromotionPage() {
  const [promotions, setPromotions] = useState<PromoDetailResponse[]>([]);
  const [items, setItems] = useState<PosItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState<PromoPayload>({
    name: "",
    promo_type: "PERCENTAGE",
    priority: 1,
    discount_value: 0,
    min_qty: 0,
    reward_qty: 0,
    min_purchase: 0,
    start_date: null,
    end_date: null,
    is_active: 1,
    item_ids: [],
  });

  const [targetType, setTargetType] = useState<"GLOBAL" | "ITEM" | "CATEGORY" | "IMPORT">("GLOBAL");
  const [itemSearch, setItemSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [promoData, itemData, catData] = await Promise.all([
        listPromotions(),
        listPosItems(),
        listCategories()
      ]);
      setPromotions(promoData);
      setItems(itemData);
      setCategories(catData);
    } catch (error) {
      console.error("Gagal memuat data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return items;
    const lowerSearch = itemSearch.toLowerCase();
    return items.filter(i => 
      i.name.toLowerCase().includes(lowerSearch) || 
      i.sku.toLowerCase().includes(lowerSearch)
    );
  }, [items, itemSearch]);

  const openModal = (promo?: PromoDetailResponse) => {
    setAlert(null); 
    if (promo) {
      setEditId(promo.id);
      setFormData(promo);
      setTargetType(promo.item_ids.length > 0 ? "ITEM" : "GLOBAL");
      setSelectedCategories([]);
      setItemSearch("");
    } else {
      setEditId(null);
      setFormData({
        name: "",
        promo_type: "PERCENTAGE",
        priority: 1,
        discount_value: 0,
        min_qty: 0,
        reward_qty: 0,
        min_purchase: 0,
        start_date: null,
        end_date: null,
        is_active: 1,
        item_ids: [],
      });
      setTargetType("GLOBAL");
      setSelectedCategories([]);
      setItemSearch("");
    }
    setIsModalOpen(true);
  };

  const toggleItemSelection = (itemId: number) => {
    setFormData(prev => {
      const isSelected = prev.item_ids.includes(itemId);
      return {
        ...prev,
        item_ids: isSelected 
          ? prev.item_ids.filter(id => id !== itemId) 
          : [...prev.item_ids, itemId]
      };
    });
  };

  const toggleCategorySelection = (catId: number) => {
    setSelectedCategories(prev => {
      const isSelected = prev.includes(catId);
      return isSelected ? prev.filter(id => id !== catId) : [...prev, catId];
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAlert(null);
    try {
      let finalPayload = { ...formData };

      if (finalPayload.promo_type === "THRESHOLD") {
        finalPayload.item_ids = [];
      } else if (targetType === "CATEGORY") {
        const itemIdsFromCats = items
          .filter(i => selectedCategories.includes(i.category_id))
          .map(i => i.id);
        finalPayload.item_ids = itemIdsFromCats;
      } else if (targetType === "GLOBAL" || targetType === "IMPORT") {
        finalPayload.item_ids = [];
      }

      if (editId) {
        await updatePromotion(editId, finalPayload);
        setAlert({ type: "success", message: "Promo berhasil diperbarui." });
      } else {
        await createPromotion(finalPayload);
        setAlert({ type: "success", message: "Promo baru berhasil ditambahkan." });
      }
      
      setIsModalOpen(false);
      await fetchData();
    } catch (error) {
      console.error("Gagal menyimpan promo", error);
      setAlert({ type: "error", message: "Gagal menyimpan data promo." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    setAlert(null);
    try {
      await deletePromotion(deleteId);
      setAlert({ type: "success", message: "Promo berhasil dihapus secara permanen." });
      await fetchData();
    } catch (error) {
      console.error("Gagal menghapus", error);
      setAlert({ type: "error", message: "Gagal menghapus promo." });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Manajemen Promo</h1>
          <p className="mt-1 text-sm text-slate-500">Atur diskon, BOGO, dan threshold toko.</p>
        </div>
        <Button onClick={() => openModal()}>+ Tambah Promo</Button>
      </div>

      {/* NOTIFIKASI ALERT */}
      {alert && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${
          alert.type === "success" 
            ? "border-emerald-200 bg-emerald-50 text-emerald-700" 
            : "border-rose-200 bg-rose-50 text-rose-700"
        }`}>
          {alert.message}
        </div>
      )}

      {/* TABEL DAFTAR PROMO */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        {isLoading ? (
          <p className="text-sm text-slate-500 text-center py-4">Memuat data...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 text-slate-900">
                <tr>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Nama Promo</th>
                  <th className="pb-3 font-medium">Tipe</th>
                  <th className="pb-3 font-medium">Prioritas</th>
                  <th className="pb-3 font-medium">Target</th>
                  <th className="pb-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {promotions.map((promo) => (
                  <tr key={promo.id} className="hover:bg-slate-50">
                    <td className="py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${promo.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {promo.is_active ? "Aktif" : "Non-aktif"}
                      </span>
                    </td>
                    <td className="py-3 font-medium text-slate-900">{promo.name}</td>
                    <td className="py-3 font-mono text-xs">{promo.promo_type}</td>
                    <td className="py-3">{promo.priority}</td>
                    <td className="py-3">
                      {promo.item_ids.length > 0 ? `${promo.item_ids.length} Barang` : "Global"}
                    </td>
                    <td className="py-3 text-right">
                      <button onClick={() => openModal(promo)} className="text-blue-600 hover:underline mr-3">Edit</button>
                      <button onClick={() => setDeleteId(promo.id)} className="text-rose-600 hover:underline">Hapus</button>
                    </td>
                  </tr>
                ))}
                {promotions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">Belum ada promo.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL FORM TAMBAH/EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900 mb-5">
              {editId ? "Edit Promo" : "Tambah Promo Baru"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Nama Promo"
                  maxLength={30}
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  required 
                />
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Status Promo</label>
                  <select 
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
                    value={formData.is_active}
                    onChange={e => setFormData({...formData, is_active: Number(e.target.value)})}
                  >
                    <option value={1}>Aktif</option>
                    <option value={0}>Non-aktif</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Tipe Promo</label>
                  <select 
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-mono"
                    value={formData.promo_type}
                    onChange={e => {
                      const newType = e.target.value;
                      setFormData({...formData, promo_type: newType});
                      if (newType === "THRESHOLD") setTargetType("GLOBAL");
                    }}
                  >
                    <option value="PERCENTAGE">PERCENTAGE (Diskon %)</option>
                    <option value="FLAT">FLAT (Potongan Nominal)</option>
                    <option value="BOGO">BOGO (Beli X Gratis Y)</option>
                    <option value="THRESHOLD">THRESHOLD (Min. Belanja)</option>
                  </select>
                </div>
                <Input 
                  label="Prioritas (Angka kecil = Eksekusi awal)" 
                  type="number" min="1" step="1" 
                  value={formData.priority} 
                  onChange={e => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value) && value.length <= 2) {
                      setFormData({...formData, priority: value === "" ? 0 : Number(value)});
                    }
                  }}
                  required 
                />
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Aturan Nilai Promo</h3>
                <div className="grid grid-cols-2 gap-4">
                  {(formData.promo_type === "PERCENTAGE" || formData.promo_type === "FLAT" || formData.promo_type === "THRESHOLD") && (
                    <Input 
                      label={formData.promo_type === "PERCENTAGE" ? "Nilai Diskon (%)" : "Nominal Potongan (Rp)"}
                      type="number" min="1" step="1"
                      value={formData.discount_value} 
                      onChange={e => {
                        const value = e.target.value;
                        if (/^\d*$/.test(value) && value.length <= 8) {
                          setFormData({...formData, discount_value: value === "" ? 0 : Number(value)});
                        }
                      }}
                    />
                  )}
                  {formData.promo_type === "THRESHOLD" && (
                    <Input 
                      label="Minimal Belanja (Rp)" 
                      type="number" min="1" step="1"
                      value={formData.min_purchase} 
                      onChange={e => {
                        const value = e.target.value;
                        if (/^\d*$/.test(value) && value.length <= 8) {
                          setFormData({...formData, min_purchase: value === "" ? 0 : Number(value)});
                        }
                      }} 
                    />
                  )}
                  {formData.promo_type === "BOGO" && (
                    <>
                      <Input 
                        label="Syarat Beli (Qty)" 
                        type="number" 
                        value={formData.min_qty} 
                        onChange={e => {
                          const value = e.target.value;
                          if (/^\d*$/.test(value) && value.length <= 8) {
                            setFormData({...formData, min_qty: value === "" ? 0 : Number(value)});
                          }
                        }} 
                      />
                      <Input 
                        label="Jumlah Gratis (Qty)" 
                        type="number" 
                        value={formData.reward_qty} 
                        onChange={e => {
                          const value = e.target.value;
                          if (/^\d*$/.test(value) && value.length <= 8) {
                            setFormData({...formData, reward_qty: value === "" ? 0 : Number(value)});
                          }
                        }} 
                      />
                    </>
                  )}
                </div>
              </div>

              {/* SECTION TARGET PROMOTION (Tetap ada, tapi opsi dinonaktifkan jika Threshold) */}
              <div className="space-y-3 border-t border-slate-200 pt-5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">Target Promotion</h3>
                  {formData.promo_type === "THRESHOLD" && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                      Terkunci (Khusus Transaksi)
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-4">
                  {["GLOBAL", "ITEM", "CATEGORY", "IMPORT"].map((type) => {
                    const isDisabled = formData.promo_type === "THRESHOLD" && type !== "GLOBAL";
                    return (
                      <label 
                        key={type} 
                        className={`flex items-center gap-2 text-sm ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      >
                        <input 
                          type="radio" 
                          name="targetType" 
                          value={type} 
                          checked={formData.promo_type === "THRESHOLD" ? type === "GLOBAL" : targetType === type} 
                          onChange={(e) => {
                            if (!isDisabled) setTargetType(e.target.value as any);
                          }}
                          disabled={isDisabled}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        {type === "GLOBAL" ? "Semua Barang" : type === "ITEM" ? "Pilih Barang Spesifik" : type === "CATEGORY" ? "Berdasarkan Kategori" : "Import Excel/CSV"}
                      </label>
                    );
                  })}
                </div>

                {/* Konten Dinamis Berdasarkan Radio */}
                {targetType === "ITEM" && formData.promo_type !== "THRESHOLD" && (
                  <div className="mt-3 rounded-2xl border border-slate-200 p-1">
                    <div className="p-2">
                      <Input 
                        placeholder="Cari nama atau SKU barang..." 
                        value={itemSearch} 
                        onChange={(e) => setItemSearch(e.target.value)} 
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                      {filteredItems.map(item => (
                        <label key={item.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.item_ids.includes(item.id)}
                            onChange={() => toggleItemSelection(item.id)}
                            className="rounded border-slate-300 text-blue-600"
                          />
                          <div className="flex justify-between flex-1 text-sm">
                            <span className="font-medium text-slate-700">{item.name}</span>
                            <span className="text-slate-400">{item.sku}</span>
                          </div>
                        </label>
                      ))}
                      {filteredItems.length === 0 && (
                        <p className="text-center text-sm text-slate-500 py-4">Barang tidak ditemukan.</p>
                      )}
                    </div>
                  </div>
                )}

                {targetType === "CATEGORY" && formData.promo_type !== "THRESHOLD" && (
                  <div className="mt-3 rounded-2xl border border-slate-200 max-h-48 overflow-y-auto p-2 space-y-1">
                    {categories.map(cat => (
                      <label key={cat.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={selectedCategories.includes(cat.id)}
                          onChange={() => toggleCategorySelection(cat.id)}
                          className="rounded border-slate-300 text-blue-600"
                        />
                        <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                )}

                {targetType === "IMPORT" && formData.promo_type !== "THRESHOLD" && (
                  <div className="mt-3 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                    <p className="text-sm text-slate-500 mb-3">Fitur upload Excel/CSV sedang dalam pengembangan.</p>
                    <Button type="button" variant="outline" disabled>Pilih File .CSV</Button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  Simpan Promo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Hapus Promo?</h3>
            <p className="mt-2 text-sm text-slate-500">
              Tindakan ini tidak dapat dibatalkan. Promo ini tidak akan lagi memotong harga pada saat transaksi kasir.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDeleteId(null)} disabled={isDeleting}>
                Batal
              </Button>
              <Button 
                type="button" 
                className="bg-rose-600 hover:bg-rose-700 text-white border-transparent" 
                isLoading={isDeleting} 
                onClick={executeDelete}
              >
                Ya, Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}