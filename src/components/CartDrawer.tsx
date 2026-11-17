import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Check,
  Copy,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { useStore } from "@/src/context/StoreContext";
import { DEFAULT_WONKA_CONTENT } from "@/src/data/wonkaData";
import {
  buildWhatsappUrl,
  countPhoneDigits,
  DAKAHLIA_CITIES,
  DELIVERY_RESTRICTION_MESSAGE,
  EGYPT_GOVERNORATES,
  normalizeWhatsappPhone,
  validateMansouraDelivery,
} from "@/src/utils/deliveryValidation";

type DrawerStep = "cart" | "checkout" | "confirmed";

interface ConfirmedOrderItem {
  productId: string;
  categoryId: string;
  name: string;
  detail?: string;
  price: number;
  quantity: number;
}

interface ConfirmedNotification {
  status: "sent" | "queued" | "pending_number" | "failed";
  provider: "whatsapp_cloud_api" | "whatsapp_webhook" | "server_queue";
  recipientNumber: string;
  attemptedAt: string;
  providerMessageId?: string;
  detail: string;
}

interface ConfirmedOrder {
  id: string;
  createdAt: string;
  customerName: string;
  phone: string;
  governorate: string;
  city: string;
  address: string;
  pickupDateTime: string;
  formattedPickup: string;
  instructions: string;
  items: ConfirmedOrderItem[];
  totalEgp: number;
  whatsappMessage: string;
  notification: ConfirmedNotification;
}

function toLocalDateTimeInputValue(date: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function getDefaultPickupDate(): Date {
  return new Date(Date.now() + 60 * 60 * 1000);
}

function triggerWhatsappOpen(url: string): boolean {
  try {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch {
    return false;
  }
}

function buildWhatsappOrderMessage(params: {
  orderId?: string;
  brandName: string;
  city: string;
  governorate: string;
  items: ConfirmedOrderItem[];
  totalEgp: number;
  customerName: string;
  phone: string;
  address: string;
  formattedPickup: string;
  instructions: string;
}): string {
  const header = params.orderId
    ? `New Order #${params.orderId} — ${params.brandName}`
    : `New Order — ${params.brandName}`;

  const lines: string[] = [
    header,
    `Location: ${params.city}, ${params.governorate}, Egypt`,
    "",
    "Order Items:",
    ...params.items.map(
      (item, i) =>
        `${i + 1}. ${item.name}${item.detail ? ` (${item.detail})` : ""} x ${
          item.quantity
        } @ ${item.price.toLocaleString()} EGP = ${(
          item.price * item.quantity
        ).toLocaleString()} EGP`
    ),
    "",
    `Total Order Amount: ${params.totalEgp.toLocaleString()} EGP`,
    "",
    "Customer Details:",
    `Full Name: ${params.customerName}`,
    `Phone: ${params.phone}`,
    `Delivery Address: ${params.address}, ${params.city}, ${params.governorate}`,
    `Preferred Pickup / Delivery Time: ${params.formattedPickup}`,
  ];

  if (params.instructions.trim()) {
    lines.push(`Additional Notes: ${params.instructions.trim()}`);
  }

  return lines.join("\n");
}

export default function CartDrawer() {
  const {
    content,
    cart,
    updateQuantity,
    removeFromCart,
    clearCart,
    cartCount,
    cartTotal,
    isCartOpen,
    setIsCartOpen,
  } = useStore();

  const [step, setStep] = useState<DrawerStep>("cart");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [governorate, setGovernorate] = useState<string>("Dakahlia");
  const [city, setCity] = useState<string>("Mansoura");
  const [address, setAddress] = useState("");
  const [pickupDateTime, setPickupDateTime] = useState(() =>
    toLocalDateTimeInputValue(getDefaultPickupDate())
  );
  const [instructions, setInstructions] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrder | null>(null);
  const [whatsappAutoOpened, setWhatsappAutoOpened] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isCartOpen) {
      setErrorMsg(null);
      if (cart.length === 0 && step !== "confirmed") {
        setStep("cart");
      }
    }
  }, [isCartOpen, cart.length, step]);

  useEffect(() => {
    if (isCartOpen && step === "checkout" && !pickupDateTime) {
      setPickupDateTime(toLocalDateTimeInputValue(getDefaultPickupDate()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCartOpen, step]);

  const liveDeliveryValidation = useMemo(
    () => validateMansouraDelivery({ governorate, city, address }),
    [governorate, city, address]
  );

  const isAreaRestricted =
    !liveDeliveryValidation.valid && liveDeliveryValidation.reason !== "incomplete";

  const formattedPickup = useMemo(() => {
    if (!pickupDateTime) return "";
    const d = new Date(pickupDateTime);
    if (Number.isNaN(d.getTime())) return pickupDateTime;
    return d.toLocaleString("en-EG", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [pickupDateTime]);

  const configuredWhatsappNumber = useMemo(
    () =>
      normalizeWhatsappPhone(
        content.business.whatsappNumber ||
          import.meta.env.VITE_WHATSAPP_NUMBER ||
          DEFAULT_WONKA_CONTENT.business.whatsappNumber
      ),
    [content.business.whatsappNumber]
  );

  const fallbackWhatsappMessage = useMemo(
    () =>
      buildWhatsappOrderMessage({
        brandName: content.business.brandName,
        city,
        governorate,
        items: cart,
        totalEgp: cartTotal,
        customerName: customerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        formattedPickup,
        instructions: instructions.trim(),
      }),
    [
      content.business.brandName,
      city,
      governorate,
      cart,
      cartTotal,
      customerName,
      phone,
      address,
      formattedPickup,
      instructions,
    ]
  );

  const activeOrderSummary = confirmedOrder?.whatsappMessage || fallbackWhatsappMessage;

  const whatsappHref = useMemo(() => {
    const recipient =
      confirmedOrder?.notification.recipientNumber || configuredWhatsappNumber;
    return buildWhatsappUrl(recipient, activeOrderSummary);
  }, [
    confirmedOrder?.notification.recipientNumber,
    configuredWhatsappNumber,
    activeOrderSummary,
  ]);

  const handleGovernorateChange = (nextGov: string) => {
    setGovernorate(nextGov);
    if (nextGov === "Dakahlia") {
      if (!DAKAHLIA_CITIES.includes(city as (typeof DAKAHLIA_CITIES)[number])) {
        setCity("Mansoura");
      }
    } else {
      setCity("Other City");
    }
    setErrorMsg(null);
  };

  const handleCityChange = (nextCity: string) => {
    setCity(nextCity);
    setErrorMsg(null);
  };

  const validateAndConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg(null);

    if (cart.length === 0) {
      setErrorMsg("Your cart is empty.");
      return;
    }
    const cleanName = customerName.trim();
    if (!cleanName) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    const cleanPhone = phone.trim();
    if (!cleanPhone || countPhoneDigits(cleanPhone) < 7) {
      setErrorMsg("Please enter a valid phone number.");
      return;
    }

    const cleanAddress = address.trim();
    const deliveryCheck = validateMansouraDelivery({
      governorate,
      city,
      address: cleanAddress,
    });
    if (!deliveryCheck.valid) {
      setErrorMsg(deliveryCheck.message || DELIVERY_RESTRICTION_MESSAGE);
      return;
    }

    if (!pickupDateTime) {
      setErrorMsg("Please choose your preferred pickup date and time.");
      return;
    }

    const pickupDate = new Date(pickupDateTime);
    const selectedTime = pickupDate.getTime();
    if (Number.isNaN(selectedTime)) {
      setErrorMsg("Please choose a valid pickup or delivery date and time.");
      return;
    }

    const cleanInstructions = instructions.trim();
    const orderItemsSnapshot: ConfirmedOrderItem[] = cart.map((item) => ({
      productId: item.productId,
      categoryId: item.categoryId,
      name: item.name,
      detail: item.detail,
      price: item.price,
      quantity: item.quantity,
    }));

    const preparedMessage = buildWhatsappOrderMessage({
      brandName: content.business.brandName,
      city,
      governorate,
      items: orderItemsSnapshot,
      totalEgp: cartTotal,
      customerName: cleanName,
      phone: cleanPhone,
      address: cleanAddress,
      formattedPickup,
      instructions: cleanInstructions,
    });

    // Trigger WhatsApp synchronously inside the submit gesture so mobile Safari/Android & desktop browsers don't block it
    const directWhatsappUrl = buildWhatsappUrl(configuredWhatsappNumber, preparedMessage);
    const openedNow = triggerWhatsappOpen(directWhatsappUrl);
    setWhatsappAutoOpened(openedNow);

    setIsSubmitting(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          customerName: cleanName,
          phone: cleanPhone,
          governorate,
          city,
          address: cleanAddress,
          pickupDateTime,
          pickupDateTimeIso: pickupDate.toISOString(),
          formattedPickup,
          instructions: cleanInstructions,
          items: orderItemsSnapshot,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const data = isJson
        ? ((await response.json().catch(() => ({}))) as {
            order?: ConfirmedOrder;
            error?: string;
          })
        : {};

      if (response.ok && data.order) {
        setConfirmedOrder(data.order);
        clearCart();
        setStep("confirmed");
        return;
      }

      if ((response.status === 400 || response.status === 422) && data.error) {
        setErrorMsg(data.error);
        return;
      }

      // If backend API is unavailable (e.g. static GitHub Pages deploy returning 404/405 HTML or 5xx),
      // keep ordering working seamlessly via WhatsApp without blocking the customer.
      const fallbackOrder: ConfirmedOrder = {
        id: `WS-${String(Date.now()).slice(-4)}`,
        createdAt: new Date().toISOString(),
        customerName: cleanName,
        phone: cleanPhone,
        governorate,
        city,
        address: cleanAddress,
        pickupDateTime,
        formattedPickup,
        instructions: cleanInstructions,
        items: orderItemsSnapshot,
        totalEgp: cartTotal,
        whatsappMessage: preparedMessage,
        notification: {
          status: "queued",
          provider: "server_queue",
          recipientNumber: configuredWhatsappNumber,
          attemptedAt: new Date().toISOString(),
          detail: openedNow
            ? "WhatsApp has been opened with your complete order summary. Tap Send in WhatsApp to complete your reservation."
            : "Your WhatsApp order summary is ready. Tap the button below to open WhatsApp and send your order.",
        },
      };
      setConfirmedOrder(fallbackOrder);
      clearCart();
      setStep("confirmed");
    } catch {
      const offlineOrder: ConfirmedOrder = {
        id: `WS-${String(Date.now()).slice(-4)}`,
        createdAt: new Date().toISOString(),
        customerName: cleanName,
        phone: cleanPhone,
        governorate,
        city,
        address: cleanAddress,
        pickupDateTime,
        formattedPickup,
        instructions: cleanInstructions,
        items: orderItemsSnapshot,
        totalEgp: cartTotal,
        whatsappMessage: preparedMessage,
        notification: {
          status: "queued",
          provider: "server_queue",
          recipientNumber: configuredWhatsappNumber,
          attemptedAt: new Date().toISOString(),
          detail: openedNow
            ? "WhatsApp has been opened with your complete order summary. Tap Send in WhatsApp to complete your reservation."
            : "Your WhatsApp order summary is ready. Tap the button below to open WhatsApp and send your order.",
        },
      };
      setConfirmedOrder(offlineOrder);
      clearCart();
      setStep("confirmed");
    } finally {
      window.clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
  };

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(activeOrderSummary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleFinishAndReset = () => {
    clearCart();
    setConfirmedOrder(null);
    setWhatsappAutoOpened(false);
    setStep("cart");
    setIsCartOpen(false);
  };

  return (
    <AnimatePresence>
      {isCartOpen ? (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Shopping Cart"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-[#1a130e]/55 backdrop-blur-[2px]"
          />

          {/* Slide-over Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex h-full w-full max-w-lg flex-col bg-[#f6f1ea] text-[#211a15] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                {step === "checkout" ? (
                  <button
                    type="button"
                    onClick={() => setStep("cart")}
                    className="inline-flex h-8 w-8 items-center justify-center text-[#5c4e43] hover:text-[#211a15] cursor-pointer"
                    aria-label="Back to cart"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                ) : null}
                <div>
                  <h2 className="font-display text-xl font-bold tracking-tight text-[#211a15]">
                    {step === "cart"
                      ? "Your Order Bag"
                      : step === "checkout"
                      ? "Reservation & Checkout"
                      : "Order Confirmed"}
                  </h2>
                  <p className="text-xs text-[#6b5a4d] tabular-nums">
                    {step === "confirmed" && confirmedOrder
                      ? `Order #${confirmedOrder.id} · ${content.business.brandName}`
                      : `${cartCount} ${cartCount === 1 ? "item" : "items"} · ${cartTotal.toLocaleString()} EGP`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center text-[#5c4e43] transition-colors hover:bg-[#efe8de] hover:text-[#211a15] cursor-pointer"
                aria-label="Close cart"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {step === "cart" ? (
                cart.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center py-16 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center border border-[var(--color-border)] bg-[#efe8de] text-[#7b6857]">
                      <ShoppingBag className="h-6 w-6" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-[#211a15]">
                      Your bag is empty
                    </h3>
                    <p className="mt-2 max-w-xs text-sm text-[#5c4e43]">
                      Explore our Cookies, Brownies, Cinnamon Rolls, and Tiramisu to begin your order.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsCartOpen(false)}
                      className="mt-6 bg-[#c4a27a] px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[#241b14] transition-all hover:brightness-105 cursor-pointer"
                    >
                      Browse Desserts
                    </button>
                  </div>
                ) : (
                  <ul className="divide-y divide-[var(--color-border)]">
                    {cart.map((item) => (
                      <li key={item.productId} className="flex gap-4 py-4">
                        <div className="h-20 w-20 shrink-0 overflow-hidden bg-[#e5dccf]">
                          <img
                            src={item.image}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="flex flex-1 flex-col justify-between">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-display text-base font-bold text-[#211a15]">
                                {item.name}
                              </h3>
                              {item.detail ? (
                                <p className="text-xs text-[#6b5a4d]">{item.detail}</p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.productId)}
                              className="p-1 text-[#7b6857] transition-colors hover:text-[#8f2d24] cursor-pointer"
                              aria-label={`Remove ${item.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center border border-[#211a15]/20 bg-[#efe8de]/50">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.productId, -1)}
                                className="flex h-9 w-9 items-center justify-center text-[#211a15] hover:bg-[#efe8de] cursor-pointer"
                                aria-label={`Decrease quantity of ${item.name}`}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-9 text-center text-xs font-bold tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.productId, 1)}
                                className="flex h-9 w-9 items-center justify-center text-[#211a15] hover:bg-[#efe8de] cursor-pointer"
                                aria-label={`Increase quantity of ${item.name}`}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <span className="text-sm font-bold text-[#211a15] tabular-nums">
                              {(item.price * item.quantity).toLocaleString()} EGP
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              ) : null}

              {step === "checkout" ? (
                <form id="wonka-checkout-form" onSubmit={validateAndConfirm} className="space-y-4">
                  {/* Order Items Mini Summary */}
                  <div className="border border-[var(--color-border)] bg-[#efe8de]/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b5a4d]">
                      Selected Desserts
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {cart.map((item) => (
                        <li
                          key={item.productId}
                          className="flex items-center justify-between gap-2 text-[#211a15]"
                        >
                          <span>
                            {item.name} × {item.quantity}
                          </span>
                          <span className="font-semibold tabular-nums">
                            {(item.price * item.quantity).toLocaleString()} EGP
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-2.5 text-sm font-bold text-[#211a15]">
                      <span>Total</span>
                      <span className="tabular-nums">{cartTotal.toLocaleString()} EGP</span>
                    </div>
                  </div>

                  {/* Customer Info Fields */}
                  <div>
                    <label
                      htmlFor="wonka-name"
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#5c4e43]"
                    >
                      Full Name *
                    </label>
                    <input
                      id="wonka-name"
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full border border-[#211a15]/20 bg-white/80 px-3.5 py-2.5 text-base sm:text-sm text-[#211a15] placeholder:text-[#8c7b6d] focus:border-[#c4a27a] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="wonka-phone"
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#5c4e43]"
                    >
                      Phone Number *
                    </label>
                    <input
                      id="wonka-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01xxxxxxxxx"
                      className="w-full border border-[#211a15]/20 bg-white/80 px-3.5 py-2.5 text-base sm:text-sm text-[#211a15] placeholder:text-[#8c7b6d] focus:border-[#c4a27a] focus:outline-none tabular-nums"
                    />
                  </div>

                  {/* Delivery Area: Mansoura, Dakahlia Only */}
                  <div className="border border-[var(--color-border)] bg-[#efe8de]/45 p-3.5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#5c4e43]">
                      <MapPin className="h-3.5 w-3.5 text-[#8c673e]" />
                      <span>Delivery Zone (Mansoura Only)</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="wonka-governorate"
                          className="mb-1 block text-xs font-semibold text-[#5c4e43]"
                        >
                          Governorate *
                        </label>
                        <select
                          id="wonka-governorate"
                          value={governorate}
                          onChange={(e) => handleGovernorateChange(e.target.value)}
                          className="w-full border border-[#211a15]/20 bg-white/85 px-3 py-2 text-base sm:text-sm text-[#211a15] focus:border-[#c4a27a] focus:outline-none"
                        >
                          {EGYPT_GOVERNORATES.map((gov) => (
                            <option key={gov} value={gov}>
                              {gov}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="wonka-city"
                          className="mb-1 block text-xs font-semibold text-[#5c4e43]"
                        >
                          City *
                        </label>
                        <select
                          id="wonka-city"
                          value={city}
                          disabled={governorate !== "Dakahlia"}
                          onChange={(e) => handleCityChange(e.target.value)}
                          className="w-full border border-[#211a15]/20 bg-white/85 px-3 py-2 text-base sm:text-sm text-[#211a15] focus:border-[#c4a27a] focus:outline-none disabled:opacity-60"
                        >
                          {governorate === "Dakahlia" ? (
                            DAKAHLIA_CITIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))
                          ) : (
                            <option value="Other City">Outside Dakahlia</option>
                          )}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="wonka-address"
                        className="mb-1 block text-xs font-semibold text-[#5c4e43]"
                      >
                        Full Delivery Address (Street, Building, District) *
                      </label>
                      <input
                        id="wonka-address"
                        type="text"
                        required
                        disabled={governorate !== "Dakahlia" || city !== "Mansoura"}
                        value={address}
                        onChange={(e) => {
                          setAddress(e.target.value);
                          setErrorMsg(null);
                        }}
                        placeholder="e.g., 14 El Gomhouria St, Toriel, Mansoura"
                        className="w-full border border-[#211a15]/20 bg-white/85 px-3.5 py-2.5 text-base sm:text-sm text-[#211a15] placeholder:text-[#8c7b6d] focus:border-[#c4a27a] focus:outline-none disabled:cursor-not-allowed disabled:bg-[#e5dccf]/60"
                      />
                    </div>

                    {isAreaRestricted ? (
                      <div
                        role="alert"
                        className="flex items-start gap-2.5 border border-[#8f2d24]/35 bg-[#8f2d24]/10 px-3 py-2.5 text-xs font-medium leading-relaxed text-[#7a2119]"
                      >
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          {liveDeliveryValidation.message || DELIVERY_RESTRICTION_MESSAGE}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <label
                      htmlFor="wonka-pickup"
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#5c4e43]"
                    >
                      Preferred Pickup / Delivery Date & Time *
                    </label>
                    <input
                      id="wonka-pickup"
                      type="datetime-local"
                      required
                      value={pickupDateTime}
                      onChange={(e) => {
                        setPickupDateTime(e.target.value);
                        setErrorMsg(null);
                      }}
                      className="w-full border border-[#211a15]/20 bg-white/80 px-3.5 py-2.5 text-base sm:text-sm text-[#211a15] focus:border-[#c4a27a] focus:outline-none tabular-nums"
                    />
                    <p className="mt-1.5 text-xs text-[#6b5a4d]">
                      Select any suitable pickup or delivery date and time to coordinate with Wonka Sweets.
                    </p>
                    <p className="mt-1 text-xs font-medium text-[#4a3c32] tabular-nums">
                      Working Hours: {content.business.workingHours || "5:00 PM – 12:00 AM"}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="wonka-notes"
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#5c4e43]"
                    >
                      Special Instructions
                    </label>
                    <textarea
                      id="wonka-notes"
                      rows={3}
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Custom writing message, gift notes, or delivery preferences..."
                      className="w-full border border-[#211a15]/20 bg-white/80 px-3.5 py-2.5 text-base sm:text-sm text-[#211a15] placeholder:text-[#8c7b6d] focus:border-[#c4a27a] focus:outline-none"
                    />
                  </div>

                  {/* Reservation Policy Reminder near Checkout Confirmation */}
                  <div
                    dir="rtl"
                    lang="ar"
                    className="border border-[#c4a27a]/55 bg-[#efe8de] p-4 text-right"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-[#211a15]">
                      <CalendarClock className="h-4 w-4 text-[#8c673e] shrink-0" />
                      <span>{content.reservation.titleAr}</span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#4a3c32]">
                      {content.reservation.bodyAr}
                    </p>
                  </div>

                  {errorMsg && !isAreaRestricted ? (
                    <div
                      role="alert"
                      className="border border-[#8f2d24]/30 bg-[#8f2d24]/10 px-3.5 py-2.5 text-xs font-medium text-[#7a2119]"
                    >
                      {errorMsg}
                    </div>
                  ) : null}
                </form>
              ) : null}

              {step === "confirmed" && confirmedOrder ? (
                <div className="space-y-5">
                  <div className="border border-[#c4a27a]/60 bg-[#efe8de] p-5">
                    <div className="flex items-center gap-2.5 text-[#211a15]">
                      <Check className="h-5 w-5 text-[#6b4f2f]" />
                      <h3 className="font-display text-lg font-bold">
                        {whatsappAutoOpened
                          ? `Order #${confirmedOrder.id} · WhatsApp Opened`
                          : `Order #${confirmedOrder.id} Confirmed`}
                      </h3>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#4a3c32]">
                      {confirmedOrder.notification.detail}
                    </p>
                  </div>

                  <div className="border border-[var(--color-border)] bg-white/70 p-4 text-xs leading-relaxed text-[#211a15] space-y-2">
                    <p className="font-bold uppercase tracking-[0.14em] text-[#6b5a4d]">
                      Order Receipt
                    </p>
                    <div className="space-y-1">
                      <p>
                        <span className="text-[#6b5a4d]">Name:</span>{" "}
                        {confirmedOrder.customerName}
                      </p>
                      <p>
                        <span className="text-[#6b5a4d]">Phone:</span> {confirmedOrder.phone}
                      </p>
                      <p>
                        <span className="text-[#6b5a4d]">Delivery Address:</span>{" "}
                        {confirmedOrder.address}, {confirmedOrder.city},{" "}
                        {confirmedOrder.governorate}
                      </p>
                      <p>
                        <span className="text-[#6b5a4d]">Pickup / Delivery:</span>{" "}
                        {confirmedOrder.formattedPickup}
                      </p>
                      {confirmedOrder.instructions ? (
                        <p>
                          <span className="text-[#6b5a4d]">Notes:</span>{" "}
                          {confirmedOrder.instructions}
                        </p>
                      ) : null}
                    </div>

                    <div className="border-t border-[var(--color-border)] pt-2 space-y-1">
                      {confirmedOrder.items.map((item) => (
                        <div
                          key={`${item.productId}-${item.name}`}
                          className="flex justify-between tabular-nums"
                        >
                          <span>
                            {item.name} × {item.quantity} ({item.price} EGP each)
                          </span>
                          <span className="font-semibold">
                            {(item.price * item.quantity).toLocaleString()} EGP
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-[var(--color-border)] pt-2 text-sm font-bold tabular-nums">
                        <span>Final Total</span>
                        <span>{confirmedOrder.totalEgp.toLocaleString()} EGP</span>
                      </div>
                    </div>
                  </div>

                  <div
                    dir="rtl"
                    lang="ar"
                    className="border border-[#c4a27a]/45 bg-[#efe8de]/70 p-3.5 text-right text-xs text-[#3b2f26]"
                  >
                    <strong className="block font-bold">{content.reservation.titleAr}</strong>
                    <span className="mt-1 block leading-relaxed">{content.reservation.bodyAr}</span>
                  </div>

                  <div className="space-y-2.5">
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 bg-[#211a15] px-5 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-[#f6f1ea] transition-opacity hover:opacity-90"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>
                        {whatsappAutoOpened
                          ? "Open WhatsApp Again"
                          : "Open Message in WhatsApp"}
                      </span>
                    </a>

                    <button
                      type="button"
                      onClick={handleCopySummary}
                      className="flex w-full items-center justify-center gap-2 border border-[#211a15]/20 bg-[#efe8de]/60 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#211a15] transition-colors hover:bg-[#efe8de] cursor-pointer"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? "Order Details Copied" : "Copy Order Summary"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleFinishAndReset}
                      className="w-full py-2 text-xs font-medium text-[#6b5a4d] underline-offset-4 hover:text-[#211a15] hover:underline cursor-pointer"
                    >
                      Close & Start New Order
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer Actions */}
            {step === "cart" && cart.length > 0 ? (
              <div className="border-t border-[var(--color-border)] bg-[#efe8de]/80 px-5 py-4 sm:px-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5c4e43]">
                    Subtotal
                  </span>
                  <span className="font-display text-xl font-bold text-[#211a15] tabular-nums">
                    {cartTotal.toLocaleString()} EGP
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setStep("checkout");
                  }}
                  className="w-full bg-[#c4a27a] py-3.5 text-xs font-bold uppercase tracking-[0.22em] text-[#241b14] transition-all hover:brightness-105 cursor-pointer"
                >
                  Proceed to Checkout
                </button>
              </div>
            ) : null}

            {step === "checkout" ? (
              <div className="border-t border-[var(--color-border)] bg-[#efe8de]/80 px-5 py-4 sm:px-6">
                <button
                  type="submit"
                  form="wonka-checkout-form"
                  disabled={isSubmitting || isAreaRestricted}
                  className="flex w-full items-center justify-center gap-2 bg-[#c4a27a] py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-[#241b14] transition-all hover:brightness-105 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>
                    {isAreaRestricted
                      ? "Delivery Unavailable Outside Mansoura"
                      : isSubmitting
                      ? "Submitting Order..."
                      : "Submit & Send WhatsApp Order"}
                  </span>
                </button>
              </div>
            ) : null}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
