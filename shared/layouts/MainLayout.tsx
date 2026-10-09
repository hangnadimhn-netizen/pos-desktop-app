import { NavLink, useNavigate, Outlet } from "react-router-dom";

import { useAuthStore } from "@modules/auth/store/useAuthStore";
import { Button } from "@shared/components/ui/Button";
import { logout as logoutCommand } from "@shared/services/tauri";

export function MainLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const sessionToken = useAuthStore((state) => state.sessionToken);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const handleLogout = async () => {
    try {
      if (sessionToken) {
        await logoutCommand(sessionToken);
      }
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 print:bg-white">
      <header className="border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-lg font-semibold">POS Kasir</p>
            <p className="text-sm text-slate-500">Tauri + React + SQLite</p>
          </div>

          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-2 md:flex">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-medium ${
                    isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                Dashboard
              </NavLink>

            {user?.role_code && ["ADMIN", "SUPERVISOR", "CASHIER"].includes(user.role_code) && (
                <NavLink
                  to="/management/items"
                  className={({ isActive }) =>
                    `rounded-xl px-3 py-2 text-sm font-medium ${
                      isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                    }`
                  }
                >
                  Inventory
                </NavLink>
            )}

            {user?.role_code && ["ADMIN", "SUPERVISOR", "CASHIER"].includes(user.role_code) && (
              <NavLink
                to="/pos"
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-medium ${
                    isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                POS
              </NavLink>
            )}

            {user?.role_code && ["ADMIN", "SUPERVISOR"].includes(user.role_code) && (
              <NavLink
                to="/reports"
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-medium ${
                    isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                Laporan
              </NavLink>
            )}
            {user?.role_code === "ADMIN" && (
                <NavLink
                  to="/settings"
                  className={({ isActive }) =>
                    `rounded-xl px-3 py-2 text-sm font-medium ${
                      isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                    }`
                  }
                >
                  Pengaturan
                </NavLink>
              )}
              {user?.role_code === "ADMIN" && (
                <NavLink
                  to="/promotions"
                  className={({ isActive }) =>
                    `rounded-xl px-3 py-2 text-sm font-medium ${
                      isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                    }`
                  }
                >
                  Promosi
                </NavLink>
              )}

              
            </nav>

            <div className="hidden rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-right sm:block">
              <p className="text-sm font-medium text-slate-900">{user?.full_name ?? "Pengguna"}</p>
              <p className="text-xs uppercase tracking-wide text-slate-500">{user?.role_name ?? "-"}</p>
            </div>
            <Button type="button" variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
