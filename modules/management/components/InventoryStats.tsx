import React, { useMemo } from "react";
import { InventoryItem, InventoryCategory } from "@shared/services/tauri";

interface StatsProps {
  items: InventoryItem[];
  categories: InventoryCategory[];
}

export function InventoryStats({ items, categories }: StatsProps) {
  const activeItems = useMemo(() => items.filter((i) => i.is_active), [items]);
  
  const totalLowStock = useMemo(() => 
    activeItems.filter((i) => i.stock_qty <= i.min_stock_qty && i.stock_qty > 0).length, 
  [activeItems]);
  
  const totalOutOfStock = useMemo(() => 
    activeItems.filter((i) => i.stock_qty <= 0).length, 
  [activeItems]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      
      <div className="px-4 py-3 sm:px-5">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Barang</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{activeItems.length}</p>
      </div>

      <div className="px-4 py-3 sm:px-5">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Stok Menipis</p>
        <p className="mt-1 text-2xl font-bold text-amber-600">{totalLowStock}</p>
      </div>

      <div className="px-4 py-3 sm:px-5">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Stok Habis</p>
        <p className="mt-1 text-2xl font-bold text-red-600">{totalOutOfStock}</p>
      </div>

      <div className="px-4 py-3 sm:px-5">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Kategori</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{categories.length}</p>
      </div>

    </div>
  );
}