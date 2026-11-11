import { dfBalance, dfPriceList, dfTransact } from "@/lib/digiflazz.functions";
import { demoInquiry, demoPay, demoPrepaidOutcome } from "@/lib/demo-engine";
import { asStatus, isConnected, makeRef, markupFor } from "@/lib/money";
import { explainRc } from "@/lib/rc";
import { useKasir } from "@/lib/store";
import type { Bill, PayMethod, Txn, TxPayload } from "@/lib/types";

function creds() {
  const { settings } = useKasir.getState();
  return {
    username: settings.username.trim(),
    apiKey: settings.apiKey.trim(),
    testing: settings.testing,
  };
}

function applySaldo(value: number | null, source: "demo" | "live", cost: number, status: Txn["status"]) {
  if (source === "live") {
    if (value != null) useKasir.getState().setBalance(value);
    return;
  }
  if (status === "Sukses") {
    useKasir.getState().setDemoBalance(Math.max(0, useKasir.getState().demoBalance - cost));
  }
}

export async function pullBalance() {
  const data = creds();
  const result = await dfBalance({ data: { username: data.username, apiKey: data.apiKey } });
  useKasir.getState().setBalance(result.deposit);
  return result.deposit;
}

export async function pullCatalog() {
  const data = creds();
  const result = await dfPriceList({ data: { username: data.username, apiKey: data.apiKey } });
  useKasir.getState().setCatalog({
    prepaid: result.prepaid,
    pasca: result.pasca,
    at: new Date().toISOString(),
  });
  return result;
}

type PrepaidInput = {
  sku: string;
  name: string;
  brand: string;
  category: string;
  customerNo: string;
  cost: number;
  sell: number;
  payMethod: PayMethod;
  note: string;
  sandbox?: boolean;
};

function liveTxn(
  input: PrepaidInput,
  refId: string,
  payload: TxPayload,
  kind: Txn["kind"],
): Txn {
  const status = asStatus(payload.status);
  const cost = payload.price != null && payload.price > 0 ? payload.price : input.cost;
  return {
    refId: payload.ref_id || refId,
    kind,
    sku: input.sku,
    productName: input.name,
    brand: input.brand,
    category: input.category,
    customerNo: payload.customer_no || input.customerNo,
    customerName: payload.customer_name || "",
    cost: status === "Gagal" ? input.cost : cost,
    sell: input.sell > 0 ? input.sell : (payload.selling_price ?? cost),
    status,
    rc: payload.rc,
    message: payload.message || explainRc(payload.rc, payload.status),
    sn: payload.sn,
    payMethod: input.payMethod,
    note: input.note,
    createdAt: new Date().toISOString(),
    source: "live",
    billLines: payload.lines,
  };
}

export async function checkoutPrepaid(input: PrepaidInput) {
  const state = useKasir.getState();
  const connected = isConnected(state.settings);
  const refId = makeRef();

  if (!connected) {
    if (input.cost > state.demoBalance) {
      const failed: Txn = {
        refId,
        kind: "prepaid",
        sku: input.sku,
        productName: input.name,
        brand: input.brand,
        category: input.category,
        customerNo: input.customerNo,
        customerName: "",
        cost: input.cost,
        sell: input.sell,
        status: "Gagal",
        rc: "44",
        message: "Saldo demo tidak cukup. Ini simulasi, bukan deposit Digiflazz.",
        sn: "",
        payMethod: input.payMethod,
        note: input.note,
        createdAt: new Date().toISOString(),
        source: "demo",
        billLines: [],
      };
      state.addTxn(failed);
      return failed;
    }
    await wait(520);
    const outcome = demoPrepaidOutcome(input.customerNo, refId);
    const txn: Txn = {
      refId,
      kind: "prepaid",
      sku: input.sku,
      productName: input.name,
      brand: input.brand,
      category: input.category,
      customerNo: input.customerNo,
      customerName: "",
      cost: input.cost,
      sell: input.sell,
      status: outcome.status,
      rc: outcome.rc,
      message: outcome.message,
      sn: outcome.sn,
      payMethod: input.payMethod,
      note: input.note,
      createdAt: new Date().toISOString(),
      source: "demo",
      billLines: [],
      demoResolve: outcome.demoResolve,
    };
    applySaldo(null, "demo", input.cost, outcome.status);
    useKasir.getState().addTxn(txn);
    return txn;
  }

  if (!input.sandbox && state.catalogSource !== "live") {
    throw new Error("Tarik daftar harga Digiflazz dulu. Produk demo tidak bisa dikirim ke akun asli.");
  }
  if (!input.sandbox && input.sku.startsWith("demo-")) {
    throw new Error("SKU demo tidak berlaku di Digiflazz. Tarik daftar harga akun kamu.");
  }

  try {
    const payload = await dfTransact({
      data: {
        ...creds(),
        action: "prepaid",
        buyerSkuCode: input.sku,
        customerNo: input.customerNo,
        refId,
        maxPrice: input.sandbox ? undefined : Math.round(input.cost),
      },
    });
    const txn = liveTxn(input, refId, payload, "prepaid");
    applySaldo(payload.buyer_last_saldo, "live", txn.cost, txn.status);
    useKasir.getState().addTxn(txn);
    return txn;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghubungi Digiflazz.";
    if (message.includes("terlalu lama")) {
      const pending: Txn = {
        refId,
        kind: "prepaid",
        sku: input.sku,
        productName: input.name,
        brand: input.brand,
        category: input.category,
        customerNo: input.customerNo,
        customerName: "",
        cost: input.cost,
        sell: input.sell,
        status: "Pending",
        rc: "01",
        message,
        sn: "",
        payMethod: input.payMethod,
        note: input.note,
        createdAt: new Date().toISOString(),
        source: "live",
        billLines: [],
      };
      useKasir.getState().addTxn(pending);
      return pending;
    }
    throw error;
  }
}

export async function inquirePasca(input: {
  sku: string;
  name: string;
  brand: string;
  customerNo: string;
}): Promise<Bill> {
  const state = useKasir.getState();
  const connected = isConnected(state.settings);
  const refId = makeRef();
  const markup = markupFor(state.settings, "Pascabayar", input.sku);

  if (!connected) {
    await wait(420);
    const outcome = demoInquiry(input.customerNo);
    const base = outcome.amount + 2500;
    return {
      refId,
      sku: input.sku,
      productName: input.name,
      brand: input.brand,
      category: "Pascabayar",
      customerNo: input.customerNo,
      customerName: outcome.name,
      cost: base,
      baseSell: base,
      sell: outcome.status === "Sukses" ? base + markup : 0,
      admin: 2500,
      status: outcome.status,
      rc: outcome.rc,
      message: outcome.message,
      lines:
        outcome.status === "Sukses"
          ? [`Nama: ${outcome.name}`, `Periode ${outcome.periode} · tagihan ${outcome.amount}`, "Admin: 2500"]
          : [],
      source: "demo",
    };
  }

  const payload = await dfTransact({
    data: {
      ...creds(),
      action: "inq-pasca",
      buyerSkuCode: input.sku,
      customerNo: input.customerNo,
      refId,
    },
  });
  if (payload.buyer_last_saldo != null) useKasir.getState().setBalance(payload.buyer_last_saldo);
  const status = asStatus(payload.status);
  const cost = payload.price ?? 0;
  const baseSell = payload.selling_price && payload.selling_price > 0 ? payload.selling_price : cost;
  return {
    refId: payload.ref_id || refId,
    sku: input.sku,
    productName: input.name,
    brand: input.brand,
    category: "Pascabayar",
    customerNo: payload.customer_no || input.customerNo,
    customerName: payload.customer_name,
    cost,
    baseSell,
    sell: status === "Sukses" ? baseSell + markup : 0,
    admin: payload.admin ?? 0,
    status,
    rc: payload.rc,
    message: payload.message,
    lines: payload.lines,
    source: "live",
  };
}

export async function payPasca(bill: Bill, payMethod: PayMethod, note: string) {
  const state = useKasir.getState();
  const base: PrepaidInput = {
    sku: bill.sku,
    name: bill.productName,
    brand: bill.brand,
    category: "Pascabayar",
    customerNo: bill.customerNo,
    cost: bill.cost,
    sell: bill.sell,
    payMethod,
    note,
  };

  if (!isConnected(state.settings)) {
    if (bill.cost > state.demoBalance) {
      const failed: Txn = {
        ...toTxn(base, bill.refId, "demo"),
        status: "Gagal",
        rc: "44",
        message: "Saldo demo tidak cukup untuk membayar tagihan ini.",
        customerName: bill.customerName,
        billLines: bill.lines,
      };
      state.addTxn(failed);
      return failed;
    }
    await wait(560);
    const outcome = demoPay(bill.customerNo, bill.refId);
    const txn: Txn = {
      ...toTxn(base, bill.refId, "demo"),
      status: outcome.status,
      rc: outcome.rc,
      message: outcome.message,
      sn: outcome.sn,
      customerName: bill.customerName,
      billLines: bill.lines,
      demoResolve: outcome.demoResolve,
    };
    applySaldo(null, "demo", bill.cost, outcome.status);
    useKasir.getState().addTxn(txn);
    return txn;
  }

  try {
    const payload = await dfTransact({
      data: {
        ...creds(),
        action: "pay-pasca",
        buyerSkuCode: bill.sku,
        customerNo: bill.customerNo,
        refId: bill.refId,
      },
    });
    const txn = liveTxn(
      { ...base, sell: bill.sell },
      bill.refId,
      payload,
      "pasca",
    );
    txn.customerName = payload.customer_name || bill.customerName;
    if (txn.billLines.length === 0) txn.billLines = bill.lines;
    applySaldo(payload.buyer_last_saldo, "live", txn.cost, txn.status);
    useKasir.getState().addTxn(txn);
    return txn;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membayar tagihan.";
    if (message.includes("terlalu lama")) {
      const pending: Txn = {
        ...toTxn(base, bill.refId, "live"),
        status: "Pending",
        rc: "01",
        message,
        customerName: bill.customerName,
        billLines: bill.lines,
      };
      useKasir.getState().addTxn(pending);
      return pending;
    }
    throw error;
  }
}

function toTxn(input: PrepaidInput, refId: string, source: "demo" | "live"): Txn {
  return {
    refId,
    kind: "pasca",
    sku: input.sku,
    productName: input.name,
    brand: input.brand,
    category: input.category,
    customerNo: input.customerNo,
    customerName: "",
    cost: input.cost,
    sell: input.sell,
    status: "Gagal",
    rc: "",
    message: "",
    sn: "",
    payMethod: input.payMethod,
    note: input.note,
    createdAt: new Date().toISOString(),
    source,
    billLines: [],
  };
}

export async function checkStatus(txn: Txn) {
  if (txn.status !== "Pending") return txn;
  if (txn.source === "demo") {
    await wait(280);
    const next = txn.demoResolve ?? "Sukses";
    const updated: Txn = {
      ...txn,
      status: next,
      rc: next === "Sukses" ? "00" : "02",
      message: next === "Sukses" ? "Transaksi Sukses" : "Transaksi Gagal",
      sn: next === "Sukses" ? txn.sn || `SN${txn.refId.slice(-8)}` : "",
      demoResolve: undefined,
    };
    if (next === "Sukses") applySaldo(null, "demo", txn.cost, "Sukses");
    useKasir.getState().replaceTxn(updated);
    return updated;
  }

  const payload = await dfTransact({
    data: {
      ...creds(),
      action: txn.kind === "pasca" ? "status-pasca" : "prepaid",
      buyerSkuCode: txn.sku,
      customerNo: txn.customerNo,
      refId: txn.refId,
    },
  });
  const status = asStatus(payload.status);
  const updated: Txn = {
    ...txn,
    status,
    rc: payload.rc || txn.rc,
    message: payload.message || txn.message,
    sn: payload.sn || txn.sn,
    cost: payload.price != null && payload.price > 0 ? payload.price : txn.cost,
    customerName: payload.customer_name || txn.customerName,
    billLines: payload.lines.length ? payload.lines : txn.billLines,
  };
  applySaldo(payload.buyer_last_saldo, "live", updated.cost, status);
  useKasir.getState().replaceTxn(updated);
  return updated;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
