import { ArrowLeft, ShoppingBag } from "lucide-react";
import { useStore } from "@/src/context/StoreContext";

interface OrderingHeaderProps {
  activeCategoryId?: string | null;
  onBackToShowcase: () => void;
  onSelectCategory?: (categoryId: string) => void;
  onBackToCategories?: () => void;
  showCategoryNav?: boolean;
}

export default function OrderingHeader({
  activeCategoryId,
  onBackToShowcase,
  onSelectCategory,
  onBackToCategories,
  showCategoryNav = true,
}: OrderingHeaderProps) {
  const { content, cartCount, cartTotal, setIsCartOpen } = useStore();

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[#f6f1ea]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:gap-8 sm:px-6">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          {onBackToCategories && activeCategoryId ? (
            <button
              type="button"
              onClick={onBackToCategories}
              className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-[#5c4e43] transition-colors hover:text-[#211a15] whitespace-nowrap shrink-0 cursor-pointer"
              aria-label="Back to categories"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Categories</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onBackToShowcase}
              className="font-display text-lg font-bold tracking-tight text-[#211a15] transition-opacity hover:opacity-75 whitespace-nowrap shrink-0 cursor-pointer sm:text-xl"
            >
              {content.business.brandName}
            </button>
          )}
        </div>

        {/* Zone 2: Concise Category Links */}
        {showCategoryNav && onSelectCategory ? (
          <nav
            aria-label="Dessert categories"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[#5c4e43]"
          >
            {content.categories.map((cat) => {
              const isActive = cat.id === activeCategoryId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectCategory(cat.id)}
                  className={`relative py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? "font-semibold text-[#211a15]"
                      : "hover:text-[#211a15]"
                  }`}
                >
                  {cat.name}
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 -bottom-0.5 h-[1.5px] bg-[#c4a27a]"
                    />
                  ) : null}
                </button>
              );
            })}
          </nav>
        ) : (
          <div className="hidden md:block" />
        )}

        {/* Zone 3: Primary Action — Shopping Cart */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="inline-flex items-center gap-2 bg-[#c4a27a] px-3.5 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#241b14] transition-all hover:brightness-105 whitespace-nowrap shrink-0 cursor-pointer sm:px-4"
            aria-label={`Open cart with ${cartCount} items`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Cart</span>
            <span className="tabular-nums">({cartCount})</span>
            {cartTotal > 0 ? (
              <span className="hidden sm:inline tabular-nums">
                · {cartTotal.toLocaleString()} EGP
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </header>
  );
}
