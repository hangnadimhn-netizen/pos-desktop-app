import React, { useMemo } from "react";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { InventoryCategory, InventoryItem } from "@shared/services/tauri";
import { useAuthStore } from "@modules/auth/store/useAuthStore";

interface CategoryManagementProps {
  categories: InventoryCategory[];
  items: InventoryItem[]; 
  isLoading: boolean;
  categoryName: string;
  editingCategory: InventoryCategory | null;
  
  setCategoryName: (name: string) => void;
  setEditingCategory: (cat: InventoryCategory | null) => void;
  
  onSubmitCreate: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onSubmitUpdate: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onDelete: (id: number) => void;
}

export function CategoryManagement({
  categories, items, isLoading,
  categoryName, editingCategory,
  setCategoryName, setEditingCategory,
  onSubmitCreate, onSubmitUpdate, onDelete
}: CategoryManagementProps) {
  
  const isEditing = editingCategory !== null;
  
  const getItemCount = (categoryId: number) => {
    return items.filter(item => item.category_id === categoryId).length;
  };

  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role_code === "ADMIN";

  return (
    <div className={`grid gap-6 ${isAdmin ? 'md:grid-cols-3' : 'grid-cols-1'}`}>
      {isAdmin && (
        <div className="md:col-span-1">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sticky top-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              {isEditing ? "Edit Kategori" : "Tambah Kategori Baru"}
            </h2>
            
            <form onSubmit={isEditing ? onSubmitUpdate : onSubmitCreate} className="space-y-4">
              <Input
                label="Nama Kategori *"
                maxLength={20}
                placeholder="Contoh: Minuman, Snack, dll"
                value={isEditing ? editingCategory.name : categoryName}
                onChange={(e) => {
                  if (isEditing) {
                    setEditingCategory({ ...editingCategory, name: e.target.value });
                  } else {
                    setCategoryName(e.target.value);
                  }
                }}
                required
              />
              
              <div className="pt-2 flex flex-col gap-2">
                <Button type="submit" className="w-full justify-center">
                  {isEditing ? "Simpan Perubahan" : "Tambah Kategori"}
                </Button>
                
                {isEditing && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full justify-center border-red-600 text-red-500 hover:bg-red-500 hover:text-white"
                    onClick={() => setEditingCategory(null)}
                  >
                    Batal Edit
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kolom Kanan: Tabel Kategori (Mengambil 2 kolom grid) */}
      <div className={isAdmin ? "md:col-span-2" : "col-span-1"}>
        <div className="rounded-3xl bg-white overflow-hidden shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-700 text-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left font-medium text-semibold w-16">No</th>
                  <th className="px-6 py-4 text-left font-medium text-semibold">Nama Kategori</th>
                  <th className="px-6 py-4 text-center font-medium text-semibold">Total Barang</th>
                  {isAdmin && (
                    <th className="px-6 py-4 text-center font-medium text-semibold">Aksi</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoading ? (
                  <tr><td colSpan={isAdmin ? 4 : 3} className="px-6 py-8 text-center text-slate-500">Memuat kategori...</td></tr>
                ) : categories.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 4 : 3} className="px-6 py-8 text-center text-slate-500">Belum ada kategori yang ditambahkan.</td></tr>
                ) : (
                  categories.map((cat, index) => {
                    const itemCount = getItemCount(cat.id);
                    return (
                      <tr key={cat.id} className="transition-colors even:bg-slate-50 odd:bg-white hover:bg-slate-100">
                        <td className="px-6 py-4 text-slate-500">{index + 1}</td>
                        <td className="px-6 py-4 font-medium text-slate-700">{cat.name}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {itemCount} item
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-2">
                              {/* Ikon Edit */}
                              <button 
                                onClick={() => setEditingCategory(cat)}
                                title="Edit Kategori"
                                className="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-200 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                </svg>
                              </button>
                              
                              {/* Ikon Hapus (Tong Sampah) */}
                              <button 
                                onClick={() => onDelete(cat.id)}
                                title="Hapus Kategori"
                                className="p-1.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-200 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}