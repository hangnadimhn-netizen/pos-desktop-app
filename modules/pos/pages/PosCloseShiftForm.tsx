import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { ConfirmModal } from "@shared/components/ui/ConfirmModal";
import { usePosSessionStore } from "@modules/pos/store/usePosSessionStore";
import { closePosShift, CloseShiftResponse } from "@shared/services/tauri"; 

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const DENOMINATIONS = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100];

interface PosCloseShiftFormProps {
  onCancel: () => void;
}

export function PosCloseShiftForm({ onCancel }: PosCloseShiftFormProps) {
  const isSuccessfullyClosed = useRef(false);
  const session = usePosSessionStore((state) => state.session);
  const closeSession = usePosSessionStore((state) => state.closeSession);


  const [isManualMode, setIsManualMode] = useState(false);

  const [modalCash, setModalCash] = useState<number | "">("");
  const [manualSales, setManualSales] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  
  const [denomCounts, setDenomCounts] = useState<Record<number, number | "">>({
    100000: "", 50000: "", 20000: "", 10000: "", 5000: "", 
    2000: "", 1000: "", 500: "", 200: "", 100: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<CloseShiftResponse | null>(null);

  const calculatedSales = useMemo(() => {
    return DENOMINATIONS.reduce((total, denom) => {
      const qty = Number(denomCounts[denom]) || 0;
      return total + denom * qty;
    }, 0);
  }, [denomCounts]);

  const actualSalesCash = isManualMode ? (Number(manualSales) || 0) : calculatedSales;
  const totalModalCash = Number(modalCash) || 0;
  const finalActualCash = totalModalCash + actualSalesCash;
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDanger?: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const closeConfirmModal = () => setConfirmState(prev => ({ ...prev, isOpen: false }));

  const executeSubmit = async () => {
    if (!session) return;
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await closePosShift({
        shift_id: session.shift_id,
        session_id: session.id,
        actual_closing_cash: finalActualCash,
        notes: notes.trim() || null,
      });
      setResult(res);
      closeSession();
      isSuccessfullyClosed.current = true;
    } catch (error) {
      setErrorMessage(typeof error === "string" ? error : "Terjadi kesalahan saat menutup shift.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDenomChange = (denom: number, val: string) => {
    setDenomCounts(prev => ({
      ...prev,
      [denom]: val === "" ? "" : Number(val)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!session) return;
      
      if (modalCash === "") {
        setErrorMessage("Uang kas modal awal wajib diisi.");
        return;
      }

      if (finalActualCash === 0) {
        setConfirmState({
          isOpen: true,
          title: "Konfirmasi Kas Aktual (Rp 0)",
          message: "Total uang aktual yang Anda input adalah Rp 0. Apakah Anda yakin ingin melanjutkan?",
          isDanger: true, 
          onConfirm: async () => {
            closeConfirmModal();
            await executeSubmit(); 
          }
        });
        return;
      }
      await executeSubmit();
    };

    useEffect(() => {
      return () => {
        if (isSuccessfullyClosed.current) {
          closeSession();
        }
      };
    }, [closeSession]);

if (result) {
    const isShortage = result.cash_difference < 0;
    const isOverage = result.cash_difference > 0;
    const currentTime = new Date().toLocaleString("id-ID");

    return (
      <>
        {/* TAMPILAN LAYAR (UI) */}
        <div className="flex min-h-[70vh] items-center justify-center print:hidden">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-slate-900">Shift Berhasil Ditutup</h2>
              <p className="mt-2 text-sm text-slate-500">Berikut adalah ringkasan kas laci Anda.</p>
            </div>
            
            <div className="mt-6 space-y-4 rounded-2xl bg-slate-50 p-6 text-sm text-slate-700">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span>Kas Harapan (Sistem):</span>
                <span className="font-semibold">{currencyFormatter.format(result.expected_cash)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span>Kas Aktual (Fisik):</span>
                <span className="font-semibold">{currencyFormatter.format(result.actual_closing_cash)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2 pt-2">
                <span>PPN Terkumpul (Include):</span>
                <span className="font-semibold">{currencyFormatter.format(result.total_tax)}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span>Selisih:</span>
                <span className={`text-lg font-bold ${isShortage ? "text-rose-600" : isOverage ? "text-emerald-600" : "text-slate-900"}`}>
                  {currencyFormatter.format(result.cash_difference)}
                </span>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Button type="button" variant="outline" className="w-1/2" onClick={() => window.print()}>
                Cetak Struk
              </Button>
              <Button type="button" className="w-1/2" onClick={onCancel}>
                Selesai & Keluar
              </Button>
            </div>
          </div>
        </div>

        {/* TAMPILAN CETAK STRUK THERMAL (Z-REPORT) */}
        <div 
          className="hidden print:block print:w-[58mm] print:bg-white print:text-black font-mono text-xs" 
          style={{ padding: '0', margin: '0' }}
        >
          <div className="text-center mb-3">
            <h1 className="font-bold text-sm">(TUTUP STATION)</h1>
            <p>Toko Portofolio</p>
          </div>
          
          <div className="border-b border-dashed border-black mb-2 pb-2">
            <p className="flex justify-between">
              <span>Waktu Cetak:</span>
              <span>{currentTime}</span>
            </p>
            <p className="flex justify-between">
              <span>ID Shift:</span>
              <span>#{result.shift_id}</span>
            </p>
            <p className="flex justify-between">
              <span>ID Sesi POS:</span>
              <span>#{result.session_id}</span>
            </p>
          </div>

          <div className="border-b border-dashed border-black mb-2 pb-2">
            <h2 className="font-bold mb-1">Rincian Kas</h2>
            <div className="flex justify-between">
              <span>Total Sales:</span>
              <span>{currencyFormatter.format(result.expected_cash)}</span>
            </div>
          <div className="flex justify-between">
              <span>Struk:</span>
              <span>{result.total_receipts}</span>
            </div>
            <div className="flex justify-between">
              <span>Inputan:</span>
              <span>{currencyFormatter.format(result.actual_closing_cash)}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Total PPN:</span>
              <span>{currencyFormatter.format(result.total_tax)}</span>
            </div>
          </div>

          <div className="border-b border-dashed border-black mb-2 pb-2">
            <div className="flex justify-between font-bold">
              <span>Selisih:</span>
              <span>{currencyFormatter.format(result.cash_difference)}</span>
            </div>
            <div className="text-center mt-1">
              {isShortage ? "( MINUS )" : isOverage ? "( LEBIH )" : "( BALANCE )"}
            </div>
          </div>

          <div className="text-center mt-4">
            <p>--- Akhir Laporan ---</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
    <div className="flex min-h-[80vh] items-center justify-center print:hidden pt-4 pb-10">
      <div className="w-full max-w-4xl rounded-3xl bg-white p-6 md:p-8 shadow-sm ring-1 ring-slate-200">
        <div className="mb-8 border-b border-slate-200 pb-4">
          <h2 className="text-2xl font-semibold text-slate-900">Penghitungan Kas Aktual</h2>
          <p className="mt-1 text-sm text-slate-500">
            Hitung total uang fisik di laci Anda sebelum mengakhiri shift.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* ============ KOLOM KIRI: METODE INPUT ============ */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Uang Sales (Pendapatan)</h3>
              <div className="flex rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setIsManualMode(false)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${!isManualMode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Pecahan
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualMode(true)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${isManualMode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Input Bebas
                </button>
              </div>
            </div>

            {isManualMode ? (
              <div className="rounded-2xl border border-slate-200 p-6 bg-slate-50">
                <Input
                  label="Total Uang Sales Langsung (Rp)"
                  type="number"
                  min="0"
                  value={manualSales}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value) && value.length <= 9) {
                      setManualSales(value === "" ? "" : Number(value));
                    }
                  }}
                  placeholder="Misal: 1500000"
                  autoFocus
                />
                <p className="mt-3 text-xs text-slate-500">
                  Masukkan total seluruh pendapatan shift ini tanpa menghitung pecahan kertas/koin.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 max-h-[50vh] overflow-y-auto pr-2">
                {DENOMINATIONS.map((denom) => (
                  <div key={denom} className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <label className="w-24 text-sm font-medium text-slate-700 text-right">
                      {currencyFormatter.format(denom).replace("Rp", "").trim()}
                    </label>
                    <span className="text-slate-400 text-xs">x</span>
                    <input
                      type="number"
                      min="0"
                      className="w-16 rounded-md border border-slate-300 px-2 py-1.5 text-center text-sm focus:border-blue-500 focus:ring-blue-500"
                      value={denomCounts[denom]}
                      onChange={(e) => handleDenomChange(denom, e.target.value)}
                      placeholder="0"
                    />
                    <span className="text-xs font-medium text-slate-600 flex-1 text-right">
                      = {currencyFormatter.format(denom * (Number(denomCounts[denom]) || 0))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ============ KOLOM KANAN: KAS MODAL & RINGKASAN ============ */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4">Uang Kas Modal</h3>
              <Input
                label="Modal Awal di Laci (Rp)"
                type="number"
                min="0"
                required
                value={modalCash}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*$/.test(value) && value.length <= 8) {
                    setModalCash(value === "" ? "" : Number(value));
                  }
                }}
                placeholder="Masukkan uang modal awal"
              />

              <div className="mt-8 border-t border-dashed border-slate-300 pt-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ringkasan Laci</h3>
                
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Kas Modal (A)</span>
                  <span>{currencyFormatter.format(totalModalCash)}</span>
                </div>
                
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Uang Sales (B)</span>
                  <span>+ {currencyFormatter.format(actualSalesCash)}</span>
                </div>
                
                <div className="flex justify-between pt-3 border-t border-slate-200">
                  <span className="font-semibold text-slate-900">Total Laci (A + B)</span>
                  <span className="font-bold text-blue-600 text-lg">
                    {currencyFormatter.format(finalActualCash)}
                  </span>
                </div>
              </div>
            </div>

            <Input
              label="Catatan Shift (Opsional)"
              type="text"
              maxLength={30}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Uang galon Rp 50.000"
            />

            {errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 space-y-2">
                <p>{errorMessage}</p>
                {/* Tombol darurat untuk menghapus state zustand jika tidak sinkron dengan database */}
                {(errorMessage.includes("CLOSED") || errorMessage.includes("tidak ditemukan")) && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full bg-white border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => {
                      closeSession();
                      onCancel();
                    }}
                  >
                    Hapus Sesi & Mulai Ulang
                </Button>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="w-1/3" onClick={onCancel} disabled={isSubmitting}>
                Kembali
              </Button>
              <Button type="submit" className="w-2/3" isLoading={isSubmitting}>
                Konfirmasi & Tutup Shift
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={closeConfirmModal}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        isDanger={confirmState.isDanger}
      />
    </>
  );
}