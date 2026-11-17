import { motion } from "motion/react";
import {
  ArrowLeft,
  Check,
  Instagram,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";
import { useState } from "react";
import { useStore } from "@/src/context/StoreContext";
import OrderingHeader from "@/src/components/OrderingHeader";
import type { ProductItem } from "@/src/data/wonkaData";

interface CategoryProductsViewProps {
  categoryId: string;
  onSelectCategory: (categoryId: string) => void;
  onBackToCategories: () => void;
  onBackToShowcase: () => void;
}

export default function CategoryProductsView({
  categoryId,
  onSelectCategory,
  onBackToCategories,
  onBackToShowcase,
}: CategoryProductsViewProps) {
  const {
    content,
    addToCart,
    getQuantity,
    cartCount,
    cartTotal,
    setIsCartOpen,
  } = useStore();

  const [justAddedMap, setJustAddedMap] = useState<Record<string, number>>({});
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});

  const categoryIndex = content.categories.findIndex((c) => c.id === categoryId);
  const category = content.categories[categoryIndex >= 0 ? categoryIndex : 0];
  const categoryProducts = content.products.filter(
    (p) => p.categoryId === category.id
  );

  const indexLabel =
    categoryIndex >= 0
      ? categoryIndex + 1 < 10
        ? `0${categoryIndex + 1}`
        : `${categoryIndex + 1}`
      : "01";

  const getPendingQty = (productId: string) => selectedQuantities[productId] ?? 1;

  const adjustPendingQty = (productId: string, delta: number) => {
    setSelectedQuantities((prev) => {
      const current = prev[productId] ?? 1;
      const next = Math.max(1, Math.min(99, current + delta));
      return { ...prev, [productId]: next };
    });
  };

  const handleAdd = (product: ProductItem) => {
    const qtyToAdd = getPendingQty(product.id);
    addToCart(product, qtyToAdd);
    setJustAddedMap((prev) => ({ ...prev, [product.id]: qtyToAdd }));
    setSelectedQuantities((prev) => ({ ...prev, [product.id]: 1 }));
    window.setTimeout(() => {
      setJustAddedMap((curr) => {
        if (!(product.id in curr)) return curr;
        const next = { ...curr };
        delete next[product.id];
        return next;
      });
    }, 1100);
  };

  return (
    <div
      key={category.id}
      className="min-h-[100svh] flex flex-col bg-[#f6f1ea] text-[#211a15]"
    >
      <OrderingHeader
        activeCategoryId={category.id}
        onBackToShowcase={onBackToShowcase}
        onSelectCategory={onSelectCategory}
        onBackToCategories={onBackToCategories}
        showCategoryNav={true}
      />

      {/* Mobile & Tablet touch category switcher */}
      <div className="border-b border-[var(--color-border)] bg-[#efe8de]/70 md:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-4 py-2.5">
          {content.categories.map((cat) => {
            const active = cat.id === category.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`min-h-[38px] px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? "bg-[#211a15] text-[#f6f1ea]"
                    : "bg-[#f6f1ea] text-[#5c4e43] hover:text-[#211a15]"
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        {/* Back button + Text-only Category Editorial Header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-7 border-b border-[var(--color-border)] pb-6 sm:mb-10 sm:pb-8"
        >
          <button
            type="button"
            onClick={onBackToCategories}
            className="mb-4 inline-flex min-h-[36px] items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#5c4e43] transition-colors hover:text-[#211a15] cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Categories</span>
          </button>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-[#6b5a4d] tabular-nums">
              <span>Collection {indexLabel}</span>
              <span aria-hidden="true">·</span>
              <span>
                {categoryProducts.length}{" "}
                {categoryProducts.length === 1 ? "Selection" : "Selections"}
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#211a15] sm:text-5xl text-balance">
              {category.name}
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#5c4e43] sm:text-base">
              {category.description}
            </p>
          </div>
        </motion.div>

        {/* Text-Based Product Grid: 1 col on <360px, 2 cards/row on mobile, 3 on desktop */}
        <div className="grid grid-cols-1 gap-3.5 min-[360px]:grid-cols-2 sm:gap-6 md:grid-cols-3 lg:gap-7">
          {categoryProducts.map((product, idx) => {
            const pendingQty = getPendingQty(product.id);
            const inCartQty = getQuantity(product.id);
            const addedCount = justAddedMap[product.id];

            return (
              <motion.article
                key={product.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.48,
                  delay: 0.06 + idx * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="group flex flex-col justify-between border border-[var(--color-border)] bg-[#efe8de]/60 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#efe8de] hover:shadow-md sm:p-6"
              >
                {/* Product Editorial Info (No Images) */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {product.detail ? (
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7b6857] sm:text-xs">
                          {product.detail}
                        </p>
                      ) : null}

                      <h2 className="font-display text-lg font-bold leading-snug text-[#211a15] sm:text-2xl">
                        {product.name}
                      </h2>
                    </div>
                  </div>

                  <div
                    className="my-3 h-[1.5px] w-8 bg-[#c4a27a] transition-all duration-300 group-hover:w-12"
                    aria-hidden="true"
                  />

                  <p className="text-xs leading-relaxed text-[#5c4e43] sm:text-sm">
                    {product.description}
                  </p>
                </div>

                {/* Price, Quantity Selector & Add to Cart */}
                <div className="mt-5 border-t border-[var(--color-border)] pt-3.5 sm:mt-6 sm:pt-4">
                  <div className="mb-3 flex items-baseline justify-between gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6b5a4d] sm:text-xs">
                      Price
                    </span>
                    <span className="font-display text-base font-bold text-[#211a15] tabular-nums sm:text-xl">
                      {product.price} EGP
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {/* Quantity Selector */}
                    <div
                      className="flex items-center justify-between border border-[#211a15]/20 bg-[#f6f1ea]"
                      aria-label={`Quantity selector for ${product.name}`}
                    >
                      <button
                        type="button"
                        onClick={() => adjustPendingQty(product.id, -1)}
                        disabled={pendingQty <= 1}
                        className="flex h-9 w-10 items-center justify-center text-[#211a15] transition-colors hover:bg-[#efe8de] disabled:opacity-35 cursor-pointer sm:h-10 sm:w-11"
                        aria-label={`Decrease quantity for ${product.name}`}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>

                      <span className="text-xs font-bold text-[#211a15] tabular-nums sm:text-sm">
                        Qty: {pendingQty}
                      </span>

                      <button
                        type="button"
                        onClick={() => adjustPendingQty(product.id, 1)}
                        className="flex h-9 w-10 items-center justify-center text-[#211a15] transition-colors hover:bg-[#efe8de] cursor-pointer sm:h-10 sm:w-11"
                        aria-label={`Increase quantity for ${product.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      type="button"
                      onClick={() => handleAdd(product)}
                      className="flex min-h-[42px] w-full items-center justify-center gap-2 bg-[#c4a27a] px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] text-[#241b14] transition-all hover:brightness-105 cursor-pointer sm:py-3 sm:text-xs"
                    >
                      {addedCount ? (
                        <>
                          <Check className="h-3.5 w-3.5 shrink-0" />
                          <span>Added ({addedCount})</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
                          <span>Add to Cart</span>
                        </>
                      )}
                    </button>

                    {inCartQty > 0 ? (
                      <button
                        type="button"
                        onClick={() => setIsCartOpen(true)}
                        className="mt-0.5 text-center text-[11px] font-medium text-[#6b4f2f] underline-offset-4 hover:underline cursor-pointer tabular-nums sm:text-xs"
                      >
                        {inCartQty} in your bag · View Cart
                      </button>
                    ) : null}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* Bottom Cart Bar when items are selected */}
        {cartCount > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 flex flex-col items-start justify-between gap-4 border border-[var(--color-border)] bg-[#efe8de] p-4 sm:flex-row sm:items-center sm:p-6"
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#6b5a4d]">
                Your Order Summary
              </p>
              <p className="mt-1 font-display text-lg font-bold text-[#211a15] tabular-nums sm:text-xl">
                {cartCount} {cartCount === 1 ? "item" : "items"} selected ·{" "}
                {cartTotal.toLocaleString()} EGP
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto sm:flex-nowrap sm:gap-3">
              <button
                type="button"
                onClick={onBackToCategories}
                className="min-h-[44px] flex-1 sm:flex-initial border border-[#211a15]/25 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#211a15] transition-colors hover:bg-[#f6f1ea] whitespace-nowrap cursor-pointer"
              >
                More Categories
              </button>
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="min-h-[44px] flex-1 sm:flex-initial bg-[#211a15] px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#f6f1ea] transition-opacity hover:opacity-90 whitespace-nowrap cursor-pointer"
              >
                Open Cart & Checkout
              </button>
            </div>
          </motion.div>
        ) : null}
      </main>

      <footer className="border-t border-[var(--color-border)] bg-[#efe8de]/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 text-center text-xs text-[#5c4e43] sm:flex-row sm:px-6 sm:text-left">
          <div className="space-y-1">
            <p>
              {content.business.brandName} · {content.business.owner} ·{" "}
              {content.business.location}
            </p>
            <p className="tabular-nums font-medium text-[#4a3c32]">
              Working Hours: {content.business.workingHours || "5:00 PM – 12:00 AM"}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <a
              href={content.business.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[36px] items-center gap-1.5 font-medium text-[#211a15] hover:underline"
            >
              <Instagram className="h-3.5 w-3.5" />
              <span>@wonka_sweets1</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
