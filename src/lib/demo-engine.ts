import type { TxnStatus } from "@/lib/types";

export type DemoOutcome = {
  status: TxnStatus;
  rc: string;
  message: string;
  sn: string;
  demoResolve?: TxnStatus;
};

function hash(text: string) {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

export function demoSn(refId: string) {
  return String(hash(refId)).padStart(12, "0").slice(0, 12);
}

export function demoPrepaidOutcome(customerNo: string, refId: string): DemoOutcome {
  const sn = demoSn(refId);
  if (customerNo === "087800001230") return { status: "Sukses", rc: "00", message: "Transaksi Sukses", sn: "1234567890" };
  if (customerNo === "087800001232") return { status: "Gagal", rc: "02", message: "Transaksi Gagal", sn: "" };
  if (customerNo === "087800001233") {
    return { status: "Pending", rc: "03", message: "Transaksi Pending", sn: "", demoResolve: "Sukses" };
  }
  if (customerNo === "087800001234") {
    return { status: "Pending", rc: "03", message: "Transaksi Pending", sn: "", demoResolve: "Gagal" };
  }
  const last = customerNo.replace(/\D/g, "").slice(-1);
  if (last === "2") return { status: "Gagal", rc: "02", message: "Transaksi Gagal", sn: "" };
  if (last === "3") return { status: "Pending", rc: "03", message: "Transaksi Pending", sn: "", demoResolve: "Sukses" };
  if (last === "4") return { status: "Pending", rc: "03", message: "Transaksi Pending", sn: "", demoResolve: "Gagal" };
  return { status: "Sukses", rc: "00", message: "Transaksi Sukses", sn };
}

export function demoBillAmount(customerNo: string) {
  return 25000 + (hash(customerNo) % 80) * 1000;
}

export function demoInquiry(customerNo: string): DemoOutcome & { amount: number; name: string; periode: string } {
  const amount = demoBillAmount(customerNo);
  const name = "BUDI SANTOSO";
  const periode = "202511";
  if (customerNo === "530000000003") {
    return { status: "Gagal", rc: "60", message: "Tagihan tidak ditemukan", sn: "", amount: 0, name: "", periode: "" };
  }
  if (customerNo === "630000000006") {
    return { status: "Gagal", rc: "02", message: "Transaksi Gagal", sn: "", amount: 0, name: "", periode: "" };
  }
  return { status: "Sukses", rc: "00", message: "Transaksi Sukses", sn: "", amount, name, periode };
}

export function demoPay(customerNo: string, refId: string): DemoOutcome {
  if (customerNo === "530000000006" || customerNo === "630000000006") {
    return { status: "Gagal", rc: "02", message: "Pembayaran gagal", sn: "" };
  }
  if (customerNo === "630000000001" || customerNo === "630000000002") {
    return { status: "Pending", rc: "03", message: "Transaksi Pending", sn: "", demoResolve: "Sukses" };
  }
  if (customerNo.endsWith("4")) {
    return { status: "Pending", rc: "03", message: "Transaksi Pending", sn: "", demoResolve: "Gagal" };
  }
  return { status: "Sukses", rc: "00", message: "Transaksi Sukses", sn: `S${demoSn(refId)}N` };
}
