import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_WONKA_CONTENT,
  type ProductItem,
  type WonkaSiteContent,
} from "@/src/data/wonkaData";

export interface CartItem {
  productId: string;
  categoryId: string;
  name: string;
  detail?: string;
  price: number;
  image: string;
  quantity: number;
}

interface StoreContextValue {
  content: WonkaSiteContent;
  refreshMenu: () => Promise<void>;
  cart: CartItem[];
  addToCart: (product: ProductItem, quantity?: number) => void;
  updateQuantity: (productId: string, delta: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  getQuantity: (productId: string) => number;
  cartCount: number;
  cartTotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CART_STORAGE_KEY = "wonka_sweets_cart_v1";

const StoreContext = createContext<StoreContextValue | null>(null);

function loadInitialCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<WonkaSiteContent>(DEFAULT_WONKA_CONTENT);
  const [cart, setCart] = useState<CartItem[]>(loadInitialCart);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const refreshMenu = useCallback(async () => {
    try {
      const res = await fetch("/api/menu");
      if (!res.ok) return;
      const data = (await res.json()) as Partial<WonkaSiteContent>;
      if (data && data.business && data.reservation && data.categories && data.products) {
        setContent({
          business: data.business,
          reservation: data.reservation,
          categories: data.categories,
          products: data.products,
        });
      }
    } catch {
      // Keep default fallback if offline
    }
  }, []);

  useEffect(() => {
    void refreshMenu();
  }, [refreshMenu]);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage quota errors
    }
  }, [cart]);

  const addToCart = (product: ProductItem, quantity = 1) => {
    const safeQty = Math.max(1, Math.floor(quantity));
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                name: product.name,
                detail: product.detail,
                price: product.price,
                image: product.image,
                quantity: item.quantity + safeQty,
              }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          categoryId: product.categoryId,
          name: product.name,
          detail: product.detail,
          price: product.price,
          image: product.image,
          quantity: safeQty,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => setCart([]);

  const getQuantity = (productId: string) => {
    return cart.find((item) => item.productId === productId)?.quantity ?? 0;
  };

  const { cartCount, cartTotal } = useMemo(() => {
    return cart.reduce(
      (acc, item) => ({
        cartCount: acc.cartCount + item.quantity,
        cartTotal: acc.cartTotal + item.price * item.quantity,
      }),
      { cartCount: 0, cartTotal: 0 }
    );
  }, [cart]);

  return (
    <StoreContext.Provider
      value={{
        content,
        refreshMenu,
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        getQuantity,
        cartCount,
        cartTotal,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
