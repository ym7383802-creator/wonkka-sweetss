export const DELIVERY_RESTRICTION_MESSAGE =
  "Sorry! Delivery is currently available within Mansoura city only. We cannot deliver to other cities or governorates.";

export const EGYPT_GOVERNORATES = [
  "Dakahlia",
  "Cairo",
  "Giza",
  "Alexandria",
  "Gharbia",
  "Sharqia",
  "Damietta",
  "Port Said",
  "Suez",
  "Ismailia",
  "Qalyubia",
  "Kafr El Sheikh",
  "Monufia",
  "Beheira",
  "Fayoum",
  "Beni Suef",
  "Minya",
  "Asyut",
  "Sohag",
  "Qena",
  "Luxor",
  "Aswan",
  "Red Sea",
  "Matrouh",
  "Other Governorate",
] as const;

export const DAKAHLIA_CITIES = [
  "Mansoura",
  "Talkha",
  "Mit Ghamr",
  "El Senbellawein",
  "Dekernes",
  "Belqas",
  "Aga",
  "Sherbin",
  "Gamasa",
  "Manzala",
  "Other City",
] as const;

const DISALLOWED_LOCATION_KEYWORDS = [
  // Other Egyptian governorates & major cities (English + Arabic)
  "cairo",
  "new cairo",
  "القاهره",
  "القاهرة",
  "القاهره الجديده",
  "القاهرة الجديدة",
  "giza",
  "الجيزه",
  "الجيزة",
  "alexandria",
  "alex",
  "الاسكندريه",
  "الإسكندرية",
  "اسكندريه",
  "tanta",
  "طنطا",
  "mahalla",
  "el mahalla",
  "المحله",
  "المحلة",
  "zagazig",
  "الزقازيق",
  "gharbia",
  "الغربيه",
  "الغربية",
  "sharqia",
  "الشرقيه",
  "الشرقية",
  "damietta",
  "new damietta",
  "دمياط",
  "دمياط الجديده",
  "دمياط الجديدة",
  "ras el bar",
  "راس البر",
  "رأس البر",
  "port said",
  "بورسعيد",
  "suez",
  "السويس",
  "ismailia",
  "الاسماعيليه",
  "الإسماعيلية",
  "qalyubia",
  "القليوبيه",
  "القليوبية",
  "banha",
  "بنها",
  "shubra",
  "shobra",
  "شبرا",
  "kafr el sheikh",
  "كفر الشيخ",
  "monufia",
  "menoufia",
  "المنوفيه",
  "المنوفية",
  "shibin",
  "شبين الكوم",
  "beheira",
  "البحيره",
  "البحيرة",
  "damanhour",
  "دمنهور",
  "fayoum",
  "faiyum",
  "الفيوم",
  "beni suef",
  "بني سويف",
  "minya",
  "المنيا",
  "assiut",
  "asyut",
  "اسيوط",
  "أسيوط",
  "sohag",
  "سوهاج",
  "qena",
  "قنا",
  "luxor",
  "الاقصر",
  "الأقصر",
  "aswan",
  "اسوان",
  "أسوان",
  "hurghada",
  "الغردقه",
  "الغردقة",
  "sharm",
  "شرم الشيخ",
  "dahab",
  "دهب",
  "ain sokhna",
  "العين السخنه",
  "العين السخنة",
  "marsa matrouh",
  "matrouh",
  "مرسي مطروح",
  "مطروح",
  "6th of october",
  "6 october",
  "اكتوبر",
  "أكتوبر",
  "sheikh zayed",
  "الشيخ زايد",
  "nasr city",
  "مدينه نصر",
  "مدينة نصر",
  "heliopolis",
  "مصر الجديده",
  "مصر الجديدة",
  "maadi",
  "المعادي",
  "zamalek",
  "الزمالك",
  "dokki",
  "الدقي",
  "mohandessin",
  "المهندسين",
  "haram",
  "الهرم",
  "faisal",
  "فيصل",
  "tagamoa",
  "tagamo3",
  "التجمع",
  "madinaty",
  "مدينتي",
  "rehab",
  "الرحاب",
  "10th of ramadan",
  "العاشر من رمضان",
  "sadat city",
  "السادات",
  "obour",
  "العبور",
  "badr city",
  "الشروق",
  "shorouk",

  // Other towns/cities inside Dakahlia outside Mansoura city
  "talkha",
  "طلخا",
  "mit ghamr",
  "ميت غمر",
  "senbellawein",
  "sinbillawin",
  "السنبلاوين",
  "dekernes",
  "دكرنس",
  "belqas",
  "بلقاس",
  "aga",
  "اجا",
  "أجا",
  "sherbin",
  "شربين",
  "gamasa",
  "جمصه",
  "جمصة",
  "manzala",
  "المنزله",
  "المنزلة",
  "nabaroh",
  "نبروه",
  "bani ebeid",
  "بني عبيد",
  "temay el amdeed",
  "تمي الامديد",
  "matareya",
  "المطريه",
  "المطرية",
  "mit salsil",
  "ميت سلسيل",
  "el kordi",
  "الكردي",
  "meet ghamr",
  "shirbin",
  "new capital",
  "العاصمه الاداريه",
  "العاصمة الإدارية",
  "outside mansoura",
  "خارج المنصوره",
  "خارج المنصورة",
];

const GENERIC_NON_STREET_TOKENS = new Set([
  "egypt",
  "مصر",
  "dakahlia",
  "الدقهليه",
  "mansoura",
  "el",
  "al",
  "المنصوره",
  "postal",
  "code",
  "zip",
  "بريد",
  "بريدي",
  "الرقم",
  "البريدي",
]);

export function toAsciiDigits(value: string): string {
  return (value || "")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

function normalizeText(value: string): string {
  return toAsciiDigits(value)
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsKeyword(normalizedAddress: string, keyword: string): boolean {
  const normKeyword = normalizeText(keyword);
  if (!normKeyword) return false;
  const paddedAddress = ` ${normalizedAddress} `;
  if (paddedAddress.includes(` ${normKeyword} `)) {
    return true;
  }
  if (/[\u0600-\u06FF]/.test(normKeyword) && paddedAddress.includes(` ب${normKeyword} `)) {
    return true;
  }
  return false;
}

export interface DeliveryValidationInput {
  governorate: string;
  city: string;
  address: string;
}

export interface DeliveryValidationResult {
  valid: boolean;
  reason?: "governorate" | "city" | "address" | "incomplete";
  message?: string;
}

export function validateMansouraDelivery(
  input: DeliveryValidationInput
): DeliveryValidationResult {
  const gov = normalizeText(input.governorate || "");
  const city = normalizeText(input.city || "");
  const rawAddress = toAsciiDigits((input.address || "").trim());
  const address = normalizeText(rawAddress);

  if (gov !== "dakahlia" && gov !== "الدقهليه") {
    return {
      valid: false,
      reason: "governorate",
      message: DELIVERY_RESTRICTION_MESSAGE,
    };
  }

  if (city !== "mansoura" && city !== "المنصوره") {
    return {
      valid: false,
      reason: "city",
      message: DELIVERY_RESTRICTION_MESSAGE,
    };
  }

  if (!rawAddress) {
    return {
      valid: false,
      reason: "incomplete",
      message: "Please enter your detailed delivery address inside Mansoura.",
    };
  }

  // Exempt famous Mansoura streets named after Canal cities so valid Mansoura addresses pass
  const keywordCheckAddress = ` ${address} `
    .replace(/\sقناه السويس\s/g, " ")
    .replace(/\bqanat el suez\b/g, " ")
    .replace(/\bsuez canal\b/g, " ")
    .replace(/\sشارع بورسعيد\s/g, " ")
    .replace(/\bport said (st|street)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Block any outside-Mansoura city/governorate/district mentioned in the address,
  // even if the user enters a Mansoura postal code (e.g., 35511).
  for (const keyword of DISALLOWED_LOCATION_KEYWORDS) {
    if (containsKeyword(keywordCheckAddress, keyword)) {
      return {
        valid: false,
        reason: "address",
        message: DELIVERY_RESTRICTION_MESSAGE,
      };
    }
  }

  // Block non-Dakahlia 5-digit Egyptian postal codes (Dakahlia/Mansoura codes begin with 35)
  const postalCodes = rawAddress.match(/\b\d{5}\b/g) ?? [];
  for (const code of postalCodes) {
    if (!code.startsWith("35")) {
      return {
        valid: false,
        reason: "address",
        message: DELIVERY_RESTRICTION_MESSAGE,
      };
    }
  }

  // Require real street/neighborhood text, preventing postal-code-only or generic bypasses
  const meaningfulStreetText = address
    .replace(/\d+/g, " ")
    .split(/\s+/)
    .filter((token) => token && !GENERIC_NON_STREET_TOKENS.has(token))
    .join(" ")
    .trim();

  if (meaningfulStreetText.length < 4) {
    return {
      valid: false,
      reason: "incomplete",
      message:
        "Please provide your full street and neighborhood address in Mansoura (not a postal code only).",
    };
  }

  return { valid: true };
}

export function countPhoneDigits(raw: string): number {
  return toAsciiDigits(raw).replace(/[^\d]/g, "").length;
}

export function normalizeWhatsappPhone(raw: string): string {
  const digits = toAsciiDigits(raw).replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) {
    return normalizeWhatsappPhone(digits.slice(2));
  }
  // Convert Egyptian local mobile format (01xxxxxxxxx -> 201xxxxxxxxx)
  if (digits.startsWith("01") && digits.length === 11) {
    return `2${digits}`;
  }
  // Convert 10-digit Egyptian mobile without leading 0 (1xxxxxxxxx -> 201xxxxxxxxx)
  if (/^1[0125]\d{8}$/.test(digits)) {
    return `20${digits}`;
  }
  return digits;
}

export function buildWhatsappUrl(phoneRaw: string, message: string): string {
  const recipient = normalizeWhatsappPhone(phoneRaw);
  const encoded = encodeURIComponent(message);
  if (recipient) {
    return `https://wa.me/${recipient}?text=${encoded}`;
  }
  return `https://api.whatsapp.com/send?text=${encoded}`;
}
