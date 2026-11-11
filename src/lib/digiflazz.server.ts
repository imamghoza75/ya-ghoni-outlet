import { createHash } from "node:crypto";
import { summarizeBill } from "@/lib/money";
import { explainRc } from "@/lib/rc";
import type { PascaProduct, PrepaidProduct, TxPayload } from "@/lib/types";

const BASE = "https://api.digiflazz.com/v1";

export class DigiflazzError extends Error {
  rc: string;
  constructor(message: string, rc = "") {
    super(message);
    this.name = "DigiflazzError";
    this.rc = rc;
  }
}

function sign(username: string, apiKey: string, suffix: string) {
  return createHash("md5").update(`${username}${apiKey}${suffix}`).digest("hex");
}

async function postJson(path: string, body: Record<string, unknown>) {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(28000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new DigiflazzError(
        "Digiflazz terlalu lama merespons. Jangan ulang transaksi dulu — cek status dengan ref yang sama.",
      );
    }
    throw new DigiflazzError("Tidak bisa menghubungi Digiflazz. Coba lagi sebentar.");
  }

  const text = await response.text();
  if (!text) throw new DigiflazzError(`Digiflazz tidak mengirim balasan (HTTP ${response.status}).`);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new DigiflazzError("Balasan Digiflazz tidak bisa dibaca.");
  }
}

function asRecord(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return null;
}

function failFrom(record: Record<string, unknown> | null, fallback: string): never {
  const rc = record && typeof record.rc === "string" ? record.rc : "";
  const message =
    record && typeof record.message === "string" && record.message.trim()
      ? record.message.trim()
      : explainRc(rc, fallback);
  throw new DigiflazzError(rc ? `${message} (RC ${rc})` : message, rc);
}

function str(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function num(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function flag(value: unknown) {
  return value === true || value === 1 || value === "true" || value === "1";
}

function parsePrepaid(value: unknown): PrepaidProduct | null {
  const row = asRecord(value);
  if (!row) return null;
  const sku = str(row.buyer_sku_code).trim();
  const name = str(row.product_name).trim();
  const price = num(row.price);
  if (!sku || !name || price == null) return null;
  return {
    product_name: name,
    category: str(row.category) || "Lainnya",
    brand: str(row.brand) || "LAINNYA",
    type: str(row.type),
    seller_name: str(row.seller_name),
    price,
    buyer_sku_code: sku,
    buyer_product_status: flag(row.buyer_product_status),
    seller_product_status: flag(row.seller_product_status),
    unlimited_stock: flag(row.unlimited_stock),
    stock: num(row.stock) ?? 0,
    multi: flag(row.multi),
    start_cut_off: str(row.start_cut_off),
    end_cut_off: str(row.end_cut_off),
    desc: str(row.desc),
  };
}

function parsePasca(value: unknown): PascaProduct | null {
  const row = asRecord(value);
  if (!row) return null;
  const sku = str(row.buyer_sku_code).trim();
  const name = str(row.product_name).trim();
  if (!sku || !name) return null;
  return {
    product_name: name,
    category: str(row.category) || "Pascabayar",
    brand: str(row.brand) || "LAINNYA",
    seller_name: str(row.seller_name),
    admin: num(row.admin) ?? 0,
    commission: num(row.commission) ?? 0,
    buyer_sku_code: sku,
    buyer_product_status: flag(row.buyer_product_status),
    seller_product_status: flag(row.seller_product_status),
    desc: str(row.desc),
  };
}

function parseTx(json: unknown): TxPayload {
  const root = asRecord(json);
  const data = asRecord(root?.data) ?? root;
  if (!data) failFrom(null, "Balasan transaksi kosong.");
  const rc = str(data.rc);
  const status = str(data.status);
  if (!status && rc && rc !== "00") failFrom(data, "Transaksi ditolak Digiflazz.");
  return {
    ref_id: str(data.ref_id),
    customer_no: str(data.customer_no),
    buyer_sku_code: str(data.buyer_sku_code),
    message: str(data.message) || explainRc(rc, status || "Tanpa pesan"),
    status: status || (rc === "00" ? "Sukses" : "Gagal"),
    rc,
    sn: str(data.sn),
    buyer_last_saldo: num(data.buyer_last_saldo),
    price: num(data.price),
    selling_price: num(data.selling_price),
    customer_name: str(data.customer_name),
    admin: num(data.admin),
    lines: summarizeBill(data.desc),
  };
}

export async function fetchBalance(username: string, apiKey: string) {
  const json = await postJson("/cek-saldo", {
    cmd: "deposit",
    username,
    sign: sign(username, apiKey, "depo"),
  });
  const root = asRecord(json);
  const data = asRecord(root?.data) ?? root;
  const deposit = data ? num(data.deposit) : null;
  if (deposit == null) failFrom(data, "Saldo tidak terbaca.");
  return { deposit };
}

async function fetchCmd(username: string, apiKey: string, cmd: "prepaid" | "pasca") {
  const json = await postJson("/price-list", {
    cmd,
    username,
    sign: sign(username, apiKey, "pricelist"),
  });
  const root = asRecord(json);
  const data = root?.data;
  if (!Array.isArray(data)) {
    failFrom(asRecord(data) ?? root, "Daftar harga tidak terbaca.");
  }
  return data;
}

export async function fetchPriceList(username: string, apiKey: string) {
  const prepaidRaw = await fetchCmd(username, apiKey, "prepaid");
  const prepaid = prepaidRaw.map(parsePrepaid).filter((item): item is PrepaidProduct => item != null);
  let pasca: PascaProduct[] = [];
  let pascaError: string | null = null;
  try {
    const pascaRaw = await fetchCmd(username, apiKey, "pasca");
    pasca = pascaRaw.map(parsePasca).filter((item): item is PascaProduct => item != null);
  } catch (error) {
    pascaError = error instanceof Error ? error.message : "Daftar pascabayar gagal ditarik.";
  }
  return { prepaid, pasca, pascaError };
}

type TransactInput = {
  username: string;
  apiKey: string;
  testing: boolean;
  action: "prepaid" | "inq-pasca" | "pay-pasca" | "status-pasca";
  buyerSkuCode: string;
  customerNo: string;
  refId: string;
  maxPrice?: number;
};

export async function sendTransact(input: TransactInput) {
  const signature = sign(input.username, input.apiKey, input.refId);
  const body: Record<string, unknown> = {
    username: input.username,
    buyer_sku_code: input.buyerSkuCode,
    customer_no: input.customerNo,
    ref_id: input.refId,
    sign: signature,
  };
  if (input.testing) body.testing = true;
  if (input.action === "prepaid") {
    body.allow_dot = true;
    if (!input.testing && typeof input.maxPrice === "number" && input.maxPrice > 0) {
      body.max_price = Math.round(input.maxPrice);
    }
  } else {
    body.commands = input.action;
  }
  const json = await postJson("/transaction", body);
  return parseTx(json);
}

export async function lookupIp() {
  try {
    const response = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(8000),
    });
    const json = (await response.json()) as { ip?: string };
    if (!json.ip) throw new Error("kosong");
    return { ip: json.ip };
  } catch {
    throw new DigiflazzError("IP server belum terbaca. Coba lagi.");
  }
}
