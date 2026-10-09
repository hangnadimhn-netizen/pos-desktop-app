import React, { useState, useMemo } from "react";
import { Button } from "@shared/components/ui/Button"; 
import { Input } from "@shared/components/ui/Input";   
import { InventoryItem, InventoryCategory } from "@shared/services/tauri";
import { useAuthStore } from "@modules/auth/store/useAuthStore";

interface ItemsTableProps {
  items: InventoryItem[];
  categories: InventoryCategory[]; 
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (item: InventoryItem) => void;
  onDeactivate: (item: InventoryItem) => void; 
}

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function ItemsTable({ items, categories, isLoading, onAdd, onEdit, onDeactivate }: ItemsTableProps) {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role_code === "ADMIN";
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;
  

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.barcode && item.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchCategory = 
        selectedCategory === "all" || item.category_id === Number(selectedCategory);

      const matchStatus = 
        selectedStatus === "all" || 
        (selectedStatus === "active" && item.is_active) ||
        (selectedStatus === "inactive" && !item.is_active);

      return matchSearch && matchCategory && matchStatus;
    });
  }, [items, searchTerm, selectedCategory, selectedStatus]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage]);

return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        
        {/* Bagian Kiri: Pencarian & Filter */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="w-full max-w-sm">
             <Input 
               placeholder="🔍 Cari barang, SKU, atau Barcode..." 
               value={searchTerm}
               onChange={(e) => {
                 setSearchTerm(e.target.value);
                 setCurrentPage(1);
               }}
             />
          </div>
          
          <select 
            className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Semua Kategori</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          
          <select 
            className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>

        {/* 2. PINDAHKAN TOMBOL TAMBAH KE SINI (Bagian Kanan) */}
        <div>
          {isAdmin && (
            <Button onClick={onAdd}>+ Tambah Barang</Button>
          )}
        </div>

      </div>

      {/* Tabel */}
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-700 text-slate-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-semibold">SKU</th>
                <th className="px-4 py-3 text-left font-medium text-semibold">Barcode</th>
                <th className="px-4 py-3 text-left font-medium text-semibold">Barang</th>
                <th className="px-4 py-3 text-left font-medium text-semibold">Kategori</th>
                <th className="px-4 py-3 text-center font-medium text-semibold">Unit</th>
                <th className="px-4 py-3 text-right font-medium text-semibold">Stok</th>
                <th className="px-4 py-3 text-right font-medium text-semibold">Harga Modal</th>
                <th className="px-4 py-3 text-right font-medium text-semibold">Harga Jual</th>
                {isAdmin && (
                  <th className="px-4 py-3 text-center font-medium text-semibold">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr><td colSpan={isAdmin ? 9 : 8} className="px-4 py-8 text-center text-slate-500">Memuat data...</td></tr>
              ) : paginatedItems.length === 0 ? (
                <tr><td colSpan={isAdmin ? 9 : 8} className="px-4 py-8 text-center text-slate-500">Tidak ada barang ditemukan.</td></tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`transition-colors even:bg-slate-50 odd:bg-white hover:bg-blue-50 ${
                      !item.is_active ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-700">{item.sku}</td>
                    <td className="px-4 py-3 text-slate-600">{item.barcode || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="font-medium flex items-center gap-2">
                        {item.name}
                        {!item.is_active && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Nonaktif</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.category_name ?? "-"}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{item.unit}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        item.stock_qty <= 0 ? "bg-red-100 text-red-700" :
                        item.stock_qty <= item.min_stock_qty ? "bg-amber-100 text-amber-700" : 
                        "bg-emerald-100 text-emerald-700"
                      }`}>
                        {item.stock_qty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {currencyFormatter.format(item.cost_price)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 font-medium">
                      {currencyFormatter.format(item.selling_price)}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          {/* Ikon Edit (Pensil) */}
                          <button 
                            onClick={() => onEdit(item)} 
                            title="Edit Barang"
                            className="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-200 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                          
                          {/* Ikon Nonaktifkan (Silang/Ban) */}
                          {item.is_active && (
                            <button 
                              onClick={() => onDeactivate(item)} 
                              title="Nonaktifkan Barang"
                              className="p-1.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-200 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kontrol Paginasi */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <div>Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredItems.length)} dari {filteredItems.length} barang</div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
              Sebelumnya
            </Button>
            <Button variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              Selanjutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}