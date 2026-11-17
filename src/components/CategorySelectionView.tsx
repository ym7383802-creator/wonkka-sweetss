import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Instagram } from "lucide-react";
import { useStore } from "@/src/context/StoreContext";
import OrderingHeader from "@/src/components/OrderingHeader";

interface CategorySelectionViewProps {
  onSelectCategory: (categoryId: string) => void;
  onBackToShowcase: () => void;
}

export default function CategorySelectionView({
  onSelectCategory,
  onBackToShowcase,
}: CategorySelectionViewProps) {
  const { content } = useStore();
  const { business, categories, products } = content;

  return (
    <div className="min-h-[100svh] flex flex-col bg-[#f6f1ea] text-[#211a15]">
      <OrderingHeader
        onBackToShowcase={onBackToShowcase}
        onSelectCategory={onSelectCategory}
        showCategoryNav={true}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {/* Top Back Link & Editorial Title */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 sm:mb-12"
        >
          <button
            type="button"
            onClick={onBackToShowcase}
            className="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#5c4e43] transition-colors hover:text-[#211a15] cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Showcase</span>
          </button>

          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#7b6857]">
                {business.brandName} · {business.location}
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#211a15] sm:text-5xl text-balance">
                Artisanal Dessert Collections
              </h1>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-[#5c4e43]">
              Choose a collection below to explore handcrafted boxes and flavors, freshly baked to order for any preferred pickup or delivery time.
            </p>
          </div>
        </motion.div>

        {/* Four Categories Grid with Staggered Gradual Reveal */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
          {categories.map((category, idx) => {
            const count = products.filter((p) => p.categoryId === category.id).length;
            const indexLabel = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;

            return (
              <motion.article
                key={category.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 0.1 + idx * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="group flex flex-col overflow-hidden border border-[var(--color-border)] bg-[#efe8de]/70 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#efe8de] hover:shadow-lg"
              >
                <button
                  type="button"
                  onClick={() => onSelectCategory(category.id)}
                  className="flex h-full w-full flex-col text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4a27a]"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#e5dccf]">
                    <img
                      src={category.image}
                      alt={category.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-6 sm:p-8">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-medium text-[#6b5a4d] tabular-nums">
                        <span>{indexLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {count} {count === 1 ? "Item" : "Items"}
                        </span>
                      </div>

                      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#211a15] sm:text-3xl">
                        {category.name}
                      </h2>

                      <p className="mt-2.5 text-sm leading-relaxed text-[#5c4e43]">
                        {category.description}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-[var(--color-border)] pt-4">
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#241b14]">
                        Explore {category.name}
                      </span>
                      <span className="inline-flex h-8 w-8 items-center justify-center bg-[#c4a27a] text-[#241b14] transition-transform duration-300 group-hover:translate-x-1">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </button>
              </motion.article>
            );
          })}
        </div>
      </main>

      <footer className="border-t border-[var(--color-border)] bg-[#efe8de]/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 text-center text-xs text-[#5c4e43] sm:flex-row sm:px-6 sm:text-left">
          <div className="space-y-1">
            <p>
              {business.brandName} · Owned by {business.owner} · {business.location}
            </p>
            <p className="tabular-nums font-medium text-[#4a3c32]">
              Working Hours: {business.workingHours || "5:00 PM – 12:00 AM"}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <a
              href={business.instagramUrl}
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
