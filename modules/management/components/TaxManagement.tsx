import React, { useState, useMemo } from "react";
import { Button } from "@shared/components/ui/Button";
import { InventoryItem } from "@shared/services/tauri";

interface TaxManagementProps {
  items: InventoryItem[];
  isLoading: boolean;
  isUpdatingTax: boolean;
  onSubmit: (itemIds: number[], taxType: string, taxRate: number) => Promise<void>;
}

export function TaxManagement({ items, isLoading, isUpdatingTax, onSubmit }: TaxManagementProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [taxType, setTaxType] = useState<"INCLUDE" | "NON_TAX">("INCLUDE");
  const [taxRate, setTaxRate] = useState<number>(11);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  const filteredItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredItems.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    await onSubmit(selectedIds, taxType, taxRate);
    setSelectedIds([]);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Kolom Kiri: Tabel Barang */}
      <div className="flex-1 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 border-b border-slate-200">
          <input
            type="text"
            placeholder="Cari barang (SKU / Nama)..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
          />
        </div>
        <div className="flex-1 overflow-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-700 sticky top-0">
              <tr>
                <th scope="col" className="px-4 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    onChange={handleSelectAll}
                    checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
                  />
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">SKU</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Nama Barang</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Status PPN Saat Ini</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {isLoading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Memuat data...</td></tr>
              ) : paginatedItems.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Barang tidak ditemukan</td></tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr
                    key={item.id}
                    className="odd:bg-white even:bg-slate-50 hover:bg-blue-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleSelect(item.id)}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 font-medium">{item.sku}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{item.name}</td>
                    <td className="px-4 py-3 text-sm">
                      {item.tax_type === "INCLUDE" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Include ({item.tax_rate}%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          Non Tax
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Kontrol Paginasi */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-600 bg-white">
            <div>
              Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredItems.length)} dari {filteredItems.length} barang
            </div>
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

      {/* Kolom Kanan: Form Pengaturan */}
      <div className="w-full md:w-80 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-4">
            Terapkan PPN
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipe Pajak</label>
              <select
                value={taxType}
                onChange={(e) => setTaxType(e.target.value as "INCLUDE" | "NON_TAX")}
                className="block w-full rounded-lg border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 border"
              >
                <option value="INCLUDE">Kena PPN (Include)</option>
                <option value="NON_TAX">Tidak Kena PPN (Non Tax)</option>
              </select>
            </div>
            
            {taxType === "INCLUDE" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Persentase PPN (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="block w-full rounded-lg border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 border"
                />
              </div>
            )}

            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full"
                disabled={selectedIds.length === 0 || isUpdatingTax}
              >
                {isUpdatingTax ? "Menyimpan..." : `Terapkan ke ${selectedIds.length} Barang`}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}