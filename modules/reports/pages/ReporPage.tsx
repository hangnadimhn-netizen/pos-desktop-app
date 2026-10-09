import { useState, useEffect } from "react";
import { 
  getRevenueSummary, 
  getCashierSalesReport,
  getStationSalesReport,
  getShiftSalesReport,
  getClosedShiftsHistory,
  RevenueSummaryDto, 
  CashierSalesReportDto,
  StationSalesReportDto,
  ShiftSalesReportDto,
  ClosedShiftHistoryDto
} from "@shared/services/tauri";
import { Button } from "@shared/components/ui/Button";

const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

const getTodayString = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

type TabType = "cashier" | "station" | "shift" | "history";

export function ReportsPage() {
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTodayString());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("cashier");

  const [summary, setSummary] = useState<RevenueSummaryDto | null>(null);
  const [cashierSales, setCashierSales] = useState<CashierSalesReportDto[]>([]);
  const [stationSales, setStationSales] = useState<StationSalesReportDto[]>([]);
  const [shiftSales, setShiftSales] = useState<ShiftSalesReportDto[]>([]);
  const [shiftHistory, setShiftHistory] = useState<ClosedShiftHistoryDto[]>([]);

  const [shiftToPrint, setShiftToPrint] = useState<ClosedShiftHistoryDto | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const req = {
        start_date: `${startDate} 00:00:00`,
        end_date: `${endDate} 23:59:59`,
      };

      const [summaryData, cashierData, stationData, shiftData, historyData] = await Promise.all([
        getRevenueSummary(req),
        getCashierSalesReport(req),
        getStationSalesReport(req),
        getShiftSalesReport(req),
        getClosedShiftsHistory(req),
      ]);

      setSummary(summaryData);
      setCashierSales(cashierData);
      setStationSales(stationData);
      setShiftSales(shiftData);
      setShiftHistory(historyData);
    } catch (err: any) {
      setError(err?.toString() || "Gagal mengambil data laporan");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleReprint = (shift: ClosedShiftHistoryDto) => {
    setShiftToPrint(shift);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <>
      <div className="space-y-6 print:hidden">
        {/* HEADER & FILTER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Laporan Penjualan</h1>
            <p className="text-sm text-slate-500">Lihat ringkasan transaksi, performa station, dan riwayat shift.</p>
          </div>

          <div className="flex items-end gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Dari Tanggal</label>
              <input
                type="date"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Sampai Tanggal</label>
              <input
                type="date"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={fetchReports} disabled={isLoading}>
              {isLoading ? "Memuat..." : "Terapkan"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-200">
            {error}
          </div>
        )}

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3"> {/* Ubah jadi grid-cols-3 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Transaksi</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {summary?.total_transactions ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Pendapatan (Gross)</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">
              {formatRupiah(summary?.total_revenue ?? 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-rose-50 p-6 shadow-sm">
            <p className="text-sm font-medium text-rose-600">PPN Terkumpul (Include)</p>
            <p className="mt-2 text-3xl font-bold text-rose-700">
              {formatRupiah(summary?.total_tax ?? 0)}
            </p>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex gap-6">
            <button
              onClick={() => setActiveTab("cashier")}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === "cashier" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              Per Kasir
            </button>
            <button
              onClick={() => setActiveTab("station")}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === "station" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              Per Station
            </button>
            <button
              onClick={() => setActiveTab("shift")}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === "shift" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              Per Shift
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === "history" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              Riwayat Tutup Kasir
            </button>
          </nav>
        </div>

        {/* TAB CONTENTS */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                {activeTab === "cashier" && (
                  <tr>
                    <th className="px-6 py-3 font-medium">Nama Kasir</th>
                    <th className="px-6 py-3 font-medium text-center">Jumlah Transaksi</th>
                    <th className="px-6 py-3 font-medium text-right">Total Pendapatan</th>
                    <th className="px-6 py-3 font-medium text-right">Total PPN</th>
                  </tr>
                )}
                {activeTab === "station" && (
                  <tr>
                    <th className="px-6 py-3 font-medium">Station (Mesin POS)</th>
                    <th className="px-6 py-3 font-medium text-center">Jumlah Transaksi</th>
                    <th className="px-6 py-3 font-medium text-right">Total Pendapatan</th>
                    <th className="px-6 py-3 font-medium text-right">Total PPN</th>
                  </tr>
                )}
                {activeTab === "shift" && (
                  <tr>
                    <th className="px-6 py-3 font-medium">Jadwal Shift</th>
                    <th className="px-6 py-3 font-medium text-center">Jumlah Transaksi</th>
                    <th className="px-6 py-3 font-medium text-right">Total Pendapatan</th>
                    <th className="px-6 py-3 font-medium text-right">Total PPN</th>
                  </tr>
                )}
               {activeTab === "history" && (
                  <tr>
                    <th className="px-6 py-3 font-medium">Jadwal & Waktu</th>
                    <th className="px-6 py-3 font-medium">Kasir</th>
                    <th className="px-6 py-3 font-medium text-right">Harapan (Sistem)</th>
                    <th className="px-6 py-3 font-medium text-right">Aktual (Fisik)</th>
                    <th className="px-6 py-3 font-medium text-right">Selisih</th>
                    
                    {/* TAMBAHKAN BARIS INI */}
                    <th className="px-6 py-3 font-medium text-right">Total PPN</th> 
                    
                    <th className="px-6 py-3 font-medium text-center">Aksi</th>
                  </tr>
                )}
              </thead>
              
              <tbody className="divide-y divide-slate-200 bg-white">
                {/* 1. Tab Kasir */}
                {activeTab === "cashier" && cashierSales.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Tidak ada data.</td></tr>
                )}
                {activeTab === "cashier" && cashierSales.map((item) => (
                  <tr key={item.cashier_id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{item.cashier_name}</td>
                    <td className="px-6 py-4 text-center">{item.total_transactions}</td>
                    <td className="px-6 py-4 text-right font-medium text-emerald-600">{formatRupiah(item.total_revenue)}</td>
                    <td className="px-6 py-4 text-right font-medium text-rose-600">{formatRupiah(item.total_tax)}</td> 
                  </tr>
                ))}

                {/* 2. Tab Station */}
                {activeTab === "station" && stationSales.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Tidak ada data.</td></tr>
                )}
                {activeTab === "station" && stationSales.map((item) => (
                  <tr key={item.station_id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{item.station_name}</td>
                    <td className="px-6 py-4 text-center">{item.total_transactions}</td>
                    <td className="px-6 py-4 text-right font-medium text-emerald-600">{formatRupiah(item.total_revenue)}</td>
                    <td className="px-6 py-4 text-right font-medium text-rose-600">{formatRupiah(item.total_tax)}</td>
                  </tr>
                ))}

                {/* 3. Tab Shift */}
                {activeTab === "shift" && shiftSales.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Tidak ada data.</td></tr>
                )}
                {activeTab === "shift" && shiftSales.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">Shift {item.schedule_name}</td>
                    <td className="px-6 py-4 text-center">{item.total_transactions}</td>
                    <td className="px-6 py-4 text-right font-medium text-emerald-600">{formatRupiah(item.total_revenue)}</td>
                    <td className="px-6 py-4 text-right font-medium text-rose-600">{formatRupiah(item.total_tax)}</td>
                  </tr>
                ))}

                {/* 4. Tab Riwayat (History) */}
                {activeTab === "history" && shiftHistory.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">Tidak ada data riwayat tutup shift.</td></tr>
                )}
                {activeTab === "history" && shiftHistory.map((item) => {
                  const isShortage = item.cash_difference < 0;
                  const isOverage = item.cash_difference > 0;
                  return (
                    <tr key={item.shift_id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{item.schedule_name}</div>
                        <div className="text-xs text-slate-500">{new Date(item.opened_at).toLocaleDateString("id-ID")}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{item.cashier_name}</td>
                      <td className="px-6 py-4 text-right">{formatRupiah(item.expected_cash)}</td>
                      <td className="px-6 py-4 text-right font-medium">{formatRupiah(item.actual_closing_cash)}</td>
                      <td className={`px-6 py-4 text-right font-bold ${isShortage ? "text-rose-600" : isOverage ? "text-emerald-600" : "text-slate-500"}`}>
                        {formatRupiah(item.cash_difference)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-rose-600">{formatRupiah(item.total_tax)}</td>
                      <td className="px-6 py-4 text-center">
                        <Button type="button" variant="outline" className="text-xs py-1.5 px-3" onClick={() => handleReprint(item)}>
                          Cetak Ulang
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* =========================================================================================
          AREA CETAK STRUK Z-REPORT (REPRINT)
          Area ini tersembunyi di layar (print:hidden diatur di div pembungkus utama), 
          hanya muncul dan diformat saat window.print() dipanggil.
          ========================================================================================= */}
      {shiftToPrint && (
        <div 
          className="hidden print:block print:w-[58mm] print:bg-white print:text-black font-mono text-xs" 
          style={{ padding: '0', margin: '0' }}
        >
          <div className="text-center mb-3">
            <h1 className="font-bold text-sm">(TUTUP STATION)</h1>
            <p>Toko Portofolio</p>
            <div className="mt-1 font-bold border border-black inline-block px-2 py-0.5 tracking-widest">
              COPY / REPRINT
            </div>
          </div>
          
          <div className="border-b border-dashed border-black mb-2 pb-2">
            <p className="flex justify-between">
              <span>Waktu Cetak:</span>
              <span>{new Date().toLocaleString("id-ID")}</span>
            </p>
            <p className="flex justify-between">
              <span>Waktu Asli:</span>
              <span>{shiftToPrint.closed_at ? new Date(shiftToPrint.closed_at).toLocaleString("id-ID") : "-"}</span>
            </p>
            <p className="flex justify-between">
              <span>ID Shift:</span>
              <span>#{shiftToPrint.shift_id}</span>
            </p>
            <p className="flex justify-between">
              <span>ID Sesi POS:</span>
              <span>#{shiftToPrint.session_id}</span>
            </p>
            <p className="flex justify-between">
              <span>Kasir:</span>
              <span>{shiftToPrint.cashier_name}</span>
            </p>
          </div>

          <div className="border-b border-dashed border-black mb-2 pb-2">
            <h2 className="font-bold mb-1">Rincian Kas</h2>
            <div className="flex justify-between">
              <span>Total Sales:</span>
              <span>{formatRupiah(shiftToPrint.expected_cash)}</span>
            </div>
            <div className="flex justify-between">
              <span>Struk:</span>
              <span>{shiftToPrint.total_receipts}</span>
            </div>
            {/* BARIS BARU UNTUK PPN CETAKAN */}
            <div className="flex justify-between">
              <span>Total PPN:</span>
              <span>{formatRupiah(shiftToPrint.total_tax)}</span>
            </div>
            <div className="flex justify-between mt-1 pt-1 border-t border-dashed border-gray-300">
              <span>Inputan:</span>
              <span>{formatRupiah(shiftToPrint.actual_closing_cash)}</span>
            </div>
          </div>

          <div className="border-b border-dashed border-black mb-2 pb-2">
            <div className="flex justify-between font-bold">
              <span>Selisih:</span>
              <span>{formatRupiah(shiftToPrint.cash_difference)}</span>
            </div>
            <div className="text-center mt-1">
              {shiftToPrint.cash_difference < 0 ? "( MINUS )" : shiftToPrint.cash_difference > 0 ? "( LEBIH )" : "( BALANCE )"}
            </div>
          </div>

          <div className="text-center mt-4">
            <p>--- Akhir Laporan ---</p>
          </div>
        </div>
      )}
    </>
  );
}