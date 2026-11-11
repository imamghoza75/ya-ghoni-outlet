import type { Settings, Txn } from "@/lib/types";

export function rupiah(n: number) {
  const value = Number.isFinite(n) ? Math.round(n) : 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function jakartaDateKey(input: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(input));
}

export function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function recentDayKeys(count = 7) {
  const today = jakartaDateKey(new Date());
  const keys: string[] = [];
  for (let ago = count - 1; ago >= 0; ago -= 1) keys.push(shiftKey(today, -ago));
  return keys;
}

function shiftKey(key: string, delta: number) {
  const [year, month, day] = key.split("-").map((part) => Number(part));
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

export function weekdayOfKey(key: string) {
  const [year, month, day] = key.split("-").map((part) => Number(part));
  return new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

export function makeRef() {
  const time = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `GK${time}${rand}`.replace(/[^A-Z0-9]/g, "");
}

export function messageOf(error: unknown) {
  if (error instanceof Error && error.message.trim() && error.message !== "[object Object]") {
    return error.message.trim();
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  return "Terjadi kesalahan. Coba lagi.";
}

export function markupFor(settings: Settings, category: string, sku: string) {
  const override = settings.productMarkup[sku];
  if (typeof override === "number" && Number.isFinite(override)) return override;
  if (typeof settings.markup[category] === "number") return settings.markup[category];
  return settings.markup.Lainnya ?? 1500;
}

export function isConnected(settings: Settings) {
  return settings.username.trim().length > 0 && settings.apiKey.trim().length >= 4;
}

export function buildStruk(txn: Txn, settings: Settings) {
  const line = "------------------------------";
  const rows = [
    (settings.outletName || "Ya Ghoni Outlet").toUpperCase(),
    settings.outletCity,
    settings.whatsapp ? `WA ${settings.whatsapp}` : "",
    line,
    formatWhen(txn.createdAt),
    `Ref ${txn.refId}`,
    line,
    txn.productName,
    txn.customerName,
    txn.customerNo,
    ...txn.billLines,
    line,
    `Harga    ${rupiah(txn.sell)}`,
    `Bayar    ${txn.payMethod}`,
    `Status   ${txn.status.toUpperCase()}`,
    txn.sn ? `SN       ${txn.sn}` : "",
    txn.status !== "Sukses" ? txn.message : "",
    txn.note ? `Catatan  ${txn.note}` : "",
    line,
    settings.footer || "Terima kasih",
  ];
  return rows.filter((row) => row && row.trim().length > 0).join("\n");
}

export function waTarget(customerNo: string) {
  const digits = customerNo.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return "";
}

export function summarizeBill(desc: unknown) {
  if (!desc || typeof desc !== "object" || Array.isArray(desc)) return [];
  const record = desc as Record<string, unknown>;
  const lines: string[] = [];
  const push = (key: string, label: string) => {
    const value = record[key];
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value).trim();
      if (text) lines.push(`${label}: ${text}`);
    }
  };
  push("tarif", "Tarif");
  push("daya", "Daya");
  push("lembar_tagihan", "Lembar");
  push("alamat", "Alamat");
  if (!Array.isArray(record.detail)) push("periode", "Periode");
  if (Array.isArray(record.detail)) {
    for (const row of record.detail) {
      if (!row || typeof row !== "object") continue;
      const item = row as Record<string, unknown>;
      const periode = item.periode ? String(item.periode) : "-";
      const nilai = item.nilai_tagihan ? String(item.nilai_tagihan) : "-";
      const denda = item.denda ? ` · denda ${item.denda}` : "";
      lines.push(`Periode ${periode} · tagihan ${nilai}${denda}`);
    }
  }
  return lines.slice(0, 8);
}

export function asStatus(status: string): Txn["status"] {
  const value = status.toLowerCase();
  if (value.includes("sukses") || value.includes("success")) return "Sukses";
  if (value.includes("pending")) return "Pending";
  return "Gagal";
}

export function inCutoff(start: string, end: string, now = new Date()) {
  if (!start || !end || start === end || (start === "00:00" && end === "00:00")) return false;
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const toMin = (value: string) => {
    const [hour, minute] = value.split(":").map((part) => Number(part));
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return hour * 60 + minute;
  };
  const current = toMin(clock);
  const from = toMin(start);
  const to = toMin(end);
  if (current == null || from == null || to == null) return false;
  if (from < to) return current >= from && current < to;
  return current >= from || current < to;
}
