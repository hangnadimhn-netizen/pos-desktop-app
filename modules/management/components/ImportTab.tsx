// file: modules/management/components/ImportTab.tsx
import React, { useState } from "react";
import { Button } from "@shared/components/ui/Button";
import { 
  ImportCsvItemPayload, 
  BulkStockInPayload, 
  importItems, 
  bulkStockIn,
  InventoryItem 
} from "@shared/services/tauri";

interface ImportTabProps {
  items: InventoryItem[];
  onSuccess: () => void;
}

interface StockImportRow extends BulkStockInPayload {
  itemName: string;
  currentStock: number | null;
  isValid: boolean;
  errorMessage: string | null;
}

export function ImportTab({ items, onSuccess }: ImportTabProps) {
  const [mode, setMode] = useState<"master" | "stock">("master");
  const [csvMasterData, setCsvMasterData] = useState<ImportCsvItemPayload[]>([]);
  const [csvStockData, setCsvStockData] = useState<StockImportRow[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const hasStockError = csvStockData.some(row => !row.isValid);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg("");
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const lines = text.split('\n');

      if (mode === "master") {
        const parsedData: ImportCsvItemPayload[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const cols = line.split(',');
          if (cols.length >= 9) {
            parsedData.push({
              sku: cols[0].trim(), barcode: cols[1].trim() || null, name: cols[2].trim(),
              category_name: cols[3].trim() || null, unit: cols[4].trim() || "PCS",
              cost_price: parseFloat(cols[5]) || 0, selling_price: parseFloat(cols[6]) || 0,
              stock_qty: parseFloat(cols[7]) || 0, min_stock_qty: parseFloat(cols[8]) || 0,
            });
          }
        }
        setCsvMasterData(parsedData);
      } 
     else {
        // Mode STOK MASUK
        const parsedStock: StockImportRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const cols = line.split(',');
          // Ambil SKU meskipun kolom sebelahnya kosong
          const sku = cols[0]?.trim() || "";
          if (!sku) continue; // Hanya skip jika baris benar-benar kosong
          
          const qty = parseFloat(cols[1]) || 0;
          const notes = cols[2] ? cols[2].trim() : null;
          
          // Validasi dengan data master saat ini
          const match = items.find(item => item.sku === sku);
          
          let isValid = true;
          let errorMessage = null;

          if (!match) {
            isValid = false;
            errorMessage = "SKU Tidak Terdaftar";
          } else if (qty <= 0) {
            isValid = false;
            errorMessage = "Qty harus > 0";
          }

          parsedStock.push({
            sku, qty, notes,
            itemName: match ? match.name : "-",
            currentStock: match ? match.stock_qty : null,
            isValid,
            errorMessage
          });
        }
        setCsvStockData(parsedStock);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setIsProcessing(true);
    setErrorMsg("");
    try {
      if (mode === "master") {
        if (csvMasterData.length === 0) return;
        const count = await importItems(csvMasterData);
        alert(`Berhasil mengimpor/memperbarui ${count} data master barang!`);
        setCsvMasterData([]);
      } else {
        if (csvStockData.length === 0 || hasStockError) return;
        const payload: BulkStockInPayload[] = csvStockData.map(r => ({ sku: r.sku, qty: r.qty, notes: r.notes }));
        const count = await bulkStockIn(payload);
        alert(`Berhasil menambahkan stok massal untuk ${count} barang!`);
        setCsvStockData([]);
      }
      const fileInput = document.getElementById("csv-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      
      onSuccess(); 
    } catch (error) {
      setErrorMsg(typeof error === "string" ? error : "Terjadi kesalahan saat memproses data.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        
        {/* Toggle Mode Import */}
        <div className="flex space-x-2 mb-6 bg-slate-100 p-1.5 rounded-xl w-max">
          <button 
            onClick={() => { setMode("master"); setCsvStockData([]); setErrorMsg(""); }} 
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "master" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Import Data Master
          </button>
          <button 
            onClick={() => { setMode("stock"); setCsvMasterData([]); setErrorMsg(""); }} 
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "stock" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Import Stok Masuk
          </button>
        </div>

        <h2 className="text-lg font-semibold text-slate-800 mb-2">
          {mode === "master" ? "Import Barang Massal (Data Master)" : "Import Stok Masuk Massal"}
        </h2>
        
        <p className="text-sm text-slate-500 mb-6">
          {mode === "master" 
            ? <>Unggah file CSV dengan urutan kolom: <strong>SKU, Barcode, Nama, Kategori, Unit, HargaModal, HargaJual, Stok, MinStok.</strong></>
            : <>Unggah file CSV dengan urutan kolom: <strong>SKU, Qty Masuk, Catatan.</strong></>}
        </p> 

        <div className="flex items-center gap-4">
          <input 
            id="csv-upload"
            type="file" accept=".csv" onChange={handleFileUpload} 
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
          <Button 
            onClick={handleImport} 
            disabled={
              isProcessing || 
              (mode === "master" ? csvMasterData.length === 0 : (csvStockData.length === 0 || hasStockError))
            }
          >
            {isProcessing ? "Memproses..." : `Mulai Import (${mode === "master" ? csvMasterData.length : csvStockData.length})`}
          </Button>
        </div>
        
        {/* Peringatan Error */}
        {errorMsg && <p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{errorMsg}</p>}
        {mode === "stock" && hasStockError && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 font-medium">
            ⚠️ Terdapat SKU yang tidak valid atau jumlah Qty &lt;= 0. Harap perbaiki baris berwarna merah di file CSV Anda, lalu unggah ulang.
          </p>
        )}
      </div>

      {/* PRATINJAU DATA MASTER */}
      {mode === "master" && csvMasterData.length > 0 && (
        <div className="rounded-3xl bg-white overflow-hidden shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-700 text-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-semibold">SKU</th>
                  <th className="px-4 py-3 text-left font-medium text-semibold">Barcode</th>
                  <th className="px-4 py-3 text-left font-medium text-semibold">Nama Barang</th>
                  <th className="px-4 py-3 text-left font-medium text-semibold">Kategori</th>
                  <th className="px-4 py-3 text-center font-medium text-semibold">Unit</th>
                  <th className="px-4 py-3 text-right font-medium text-semibold">Harga Modal</th>
                  <th className="px-4 py-3 text-right font-medium text-semibold">Harga Jual</th>
                  <th className="px-4 py-3 text-right font-medium text-semibold">Stok</th>
                  <th className="px-4 py-3 text-right font-medium text-semibold">Min Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {csvMasterData.map((item, idx) => (
                  <tr 
                    key={idx} 
                    className={`transition-colors hover:bg-slate-100 ${
                      !item.sku || !item.name 
                        ? "bg-red-100/70" 
                        : "even:bg-slate-50 odd:bg-white"
                    }`}
                  >
                    <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">{item.sku || "KOSONG"}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{item.barcode || "-"}</td>
                    <td className="px-4 py-3 text-slate-700 min-w-[200px]">{item.name || "KOSONG"}</td>
                    <td className="px-4 py-3 text-slate-500">{item.category_name || "Tanpa Kategori"}</td>
                    <td className="px-4 py-3 text-slate-500 text-center">{item.unit}</td>
                    <td className="px-4 py-3 text-slate-500 text-right">
                      {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.cost_price)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium text-right">
                      {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.selling_price)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-right font-medium">{item.stock_qty}</td>
                    <td className="px-4 py-3 text-slate-500 text-right">{item.min_stock_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRATINJAU STOK MASUK */}
      {mode === "stock" && csvStockData.length > 0 && (
        <div className="rounded-3xl bg-white overflow-hidden shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-700 text-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-semibold">SKU</th>
                  <th className="px-4 py-3 text-left font-medium text-semibold">Nama Barang</th>
                  <th className="px-4 py-3 text-center font-medium text-semibold">Stok Awal</th>
                  <th className="px-4 py-3 text-center font-medium text-blue-600">+ Masuk</th>
                  <th className="px-4 py-3 text-center font-medium text-semibold-800">Estimasi Akhir</th>
                  <th className="px-4 py-3 text-left font-medium text-semibold">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {csvStockData.map((item, idx) => (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      !item.isValid
                        ? "bg-red-50 hover:bg-red-100"
                        : "odd:bg-white even:bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <td className="px-4 py-3 text-center">
                      {!item.isValid ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold" title={item.errorMessage || "Error"}>✕</span>
                      ) : (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold">✓</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 font-bold ${!item.isValid ? "text-red-600" : "text-slate-700"}`}>
                      {item.sku}
                    </td>
                    <td className="px-4 py-3">
                      {item.errorMessage === "SKU Tidak Terdaftar" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/20">
                          ⚠️ SKU Tidak Terdaftar
                        </span>
                      ) : (
                        <span className={`font-medium ${!item.isValid ? "text-red-500" : "text-slate-700"}`}>
                          {item.itemName}
                        </span>
                      )}
                      {item.errorMessage === "Qty harus > 0" && (
                        <span className="ml-2 inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                          ⚠️ Qty Tidak Valid
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">{item.currentStock ?? "-"}</td>
                    <td className={`px-4 py-3 text-center font-bold ${!item.isValid && item.qty <= 0 ? 'text-red-500' : 'text-blue-600'}`}>
                      +{item.qty}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">
                      {item.currentStock !== null && item.qty > 0 ? item.currentStock + item.qty : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 italic">{item.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}