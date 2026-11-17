import "dotenv/config";
import crypto from "crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import {
  DEFAULT_WONKA_CONTENT,
  type WonkaSiteContent,
} from "./src/data/wonkaData.ts";
import {
  countPhoneDigits,
  DELIVERY_RESTRICTION_MESSAGE,
  normalizeWhatsappPhone,
  validateMansouraDelivery,
} from "./src/utils/deliveryValidation.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(__dirname, "data");
const STORE_FILE = path.join(DATA_DIR, "wonka-orders.json");
const ADMIN_COOKIE_NAME = "wonka_admin_session";
const SESSION_TTL_SECONDS = 24 * 60 * 60;

type OrderStatus = "pending" | "confirmed" | "preparing" | "delivered" | "cancelled";

interface OrderLineItem {
  productId: string;
  categoryId: string;
  name: string;
  detail?: string;
  price: number;
  quantity: number;
}

interface NotificationRecord {
  status: "sent" | "queued" | "pending_number" | "failed";
  provider: "whatsapp_cloud_api" | "whatsapp_webhook" | "server_queue";
  recipientNumber: string;
  attemptedAt: string;
  providerMessageId?: string;
  detail: string;
}

interface StoredOrder {
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
  items: OrderLineItem[];
  totalEgp: number;
  whatsappMessage: string;
  notification: NotificationRecord;
}

interface AdminAccount {
  email: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

interface ServerStore {
  sessionSecret: string;
  adminAccount: AdminAccount | null;
  receivingWhatsappNumber: string;
  menu: WonkaSiteContent;
  orders: StoredOrder[];
}

interface AdminSessionPayload {
  sub: string;
  role: "admin";
  jti: string;
  iat: number;
  exp: number;
}

const revokedTokenIds = new Set<string>();
const loginFailuresByIp = new Map<string, { count: number; resetAt: number }>();

function cloneDefaultMenu(): WonkaSiteContent {
  return JSON.parse(JSON.stringify(DEFAULT_WONKA_CONTENT)) as WonkaSiteContent;
}

function readServerStore(): ServerStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_FILE)) {
      const initial: ServerStore = {
        sessionSecret: crypto.randomBytes(32).toString("hex"),
        adminAccount: null,
        receivingWhatsappNumber: normalizeWhatsappPhone(
          process.env.WHATSAPP_RECEIVING_NUMBER ||
            DEFAULT_WONKA_CONTENT.business.whatsappNumber
        ),
        menu: cloneDefaultMenu(),
        orders: [],
      };
      fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), "utf8");
      return initial;
    }

    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<ServerStore>;

    let dirty = false;
    let sessionSecret = parsed.sessionSecret;
    if (!sessionSecret || typeof sessionSecret !== "string" || sessionSecret.length < 32) {
      sessionSecret = crypto.randomBytes(32).toString("hex");
      dirty = true;
    }

    const resolvedReceivingNumber = normalizeWhatsappPhone(
      parsed.receivingWhatsappNumber ||
        process.env.WHATSAPP_RECEIVING_NUMBER ||
        parsed.menu?.business?.whatsappNumber ||
        DEFAULT_WONKA_CONTENT.business.whatsappNumber
    );
    if (!parsed.receivingWhatsappNumber && resolvedReceivingNumber) {
      dirty = true;
    }

    const loadedMenu =
      parsed.menu &&
      parsed.menu.business &&
      parsed.menu.reservation &&
      Array.isArray(parsed.menu.categories) &&
      Array.isArray(parsed.menu.products)
        ? parsed.menu
        : cloneDefaultMenu();

    // Migrate legacy default 24-hour restriction notice copy if still present
    if (
      loadedMenu.reservation.bodyAr?.includes("24 ساعة") ||
      loadedMenu.reservation.subtextEn?.includes("24-hour")
    ) {
      loadedMenu.reservation = {
        ...loadedMenu.reservation,
        titleAr: DEFAULT_WONKA_CONTENT.reservation.titleAr,
        bodyAr: DEFAULT_WONKA_CONTENT.reservation.bodyAr,
        subtextEn: DEFAULT_WONKA_CONTENT.reservation.subtextEn,
      };
      dirty = true;
    }

    const store: ServerStore = {
      sessionSecret,
      adminAccount: parsed.adminAccount ?? null,
      receivingWhatsappNumber: resolvedReceivingNumber,
      menu: loadedMenu,
      orders: Array.isArray(parsed.orders)
        ? parsed.orders.map((o) => ({
            ...o,
            orderStatus: o.orderStatus || "pending",
          }))
        : [],
    };

    if (dirty || !parsed.menu) {
      fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
    }

    return store;
  } catch {
    return {
      sessionSecret: crypto.randomBytes(32).toString("hex"),
      adminAccount: null,
      receivingWhatsappNumber: normalizeWhatsappPhone(
        process.env.WHATSAPP_RECEIVING_NUMBER ||
          DEFAULT_WONKA_CONTENT.business.whatsappNumber
      ),
      menu: cloneDefaultMenu(),
      orders: [],
    };
  }
}

function writeServerStore(store: ServerStore): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

function getSigningSecret(store: ServerStore): string {
  return process.env.SESSION_SECRET?.trim() || store.sessionSecret;
}

function hashPassword(password: string, saltHex: string): Buffer {
  return crypto.scryptSync(password, saltHex, 64);
}

function verifyPassword(password: string, saltHex: string, expectedHashHex: string): boolean {
  try {
    const derived = hashPassword(password, saltHex);
    const expected = Buffer.from(expectedHashHex, "hex");
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function constantTimeStringEqual(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function hasEnvAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD?.trim());
}

function hasAnyAdminConfigured(store: ServerStore): boolean {
  return hasEnvAdminConfigured() || Boolean(store.adminAccount?.passwordHash);
}

function signAdminSession(email: string, secret: string): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    sub: email,
    role: "admin",
    jti: crypto.randomBytes(16).toString("hex"),
    iat: nowSec,
    exp: nowSec + SESSION_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${sig}`;
}

function verifySignedToken(token: string, secret: string): AdminSessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [encodedPayload, providedSig] = parts;
    if (!encodedPayload || !providedSig) return null;

    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(encodedPayload)
      .digest("base64url");

    const sigBufA = Buffer.from(providedSig, "utf8");
    const sigBufB = Buffer.from(expectedSig, "utf8");
    if (sigBufA.length !== sigBufB.length || !crypto.timingSafeEqual(sigBufA, sigBufB)) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as AdminSessionPayload;

    if (
      !decoded ||
      decoded.role !== "admin" ||
      typeof decoded.sub !== "string" ||
      typeof decoded.exp !== "number" ||
      typeof decoded.jti !== "string"
    ) {
      return null;
    }

    if (revokedTokenIds.has(decoded.jti)) {
      return null;
    }

    if (Math.floor(Date.now() / 1000) >= decoded.exp) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      result[key] = decodeURIComponent(val);
    }
  }
  return result;
}

function extractRequestToken(req: Request): string | null {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[ADMIN_COOKIE_NAME]) {
    return cookies[ADMIN_COOKIE_NAME];
  }
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice(7).trim() || null;
  }
  return null;
}

function getAuthenticatedAdmin(req: Request, store: ServerStore): AdminSessionPayload | null {
  const token = extractRequestToken(req);
  if (!token) return null;
  return verifySignedToken(token, getSigningSecret(store));
}

function isSecureRequest(req: Request): boolean {
  const proto = String(req.headers["x-forwarded-proto"] || "").toLowerCase();
  return req.secure || proto.includes("https");
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const secure = isSecureRequest(req);
  const parts = [
    `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (secure) {
    parts.push("SameSite=None", "Secure", "Partitioned");
  } else {
    parts.push("SameSite=Lax");
  }
  res.setHeader("Set-Cookie", parts.join("; "));
}

function clearSessionCookie(req: Request, res: Response): void {
  const secure = isSecureRequest(req);
  const parts = [`${ADMIN_COOKIE_NAME}=`, "HttpOnly", "Path=/", "Max-Age=0"];
  if (secure) {
    parts.push("SameSite=None", "Secure", "Partitioned");
  } else {
    parts.push("SameSite=Lax");
  }
  res.setHeader("Set-Cookie", parts.join("; "));
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const store = readServerStore();
  const session = getAuthenticatedAdmin(req, store);
  if (!session) {
    res.status(401).json({
      error: "Unauthorized. Administrator sign-in is required.",
    });
    return;
  }
  (req as Request & { adminSession?: AdminSessionPayload }).adminSession = session;
  next();
}

function getPublicMenu(store: ServerStore): WonkaSiteContent {
  const publicWhatsapp = normalizeWhatsappPhone(
    store.receivingWhatsappNumber ||
      store.menu.business.whatsappNumber ||
      process.env.WHATSAPP_RECEIVING_NUMBER ||
      DEFAULT_WONKA_CONTENT.business.whatsappNumber
  );
  return {
    ...store.menu,
    business: {
      ...store.menu.business,
      whatsappNumber: publicWhatsapp,
      workingHours:
        store.menu.business.workingHours ||
        DEFAULT_WONKA_CONTENT.business.workingHours,
    },
  };
}

function buildWhatsappOrderText(order: {
  id: string;
  customerName: string;
  phone: string;
  governorate: string;
  city: string;
  address: string;
  formattedPickup: string;
  instructions: string;
  items: OrderLineItem[];
  totalEgp: number;
}): string {
  const lines: string[] = [
    `New Order #${order.id} — Wonka Sweets`,
    `Location: ${order.city}, ${order.governorate}, Egypt`,
    "",
    "Order Items:",
    ...order.items.map(
      (item, idx) =>
        `${idx + 1}. ${item.name}${item.detail ? ` (${item.detail})` : ""} x ${
          item.quantity
        } @ ${item.price} EGP = ${(item.price * item.quantity).toLocaleString()} EGP`
    ),
    "",
    `Total Order Amount: ${order.totalEgp.toLocaleString()} EGP`,
    "",
    "Customer Details:",
    `Full Name: ${order.customerName}`,
    `Phone: ${order.phone}`,
    `Delivery Address: ${order.address}, ${order.city}, ${order.governorate}`,
    `Preferred Pickup / Delivery: ${order.formattedPickup}`,
  ];

  if (order.instructions.trim()) {
    lines.push(`Special Instructions: ${order.instructions.trim()}`);
  }

  return lines.join("\n");
}

async function dispatchWhatsappNotification(
  recipientRaw: string,
  order: StoredOrder
): Promise<NotificationRecord> {
  const recipientNumber = normalizeWhatsappPhone(recipientRaw);
  const attemptedAt = new Date().toISOString();

  if (!recipientNumber) {
    return {
      status: "pending_number",
      provider: "server_queue",
      recipientNumber: "",
      attemptedAt,
      detail:
        "Order saved. Add your receiving WhatsApp number in the Admin Dashboard to enable automatic dispatch.",
    };
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME?.trim();
  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL?.trim();

  if (accessToken && phoneNumberId) {
    try {
      const endpoint = `https://graph.facebook.com/v21.0/${encodeURIComponent(
        phoneNumberId
      )}/messages`;

      const payload = templateName
        ? {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: recipientNumber,
            type: "template",
            template: {
              name: templateName,
              language: { code: "en" },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: order.id },
                    { type: "text", text: order.customerName },
                    { type: "text", text: order.phone },
                    { type: "text", text: `${order.totalEgp} EGP` },
                  ],
                },
              ],
            },
          }
        : {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: recipientNumber,
            type: "text",
            text: {
              preview_url: false,
              body: order.whatsappMessage,
            },
          };

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await resp.json().catch(() => ({}))) as {
        messages?: Array<{ id?: string }>;
        error?: { message?: string };
      };

      if (resp.ok) {
        return {
          status: "sent",
          provider: "whatsapp_cloud_api",
          recipientNumber,
          attemptedAt,
          providerMessageId: data.messages?.[0]?.id,
          detail: `Notification sent automatically via WhatsApp Business Cloud API to +${recipientNumber}.`,
        };
      }

      return {
        status: "failed",
        provider: "whatsapp_cloud_api",
        recipientNumber,
        attemptedAt,
        detail:
          data.error?.message ||
          `WhatsApp Cloud API returned HTTP ${resp.status}.`,
      };
    } catch (err) {
      return {
        status: "failed",
        provider: "whatsapp_cloud_api",
        recipientNumber,
        attemptedAt,
        detail:
          err instanceof Error
            ? err.message
            : "Network error reaching WhatsApp Cloud API.",
      };
    }
  }

  if (webhookUrl) {
    try {
      const resp = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipientNumber,
          orderId: order.id,
          message: order.whatsappMessage,
          order,
        }),
      });
      if (resp.ok) {
        return {
          status: "sent",
          provider: "whatsapp_webhook",
          recipientNumber,
          attemptedAt,
          detail: `Notification dispatched via server webhook to +${recipientNumber}.`,
        };
      }
      return {
        status: "failed",
        provider: "whatsapp_webhook",
        recipientNumber,
        attemptedAt,
        detail: `WhatsApp webhook returned HTTP ${resp.status}.`,
      };
    } catch (err) {
      return {
        status: "failed",
        provider: "whatsapp_webhook",
        recipientNumber,
        attemptedAt,
        detail:
          err instanceof Error
            ? err.message
            : "Failed to reach WhatsApp webhook.",
      };
    }
  }

  return {
    status: "queued",
    provider: "server_queue",
    recipientNumber,
    attemptedAt,
    detail: `Order notification queued for +${recipientNumber}. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in server secrets to deliver via Meta Cloud API.`,
  };
}

function maskPublicNotification(notif: NotificationRecord): NotificationRecord {
  return {
    ...notif,
    detail:
      notif.status === "sent"
        ? "Automatic WhatsApp notification sent to Wonka Sweets."
        : notif.status === "queued"
        ? "Order recorded and WhatsApp opened to complete confirmation with Wonka Sweets."
        : notif.status === "pending_number"
        ? "Order recorded and WhatsApp prepared for confirmation."
        : "Order recorded. Use the WhatsApp button below to send your order directly.",
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "4mb" }));

  // =====================================================
  // PUBLIC ENDPOINTS (Available to all visitors)
  // =====================================================

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/menu", (_req, res) => {
    const store = readServerStore();
    res.json(getPublicMenu(store));
  });

  app.post("/api/orders", async (req, res) => {
    const body = (req.body || {}) as {
      customerName?: string;
      phone?: string;
      governorate?: string;
      city?: string;
      address?: string;
      pickupDateTime?: string;
      pickupDateTimeIso?: string;
      formattedPickup?: string;
      instructions?: string;
      items?: OrderLineItem[];
    };

    const customerName = (body.customerName || "").trim();
    const phone = (body.phone || "").trim();
    const governorate = (body.governorate || "").trim();
    const city = (body.city || "").trim();
    const address = (body.address || "").trim();
    const pickupDateTime = (body.pickupDateTime || "").trim();
    const pickupDateTimeIso = (body.pickupDateTimeIso || "").trim();
    const instructions = (body.instructions || "").trim();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!customerName) {
      res.status(400).json({ error: "Customer full name is required." });
      return;
    }

    if (!phone || countPhoneDigits(phone) < 7) {
      res.status(400).json({ error: "A valid phone number is required." });
      return;
    }

    const deliveryCheck = validateMansouraDelivery({
      governorate,
      city,
      address,
    });
    if (!deliveryCheck.valid) {
      res.status(400).json({
        error: deliveryCheck.message || DELIVERY_RESTRICTION_MESSAGE,
        reason: deliveryCheck.reason,
      });
      return;
    }

    const pickupSource = pickupDateTimeIso || pickupDateTime;
    if (!pickupSource) {
      res.status(400).json({ error: "Preferred pickup date and time is required." });
      return;
    }

    const pickupMs = new Date(pickupSource).getTime();
    if (Number.isNaN(pickupMs)) {
      res.status(400).json({
        error: "Please provide a valid preferred pickup or delivery date and time.",
      });
      return;
    }

    if (items.length === 0) {
      res.status(400).json({ error: "Your order must contain at least one product." });
      return;
    }

    const store = readServerStore();
    const catalogById = new Map(store.menu.products.map((p) => [p.id, p]));
    const catalogByName = new Map(
      store.menu.products.map((p) => [p.name.trim().toLowerCase(), p])
    );

    // Authoritative server-side price & product verification
    const sanitizedItems: OrderLineItem[] = [];
    for (const rawItem of items) {
      if (!rawItem) continue;
      const byId =
        typeof rawItem.productId === "string"
          ? catalogById.get(rawItem.productId)
          : undefined;
      const byName =
        !byId && typeof rawItem.name === "string"
          ? catalogByName.get(rawItem.name.trim().toLowerCase())
          : undefined;
      const catalogProduct = byId || byName;
      if (!catalogProduct) {
        res.status(400).json({
          error: `Product "${String(rawItem.name || rawItem.productId)}" is no longer available on the menu.`,
        });
        return;
      }
      const qty = Math.floor(Number(rawItem.quantity));
      if (!Number.isFinite(qty) || qty < 1 || qty > 100) {
        res.status(400).json({ error: "Invalid product quantity." });
        return;
      }
      sanitizedItems.push({
        productId: catalogProduct.id,
        categoryId: catalogProduct.categoryId,
        name: catalogProduct.name,
        detail: catalogProduct.detail,
        price: catalogProduct.price,
        quantity: qty,
      });
    }

    if (sanitizedItems.length === 0) {
      res.status(400).json({ error: "Invalid order items." });
      return;
    }

    const totalEgp = sanitizedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const nextNum = 1001 + store.orders.length;
    const orderId = `WS-${nextNum}`;
    const formattedPickup =
      body.formattedPickup?.trim() ||
      new Date(pickupSource).toLocaleString("en-EG", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

    const whatsappMessage = buildWhatsappOrderText({
      id: orderId,
      customerName,
      phone,
      governorate: "Dakahlia",
      city: "Mansoura",
      address,
      formattedPickup,
      instructions,
      items: sanitizedItems,
      totalEgp,
    });

    const newOrder: StoredOrder = {
      id: orderId,
      createdAt: new Date().toISOString(),
      orderStatus: "pending",
      customerName,
      phone,
      governorate: "Dakahlia",
      city: "Mansoura",
      address,
      pickupDateTime,
      formattedPickup,
      instructions,
      items: sanitizedItems,
      totalEgp,
      whatsappMessage,
      notification: {
        status: "queued",
        provider: "server_queue",
        recipientNumber: store.receivingWhatsappNumber,
        attemptedAt: new Date().toISOString(),
        detail: "Pending dispatch",
      },
    };

    newOrder.notification = await dispatchWhatsappNotification(
      store.receivingWhatsappNumber,
      newOrder
    );

    store.orders.unshift(newOrder);
    writeServerStore(store);

    const publicReceiptOrder: StoredOrder = {
      ...newOrder,
      notification: maskPublicNotification(newOrder.notification),
    };

    res.status(201).json({
      order: publicReceiptOrder,
      notification: publicReceiptOrder.notification,
    });
  });

  // =====================================================
  // ADMIN AUTHENTICATION ENDPOINTS
  // =====================================================

  app.get("/api/admin/auth/status", (req, res) => {
    const store = readServerStore();
    const session = getAuthenticatedAdmin(req, store);
    res.json({
      authenticated: Boolean(session),
      setupRequired: !hasAnyAdminConfigured(store),
      email: session ? session.sub : undefined,
    });
  });

  app.post("/api/admin/auth/setup", (req, res) => {
    const store = readServerStore();
    if (hasAnyAdminConfigured(store)) {
      res.status(403).json({
        error: "Administrator account is already configured. Please sign in.",
      });
      return;
    }

    const body = (req.body || {}) as { email?: string; password?: string };
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    if (!email || !email.includes("@") || email.length < 5) {
      res.status(400).json({ error: "Please enter a valid owner email address." });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        error: "Password must be at least 8 characters long.",
      });
      return;
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt).toString("hex");
    const now = new Date().toISOString();

    store.adminAccount = {
      email,
      salt,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };
    writeServerStore(store);

    const token = signAdminSession(email, getSigningSecret(store));
    setSessionCookie(req, res, token);
    res.status(201).json({
      authenticated: true,
      email,
      sessionToken: token,
    });
  });

  app.post("/api/admin/auth/login", (req, res) => {
    const ip = req.ip || "unknown";
    const nowMs = Date.now();
    const failRecord = loginFailuresByIp.get(ip);
    if (failRecord && failRecord.count >= 10 && nowMs < failRecord.resetAt) {
      res.status(429).json({
        error: "Too many failed login attempts. Please wait a few minutes and try again.",
      });
      return;
    }

    const store = readServerStore();
    if (!hasAnyAdminConfigured(store)) {
      res.status(403).json({
        error: "Owner account setup is required first.",
        setupRequired: true,
      });
      return;
    }

    const body = (req.body || {}) as { email?: string; password?: string };
    const emailInput = (body.email || "").trim().toLowerCase();
    const passwordInput = body.password || "";

    if (!emailInput || !passwordInput) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    let valid = false;
    let verifiedEmail = emailInput;

    const envPassword = process.env.ADMIN_PASSWORD?.trim();
    const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

    if (envPassword) {
      const passwordOk = constantTimeStringEqual(passwordInput, envPassword);
      const emailOk = envEmail ? constantTimeStringEqual(emailInput, envEmail) : true;
      if (passwordOk && emailOk) {
        valid = true;
        verifiedEmail = envEmail || emailInput;
      }
    }

    if (!valid && store.adminAccount) {
      const emailOk = constantTimeStringEqual(emailInput, store.adminAccount.email);
      const passwordOk = verifyPassword(
        passwordInput,
        store.adminAccount.salt,
        store.adminAccount.passwordHash
      );
      if (emailOk && passwordOk) {
        valid = true;
        verifiedEmail = store.adminAccount.email;
      }
    }

    if (!valid) {
      const current =
        failRecord && nowMs < failRecord.resetAt
          ? failRecord
          : { count: 0, resetAt: nowMs + 15 * 60 * 1000 };
      current.count += 1;
      loginFailuresByIp.set(ip, current);
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    loginFailuresByIp.delete(ip);
    const token = signAdminSession(verifiedEmail, getSigningSecret(store));
    setSessionCookie(req, res, token);
    res.json({
      authenticated: true,
      email: verifiedEmail,
      sessionToken: token,
    });
  });

  app.post("/api/admin/auth/logout", (req, res) => {
    const store = readServerStore();
    const session = getAuthenticatedAdmin(req, store);
    if (session?.jti) {
      revokedTokenIds.add(session.jti);
    }
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  // =====================================================
  // PROTECTED ADMIN ROUTES (Require valid admin session)
  // =====================================================

  app.get("/api/admin/settings", requireAdmin, (_req, res) => {
    const store = readServerStore();
    const cloudApiConfigured = Boolean(
      process.env.WHATSAPP_ACCESS_TOKEN?.trim() &&
        process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
    );
    const webhookConfigured = Boolean(process.env.WHATSAPP_WEBHOOK_URL?.trim());

    res.json({
      receivingWhatsappNumber: store.receivingWhatsappNumber,
      cloudApiConfigured,
      webhookConfigured,
      deliveryScope: "Mansoura, Dakahlia, Egypt",
    });
  });

  app.put("/api/admin/settings", requireAdmin, (req, res) => {
    const body = (req.body || {}) as { receivingWhatsappNumber?: string };
    const normalized = normalizeWhatsappPhone(body.receivingWhatsappNumber || "");
    if (body.receivingWhatsappNumber && normalized.length < 8) {
      res.status(400).json({
        error: "Please enter a valid WhatsApp phone number including country code.",
      });
      return;
    }

    const store = readServerStore();
    store.receivingWhatsappNumber = normalized;
    writeServerStore(store);

    res.json({
      receivingWhatsappNumber: store.receivingWhatsappNumber,
    });
  });

  app.get("/api/admin/orders", requireAdmin, (_req, res) => {
    const store = readServerStore();
    res.json({
      orders: store.orders,
    });
  });

  app.patch("/api/admin/orders/:id", requireAdmin, (req, res) => {
    const body = (req.body || {}) as { orderStatus?: OrderStatus };
    const allowed: OrderStatus[] = [
      "pending",
      "confirmed",
      "preparing",
      "delivered",
      "cancelled",
    ];
    if (!body.orderStatus || !allowed.includes(body.orderStatus)) {
      res.status(400).json({ error: "Invalid order status." });
      return;
    }

    const store = readServerStore();
    const order = store.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }

    order.orderStatus = body.orderStatus;
    writeServerStore(store);
    res.json({ order });
  });

  app.delete("/api/admin/orders/:id", requireAdmin, (req, res) => {
    const store = readServerStore();
    const before = store.orders.length;
    store.orders = store.orders.filter((o) => o.id !== req.params.id);
    if (store.orders.length === before) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    writeServerStore(store);
    res.json({ ok: true });
  });

  app.post("/api/admin/orders/:id/resend", requireAdmin, async (req, res) => {
    const store = readServerStore();
    const order = store.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }

    order.notification = await dispatchWhatsappNotification(
      store.receivingWhatsappNumber,
      order
    );
    writeServerStore(store);

    res.json({ order, notification: order.notification });
  });

  app.get("/api/admin/content", requireAdmin, (_req, res) => {
    const store = readServerStore();
    res.json(store.menu);
  });

  app.put("/api/admin/content", requireAdmin, (req, res) => {
    const body = req.body as Partial<WonkaSiteContent>;
    if (
      !body ||
      !body.business ||
      !body.reservation ||
      !Array.isArray(body.categories) ||
      !Array.isArray(body.products)
    ) {
      res.status(400).json({ error: "Invalid menu content payload." });
      return;
    }

    const sanitizedProducts = body.products.map((p) => ({
      id: String(p.id || `prod-${Date.now()}`),
      categoryId: String(p.categoryId || body.categories![0]?.id || "cookies"),
      name: String(p.name || "").trim() || "Untitled Item",
      detail: p.detail ? String(p.detail).trim() : undefined,
      price: Math.max(0, Number(p.price) || 0),
      description: String(p.description || "").trim(),
      image: String(p.image || ""),
      imagePosition: p.imagePosition ? String(p.imagePosition) : undefined,
    }));

    const store = readServerStore();
    store.menu = {
      business: {
        brandName: String(body.business.brandName || "Wonka Sweets"),
        owner: String(body.business.owner || "Ayaa Elshikh"),
        location: String(body.business.location || "Mansoura, Egypt"),
        instagramUrl: String(body.business.instagramUrl || ""),
        whatsappNumber:
          store.receivingWhatsappNumber ||
          DEFAULT_WONKA_CONTENT.business.whatsappNumber,
        workingHours: String(
          body.business.workingHours ||
            DEFAULT_WONKA_CONTENT.business.workingHours ||
            "5:00 PM – 12:00 AM"
        ),
        creditText: String(body.business.creditText || ""),
        accentColor: String(body.business.accentColor || "#c4a27a"),
        ctaLabel: String(body.business.ctaLabel || "ORDER NOW"),
      },
      reservation: {
        titleAr: String(body.reservation.titleAr || ""),
        bodyAr: String(body.reservation.bodyAr || ""),
        ctaAr: String(body.reservation.ctaAr || ""),
        subtextEn: String(body.reservation.subtextEn || ""),
        backgroundImage: String(body.reservation.backgroundImage || ""),
      },
      categories: body.categories.map((c) => ({
        id: String(c.id || ""),
        name: String(c.name || ""),
        description: String(c.description || ""),
        slideDescription: String(c.slideDescription || ""),
        image: String(c.image || ""),
        thumb: String(c.thumb || c.image || ""),
      })),
      products: sanitizedProducts,
    };

    writeServerStore(store);
    res.json(store.menu);
  });

  app.post("/api/admin/content/reset", requireAdmin, (_req, res) => {
    const store = readServerStore();
    store.menu = cloneDefaultMenu();
    writeServerStore(store);
    res.json(store.menu);
  });

  // Server-side page redirect: direct unauthorized visit to /admin redirects to /admin/login
  app.use((req, res, next) => {
    if (
      req.method === "GET" &&
      (req.path === "/admin" ||
        (req.path.startsWith("/admin/") && req.path !== "/admin/login"))
    ) {
      const store = readServerStore();
      const session = getAuthenticatedAdmin(req, store);
      if (!session) {
        res.redirect(302, "/admin/login");
        return;
      }
    }
    next();
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Wonka Sweets server running on http://localhost:${PORT}`);
  });
}

startServer();
