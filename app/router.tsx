import { Navigate, createBrowserRouter } from "react-router-dom";

import { LoginPage } from "@modules/auth/pages/LoginPage";
import { InventoryPage } from "@modules/management/pages/InventoryPage";
import { PosPage } from "@modules/pos/pages/PosPage";
import { ProtectedRoute } from "@shared/components/ProtectedRoute";
import { AuthLayout } from "@shared/layouts/AuthLayout";
import { MainLayout } from "@shared/layouts/MainLayout";
import { ReportsPage } from "@modules/reports/pages/ReporPage";
import { SettingsPage } from "@modules/settings/pages/SettingsPage";
import { PromotionPage } from "@modules/promotion/pages/PromotionPage";

function DashboardPage() {
  const features = [
    [
      "Otentikasi & Pengguna", 
      "Keamanan berbasis Argon2 dengan manajemen sesi token. Mendukung Role-Based Access Control (RBAC) untuk mengelola data staf dan kasir."
    ],
    [
      "Manajemen Inventori", 
      "Pengelolaan barang, kategori, SKU & Barcode. Dilengkapi pelacakan riwayat stok, penyesuaian stok (in/out), hingga impor CSV massal."
    ],
    [
      "Point of Sale (Kasir)", 
      "Sistem transaksi tangguh dengan fitur Hold Cart, perhitungan pajak/kembalian otomatis, pembuatan struk, dan manajemen buka/tutup Shift."
    ],
    [
      "Mesin Promosi", 
      "Mendukung kalkulasi diskon dinamis seperti Persentase, Nominal (Flat), Beli X Gratis Y (BOGO), dan diskon minimal belanja (Threshold)."
    ],
    [
      "Laporan & Analitik", 
      "Pantau ringkasan pendapatan, performa penjualan per kasir, penjualan per stasiun, hingga rekapitulasi shift yang sudah ditutup."
    ],
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 px-6 py-8 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.2em] text-blue-200">Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold">Point of Sale System Portofolio</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
          Sistem kasir dan manajemen toko berbasis desktop yang dirancang sebagai proyek 
          portofolio. Aplikasi mencakup transaksi penjualan, manajemen produk dan stok, pembayaran, 
          pajak, serta laporan operasional dalam satu sistem terintegrasi
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
          <b>Dibangun menggunakan Tauri, Rust, React, Tailwind CSS, dan SQLite 
          dengan fokus pada performa, efisiensi, keamanan data, dan pengalaman pengguna yang sederhana.
          </b>
          </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {features.map(([title, description]) => (
          <div 
            key={title} 
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300"
          >
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export const appRouter = createBrowserRouter([
  {
    path: "/login",
    element: <AuthLayout />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "CASHIER"]} />,
        children: [
          {
            path: "/pos",
            element: <MainLayout />,
            children: [
              {
                index: true,
                element: <PosPage />,
              },
            ],
          },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={["ADMIN","SUPERVISOR", "CASHIER"]} />,
        children: [
          {
            path: "/management/items",
            element: <MainLayout />,
            children: [
              {
                index: true,
                element: <InventoryPage />,
              },
            ],
          },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR"]} />,
        children: [
          {
            path: "/reports",
            element: <MainLayout />,
            children: [
              {
                index: true,
                element: <ReportsPage />,
              },
            ],
          },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={["ADMIN"]} />,
        children: [
          {
            path: "/settings",
            element: <MainLayout />,
            children: [
              {
                index: true,
                element: <SettingsPage />,
              },
            ],
          },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={["ADMIN"]} />,
        children: [
          {
            path: "/promotions",
            element: <MainLayout />,
            children: [
              {
                index: true,
                element: <PromotionPage />,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);