import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Clock, Instagram, MapPin, ShoppingBag } from "lucide-react";
import SplitPhotoSlider, { type SplitSlide } from "@/src/components/ui/split-photo-slider";
import { StoreProvider, useStore } from "@/src/context/StoreContext";
import ReservationNoticeView from "@/src/components/ReservationNoticeView";
import CategorySelectionView from "@/src/components/CategorySelectionView";
import CategoryProductsView from "@/src/components/CategoryProductsView";
import CartDrawer from "@/src/components/CartDrawer";
import AdminLoginPage from "@/src/components/AdminLoginPage";

const AdminDashboardView = lazy(() => import("@/src/components/AdminDashboardView"));

type AppView = "showcase" | "reservation" | "categories" | "category";

function DessertMark() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8 10.5c1.5-1.5 3.5-1.5 5 0s3.5 1.5 5 0" />
      <circle cx="9.5" cy="15" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="14" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PublicStorefront() {
  const { content, cartCount, cartTotal, setIsCartOpen } = useStore();
  const [view, setView] = useState<AppView>("showcase");
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    content.categories[0]?.id ?? "cookies"
  );

  const slides: SplitSlide[] = useMemo(
    () =>
      content.categories.map((cat) => ({
        title: cat.name,
        description: cat.slideDescription,
        alt: `${cat.name} by ${content.business.brandName}`,
        image: cat.image,
        thumb: cat.thumb,
        cta: content.business.ctaLabel,
        categoryId: cat.id,
      })),
    [content.categories, content.business.brandName, content.business.ctaLabel]
  );

  const scrollTopInstant = () => {
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const handleStartOrderSession = () => {
    scrollTopInstant();
    setView("reservation");
  };

  const handleContinueFromNotice = () => {
    scrollTopInstant();
    setView("categories");
  };

  const handleSelectCategory = (categoryId: string) => {
    scrollTopInstant();
    setActiveCategoryId(categoryId);
    setView("category");
  };

  const handleBackToCategories = () => {
    scrollTopInstant();
    setView("categories");
  };

  const handleBackToShowcase = () => {
    scrollTopInstant();
    setView("showcase");
  };

  return (
    <div className="min-h-[100svh] bg-[#f6f1ea] text-[#211a15]">
      <AnimatePresence mode="wait">
        {view === "showcase" ? (
          <motion.div
            key="showcase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <SplitPhotoSlider
              slides={slides}
              brand={
                <>
                  <DessertMark />
                  <span>{content.business.brandName}</span>
                </>
              }
              credit={content.business.creditText}
              ctaLabel={content.business.ctaLabel}
              accent={content.business.accentColor}
              socials={[
                {
                  label: "Instagram",
                  href: content.business.instagramUrl,
                  icon: "instagram",
                },
              ]}
              onCta={() => handleStartOrderSession()}
            />

            {/* Public Brand & Artisanal Craft Footer */}
            <footer className="border-t border-[var(--color-border)] bg-[#efe8de] text-[#211a15]">
              <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-10 sm:flex-row sm:items-center sm:px-8">
                <div>
                  <p className="font-display text-2xl font-bold tracking-tight">
                    {content.business.brandName}
                  </p>
                  <p className="mt-1 text-sm text-[#5c4e43]">
                    Handcrafted luxury desserts by {content.business.owner}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs font-medium text-[#5c4e43] sm:text-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-[#8c673e]" />
                      <span>{content.business.location}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-[#8c673e]" />
                      <span>
                        Working Hours:{" "}
                        {content.business.workingHours || "5:00 PM – 12:00 AM"}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <button
                    type="button"
                    onClick={handleStartOrderSession}
                    className="min-h-[44px] bg-[#c4a27a] px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[#241b14] transition-all hover:brightness-105 cursor-pointer"
                  >
                    {content.business.ctaLabel}
                  </button>

                  <a
                    href={content.business.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center gap-1.5 border border-[#211a15]/20 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#211a15] transition-colors hover:bg-[#f6f1ea]"
                  >
                    <Instagram className="h-3.5 w-3.5" />
                    <span>Instagram</span>
                  </a>
                </div>
              </div>
            </footer>

            {/* Floating Cart Trigger on Showcase only when items are already in Cart */}
            {cartCount > 0 ? (
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="fixed bottom-4 right-4 z-40 inline-flex max-w-[calc(100vw-2rem)] items-center gap-2.5 bg-[#211a15] px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#f6f1ea] shadow-xl transition-transform hover:-translate-y-0.5 cursor-pointer sm:bottom-5 sm:right-5"
              >
                <ShoppingBag className="h-4 w-4 shrink-0 text-[#c4a27a]" />
                <span className="truncate tabular-nums">
                  Cart ({cartCount}) · {cartTotal.toLocaleString()} EGP
                </span>
              </button>
            ) : null}
          </motion.div>
        ) : null}

        {view === "reservation" ? (
          <motion.div
            key="reservation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <ReservationNoticeView
              onContinue={handleContinueFromNotice}
              onBack={handleBackToShowcase}
            />
          </motion.div>
        ) : null}

        {view === "categories" ? (
          <motion.div
            key="categories"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <CategorySelectionView
              onSelectCategory={handleSelectCategory}
              onBackToShowcase={handleBackToShowcase}
            />
          </motion.div>
        ) : null}

        {view === "category" ? (
          <motion.div
            key={`category-${activeCategoryId}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <CategoryProductsView
              categoryId={activeCategoryId}
              onSelectCategory={handleSelectCategory}
              onBackToCategories={handleBackToCategories}
              onBackToShowcase={handleBackToShowcase}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <CartDrawer />
    </div>
  );
}

function ProtectedAdminArea({
  pathname,
  navigate,
}: {
  pathname: string;
  navigate: (path: string, replace?: boolean) => void;
}) {
  const [authChecked, setAuthChecked] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const isLoginPath = pathname === "/admin/login";

  useEffect(() => {
    let active = true;
    const verify = async () => {
      try {
        const headers: Record<string, string> = {};
        if (sessionToken) {
          headers.Authorization = `Bearer ${sessionToken}`;
        }
        const res = await fetch("/api/admin/auth/status", {
          credentials: "include",
          headers,
        });
        if (!active) return;
        if (res.ok) {
          const data = (await res.json()) as {
            authenticated?: boolean;
            email?: string;
          };
          if (data.authenticated && data.email) {
            setAdminEmail(data.email);
            if (isLoginPath) {
              navigate("/admin", true);
            }
          } else {
            setAdminEmail(null);
            if (!isLoginPath) {
              navigate("/admin/login", true);
            }
          }
        } else {
          setAdminEmail(null);
          if (!isLoginPath) {
            navigate("/admin/login", true);
          }
        }
      } catch {
        if (!active) return;
        setAdminEmail(null);
        if (!isLoginPath) {
          navigate("/admin/login", true);
        }
      } finally {
        if (active) setAuthChecked(true);
      }
    };
    void verify();
    return () => {
      active = false;
    };
  }, [isLoginPath, navigate, sessionToken]);

  const handleLoginSuccess = useCallback(
    (email: string, token?: string) => {
      setAdminEmail(email);
      if (token) setSessionToken(token);
      setAuthChecked(true);
      navigate("/admin", true);
    },
    [navigate]
  );

  const handleUnauthorizedOrLogout = useCallback(() => {
    setAdminEmail(null);
    setSessionToken(null);
    navigate("/admin/login", true);
  }, [navigate]);

  if (isLoginPath || !adminEmail) {
    if (!authChecked && !isLoginPath) {
      return (
        <div className="min-h-[100svh] flex items-center justify-center bg-[#f6f1ea] text-xs font-medium uppercase tracking-[0.2em] text-[#6b5a4d]">
          Verifying access...
        </div>
      );
    }
    return (
      <AdminLoginPage
        onSuccess={handleLoginSuccess}
        onBackToStore={() => navigate("/", false)}
      />
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-[100svh] flex items-center justify-center bg-[#f6f1ea] text-xs font-medium uppercase tracking-[0.2em] text-[#6b5a4d]">
          Loading dashboard...
        </div>
      }
    >
      <AdminDashboardView
        adminEmail={adminEmail}
        sessionToken={sessionToken}
        onUnauthorized={handleUnauthorizedOrLogout}
        onLoggedOut={handleUnauthorizedOrLogout}
        onBackToStore={() => navigate("/", false)}
      />
    </Suspense>
  );
}

function WonkaRouter() {
  const [pathname, setPathname] = useState(() => window.location.pathname || "/");

  useEffect(() => {
    const onPopState = () => {
      setPathname(window.location.pathname || "/");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((nextPath: string, replace = false) => {
    if (replace) {
      window.history.replaceState(null, "", nextPath);
    } else {
      window.history.pushState(null, "", nextPath);
    }
    setPathname(nextPath);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminRoute) {
    return <ProtectedAdminArea pathname={pathname} navigate={navigate} />;
  }

  return <PublicStorefront />;
}

export default function App() {
  return (
    <StoreProvider>
      <WonkaRouter />
    </StoreProvider>
  );
}
