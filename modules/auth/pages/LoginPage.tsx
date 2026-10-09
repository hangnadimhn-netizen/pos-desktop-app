import { FormEvent, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuthStore } from "@modules/auth/store/useAuthStore";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { login as loginCommand } from "@shared/services/tauri";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectPath = useMemo(() => {
    const nextPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    return nextPath && nextPath !== "/login" ? nextPath : "/";
  }, [location.state]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      setErrorMessage("Username dan password wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await loginCommand({
        username: username.trim(),
        password: password.trim(),
      });

      setAuth(
        {
          userId: response.user.user_id,
          username: response.user.username,
          full_name: response.user.full_name,
          role_code: response.user.role_code,
          role_name: response.user.role_name,
        },
        response.session_token,
      );

      navigate(redirectPath, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login gagal. Silakan coba lagi.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-950/10">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Login</p>
        <h2 className="text-3xl font-semibold text-slate-900">Masuk ke POS Kasir</h2>
        <p className="text-sm leading-6 text-slate-500">
          Gunakan akun Anda untuk mengakses modul sesuai peran. Default awal: `admin` / `admin123`.
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <Input
          label="Username"
          name="username"
          className="text-slate-900"
          autoComplete="username"
          placeholder="Masukkan username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />

        <Input
          label="Password"
          type="password"
          name="password"
          className="text-slate-900"
          autoComplete="current-password"
          placeholder="Masukkan password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {errorMessage}
          </div>
        ) : null}

        <Button className="w-full" type="submit" isLoading={isSubmitting}>
          {isSubmitting ? "Memproses..." : "Masuk"}
        </Button>
      </form>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Role yang disiapkan</p>
        <p className="mt-2">`CASHIER` untuk transaksi, `SUPERVISOR` untuk laporan, `ADMIN` untuk pengaturan dan master data.</p>
      </div>
    </div>
  );
}
