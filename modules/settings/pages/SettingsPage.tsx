  import { useEffect, useState, FormEvent } from "react";
  import { useUserStore } from "../store/useUserStore";
  import { useAuthStore } from "@modules/auth/store/useAuthStore";
  import { registerUser, deleteUser } from "@shared/services/tauri";
  import { Button } from "@shared/components/ui/Button"; 
  import { Input } from "@shared/components/ui/Input";

  export function SettingsPage() {
    const { users, fetchUsers, isLoading } = useUserStore();
    const sessionToken = useAuthStore((state) => state.sessionToken);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [formData, setFormData] = useState({
      fullName: "",
      username: "",
      password: "",
      roleCode: "CASHIER",
    });

    useEffect(() => {
      void fetchUsers();
    }, [fetchUsers]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmitForm = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setErrorMessage("");

      if (!formData.fullName.trim() || !formData.username.trim() || !formData.password.trim()) {
        setErrorMessage("Semua kolom wajib diisi.");
        return;
      }

      if (sessionToken) {
        setIsSubmitting(true);
        try {
          await registerUser({
            session_token: sessionToken,
            full_name: formData.fullName.trim(),
            username: formData.username.trim(),
            password: formData.password.trim(),
            role_code: formData.roleCode,
          });
          
          setFormData({ fullName: "", username: "", password: "", roleCode: "CASHIER" });
          setIsAddModalOpen(false);
          void fetchUsers(); 
        } catch (error: any) {
          setErrorMessage(error instanceof Error ? error.message : String(error));
        } finally {
          setIsSubmitting(false);
        }
      }
    };

    const handleDeleteClick = (id: number) => {
      setUserToDelete(id);
      setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
      if (userToDelete !== null && sessionToken) {
        setIsDeleting(true);
        try {
          await deleteUser({ session_token: sessionToken, id: userToDelete });
          void fetchUsers();
          setIsDeleteModalOpen(false);
          setUserToDelete(null);
        } catch (error: any) {
          alert(error instanceof Error ? error.message : String(error));
        } finally {
          setIsDeleting(false);
        }
      }
    };

    return (
      <div className="space-y-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Manajemen Pengguna</h1>
            <p className="text-sm text-slate-500">Kelola akses Kasir, Supervisor, dan Admin.</p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>+ Tambah Pengguna</Button>
        </div>

        {/* Tabel Pengguna */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-900">
              <tr>
                <th className="px-6 py-4 font-medium">Nama Lengkap</th>
                <th className="px-6 py-4 font-medium">Username</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-4 text-center">Memuat data...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-4 text-center">Belum ada pengguna lain.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{u.full_name}</td>
                    <td className="px-6 py-4">{u.username}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
                        {u.role_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.role_code !== "ADMIN" && (
                        <Button variant="outline" onClick={() => handleDeleteClick(u.id)}>
                          Hapus
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MODAL TAMBAH PENGGUNA */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Tambah Pengguna Baru</h2>
              
              <form onSubmit={handleSubmitForm} className="space-y-4">
                <Input
                  label="Nama Lengkap"
                  name="fullName"
                  placeholder="Contoh: Budi Santoso"
                  value={formData.fullName}
                  onChange={handleInputChange}
                />

                <Input
                  label="Username"
                  name="username"
                  autoComplete="off"
                  placeholder="Contoh: budi.kasir"
                  value={formData.username}
                  onChange={handleInputChange}
                />

                <Input
                  label="Password"
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  placeholder="Masukkan password"
                  value={formData.password}
                  onChange={handleInputChange}
                />

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Role / Jabatan</label>
                  <select
                    name="roleCode"
                    value={formData.roleCode}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="CASHIER">Kasir</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>

                {errorMessage && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {errorMessage}
                  </div>
                )}

                <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    Batal
                  </Button>
                  <Button type="submit" isLoading={isSubmitting}>
                    {isSubmitting ? "Menyimpan..." : "Simpan Pengguna"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL KONFIRMASI HAPUS */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Hapus Pengguna?</h2>
              <p className="text-sm text-slate-500 mb-8">
                Apakah Anda yakin ingin menghapus pengguna ini? Akun akan dinonaktifkan dan tidak dapat digunakan untuk login kembali.
              </p>
              
              <div className="flex justify-center gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setUserToDelete(null);
                  }}
                  disabled={isDeleting}
                >
                  Batal
                </Button>
                
                {/* Tombol Hapus kustom dengan warna merah (bisa disesuaikan jika Button Anda mendukung variant 'danger') */}
                <button 
                  type="button" 
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? "Menghapus..." : "Ya, Hapus"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }