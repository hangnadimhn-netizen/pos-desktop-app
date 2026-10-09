import { create } from "zustand";
import { PosItem, CartResponse, calculateCart } from "@shared/services/tauri";

export interface PosCartLine {
  item_id: number;
  sku: string;
  name: string;
  unit: string;
  selling_price: number;
  qty: number;
  stock_qty: number;
}

interface PosCartState {
  items: PosCartLine[];
  calculatedCart: CartResponse | null;
  isCalculating: boolean;
  
  addItem: (item: PosItem) => void;
  incrementItem: (itemId: number) => void;
  decrementItem: (itemId: number) => void;
  updateQty: (itemId: number, qty: number) => void;
  removeItem: (itemId: number) => void;
  clearCart: () => void;
  
  syncPromotions: () => Promise<void>;
}

export const usePosCartStore = create<PosCartState>((set, get) => ({
  items: [],
  calculatedCart: null,
  isCalculating: false,

  syncPromotions: async () => {
    const { items } = get();
    
    if (items.length === 0) {
      set({ calculatedCart: null, isCalculating: false });
      return;
    }

    set({ isCalculating: true });
    try {
      const payload = {
        items: items.map((i) => ({
          item_id: i.item_id,
          qty: i.qty,
          original_price: i.selling_price,
        })),
      };
      
      const response = await calculateCart(payload);
      set({ calculatedCart: response });
    } catch (error) {
      console.error("Gagal menghitung promo:", error);
    } finally {
      set({ isCalculating: false });
    }
  },

  addItem: (item) => {
    if (item.stock_qty <= 0) return;
    set((state) => {
      const existingItem = state.items.find((line) => line.item_id === item.id);
      if (existingItem) {
        if (existingItem.qty >= existingItem.stock_qty) return state;
        return {
          items: state.items.map((line) =>
            line.item_id === item.id ? { ...line, qty: line.qty + 1 } : line,
          ),
        };
      }
      return {
        items: [
          {
            item_id: item.id,
            sku: item.sku,
            name: item.name,
            unit: item.unit,
            selling_price: item.selling_price,
            qty: 1,
            stock_qty: item.stock_qty,
          },
          ...state.items,
        ],
      };
    });
    get().syncPromotions();
  },

  incrementItem: (itemId) => {
    set((state) => ({
      items: state.items.map((line) => {
        if (line.item_id !== itemId || line.qty >= line.stock_qty) return line;
        return { ...line, qty: line.qty + 1 };
      }),
    }));
    get().syncPromotions();
  },

  decrementItem: (itemId) => {
    set((state) => ({
      items: state.items
        .map((line) => (line.item_id === itemId ? { ...line, qty: Math.max(0, line.qty - 1) } : line))
        .filter((line) => line.qty > 0),
    }));
    get().syncPromotions();
  },

  updateQty: (itemId, qty) => {
    set((state) => ({
      items: state.items
        .map((line) => {
          if (line.item_id !== itemId) return line;
          const safeQty = Math.min(Math.max(qty, 0), line.stock_qty);
          return { ...line, qty: safeQty };
        })
        .filter((line) => line.qty > 0),
    }));
    get().syncPromotions();
  },

  removeItem: (itemId) => {
    set((state) => ({
      items: state.items.filter((line) => line.item_id !== itemId),
    }));
    get().syncPromotions();
  },

  clearCart: () => {
    set({ items: [], calculatedCart: null });
  },
}));