import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.2fr_0.8fr]">
        <section className="hidden flex-col justify-between border-r border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_35%),linear-gradient(180deg,_rgba(15,23,42,0.96),_rgba(2,6,23,1))] px-10 py-12 lg:flex">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-blue-200">
              POS Kasir
            </span>
            <div className="max-w-xl space-y-4">
              <h1 className="text-4xl font-semibold leading-tight">
                Sistem kasir modern untuk alur minimarket yang cepat, rapi, dan mudah dikembangkan.
              </h1>
              <p className="text-base leading-7 text-slate-300">
                Fondasi ini disiapkan untuk login berbasis role, transaksi kasir, manajemen stok,
                promo, cetak struk, dan laporan harian dalam satu aplikasi desktop.
              </p>
            </div>
          </div>

          <div className="grid gap-4 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="font-medium text-white">Role-based access</p>
              <p className="mt-2">
                Kasir, Supervisor, dan Administrator dipisahkan agar setiap modul aman dan jelas.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="font-medium text-white">Arsitektur modular</p>
              <p className="mt-2">
                Frontend dan backend dipisah per fitur supaya lebih mudah dirawat saat aplikasi tumbuh.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
