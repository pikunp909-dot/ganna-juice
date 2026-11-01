import { createContext, useContext, useEffect, useState, useCallback } from "react";

const CartCtx = createContext(null);
const KEY = "ganna_cart";
const MAX_QTY = 99;

export function CartProvider({ children }) {
  const [lines, setLines] = useState([]);

  // hydrate from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      /* corrupted cart — start empty */
    }
  }, []);

  // persist on every change
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* storage full/unavailable — cart still works in memory */
    }
  }, [lines]);

  const add = useCallback((item, qty = 1) => {
    setLines((prev) => {
      const found = prev.find((l) => l.item.id === item.id);
      if (found) {
        return prev.map((l) =>
          l.item.id === item.id ? { ...l, qty: Math.min(l.qty + qty, MAX_QTY) } : l
        );
      }
      return [...prev, { item, qty: Math.min(qty, MAX_QTY) }];
    });
  }, []);

  const setQty = useCallback((id, qty) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.item.id !== id)
        : prev.map((l) => (l.item.id === id ? { ...l, qty: Math.min(qty, MAX_QTY) } : l))
    );
  }, []);

  const remove = useCallback((id) => {
    setLines((prev) => prev.filter((l) => l.item.id !== id));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const count = lines.reduce((n, l) => n + l.qty, 0);
  const total = lines.reduce((n, l) => n + l.qty * Number(l.item.price || 0), 0);

  return (
    <CartCtx.Provider value={{ lines, count, total, add, setQty, remove, clear }}>
      {children}
    </CartCtx.Provider>
  );
}

export const useCart = () => useContext(CartCtx);
