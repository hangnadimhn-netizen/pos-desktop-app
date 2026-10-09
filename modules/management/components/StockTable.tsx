import React, { useState, useMemo } from "react";
import { Button } from "@shared/components/ui/Button"; 
import { Input } from "@shared/components/ui/Input";   
import { InventoryItem } from "@shared/services/tauri";
import { useAuthStore } from "@modules/auth/store/useAuthStore";

interface StockTableProps {
  items: InventoryItem[];
  isLoading: boolean;
  onAdjustStock: (item: InventoryItem) => void;
}

export function StockTable({ items, isLoading, onAdjustStock }: StockTableProps) {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role_code === "ADMIN";
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  const activeItems = useMemo(() => items.filter(i => i.is_active), [items]);

  const filteredItems = useMemo(() => {
    return activeItems.filter((item) => {
      const matchSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.barcode && item.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
      
      let matchStock = true;
      if (stockFilter === "low") {
        matchStock = item.stock_qty <= item.min_stock_qty && item.stock_qty > 0;
      } else if (stockFilter === "out") {
        matchStock = item.stock_qty <= 0;
      }

      return matchSearch && matchStock;
    });
  }, [activeItems, searchTerm, stockFilter]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage]);

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="w-full max-w-sm">
             <Input 
               placeholder="🔍 Cari SKU, Barcode, atau Nama..." 
               value={searchTerm}
               onChange={(e) => {
                 setSearchTerm(e.target.value);
                 setCurrentPage(1);
               }}
             />
          </div>
          
          <select 
            className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white font-medium"
            value={stockFilter}
            onChange={(e) => {
              setStockFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Semua Kondisi Stok</option>
            <option value="low">⚠️ Stok Menipis</option>
            <option value="out">🛑 Stok Habis</option>
          </select>
        </div>
      </div>

      {/* Tabel Stok */}
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-700 text-slate-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-semibold">SKU / Barcode</th>
                <th className="px-4 py-3 text-left font-medium text-semibold">Nama Barang</th>
                <th className="px-4 py-3 text-center font-medium text-semibold">Batas Min.</th>
                <th className="px-4 py-3 text-center font-medium text-semibold">Stok Sistem</th>
                <th className="px-4 py-3 text-left font-medium text-semibold">Status</th>
                {isAdmin && (
                  <th className="px-4 py-3 text-center font-medium text-semibold">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr><td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-slate-500">Memuat data...</td></tr>
              ) : paginatedItems.length === 0 ? (
                <tr><td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-slate-500">Tidak ada barang ditemukan.</td></tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`transition-colors even:bg-slate-50 odd:bg-white hover:bg-blue-50 ${
                      !item.is_active ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">{item.sku}</div>
                      <div className="text-xs text-slate-400">{item.barcode || "Tanpa Barcode"}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{item.name}</td>
                    <td className="px-4 py-3 text-center text-slate-500">{item.min_stock_qty} {item.unit}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800 text-base">
                      {item.stock_qty} <span className="text-sm font-normal text-slate-500">{item.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-left">
                      {item.stock_qty <= 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span> Habis
                        </span>
                      ) : item.stock_qty <= item.min_stock_qty ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span> Menipis
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Aman
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => onAdjustStock(item)} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          Adjust Stok
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginasi */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <div>Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredItems.length)} dari {filteredItems.length} barang</div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Sebelumnya</Button>
            <Button variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Selanjutnya</Button>
          </div>
        </div>
      )}
    </div>
  );
}