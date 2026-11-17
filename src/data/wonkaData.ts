export type CategoryId = "cookies" | "brownies" | "cinnamon-rolls" | "tiramisu";

export interface BusinessInfo {
  brandName: string;
  owner: string;
  location: string;
  instagramUrl: string;
  whatsappNumber: string;
  workingHours?: string;
  creditText: string;
  accentColor: string;
  ctaLabel: string;
}

export interface ReservationNotice {
  titleAr: string;
  bodyAr: string;
  ctaAr: string;
  subtextEn: string;
  backgroundImage: string;
}

export interface CategoryItem {
  id: CategoryId | string;
  name: string;
  description: string;
  slideDescription: string;
  image: string;
  thumb: string;
}

export interface ProductItem {
  id: string;
  categoryId: string;
  name: string;
  detail?: string;
  price: number;
  description: string;
  image: string;
  imagePosition?: string;
}

export interface WonkaSiteContent {
  business: BusinessInfo;
  reservation: ReservationNotice;
  categories: CategoryItem[];
  products: ProductItem[];
}

export const DESSERT_IMAGES = {
  cookies: "/assets/aistudio/f11d07c1ab02d177bd4d6338104b808a_c9e318c8.jpg",
  brownies: "/assets/aistudio/8fd58dc9797891c1b33fe221d3fb100d_89bd7716.jpg",
  cinnamonRolls: "/assets/aistudio/ee2fff9a43109e7a5e0e1de5013d6014_069cc7e8.jpg",
  tiramisu: "/assets/aistudio/50939f486fa4683d919ec6f8b480ec8b_80108325.jpg",
} as const;

export const DEFAULT_WONKA_CONTENT: WonkaSiteContent = {
  business: {
    brandName: "Wonka Sweets",
    owner: "Ayaa Elshikh",
    location: "Mansoura, Egypt",
    instagramUrl: "https://www.instagram.com/wonka_sweets1/",
    whatsappNumber: "201050761083",
    workingHours: "5:00 PM – 12:00 AM",
    creditText: "© Wonka Sweets · Mansoura, Egypt",
    accentColor: "#c4a27a",
    ctaLabel: "ORDER NOW",
  },
  reservation: {
    titleAr: "تجهيز طازج عند الطلب",
    bodyAr:
      "نستقبل طلباتكم لتجهيز المكونات وخبزها خصيصاً لكم، مع مرونة كاملة في تنسيق موعد الاستلام أو التوصيل المناسب لكم في أي وقت.",
    ctaAr: "متابعة الطلب",
    subtextEn:
      "Handcrafted to order by Ayaa Elshikh in Mansoura, Egypt. Pickup and delivery times can be scheduled flexibly at your convenience.",
    backgroundImage: DESSERT_IMAGES.brownies,
  },
  categories: [
    {
      id: "cookies",
      name: "Cookies",
      description:
        "Thick, golden-edged artisanal cookies and cookie tarts baked with rich chocolate chunks, caramel centers, and caramelized biscuit spreads.",
      slideDescription:
        "Thick, golden-edged cookies and tarts baked to order in small batches—from classic chocolate chunk boxes to molten filled assortments.",
      image: DESSERT_IMAGES.cookies,
      thumb: DESSERT_IMAGES.cookies,
    },
    {
      id: "brownies",
      name: "Brownies",
      description:
        "Fudgy, crackle-top dark chocolate brownies crafted with pure butter and Belgian cocoa—available in bite boxes, slabs, or custom inscribed trays.",
      slideDescription:
        "Dense, glossy dark chocolate brownies with a delicate crackled crust—served in bite boxes, classic squares, or personalized celebration slabs.",
      image: DESSERT_IMAGES.brownies,
      thumb: DESSERT_IMAGES.brownies,
    },
    {
      id: "cinnamon-rolls",
      name: "Cinnamon Rolls",
      description:
        "Pillow-soft, warm brioche spirals layered with fragrant Ceylon cinnamon and finished with six indulgent gourmet glazes.",
      slideDescription:
        "Pillow-soft brioche spirals swirled with warm cinnamon sugar and crowned with Chocolate, Caramel, Lotus, Kinder, Pistachio, or Berries.",
      image: DESSERT_IMAGES.cinnamonRolls,
      thumb: DESSERT_IMAGES.cinnamonRolls,
    },
    {
      id: "tiramisu",
      name: "Tiramisu",
      description:
        "Velvety whipped mascarpone layered over espresso-kissed savoiardi biscuits and dusted generously with dark Dutch-process cocoa.",
      slideDescription:
        "Silky whipped mascarpone cream layered over espresso-soaked ladyfingers and finished with a delicate veil of pure dark cocoa.",
      image: DESSERT_IMAGES.tiramisu,
      thumb: DESSERT_IMAGES.tiramisu,
    },
  ],
  products: [
    // CATEGORY 1: COOKIES
    {
      id: "cookies-classic-box",
      categoryId: "cookies",
      name: "Classic Box",
      detail: "6 pieces",
      price: 200,
      description:
        "Six signature thick-baked cookies with crisp golden edges and soft, chocolate-studded centers.",
      image: DESSERT_IMAGES.cookies,
      imagePosition: "50% 25%",
    },
    {
      id: "cookies-flat-box",
      categoryId: "cookies",
      name: "Flat Cookies Box",
      detail: "6 different cookies",
      price: 350,
      description:
        "An assorted tasting box of six distinct gourmet cookie flavors, crisp on the rim and chewy throughout.",
      image: DESSERT_IMAGES.cookies,
      imagePosition: "50% 55%",
    },
    {
      id: "cookies-tart",
      categoryId: "cookies",
      name: "Cookie Tart",
      price: 80,
      description:
        "A rich, buttery baked cookie shell cradling a luscious chocolate ganache and caramelized finish.",
      image: DESSERT_IMAGES.cookies,
      imagePosition: "50% 80%",
    },

    // CATEGORY 2: BROWNIES
    {
      id: "brownies-bites-box",
      categoryId: "brownies",
      name: "Brownie Bites Box",
      price: 100,
      description:
        "Bite-sized squares of intensely fudgy dark chocolate brownie, crafted for effortless sharing.",
      image: DESSERT_IMAGES.brownies,
      imagePosition: "50% 25%",
    },
    {
      id: "brownies-plain-box",
      categoryId: "brownies",
      name: "Plain Brownie Box",
      detail: "Size: 20 × 20 cm",
      price: 250,
      description:
        "A full 20 × 20 cm tray of pure, deeply chocolatey classic brownie with a signature crackle top.",
      image: DESSERT_IMAGES.brownies,
      imagePosition: "50% 55%",
    },
    {
      id: "brownies-custom-writing-box",
      categoryId: "brownies",
      name: "Custom Writing Brownie Box",
      detail: "Size: 20 × 20 cm",
      price: 300,
      description:
        "A 20 × 20 cm celebration brownie tray hand-lettered with your personalized message for special occasions.",
      image: DESSERT_IMAGES.brownies,
      imagePosition: "50% 80%",
    },

    // CATEGORY 3: CINNAMON ROLLS
    {
      id: "cinnamon-chocolate",
      categoryId: "cinnamon-rolls",
      name: "Chocolate",
      price: 80,
      description:
        "Warm cinnamon brioche roll drizzled generously with silky dark and milk chocolate glaze.",
      image: DESSERT_IMAGES.cinnamonRolls,
      imagePosition: "50% 48%",
    },
    {
      id: "cinnamon-caramel",
      categoryId: "cinnamon-rolls",
      name: "Caramel",
      price: 80,
      description:
        "Soft spiced roll finished with slow-simmered golden butterscotch caramel.",
      image: DESSERT_IMAGES.cinnamonRolls,
      imagePosition: "45% 52%",
    },
    {
      id: "cinnamon-lotus",
      categoryId: "cinnamon-rolls",
      name: "Lotus",
      price: 80,
      description:
        "Fluffy cinnamon spiral topped with melted Biscoff spread and caramelized biscuit crumble.",
      image: DESSERT_IMAGES.cinnamonRolls,
      imagePosition: "55% 45%",
    },
    {
      id: "cinnamon-kinder",
      categoryId: "cinnamon-rolls",
      name: "Kinder",
      price: 80,
      description:
        "Tender cinnamon roll crowned with creamy hazelnut-milk chocolate sauce.",
      image: DESSERT_IMAGES.cinnamonRolls,
      imagePosition: "50% 58%",
    },
    {
      id: "cinnamon-pistachio",
      categoryId: "cinnamon-rolls",
      name: "Pistachio",
      price: 100,
      description:
        "Artisanal cinnamon roll finished with rich roasted pistachio cream and crushed pistachios.",
      image: DESSERT_IMAGES.cinnamonRolls,
      imagePosition: "42% 48%",
    },
    {
      id: "cinnamon-berries",
      categoryId: "cinnamon-rolls",
      name: "Berries",
      price: 100,
      description:
        "Warm vanilla-iced cinnamon roll balanced with a bright, velvety berry compote glaze.",
      image: DESSERT_IMAGES.cinnamonRolls,
      imagePosition: "58% 52%",
    },

    // CATEGORY 4: TIRAMISU
    {
      id: "tiramisu-classic",
      categoryId: "tiramisu",
      name: "Tiramisu",
      price: 170,
      description:
        "Classic layered dessert crafted with delicate espresso-soaked savoiardi, whipped mascarpone, and fine cocoa.",
      image: DESSERT_IMAGES.tiramisu,
      imagePosition: "50% 50%",
    },
  ],
};
