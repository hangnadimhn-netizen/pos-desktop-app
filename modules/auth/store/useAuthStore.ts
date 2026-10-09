import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  userId: number;
  username: string;
  full_name: string;
  role_code: string;
  role_name: string;
}

interface AuthState {
  user: User | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
 
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      sessionToken: null,
      isAuthenticated: false,

      setAuth: (user, token) => set({ 
        user, 
        sessionToken: token, 
        isAuthenticated: true 
      }),

      clearAuth: () => set({ 
        user: null, 
        sessionToken: null, 
        isAuthenticated: false 
      }),
    }),
    {
      name: 'pos-auth-storage',
    }
  )
);
