import { Gamepad2, LayoutGrid, Receipt, Smartphone, Ticket, Wallet, Wifi, Zap } from "lucide-react";

export const TILES = [
  { id: "Pulsa", label: "Pulsa", hint: "Semua operator", icon: Smartphone },
  { id: "Data", label: "Paket data", hint: "Kuota internet", icon: Wifi },
  { id: "PLN", label: "Token listrik", hint: "Prabayar PLN", icon: Zap },
  { id: "E-Money", label: "E-wallet", hint: "Dana, OVO, GoPay", icon: Wallet },
  { id: "Games", label: "Game", hint: "Diamond dan UC", icon: Gamepad2 },
  { id: "Voucher", label: "Voucher", hint: "Play dan streaming", icon: Ticket },
  { id: "Tagihan", label: "Tagihan", hint: "PLN, PDAM, BPJS", icon: Receipt },
  { id: "Lainnya", label: "Lainnya", hint: "Di luar kategori utama", icon: LayoutGrid },
] as const;

export type TileId = (typeof TILES)[number]["id"];

const MAIN = ["Pulsa", "Data", "PLN", "E-Money", "Games", "Voucher"] as const;

export function matchesTile(category: string, brand: string, tile: string): boolean {
  const blob = `${category} ${brand}`.toLowerCase();
  if (tile === "Pulsa") return category.toLowerCase() === "pulsa";
  if (tile === "Data") return blob.includes("data");
  if (tile === "PLN") return /pln|token|listrik/.test(blob) && !blob.includes("pascabayar");
  if (tile === "E-Money") return /e-money|emoney|e money|uang elektronik/.test(blob);
  if (tile === "Games") return blob.includes("game");
  if (tile === "Voucher") return /voucher|streaming/.test(blob);
  if (tile === "Lainnya") return !MAIN.some((id) => matchesTile(category, brand, id));
  return false;
}

export function productReady(product: {
  buyer_product_status: boolean;
  seller_product_status: boolean;
  unlimited_stock?: boolean;
  stock?: number;
}) {
  if (!product.buyer_product_status || !product.seller_product_status) return false;
  if (product.unlimited_stock === false && (product.stock ?? 0) <= 0) return false;
  return true;
}
