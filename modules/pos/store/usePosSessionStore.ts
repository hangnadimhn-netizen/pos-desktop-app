import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PosSession } from "@shared/services/tauri";

interface PosSessionState {
  isInitialized: boolean;
  session: PosSession | null;
  setSession: (session: PosSession) => void;
  closeSession: () => void;
}

export const usePosSessionStore = create<PosSessionState>()(
  persist(
    (set) => ({
      isInitialized: false,
      session: null,
      setSession: (session) => set({ isInitialized: true, session }),
      closeSession: () => set({ isInitialized: false, session: null }),
    }),
    {
      name: "pos-session-storage",
    }
  )
);