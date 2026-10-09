import React, { useState, useMemo } from "react";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { StockMovementDto } from "@shared/services/tauri";

interface HistoryTableProps {
  movements: StockMovementDto[];
  isLoading: boolean;
}

export function HistoryTable({ movements = [], isLoading }: HistoryTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  const filteredMovements = useMemo(() => {
    return movements.filter((log) => {
      const matchSearch = 
        log.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.item_sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.notes && log.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchType = typeFilter === "all" || log.movement_type === typeFilter;

      return matchSearch && matchType;
    });
  }, [movements, searchTerm, typeFilter]);

  const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);
  const paginatedMovements = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMovements.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMovements, currentPage]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="w-full max-w-sm">
             <Input 
               placeholder="🔍 Cari Barang, SKU, atau Catatan..." 
               value={searchTerm}
               onChange={(e) => {
                 setSearchTerm(e.target.value);
                 setCurrentPage(1);
               }}
             />
          </div>
          
          <select 
            className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Semua Tipe Mutasi</option>
            <option value="IN">Masuk (IN)</option>
            <option value="OUT">Keluar (OUT)</option>
            <option value="ADJUSTMENT">Koreksi (ADJUSTMENT)</option>
          </select>
        </div>
      </div>

      {/* Tabel */}
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-700 text-slate-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-semibold">Tanggal & Waktu</th>
                <th className="px-4 py-3 text-left font-medium text-semibold">Barang (SKU)</th>
                <th className="px-4 py-3 text-center font-medium text-semibold">Tipe</th>
                <th className="px-4 py-3 text-right font-medium text-semibold">Perubahan Qty</th>
                <th className="px-4 py-3 text-left font-medium text-semibold">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Memuat riwayat...</td></tr>
              ) : paginatedMovements.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Tidak ada riwayat mutasi stok ditemukan.</td></tr>
              ) : (
                paginatedMovements.map((log) => (
                  <tr key={log.id} className="transition-colors even:bg-slate-50 odd:bg-white hover:bg-slate-100">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">{log.item_name}</div>
                      <div className="text-xs text-slate-400">{log.item_sku}</div> {/* Gunakan item_sku */}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        log.movement_type === "IN" ? "bg-emerald-100 text-emerald-700" :
                        log.movement_type === "OUT" ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {log.movement_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-base">
                      <span className={
                        log.movement_type === "IN" ? "text-emerald-600" :
                        log.movement_type === "OUT" ? "text-red-600" :
                        "text-amber-600"
                      }>
                        {log.movement_type === "IN" ? "+" : log.movement_type === "OUT" ? "-" : "~"}
                        {log.qty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 italic">
                      {log.notes || "-"}
                    </td>
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
          <div>Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredMovements.length)} dari {filteredMovements.length} riwayat</div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Sebelumnya</Button>
            <Button variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Selanjutnya</Button>
          </div>
        </div>
      )}
    </div>
  );
}