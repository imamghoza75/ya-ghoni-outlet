import type { PascaProduct, PrepaidProduct } from "@/lib/types";

function prepaid(
  brand: string,
  name: string,
  category: string,
  sku: string,
  price: number,
  type = "Umum",
): PrepaidProduct {
  return {
    product_name: name,
    category,
    brand,
    type,
    seller_name: "Demo",
    price,
    buyer_sku_code: sku,
    buyer_product_status: true,
    seller_product_status: true,
    unlimited_stock: true,
    stock: 0,
    multi: true,
    start_cut_off: "00:00",
    end_cut_off: "00:00",
    desc: name,
  };
}

const PULSA_BRANDS: [string, string][] = [
  ["TELKOMSEL", "Telkomsel"],
  ["INDOSAT", "Indosat"],
  ["XL", "XL"],
  ["AXIS", "Axis"],
  ["TRI", "Tri"],
  ["SMARTFREN", "Smartfren"],
];

const PULSA_NOMINAL = [5000, 10000, 15000, 20000, 25000, 50000, 100000];

function pulsaModal(nominal: number, index: number) {
  if (nominal <= 5000) return nominal + 700 + index * 20;
  if (nominal <= 15000) return nominal + 550 + index * 15;
  if (nominal <= 25000) return nominal + 400;
  if (nominal <= 50000) return nominal + 250;
  return nominal + 100;
}

const DATA: PrepaidProduct[] = [
  prepaid("TELKOMSEL", "Telkomsel 2GB 30 hari", "Data", "demo-tsel-2gb", 28500, "Data"),
  prepaid("TELKOMSEL", "Telkomsel 8GB 30 hari", "Data", "demo-tsel-8gb", 56000, "Data"),
  prepaid("TELKOMSEL", "Telkomsel 15GB 30 hari", "Data", "demo-tsel-15gb", 78000, "Data"),
  prepaid("XL", "XL Hotrod 3GB 30 hari", "Data", "demo-xl-3gb", 32000, "Data"),
  prepaid("XL", "XL Hotrod 6GB 30 hari", "Data", "demo-xl-6gb", 49000, "Data"),
  prepaid("INDOSAT", "Indosat Freedom 3GB", "Data", "demo-isat-3gb", 29500, "Data"),
  prepaid("INDOSAT", "Indosat Freedom 8GB", "Data", "demo-isat-8gb", 52000, "Data"),
  prepaid("AXIS", "Axis Bronet 3GB", "Data", "demo-axis-3gb", 24500, "Data"),
  prepaid("AXIS", "Axis Bronet 8GB", "Data", "demo-axis-8gb", 43000, "Data"),
  prepaid("TRI", "Tri Data 5GB", "Data", "demo-tri-5gb", 27000, "Data"),
  prepaid("TRI", "Tri Data 10GB", "Data", "demo-tri-10gb", 41000, "Data"),
  prepaid("SMARTFREN", "Smartfren 30 hari", "Data", "demo-smart-30", 36000, "Data"),
];

const PLN = [20000, 50000, 100000, 200000, 500000, 1000000].map((nominal) =>
  prepaid(
    "PLN",
    `Token PLN ${new Intl.NumberFormat("id-ID").format(nominal)}`,
    "PLN",
    `demo-pln-${nominal}`,
    nominal + (nominal >= 500000 ? 2000 : 1500),
    "Token",
  ),
);

const WALLETS: [string, string][] = [
  ["DANA", "DANA"],
  ["GOPAY", "GoPay"],
  ["OVO", "OVO"],
  ["SHOPEEPAY", "ShopeePay"],
  ["LINKAJA", "LinkAja"],
];

const WALLET_NOMINAL = [10000, 25000, 50000, 100000];

const GAMES: PrepaidProduct[] = [
  prepaid("FREE FIRE", "Free Fire 5 Diamond", "Games", "demo-ff-5", 1400, "Game"),
  prepaid("FREE FIRE", "Free Fire 50 Diamond", "Games", "demo-ff-50", 8500, "Game"),
  prepaid("FREE FIRE", "Free Fire 70 Diamond", "Games", "demo-ff-70", 11500, "Game"),
  prepaid("FREE FIRE", "Free Fire 140 Diamond", "Games", "demo-ff-140", 21000, "Game"),
  prepaid("MOBILE LEGENDS", "ML 5 Diamond", "Games", "demo-ml-5", 1600, "Game"),
  prepaid("MOBILE LEGENDS", "ML 86 Diamond", "Games", "demo-ml-86", 22500, "Game"),
  prepaid("MOBILE LEGENDS", "ML 172 Diamond", "Games", "demo-ml-172", 44000, "Game"),
  prepaid("PUBG", "PUBG 60 UC", "Games", "demo-pubg-60", 14500, "Game"),
];

const VOUCHERS: PrepaidProduct[] = [
  prepaid("GOOGLE PLAY", "Google Play 10.000", "Voucher", "demo-gp-10", 11200, "Voucher"),
  prepaid("GOOGLE PLAY", "Google Play 50.000", "Voucher", "demo-gp-50", 52500, "Voucher"),
  prepaid("GOOGLE PLAY", "Google Play 100.000", "Voucher", "demo-gp-100", 103000, "Voucher"),
  prepaid("GARENA", "Garena Shell 33", "Voucher", "demo-shell-33", 10500, "Voucher"),
  prepaid("NETFLIX", "Netflix 1 bulan", "Streaming", "demo-nflx-1", 54000, "Streaming"),
  prepaid("SPOTIFY", "Spotify 1 bulan", "Streaming", "demo-spot-1", 18000, "Streaming"),
];

export const DEMO_PREPAID: PrepaidProduct[] = [
  ...PULSA_BRANDS.flatMap(([brand, label], index) =>
    PULSA_NOMINAL.map((nominal) =>
      prepaid(
        brand,
        `${label} ${new Intl.NumberFormat("id-ID").format(nominal)}`,
        "Pulsa",
        `demo-${brand.toLowerCase()}-${nominal}`,
        pulsaModal(nominal, index),
      ),
    ),
  ),
  ...DATA,
  ...PLN,
  ...WALLETS.flatMap(([brand, label]) =>
    WALLET_NOMINAL.map((nominal) =>
      prepaid(
        brand,
        `${label} ${new Intl.NumberFormat("id-ID").format(nominal)}`,
        "E-Money",
        `demo-${brand.toLowerCase()}-${nominal}`,
        nominal + 800,
        "E-Money",
      ),
    ),
  ),
  ...GAMES,
  ...VOUCHERS,
];

export const DEMO_PASCA: PascaProduct[] = [
  {
    product_name: "PLN Pascabayar",
    category: "Pascabayar",
    brand: "PLN",
    seller_name: "Demo",
    admin: 2500,
    commission: 1500,
    buyer_sku_code: "demo-pln-pasca",
    buyer_product_status: true,
    seller_product_status: true,
    desc: "Tagihan listrik",
  },
  {
    product_name: "PDAM Aetra Jakarta",
    category: "Pascabayar",
    brand: "PDAM",
    seller_name: "Demo",
    admin: 2500,
    commission: 800,
    buyer_sku_code: "demo-pdam-jkt",
    buyer_product_status: true,
    seller_product_status: true,
    desc: "DKI Jakarta",
  },
  {
    product_name: "PDAM Kota Bekasi",
    category: "Pascabayar",
    brand: "PDAM",
    seller_name: "Demo",
    admin: 2500,
    commission: 800,
    buyer_sku_code: "demo-pdam-bks",
    buyer_product_status: true,
    seller_product_status: true,
    desc: "Kota Bekasi",
  },
  {
    product_name: "PDAM Kota Bandung",
    category: "Pascabayar",
    brand: "PDAM",
    seller_name: "Demo",
    admin: 2500,
    commission: 700,
    buyer_sku_code: "demo-pdam-bdg",
    buyer_product_status: true,
    seller_product_status: true,
    desc: "Kota Bandung",
  },
  {
    product_name: "BPJS Kesehatan",
    category: "Pascabayar",
    brand: "BPJS",
    seller_name: "Demo",
    admin: 2500,
    commission: 1000,
    buyer_sku_code: "demo-bpjs",
    buyer_product_status: true,
    seller_product_status: true,
    desc: "Iuran kesehatan",
  },
  {
    product_name: "Indihome",
    category: "Pascabayar",
    brand: "INTERNET",
    seller_name: "Demo",
    admin: 2500,
    commission: 1200,
    buyer_sku_code: "demo-indihome",
    buyer_product_status: true,
    seller_product_status: true,
    desc: "Internet Telkom",
  },
  {
    product_name: "Telkom",
    category: "Pascabayar",
    brand: "TELKOM",
    seller_name: "Demo",
    admin: 2500,
    commission: 900,
    buyer_sku_code: "demo-telkom",
    buyer_product_status: true,
    seller_product_status: true,
    desc: "Telepon rumah",
  },
];

export const SANDBOX_CASES = [
  { label: "Pulsa sukses", sku: "xld10", customerNo: "087800001230", kind: "prepaid" as const, note: "SN 1234567890" },
  { label: "Pulsa gagal", sku: "xld10", customerNo: "087800001232", kind: "prepaid" as const, note: "Langsung gagal" },
  { label: "Pending lalu sukses", sku: "xld10", customerNo: "087800001233", kind: "prepaid" as const, note: "Cek status setelahnya" },
  { label: "Pending lalu gagal", sku: "xld10", customerNo: "087800001234", kind: "prepaid" as const, note: "Cek status setelahnya" },
  { label: "PLN 1 lembar", sku: "pln", customerNo: "530000000001", kind: "pasca" as const, note: "Inquiry sukses" },
  { label: "PLN cek gagal", sku: "pln", customerNo: "530000000003", kind: "pasca" as const, note: "Inquiry gagal" },
  { label: "PLN bayar gagal", sku: "pln", customerNo: "530000000006", kind: "pasca" as const, note: "Bayar ditolak" },
  { label: "PLN pending", sku: "pln", customerNo: "630000000001", kind: "pasca" as const, note: "Callback sukses" },
];
