import { create } from 'zustand';
import { UserListItem, getAllUsers } from '@shared/services/tauri';
import { useAuthStore } from '@modules/auth/store/useAuthStore';

interface UserStoreState {
  users: UserListItem[];
  isLoading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
}

export const useUserStore = create<UserStoreState>((set) => ({
  users: [],
  isLoading: false,
  error: null,
  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = useAuthStore.getState().sessionToken;
      if (!token) throw new Error("Sesi tidak valid");
      
      const data = await getAllUsers(token);
      set({ users: data.filter(u => u.is_active === 1), isLoading: false });
    } catch (err: any) {
      set({ error: err.message || "Gagal memuat data pengguna", isLoading: false });
    }
  },
}));