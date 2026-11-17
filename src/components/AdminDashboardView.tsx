import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  LogOut,
  MessageCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { useStore } from "@/src/context/StoreContext";
import type { CategoryItem, ProductItem, WonkaSiteContent } from "@/src/data/wonkaData";

type AdminTab = "orders" | "products" | "categories" | "business";
type OrderStatus = "pending" | "confirmed" | "preparing" | "delivered" | "cancelled";

interface AdminOrderItem {
  productId: string;
  categoryId: string;
  name: string;
  detail?: string;
  price: number;
  quantity: number;
}

interface AdminOrderNotification {
  status: "sent" | "queued" | "pending_number" | "failed";
  provider: "whatsapp_cloud_api" | "whatsapp_webhook" | "server_queue";
  recipientNumber: string;
  attemptedAt: string;
  providerMessageId?: string;
  detail: string;
}

interface AdminOrder {
  id: string;
  createdAt: string;
  orderStatus: OrderStatus;
  customerName: string;
  phone: string;
  governorate: string;
  city: string;
  address: string;
  pickupDateTime: string;
  formattedPickup: string;
  instructions: string;
  items: AdminOrderItem[];
  totalEgp: number;
  notification: AdminOrderNotification;
}

interface AdminSettingsResponse {
  receivingWhatsappNumber: string;
  cloudApiConfigured: boolean;
  webhookConfigured: boolean;
  deliveryScope: string;
}

interface AdminDashboardViewProps {
  adminEmail: string;
  sessionToken: string | null;
  onUnauthorized: () => void;
  onLoggedOut: () => void;
  onBackToStore: () => void;
}

const ORDER_STATUS_OPTIONS: Array<{ value: OrderStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AdminDashboardView({
  adminEmail,
  sessionToken,
  onUnauthorized,
  onLoggedOut,
  onBackToStore,
}: AdminDashboardViewProps) {
  const { content, refreshMenu } = useStore();
  const [tab, setTab] = useState<AdminTab>("orders");
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>("all");

  // WhatsApp & Orders state
  const [receivingWhatsappInput, setReceivingWhatsappInput] = useState("");
  const [savedWhatsappNumber, setSavedWhatsappNumber] = useState("");
  const [cloudApiConfigured, setCloudApiConfigured] = useState(false);
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const [deliveryScope, setDeliveryScope] = useState("Mansoura, Dakahlia, Egypt");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [savingNumber, setSavingNumber] = useState(false);
  const [numberFeedback, setNumberFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [resendingOrderId, setResendingOrderId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Authoritative menu/content state (persisted on backend)
  const [draftContent, setDraftContent] = useState<WonkaSiteContent>(content);
  const [hasUnsavedMenu, setHasUnsavedMenu] = useState(false);
  const [savingMenu, setSavingMenu] = useState(false);
  const [menuFeedback, setMenuFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const authHeaders = useCallback(
    (extra?: Record<string, string>): HeadersInit => {
      const headers: Record<string, string> = { ...(extra || {}) };
      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }
      return headers;
    },
    [sessionToken]
  );

  const loadAllAdminData = useCallback(async () => {
    setLoadingAdmin(true);
    try {
      const [settingsRes, ordersRes, contentRes] = await Promise.all([
        fetch("/api/admin/settings", {
          credentials: "include",
          headers: authHeaders(),
        }),
        fetch("/api/admin/orders", {
          credentials: "include",
          headers: authHeaders(),
        }),
        fetch("/api/admin/content", {
          credentials: "include",
          headers: authHeaders(),
        }),
      ]);

      if (
        settingsRes.status === 401 ||
        ordersRes.status === 401 ||
        contentRes.status === 401
      ) {
        onUnauthorized();
        return;
      }

      if (settingsRes.ok) {
        const settings = (await settingsRes.json()) as AdminSettingsResponse;
        setReceivingWhatsappInput(settings.receivingWhatsappNumber || "");
        setSavedWhatsappNumber(settings.receivingWhatsappNumber || "");
        setCloudApiConfigured(Boolean(settings.cloudApiConfigured));
        setWebhookConfigured(Boolean(settings.webhookConfigured));
        if (settings.deliveryScope) setDeliveryScope(settings.deliveryScope);
      }

      if (ordersRes.ok) {
        const data = (await ordersRes.json()) as { orders?: AdminOrder[] };
        setOrders(Array.isArray(data.orders) ? data.orders : []);
      }

      if (contentRes.ok) {
        const menuData = (await contentRes.json()) as WonkaSiteContent;
        setDraftContent(menuData);
        setHasUnsavedMenu(false);
      }
    } catch {
      // Ignore transient failure
    } finally {
      setLoadingAdmin(false);
    }
  }, [authHeaders, onUnauthorized]);

  useEffect(() => {
    void loadAllAdminData();
  }, [loadAllAdminData]);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
      });
    } catch {
      // Ignore
    }
    onLoggedOut();
  };

  const handleSaveWhatsappNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingNumber) return;
    setSavingNumber(true);
    setNumberFeedback(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        credentials: "include",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          receivingWhatsappNumber: receivingWhatsappInput.trim(),
        }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        receivingWhatsappNumber?: string;
        error?: string;
      };
      if (!res.ok) {
        setNumberFeedback({
          type: "error",
          text: data.error || "Unable to save receiving WhatsApp number.",
        });
        return;
      }
      const normalized = data.receivingWhatsappNumber || "";
      setReceivingWhatsappInput(normalized);
      setSavedWhatsappNumber(normalized);
      await refreshMenu();
      setNumberFeedback({
        type: "success",
        text: normalized
          ? `Receiving WhatsApp number updated to +${normalized}.`
          : "Receiving WhatsApp number cleared.",
      });
    } catch {
      setNumberFeedback({
        type: "error",
        text: "Network error while saving WhatsApp settings.",
      });
    } finally {
      setSavingNumber(false);
    }
  };

  const handleResendOrder = async (orderId: string) => {
    if (resendingOrderId) return;
    setResendingOrderId(orderId);
    try {
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}/resend`,
        {
          method: "POST",
          credentials: "include",
          headers: authHeaders(),
        }
      );
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as { order?: AdminOrder };
        if (data.order) {
          setOrders((prev) =>
            prev.map((o) => (o.id === orderId && data.order ? data.order : o))
          );
        }
      }
    } finally {
      setResendingOrderId(null);
    }
  };

  const handleOrderStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ orderStatus: nextStatus }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as { order?: AdminOrder };
        if (data.order) {
          setOrders((prev) =>
            prev.map((o) => (o.id === orderId && data.order ? data.order : o))
          );
        }
      }
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: "DELETE",
        credentials: "include",
        headers: authHeaders(),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      }
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const applyDraftPatch = (updater: (prev: WonkaSiteContent) => WonkaSiteContent) => {
    setDraftContent((prev) => updater(prev));
    setHasUnsavedMenu(true);
    setMenuFeedback(null);
  };

  const handleSaveMenuContent = async () => {
    if (savingMenu) return;
    setSavingMenu(true);
    setMenuFeedback(null);
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        credentials: "include",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(draftContent),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as WonkaSiteContent & {
        error?: string;
      };
      if (!res.ok) {
        setMenuFeedback({
          type: "error",
          text: data.error || "Failed to save menu changes.",
        });
        return;
      }
      setDraftContent(data);
      setHasUnsavedMenu(false);
      await refreshMenu();
      setMenuFeedback({
        type: "success",
        text: "All product, category, and website changes have been published to the live store.",
      });
    } catch {
      setMenuFeedback({
        type: "error",
        text: "Network error while saving website content.",
      });
    } finally {
      setSavingMenu(false);
    }
  };

  const handleResetMenuDefaults = async () => {
    if (savingMenu) return;
    setSavingMenu(true);
    setMenuFeedback(null);
    try {
      const res = await fetch("/api/admin/content/reset", {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (res.ok) {
        const resetData = (await res.json()) as WonkaSiteContent;
        setDraftContent(resetData);
        setHasUnsavedMenu(false);
        await refreshMenu();
        setMenuFeedback({
          type: "success",
          text: "Menu and storefront content reset to default Wonka Sweets catalog.",
        });
      }
    } finally {
      setSavingMenu(false);
    }
  };

  const updateBusiness = (field: keyof WonkaSiteContent["business"], value: string) => {
    applyDraftPatch((prev) => ({
      ...prev,
      business: { ...prev.business, [field]: value },
    }));
  };

  const updateReservation = (
    field: keyof WonkaSiteContent["reservation"],
    value: string
  ) => {
    applyDraftPatch((prev) => ({
      ...prev,
      reservation: { ...prev.reservation, [field]: value },
    }));
  };

  const updateCategory = (id: string, patch: Partial<CategoryItem>) => {
    applyDraftPatch((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  };

  const updateProduct = (id: string, patch: Partial<ProductItem>) => {
    applyDraftPatch((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const addProduct = () => {
    const targetCategory =
      selectedCatFilter === "all"
        ? draftContent.categories[0]?.id ?? "cookies"
        : selectedCatFilter;
    const cat = draftContent.categories.find((c) => c.id === targetCategory);
    const newProduct: ProductItem = {
      id: `custom-${Date.now()}`,
      categoryId: targetCategory,
      name: "New Dessert Item",
      detail: "",
      price: 100,
      description: "Freshly handcrafted to order.",
      image: cat?.image ?? draftContent.categories[0]?.image ?? "",
    };
    applyDraftPatch((prev) => ({
      ...prev,
      products: [...prev.products, newProduct],
    }));
  };

  const deleteProduct = (id: string) => {
    applyDraftPatch((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id),
    }));
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onLoad: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onLoad(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const filteredProducts =
    selectedCatFilter === "all"
      ? draftContent.products
      : draftContent.products.filter((p) => p.categoryId === selectedCatFilter);

  const notificationStatusLabel = (status: AdminOrderNotification["status"]) => {
    switch (status) {
      case "sent":
        return "Sent via WhatsApp";
      case "queued":
        return "Queued (Configure Cloud API Env)";
      case "pending_number":
        return "Awaiting Receiving Number";
      case "failed":
        return "Delivery Failed";
    }
  };

  return (
    <div className="min-h-[100svh] flex flex-col bg-[#f6f1ea] text-[#211a15]">
      {/* Top Protected Admin Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[#f6f1ea]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center border border-[#c4a27a]/60 bg-[#efe8de] text-[#8c673e]">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-[#211a15] sm:text-xl">
                Wonka Sweets · Admin Dashboard
              </h1>
              <p className="text-xs text-[#6b5a4d]">
                Authorized Owner: <span className="font-medium text-[#211a15]">{adminEmail}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onBackToStore}
              className="inline-flex min-h-[38px] items-center gap-1.5 border border-[#211a15]/20 bg-[#efe8de]/70 px-3.5 py-2 text-xs font-semibold text-[#211a15] transition-colors hover:bg-[#efe8de] cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Storefront</span>
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex min-h-[38px] items-center gap-1.5 bg-[#211a15] px-3.5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#f6f1ea] transition-opacity hover:opacity-90 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-t border-[var(--color-border)] bg-[#efe8de]/60">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
            <div className="flex w-full items-center gap-1.5 overflow-x-auto pb-0.5 sm:w-auto sm:gap-2 sm:pb-0">
              {(
                [
                  { id: "orders", label: "WhatsApp & Orders" },
                  { id: "products", label: "Products & Prices" },
                  { id: "categories", label: "Categories" },
                  { id: "business", label: "Brand & Reservation" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`min-h-[36px] shrink-0 px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    tab === item.id
                      ? "bg-[#211a15] text-[#f6f1ea]"
                      : "text-[#5c4e43] hover:text-[#211a15]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {tab !== "orders" ? (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => void handleResetMenuDefaults()}
                  disabled={savingMenu}
                  className="inline-flex min-h-[36px] items-center gap-1.5 border border-[#211a15]/20 px-3 py-1.5 text-xs font-medium text-[#5c4e43] hover:text-[#211a15] whitespace-nowrap cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Defaults</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveMenuContent()}
                  disabled={savingMenu || !hasUnsavedMenu}
                  className="inline-flex min-h-[36px] items-center gap-1.5 bg-[#c4a27a] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#241b14] hover:brightness-105 whitespace-nowrap cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{savingMenu ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Protected Workspace */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {menuFeedback && tab !== "orders" ? (
          <div
            role="status"
            className={`mb-5 border px-4 py-3 text-xs font-medium ${
              menuFeedback.type === "success"
                ? "border-[#c4a27a] bg-[#efe8de] text-[#211a15]"
                : "border-[#8f2d24]/30 bg-[#8f2d24]/10 text-[#7a2119]"
            }`}
          >
            {menuFeedback.text}
          </div>
        ) : null}

        {tab === "orders" ? (
          <div className="space-y-6">
            {/* Receiving WhatsApp Configuration */}
            <section className="border border-[var(--color-border)] bg-[#efe8de]/60 p-4 sm:p-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#211a15]">
                    <MessageCircle className="h-4 w-4 text-[#8c673e]" />
                    <span>Receiving WhatsApp Number</span>
                  </h2>
                  <p className="mt-0.5 text-xs text-[#5c4e43]">
                    Every submitted Mansoura order triggers a separate automatic notification to this WhatsApp number.
                  </p>
                </div>
                <span className="text-xs font-medium text-[#6b5a4d]">
                  Active zone: {deliveryScope}
                </span>
              </div>

              <form
                onSubmit={handleSaveWhatsappNumber}
                className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
              >
                <div className="flex-1">
                  <label
                    htmlFor="admin-receiving-whatsapp"
                    className="mb-1 block text-xs font-semibold text-[#5c4e43]"
                  >
                    Owner WhatsApp Phone Number (Egypt: 010xxxxxxxx or 2010xxxxxxxx)
                  </label>
                  <input
                    id="admin-receiving-whatsapp"
                    type="tel"
                    value={receivingWhatsappInput}
                    onChange={(e) => {
                      setReceivingWhatsappInput(e.target.value);
                      setNumberFeedback(null);
                    }}
                    placeholder="Enter your receiving WhatsApp number (e.g., 01012345678)"
                    className="w-full border border-[#211a15]/20 bg-white/85 px-3.5 py-2.5 text-base sm:text-sm text-[#211a15] placeholder:text-[#8c7b6d] focus:border-[#c4a27a] focus:outline-none tabular-nums"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingNumber}
                  className="inline-flex min-h-[42px] items-center justify-center gap-1.5 bg-[#211a15] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-[#f6f1ea] hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{savingNumber ? "Saving..." : "Save Number"}</span>
                </button>
              </form>

              {numberFeedback ? (
                <div
                  role="status"
                  className={`mt-3 border px-3.5 py-2 text-xs font-medium ${
                    numberFeedback.type === "success"
                      ? "border-[#c4a27a] bg-[#f6f1ea] text-[#211a15]"
                      : "border-[#8f2d24]/30 bg-[#8f2d24]/10 text-[#7a2119]"
                  }`}
                >
                  {numberFeedback.text}
                </div>
              ) : null}

              <div className="mt-3.5 border-t border-[var(--color-border)] pt-3 text-xs text-[#5c4e43] space-y-1">
                <p>
                  <span className="font-semibold text-[#211a15]">Current Recipient:</span>{" "}
                  {savedWhatsappNumber ? `+${savedWhatsappNumber}` : "Not set yet"}
                </p>
                <p>
                  <span className="font-semibold text-[#211a15]">Server Integration:</span>{" "}
                  {cloudApiConfigured
                    ? "WhatsApp Business Cloud API configured securely via server environment variables."
                    : webhookConfigured
                    ? "Server-side WhatsApp gateway webhook configured."
                    : "Server-side queue active. Add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID to server secrets for live Meta Cloud API delivery."}
                </p>
              </div>
            </section>

            {/* Customer Orders Management */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#211a15]">
                    Customer Orders ({orders.length})
                  </h2>
                  <p className="text-xs text-[#5c4e43]">
                    Protected customer order records and per-order WhatsApp notification logs.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void loadAllAdminData()}
                  disabled={loadingAdmin}
                  className="inline-flex min-h-[38px] items-center gap-1.5 border border-[#211a15]/20 bg-[#efe8de] px-3.5 py-1.5 text-xs font-semibold text-[#211a15] hover:bg-[#e5dccf] cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${loadingAdmin ? "animate-spin" : ""}`}
                  />
                  <span>Refresh</span>
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="border border-[var(--color-border)] bg-[#efe8de]/35 p-8 text-center text-xs text-[#5c4e43]">
                  No orders submitted yet. Once a customer completes checkout in Mansoura, full order details and WhatsApp notifications will appear here.
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <article
                      key={order.id}
                      className="border border-[var(--color-border)] bg-[#efe8de]/45 p-4 space-y-3 sm:p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] pb-3">
                        <div>
                          <p className="font-display text-base font-bold text-[#211a15]">
                            Order #{order.id} · {order.customerName}
                          </p>
                          <p className="text-xs text-[#6b5a4d] tabular-nums">
                            Submitted {new Date(order.createdAt).toLocaleString("en-EG")} ·{" "}
                            {order.totalEgp.toLocaleString()} EGP
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            aria-label={`Order status for ${order.id}`}
                            value={order.orderStatus}
                            disabled={updatingOrderId === order.id}
                            onChange={(e) =>
                              void handleOrderStatusChange(
                                order.id,
                                e.target.value as OrderStatus
                              )
                            }
                            className="border border-[#211a15]/25 bg-white/85 px-2.5 py-1.5 text-xs font-semibold text-[#211a15]"
                          >
                            {ORDER_STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>

                          <span
                            className={`px-2.5 py-1.5 text-[11px] font-semibold ${
                              order.notification.status === "sent"
                                ? "bg-[#211a15] text-[#f6f1ea]"
                                : order.notification.status === "failed"
                                ? "bg-[#8f2d24]/15 text-[#7a2119]"
                                : "bg-[#c4a27a]/35 text-[#241b14]"
                            }`}
                          >
                            {notificationStatusLabel(order.notification.status)}
                          </span>

                          <button
                            type="button"
                            onClick={() => void handleResendOrder(order.id)}
                            disabled={resendingOrderId === order.id}
                            className="inline-flex items-center gap-1 border border-[#211a15]/25 bg-white/85 px-2.5 py-1.5 text-[11px] font-semibold text-[#211a15] hover:bg-white cursor-pointer disabled:opacity-50"
                          >
                            <Send className="h-3 w-3" />
                            <span>
                              {resendingOrderId === order.id ? "Sending..." : "Resend"}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDeleteOrder(order.id)}
                            disabled={updatingOrderId === order.id}
                            className="inline-flex items-center gap-1 border border-[#8f2d24]/30 px-2.5 py-1.5 text-[11px] font-semibold text-[#7a2119] hover:bg-[#8f2d24]/10 cursor-pointer disabled:opacity-50"
                            aria-label={`Delete order ${order.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                        <div className="space-y-1 text-[#211a15]">
                          <p>
                            <span className="text-[#6b5a4d]">Phone:</span> {order.phone}
                          </p>
                          <p>
                            <span className="text-[#6b5a4d]">Address:</span> {order.address},{" "}
                            {order.city}, {order.governorate}
                          </p>
                          <p>
                            <span className="text-[#6b5a4d]">Pickup / Delivery:</span>{" "}
                            {order.formattedPickup}
                          </p>
                          {order.instructions ? (
                            <p>
                              <span className="text-[#6b5a4d]">Notes:</span>{" "}
                              {order.instructions}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-1 text-[#211a15]">
                          <p className="font-semibold text-[#5c4e43]">Ordered Products:</p>
                          {order.items.map((item, idx) => (
                            <div
                              key={`${order.id}-${item.productId}-${idx}`}
                              className="flex justify-between gap-2 tabular-nums"
                            >
                              <span>
                                {item.name} × {item.quantity} ({item.price} EGP)
                              </span>
                              <span className="font-semibold">
                                {(item.price * item.quantity).toLocaleString()} EGP
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <p className="border-t border-[var(--color-border)] pt-2 text-[11px] text-[#5c4e43]">
                        {order.notification.detail}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}

        {tab === "products" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedCatFilter("all")}
                  className={`px-3 py-1.5 text-xs font-medium cursor-pointer ${
                    selectedCatFilter === "all"
                      ? "bg-[#211a15] text-[#f6f1ea]"
                      : "bg-[#efe8de] text-[#5c4e43]"
                  }`}
                >
                  All ({draftContent.products.length})
                </button>
                {draftContent.categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCatFilter(cat.id)}
                    className={`px-3 py-1.5 text-xs font-medium cursor-pointer ${
                      selectedCatFilter === cat.id
                        ? "bg-[#211a15] text-[#f6f1ea]"
                        : "bg-[#efe8de] text-[#5c4e43]"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={addProduct}
                className="inline-flex min-h-[38px] items-center gap-1.5 bg-[#c4a27a] px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#241b14] cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Product</span>
              </button>
            </div>

            <div className="space-y-3">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="border border-[var(--color-border)] bg-[#efe8de]/40 p-4 space-y-3"
                >
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-[#5c4e43]">
                        Product Name
                      </label>
                      <input
                        type="text"
                        value={product.name}
                        onChange={(e) =>
                          updateProduct(product.id, { name: e.target.value })
                        }
                        className="w-full border border-[#211a15]/20 bg-white/80 px-2.5 py-1.5 text-base sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#5c4e43]">
                        Size / Detail
                      </label>
                      <input
                        type="text"
                        value={product.detail ?? ""}
                        onChange={(e) =>
                          updateProduct(product.id, { detail: e.target.value })
                        }
                        placeholder="e.g. 6 pieces"
                        className="w-full border border-[#211a15]/20 bg-white/80 px-2.5 py-1.5 text-base sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#5c4e43]">
                        Price (EGP)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={product.price}
                        onChange={(e) =>
                          updateProduct(product.id, {
                            price: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-full border border-[#211a15]/20 bg-white/80 px-2.5 py-1.5 text-base sm:text-sm tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#5c4e43]">
                        Category
                      </label>
                      <select
                        value={product.categoryId}
                        onChange={(e) =>
                          updateProduct(product.id, { categoryId: e.target.value })
                        }
                        className="w-full border border-[#211a15]/20 bg-white/80 px-2.5 py-1.5 text-base sm:text-sm"
                      >
                        {draftContent.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2 flex items-end gap-2">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-semibold text-[#5c4e43]">
                          Description
                        </label>
                        <input
                          type="text"
                          value={product.description}
                          onChange={(e) =>
                            updateProduct(product.id, {
                              description: e.target.value,
                            })
                          }
                          className="w-full border border-[#211a15]/20 bg-white/80 px-2.5 py-1.5 text-base sm:text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteProduct(product.id)}
                        className="inline-flex h-9 items-center gap-1 border border-[#8f2d24]/25 px-3 text-xs font-medium text-[#8f2d24] hover:bg-[#8f2d24]/10 cursor-pointer"
                        aria-label={`Delete ${product.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "categories" ? (
          <div className="space-y-4">
            {draftContent.categories.map((cat) => (
              <div
                key={cat.id}
                className="grid grid-cols-1 gap-4 border border-[var(--color-border)] bg-[#efe8de]/40 p-4 sm:grid-cols-[130px_1fr]"
              >
                <div className="space-y-2">
                  <div className="aspect-[4/5] overflow-hidden bg-[#e5dccf]">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <label className="flex cursor-pointer items-center justify-center gap-1.5 border border-[#211a15]/20 bg-white/80 px-2 py-1.5 text-[11px] font-medium hover:bg-white">
                    <Upload className="h-3 w-3" />
                    <span>Upload Cover</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) =>
                        handleFileUpload(e, (url) =>
                          updateCategory(cat.id, { image: url, thumb: url })
                        )
                      }
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#5c4e43]">
                        Category Name
                      </label>
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) =>
                          updateCategory(cat.id, { name: e.target.value })
                        }
                        className="w-full border border-[#211a15]/20 bg-white/80 px-3 py-2 text-base sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#5c4e43]">
                        Cover Image URL
                      </label>
                      <input
                        type="text"
                        value={cat.image}
                        onChange={(e) =>
                          updateCategory(cat.id, {
                            image: e.target.value,
                            thumb: e.target.value,
                          })
                        }
                        className="w-full border border-[#211a15]/20 bg-white/80 px-3 py-2 text-base sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5c4e43]">
                      Category Description
                    </label>
                    <textarea
                      rows={2}
                      value={cat.description}
                      onChange={(e) =>
                        updateCategory(cat.id, { description: e.target.value })
                      }
                      className="w-full border border-[#211a15]/20 bg-white/80 px-3 py-2 text-base sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5c4e43]">
                      Homepage Slider Copy
                    </label>
                    <textarea
                      rows={2}
                      value={cat.slideDescription}
                      onChange={(e) =>
                        updateCategory(cat.id, { slideDescription: e.target.value })
                      }
                      className="w-full border border-[#211a15]/20 bg-white/80 px-3 py-2 text-base sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === "business" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#5c4e43]">
                Brand Name
              </label>
              <input
                type="text"
                value={draftContent.business.brandName}
                onChange={(e) => updateBusiness("brandName", e.target.value)}
                className="w-full border border-[#211a15]/20 bg-white/80 px-3 py-2 text-base sm:text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#5c4e43]">
                Owner Name
              </label>
              <input
                type="text"
                value={draftContent.business.owner}
                onChange={(e) => updateBusiness("owner", e.target.value)}
                className="w-full border border-[#211a15]/20 bg-white/80 px-3 py-2 text-base sm:text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#5c4e43]">
                Location
              </label>
              <input
                type="text"
                value={draftContent.business.location}
                onChange={(e) => updateBusiness("location", e.target.value)}
                className="w-full border border-[#211a15]/20 bg-white/80 px-3 py-2 text-base sm:text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#5c4e43]">
                Working Hours
              </label>
              <input
                type="text"
                value={draftContent.business.workingHours ?? "5:00 PM – 12:00 AM"}
                onChange={(e) => updateBusiness("workingHours", e.target.value)}
                placeholder="5:00 PM – 12:00 AM"
                className="w-full border border-[#211a15]/20 bg-white/80 px-3 py-2 text-base sm:text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#5c4e43]">
                Instagram URL
              </label>
              <input
                type="url"
                value={draftContent.business.instagramUrl}
                onChange={(e) => updateBusiness("instagramUrl", e.target.value)}
                className="w-full border border-[#211a15]/20 bg-white/80 px-3 py-2 text-base sm:text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#5c4e43]">
                Slider CTA Label
              </label>
              <input
                type="text"
                value={draftContent.business.ctaLabel}
                onChange={(e) => updateBusiness("ctaLabel", e.target.value)}
                className="w-full border border-[#211a15]/20 bg-white/80 px-3 py-2 text-base sm:text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#5c4e43]">
                Reservation Notice Background Image URL
              </label>
              <input
                type="text"
                value={draftContent.reservation.backgroundImage}
                onChange={(e) =>
                  updateReservation("backgroundImage", e.target.value)
                }
                className="w-full border border-[#211a15]/20 bg-white/80 px-3 py-2 text-base sm:text-sm"
              />
            </div>

            <div className="sm:col-span-2 border-t border-[var(--color-border)] pt-4 mt-2 space-y-3">
              <h3 className="font-display text-base font-bold">
                Reservation Notice (Arabic)
              </h3>
              <div dir="rtl">
                <label className="mb-1 block text-xs font-semibold text-[#5c4e43]">
                  عنوان التنبيه
                </label>
                <input
                  type="text"
                  value={draftContent.reservation.titleAr}
                  onChange={(e) => updateReservation("titleAr", e.target.value)}
                  className="w-full border border-[#211a15]/20 bg-white/80 px-3 py-2 text-base sm:text-sm"
                />
              </div>
              <div dir="rtl">
                <label className="mb-1 block text-xs font-semibold text-[#5c4e43]">
                  نص سياسة الحجز المسبق
                </label>
                <textarea
                  rows={2}
                  value={draftContent.reservation.bodyAr}
                  onChange={(e) => updateReservation("bodyAr", e.target.value)}
                  className="w-full border border-[#211a15]/20 bg-white/80 px-3 py-2 text-base sm:text-sm"
                />
              </div>
              <div dir="rtl">
                <label className="mb-1 block text-xs font-semibold text-[#5c4e43]">
                  نص زر المتابعة
                </label>
                <input
                  type="text"
                  value={draftContent.reservation.ctaAr}
                  onChange={(e) => updateReservation("ctaAr", e.target.value)}
                  className="w-full border border-[#211a15]/20 bg-white/80 px-3 py-2 text-base sm:text-sm"
                />
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
