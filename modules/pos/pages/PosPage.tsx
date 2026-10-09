import { FormEvent, useEffect, useMemo, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core"; 
import { useAuthStore } from "@modules/auth/store/useAuthStore";
import { usePosCartStore } from "@modules/pos/store/usePosCartStore";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { PosItem, PosReceipt, createTransaction, listPosItems, saveHoldCart, getHoldCart, deleteHoldCart } from "@shared/services/tauri";
import { usePosSessionStore } from "@modules/pos/store/usePosSessionStore";
import { PosCloseShiftForm } from "./PosCloseShiftForm";
import { PosInitForm } from "./PosInitForm";
import { ConfirmModal } from "@shared/components/ui/ConfirmModal";

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function PosPage() {
  const user = useAuthStore((state) => state.user);
  
  const cartItems = usePosCartStore((state) => state.items);
  const calculatedCart = usePosCartStore((state) => state.calculatedCart);
  const isCalculating = usePosCartStore((state) => state.isCalculating);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDanger?: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const closeConfirmModal = () => setConfirmState(prev => ({ ...prev, isOpen: false }));

  const addItem = usePosCartStore((state) => state.addItem);
  const incrementItem = usePosCartStore((state) => state.incrementItem);
  const decrementItem = usePosCartStore((state) => state.decrementItem);
  const updateQty = usePosCartStore((state) => state.updateQty);
  const removeItem = usePosCartStore((state) => state.removeItem);
  const clearCart = usePosCartStore((state) => state.clearCart);
  
  const isInitialized = usePosSessionStore((state) => state.isInitialized);
  const session = usePosSessionStore((state) => state.session);
  const closeSession = usePosSessionStore((state) => state.closeSession);
  const [isClosingShift, setIsClosingShift] = useState(false);

  const [items, setItems] = useState<PosItem[]>([]);
  const [search, setSearch] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [lastReceipt, setLastReceipt] = useState<PosReceipt | null>(null);


  const [hasHold, setHasHold] = useState(false);
  const [isHolding, setIsHolding] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const payInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const lastEnterPressTime = useRef<number>(0);

  const [paymentTypeUI, setPaymentTypeUI] = useState<"CASH" | "CASHLESS">("CASH");

  const manualSubtotal = useMemo(
    () => cartItems.reduce((total, item) => total + item.selling_price * item.qty, 0),
    [cartItems],
  );
  
  const grandTotal = calculatedCart?.grand_total ?? manualSubtotal;
  const changeAmount = Math.max(paidAmount - grandTotal, 0);

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return items.slice(0, 24);
    return items
      .filter((item) =>
        [item.name, item.sku, item.barcode ?? ""].some((value) =>
          value.toLowerCase().includes(normalized),
        ),
      )
      .slice(0, 24);
  }, [items, search]);

  const loadItems = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const rows = await listPosItems();
      setItems(rows);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal memuat data barang POS.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      getHoldCart(session.id)
        .then((res) => {
          if (res.length > 0) setHasHold(true);
        })
        .catch(console.error);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      invoke<{ item_id: number; qty: number }[]>("get_hold_cart", { sessionId: session.id })
        .then((res) => {
          if (res.length > 0) setHasHold(true);
        })
        .catch(console.error);
    }
  }, [session]);

  useEffect(() => {
    if (isInitialized) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isInitialized]);

  const handleQuickAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = search.trim().toLowerCase();
    if (!normalized) return;

    const exactItem =
      items.find(
        (item) =>
          item.sku.toLowerCase() === normalized ||
          item.barcode?.toLowerCase() === normalized ||
          item.name.toLowerCase() === normalized,
      ) ?? filteredItems[0];

    if (!exactItem) {
      setErrorMessage("Barang tidak ditemukan.");
      return;
    }
    if (exactItem.stock_qty <= 0) {
      setErrorMessage(`Stok ${exactItem.name} sedang habis.`);
      return;
    }
    addItem(exactItem);
    setSearch("");
    setErrorMessage("");
  };

  const handleCheckout = async () => {
    if (!user || !session) { 
      setErrorMessage("Session kasir tidak valid.");
      return;
    }
    if (cartItems.length === 0) {
      setErrorMessage("Cart masih kosong.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const receipt = await createTransaction({
        cashier_id: user.userId,
        session_id: session.id,
        shift_id: session.shift_id,
        station_id: session.station_id,
        payment_method: "CASH",
        paid_amount: paidAmount,
        notes: notes.trim() || null,
        items: cartItems.map((item) => ({
          item_id: item.item_id,
          qty: item.qty,
        })),
      });
      setLastReceipt(receipt);
      clearCart();
      setPaidAmount(0);
      setNotes("");
      setSuccessMessage(`Transaksi ${receipt.transaction_no} berhasil disimpan.`);
      await loadItems();
      
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);

    } catch (error) {
      if (typeof error === "string") {
        setErrorMessage(error);
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Transaksi gagal disimpan.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

const handleHoldToggle = async () => {
    if (!session) return;
    setIsHolding(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!hasHold) {
        if (cartItems.length === 0) {
          setErrorMessage("Cart masih kosong, tidak ada transaksi yang bisa ditahan.");
          return;
        }

        await saveHoldCart({
          session_id: session.id,
          notes: notes.trim() || null,
          items: cartItems.map((item) => ({
            item_id: item.item_id,
            qty: item.qty,
          })),
        });

        clearCart();
        setNotes("");
        setPaidAmount(0);
        setHasHold(true);
        setSuccessMessage("Transaksi berhasil ditahan (Hold).");
      } 
      else {
        if (cartItems.length > 0) {
          setErrorMessage("Kosongkan cart terlebih dahulu untuk membuka transaksi yang ditahan.");
          return;
        }

        const holdItems = await getHoldCart(session.id);

        if (holdItems.length === 0) {
           setHasHold(false);
           setErrorMessage("Data hold tidak ditemukan.");
           return;
        }
        
        holdItems.forEach((holdItem) => {
          const fullItem = items.find((i) => i.id === holdItem.item_id);
          if (fullItem) {
            addItem(fullItem); 
            updateQty(fullItem.id, holdItem.qty);
          }
        });

        await deleteHoldCart(session.id);
        
        setHasHold(false);
        setSuccessMessage("Transaksi yang ditahan berhasil dipulihkan.");
      }
    } catch (error) {
      setErrorMessage(typeof error === "string" ? error : "Gagal memproses hold cart.");
    } finally {
      setIsHolding(false);
    }
  };

  const handleReprint = () => {
    if (lastReceipt) {
      window.print();
    }
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && search.trim() === "") {
      event.preventDefault(); 
      
      const currentTime = new Date().getTime();
      const timeDifference = currentTime - lastEnterPressTime.current;
      
      if (timeDifference < 500) {
        payInputRef.current?.focus();
        lastEnterPressTime.current = 0; 
      } else {
        lastEnterPressTime.current = currentTime; 
      }
    }
  };

  const handlePayKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      notesInputRef.current?.focus();
    }
  };

  const handleNotesKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitButtonRef.current?.focus();
    }
  };
  
const handleInitiateCloseShift = () => {
    setConfirmState({
      isOpen: true,
      title: "Tutup Shift Kasir",
      message: "Apakah Anda yakin untuk melakukan tutup shift? Pastikan uang kas dan uang sales sudah dihitung dengan benar.",
      confirmText: "Ya, Tutup Shift",
      isDanger: false,
      onConfirm: () => {
        setIsClosingShift(true);
        closeConfirmModal();
      }
    });
  };

  if (isClosingShift) {
    return <PosCloseShiftForm onCancel={() => setIsClosingShift(false)} />;
  }

  if (!session) {
    return <PosInitForm />;
  }

return (
    <>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start print:hidden">
        <section className="w-full space-y-6 lg:w-1/4">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">

            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleInitiateCloseShift}
                className="w-full border-rose-500 text-rose-600 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700"
                title="Akhiri sesi kasir"
              >
                Tutup Shift
              </Button>
            </div>

            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full border-blue-500 text-blue-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                onClick={() => void loadItems()}
              >
                Muat ulang barang
              </Button>
            </div>

          <form className="mt-5" onSubmit={handleQuickAdd}>
            <Input
              ref={searchInputRef}
              label="Scan / input barang"
              placeholder="Scan barcode atau ketik SKU / nama barang"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </form>

            <div className="mt-6 grid gap-3 lg:max-h-[65vh] lg:overflow-y-auto lg:pr-1">
              {isLoading ? (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  Memuat daftar barang...
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  Barang tidak ditemukan.
                </div>
              ) : (
                filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50 ${item.stock_qty <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => addItem(item)}
                    disabled={item.stock_qty <= 0}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.sku} {item.barcode ? `• ${item.barcode}` : ""}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          item.stock_qty > 0
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {item.stock_qty > 0 ? `Stok ${item.stock_qty}` : "Habis"}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-slate-500">{item.unit}</span>
                      <span className="text-base font-semibold text-slate-900">
                        {currencyFormatter.format(item.selling_price)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* SECTION STRUK TERAKHIR & TOMBOL REPRINT */}
          {lastReceipt && (
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Struk terakhir</h2>
                  <p className="text-xs text-slate-500 mt-1">{lastReceipt.receipt_no}</p>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="px-3 py-1.5 text-sm" 
                  onClick={handleReprint}
                >
                  Cetak Ulang
                </Button>
              </div>
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="mb-2 flex justify-between text-sm text-slate-600">
                  <span>Kasir: {lastReceipt.cashier_name}</span>
                  <span className="font-semibold text-slate-900">{currencyFormatter.format(lastReceipt.grand_total)}</span>
                </div>
                <div className="text-xs text-slate-500 text-center border-t border-slate-200 pt-2">
                  Berhasil diproses
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ============ KOLOM TENGAH (50%) ============ */}
        <section className="w-full space-y-6 lg:w-1/2">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Cart</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isCalculating ? (
                    <span className="text-blue-600 animate-pulse">Menghitung promo...</span>
                  ) : (
                    "Ringkas, jelas, dan cepat untuk kasir."
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  isLoading={isHolding}
                  onClick={handleHoldToggle}
                  className={
                    hasHold
                      ? "border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                      : ""
                  }
                >
                  {hasHold ? "Buka Hold" : "Hold"}
                </Button>

              <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setConfirmState({
                      isOpen: true,
                      title: "Kosongkan Cart",
                      message: "Yakin ingin mengosongkan cart ini? Semua item yang belum dibayar akan dihapus dari daftar.",
                      confirmText: "Kosongkan",
                      isDanger: true,
                      onConfirm: () => {
                        clearCart();
                        closeConfirmModal();
                      }
                    });
                  }} 
                  disabled={cartItems.length === 0}
                >
                  Kosongkan
                </Button>
              </div>
            </div>

            <div className="mt-5 space-y-3 lg:max-h-[70vh] lg:overflow-y-auto lg:pr-1">
              {cartItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  Cart masih kosong.
                </div>
              ) : (
                cartItems.map((item) => {
                  const calcItem = calculatedCart?.items.find((i) => i.item_id === item.item_id);
                  const isDiscounted = calcItem && calcItem.item_total_discount > 0;
                  const normalLineTotal = item.selling_price * item.qty;

                  return (
                    <div key={item.item_id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-slate-900 truncate">{item.name}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {item.sku} • stok {item.stock_qty}
                          </p>
                          {isDiscounted && calcItem.applied_promos.map((promo, idx) => (
                            <span key={idx} className="mt-1 inline-block rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 mr-1">
                              {promo.promo_name}
                            </span>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="text-[11px] font-medium text-rose-500 hover:text-rose-700 shrink-0 ml-2"
                          onClick={() => removeItem(item.item_id)}
                        >
                          Hapus
                        </button>
                      </div>

                      <div className="mt-2.5 flex items-end justify-between gap-3">
                        <div className="flex items-center gap-1.5">
                          {/* 5. Tombol qty di-custom agar kecil dan kotak sempurna (h-7 w-7) */}
                          <button 
                            type="button" 
                            className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            onClick={() => decrementItem(item.item_id)} 
                            disabled={isCalculating}
                          >
                            -
                        </button>
                          <input
                            className="h-7 w-12 rounded border border-slate-300 px-1 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            type="number"
                            min="1"
                            max={item.stock_qty}
                            value={item.qty}
                            disabled={isCalculating}
                            onChange={(event) => {
                              const value = event.target.value;
                              if (/^\d*$/.test(value)) {
                                updateQty(item.item_id, value === "" ? 0 : Number(value));
                              }
                            }}
                          />
                          <button 
                            type="button" 
                            className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            onClick={() => incrementItem(item.item_id)} 
                            disabled={isCalculating}
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          {isDiscounted ? (
                            <>
                              <p className="text-[10px] text-slate-400 line-through leading-none mb-1">
                                {currencyFormatter.format(normalLineTotal)}
                              </p>
                              <p className="text-sm font-bold text-orange-600 leading-none">
                                {currencyFormatter.format(calcItem.final_price)}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm font-bold text-slate-900 leading-none">
                              {currencyFormatter.format(normalLineTotal)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* ============ KOLOM KANAN (25%) ============ */}
        <aside className="w-full space-y-6 lg:w-1/4">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:sticky lg:top-6">
            <h2 className="text-xl font-semibold text-slate-900">Pembayaran</h2>
            <div className="mt-4 flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                  paymentTypeUI === "CASH"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => setPaymentTypeUI("CASH")}
              >
                Tunai
              </button>
              <button
                type="button"
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                  paymentTypeUI === "CASHLESS"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => setPaymentTypeUI("CASHLESS")}
              >
                Non-Tunai
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {calculatedCart && (
                <div className="space-y-2 mb-4 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{currencyFormatter.format(manualSubtotal)}</span>
                  </div>

                  {calculatedCart.total_discount > 0 && (
                    <div className="flex justify-between text-orange-600 border-b border-slate-100 pb-2">
                      <span>Diskon Promo:</span>
                      <span>-{currencyFormatter.format(calculatedCart.total_discount)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-slate-900 font-semibold text-lg">Grand Total</span>
                <span className="text-xl font-bold text-slate-900">
                  {currencyFormatter.format(grandTotal)}
                </span>
              </div>

            <Input
              ref={payInputRef}
              label="Bayar"
              type="number"
              min="0"
              value={paidAmount === 0 ? "" : paidAmount}
              onChange={(event) => {
                const value = event.target.value;
                if (/^\d*$/.test(value) && value.length <= 9) {
                  setPaidAmount(value === "" ? 0 : Number(value));
                }
              }}
              placeholder="Masukkan uang bayar"
              onKeyDown={handlePayKeyDown} 
            />
            <Input
              ref={notesInputRef}
              label="Catatan transaksi"
              maxLength={30}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Opsional"
              onKeyDown={handleNotesKeyDown}
            />

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-500">Kembalian</span>
                <span className="text-lg font-semibold text-slate-900">
                  {currencyFormatter.format(changeAmount)}
                </span>
              </div>

              {errorMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </div>
              )}

              <Button
                ref={submitButtonRef}
                className="w-full"
                type="button"
                isLoading={isSubmitting || isCalculating}
                disabled={cartItems.length === 0 || !paidAmount || paidAmount < grandTotal}
                onClick={handleCheckout}
              >
                {isSubmitting ? "Memproses transaksi..." : "Simpan transaksi"}
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {/* =========================================================================================
          AREA CETAK STRUK
          ========================================================================================= */}
      {lastReceipt && (
        <div 
          className="hidden print:block print:w-[58mm] print:bg-white print:text-black font-mono text-xs" 
          style={{ padding: '0', margin: '0' }}
        >
          <div className="text-center mb-3">
            <h1 className="font-bold text-sm">MINIMARKET PORTFOLIO</h1>
            <p>Jl. Karya Indah No. 123</p>
            <p>Malang, Jawa Timur</p>
          </div>
          
          <div className="border-b border-dashed border-black mb-2 pb-2">
            <p className="flex justify-between">
              <span>No:</span>
              <span>{lastReceipt.receipt_no}</span>
            </p>
            <p className="flex justify-between">
              <span>Kasir:</span>
              <span>{lastReceipt.cashier_name}</span>
            </p>
            <p className="flex justify-between">
              <span>Waktu:</span>
              <span>{new Date(lastReceipt.created_at).toLocaleString("id-ID")}</span>
            </p>
          </div>

          <div className="border-b border-dashed border-black mb-2 pb-2">
            {lastReceipt.items.map((item, idx) => {
              const normalTotal = item.qty * item.unit_price;
              const discountAmount = normalTotal - item.line_total;

              return (
                <div key={idx} className="mb-1.5">
                  <p className="truncate">{item.item_name}</p>
                  
                  <div className="flex justify-between">
                    <span>{item.qty} x {currencyFormatter.format(item.unit_price)}</span>
                    <span>{currencyFormatter.format(discountAmount > 0 ? normalTotal : item.line_total)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-black">
                      <span className="pl-4">(Diskon)</span>
                      <span>-{currencyFormatter.format(discountAmount)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-b border-dashed border-black mb-2 pb-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{currencyFormatter.format(lastReceipt.subtotal)}</span>
            </div>
            {lastReceipt.subtotal > lastReceipt.grand_total && (
              <div className="flex justify-between">
                <span>Diskon:</span>
                <span>-{currencyFormatter.format(lastReceipt.subtotal - lastReceipt.grand_total)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold mt-1">
              <span>TOTAL:</span>
              <span>{currencyFormatter.format(lastReceipt.grand_total)}</span>
            </div>
          </div>

          <div className="mb-3">
            <div className="flex justify-between">
              <span>Tunai:</span>
              <span>{currencyFormatter.format(lastReceipt.paid_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Kembali:</span>
              <span>{currencyFormatter.format(lastReceipt.change_amount)}</span>
            </div>
            {lastReceipt.tax_total > 0 && (
              <div className="flex justify-between mt-1">
                <span>PPN :</span>
                <span>{currencyFormatter.format(lastReceipt.tax_total)}</span>
              </div>
            )}
            
          </div>

          <div className="text-center mt-4">
            <p>Terima Kasih</p>
            <p>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.</p>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={closeConfirmModal}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        onConfirm={confirmState.onConfirm}
        isDanger={confirmState.isDanger}
      />
      
    </>
  );
}