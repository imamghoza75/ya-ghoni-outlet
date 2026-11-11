import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/kasir/bits";
import { SANDBOX_CASES } from "@/lib/demo-catalog";
import { checkoutPrepaid, inquirePasca, payPasca } from "@/lib/checkout";
import { brandMatches, cleanCustomerNo, detectBrand } from "@/lib/operators";
import { inCutoff, isConnected, markupFor, messageOf, rupiah } from "@/lib/money";
import { explainRc } from "@/lib/rc";
import { useKasir } from "@/lib/store";
import { TILES, matchesTile, productReady } from "@/lib/tiles";
import type { Bill, PascaProduct, PayMethod, PrepaidProduct, Txn } from "@/lib/types";

type Draft = {
  sku: string;
  name: string;
  brand: string;
  category: string;
  cost: number;
  sell: number;
  customerNo: string;
  sandbox?: boolean;
};

export function SellScreen() {
  const focus = useKasir((state) => state.sellFocus);
  const settings = useKasir((state) => state.settings);
  const prepaid = useKasir((state) => state.prepaid);
  const pasca = useKasir((state) => state.pasca);
  const catalogSource = useKasir((state) => state.catalogSource);
  const go = useKasir((state) => state.go);
  const [tile, setTile] = useState(focus);
  const [query, setQuery] = useState("");
  const [number, setNumber] = useState("");
  const [brandPick, setBrandPick] = useState<string>("auto");
  const [pascaPick, setPascaPick] = useState<PascaProduct | null>(null);
  const [bill, setBill] = useState<Bill | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>("Tunai");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Txn | null>(null);
  const connected = isConnected(settings);
  const detected = detectBrand(number);

  useEffect(() => {
    setTile(focus);
  }, [focus]);

  useEffect(() => {
    setBrandPick("auto");
  }, [number, tile]);

  const brands = useMemo(() => {
    const names = new Set<string>();
    for (const product of prepaid) {
      if (matchesTile(product.category, product.brand, tile)) names.add(product.brand);
    }
    return [...names].sort((a, b) => a.localeCompare(b, "id"));
  }, [prepaid, tile]);

  const products = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return prepaid
      .filter((product) => matchesTile(product.category, product.brand, tile))
      .filter((product) => {
        if (brandPick === "all") return true;
        if (brandPick !== "auto") return product.brand.toLowerCase() === brandPick.toLowerCase();
        if ((tile === "Pulsa" || tile === "Data") && detected) return brandMatches(product.brand, detected);
        return true;
      })
      .filter((product) => {
        if (!needle) return true;
        return `${product.product_name} ${product.brand} ${product.buyer_sku_code}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => a.price - b.price);
  }, [brandPick, detected, prepaid, query, tile]);

  const bills = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return pasca.filter((product) => {
      if (!needle) return true;
      return `${product.product_name} ${product.brand} ${product.desc} ${product.buyer_sku_code}`
        .toLowerCase()
        .includes(needle);
    });
  }, [pasca, query]);

  const shown = products.slice(0, 50);
  const liveLocked = connected && catalogSource !== "live";

  function openPrepaid(product: PrepaidProduct) {
    const customerNo = cleanCustomerNo(number);
    if (!customerNo) {
      toast.error("Isi nomor tujuan dulu");
      return;
    }
    if (liveLocked) {
      toast.error("Tarik daftar harga di menu Harga sebelum jual produk asli");
      return;
    }
    const markup = markupFor(settings, product.category, product.buyer_sku_code);
    setResult(null);
    setDraft({
      sku: product.buyer_sku_code,
      name: product.product_name,
      brand: product.brand,
      category: product.category,
      cost: product.price,
      sell: product.price + markup,
      customerNo,
    });
  }

  function openSandbox(item: (typeof SANDBOX_CASES)[number]) {
    if (item.kind === "pasca") {
      setTile("Tagihan");
      setNumber(item.customerNo);
      setPascaPick({
        product_name: "PLN sandbox",
        category: "Pascabayar",
        brand: "PLN",
        seller_name: "Digiflazz",
        admin: 0,
        commission: 0,
        buyer_sku_code: item.sku,
        buyer_product_status: true,
        seller_product_status: true,
        desc: "Uji coba resmi",
      });
      setBill(null);
      setDraft(null);
      return;
    }
    setNumber(item.customerNo);
    setResult(null);
    setDraft({
      sku: item.sku,
      name: `Uji ${item.sku}`,
      brand: "XL",
      category: "Pulsa",
      cost: 0,
      sell: 0,
      customerNo: item.customerNo,
      sandbox: true,
    });
  }

  async function processDraft() {
    if (!draft) return;
    setBusy(true);
    try {
      const txn = await checkoutPrepaid({
        sku: draft.sku,
        name: draft.name,
        brand: draft.brand,
        category: draft.category,
        customerNo: draft.customerNo,
        cost: draft.cost,
        sell: draft.sell || draft.cost,
        payMethod,
        note,
        sandbox: draft.sandbox,
      });
      setResult(txn);
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setBusy(false);
    }
  }

  async function runInquiry() {
    if (!pascaPick) {
      toast.error("Pilih jenis tagihan dulu");
      return;
    }
    const customerNo = cleanCustomerNo(number);
    if (!customerNo) {
      toast.error("Isi nomor pelanggan");
      return;
    }
    if (connected && catalogSource !== "live" && pascaPick.buyer_sku_code.startsWith("demo-")) {
      toast.error("Tarik daftar harga dulu. Produk demo tidak dikirim ke Digiflazz.");
      return;
    }
    setBusy(true);
    try {
      const next = await inquirePasca({
        sku: pascaPick.buyer_sku_code,
        name: pascaPick.product_name,
        brand: pascaPick.brand,
        customerNo,
      });
      setBill(next);
      if (next.status !== "Sukses") toast.error(explainRc(next.rc, next.message));
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setBusy(false);
    }
  }

  async function runPay() {
    if (!bill) return;
    setBusy(true);
    try {
      const txn = await payPasca(bill, payMethod, note);
      setResult(txn);
      setBill(null);
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Jual</h1>
        <p className="text-sm text-muted">
          {connected
            ? settings.testing
              ? "Mode uji aktif. Pakai kasus sandbox di bawah, atau produk asli dengan risiko sesuai aturan Digiflazz."
              : "Mode live. Pastikan pelanggan sudah membayar sebelum diproses."
            : "Demo: nomor berakhir 2 gagal, 3 pending lalu sukses, 4 pending lalu gagal."}
        </p>
      </div>

      <div className="scroll-x -mx-4 flex gap-2 px-4">
        {TILES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTile(item.id);
              setPascaPick(null);
              setBill(null);
            }}
            className={
              tile === item.id
                ? "h-9 shrink-0 rounded-full bg-primary px-3 text-sm font-semibold text-primary-ink"
                : "h-9 shrink-0 rounded-full border border-line bg-surface px-3 text-sm text-muted"
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      {connected && settings.testing ? (
        <section className="rounded-xl border border-line bg-surface p-3">
          <p className="text-xs font-medium text-muted">Kasus uji resmi Digiflazz</p>
          <div className="mt-2 flex flex-col gap-2">
            {SANDBOX_CASES.map((item) => (
              <button
                key={`${item.sku}-${item.customerNo}`}
                type="button"
                onClick={() => openSandbox(item)}
                className="flex items-center justify-between gap-3 rounded-lg bg-raised px-3 py-2 text-left"
              >
                <span>
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block text-xs text-faint">
                    {item.sku} · {item.customerNo}
                  </span>
                </span>
                <span className="text-xs text-muted">{item.note}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted">
          {tile === "Tagihan" ? "Nomor pelanggan" : tile === "PLN" ? "Nomor meter / ID" : "Nomor tujuan"}
        </span>
        <input
          value={number}
          onChange={(event) => setNumber(event.target.value)}
          inputMode={tile === "Games" || tile === "Voucher" ? "text" : "tel"}
          placeholder={tile === "PLN" ? "11 digit nomor meter" : "08... atau ID tujuan"}
          className="h-12 w-full rounded-lg border border-line bg-raised px-3 font-mono text-base outline-none placeholder:text-faint"
          aria-label="Nomor tujuan"
        />
        {detected && (tile === "Pulsa" || tile === "Data") ? (
          <span className="mt-1.5 block text-xs text-muted">Terdeteksi {detected}</span>
        ) : null}
      </label>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Cari nominal atau nama"
        aria-label="Cari produk"
        className="h-11 rounded-lg border border-line bg-raised px-3 text-base outline-none placeholder:text-faint"
      />

      {tile !== "Tagihan" && brands.length > 1 ? (
        <div className="scroll-x flex gap-2">
          <Chip active={brandPick === "auto"} onClick={() => setBrandPick("auto")}>
            {detected && (tile === "Pulsa" || tile === "Data") ? detected : "Otomatis"}
          </Chip>
          <Chip active={brandPick === "all"} onClick={() => setBrandPick("all")}>
            Semua
          </Chip>
          {brands.slice(0, 12).map((brand) => (
            <Chip key={brand} active={brandPick === brand} onClick={() => setBrandPick(brand)}>
              {brand}
            </Chip>
          ))}
        </div>
      ) : null}

      {liveLocked ? (
        <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
          Akun tersambung, tapi daftar harga masih demo. Buka Harga lalu tarik produk dari Digiflazz. Kasus sandbox tetap bisa dijalankan.
        </p>
      ) : null}

      {tile === "Tagihan" ? (
        <div className="flex flex-col gap-2">
          {bills.slice(0, 40).map((product) => {
            const active = pascaPick?.buyer_sku_code === product.buyer_sku_code;
            return (
              <button
                key={product.buyer_sku_code}
                type="button"
                onClick={() => {
                  setPascaPick(product);
                  setBill(null);
                }}
                className={
                  active
                    ? "rounded-xl border border-primary bg-surface px-4 py-3 text-left"
                    : "rounded-xl border border-line bg-surface px-4 py-3 text-left"
                }
              >
                <span className="block text-sm font-medium">{product.product_name}</span>
                <span className="block text-xs text-faint">
                  {product.brand}
                  {product.desc ? ` · ${product.desc}` : ""} · admin {rupiah(product.admin)}
                </span>
              </button>
            );
          })}
          <Button onClick={() => void runInquiry()} disabled={busy || !pascaPick}>
            {busy ? "Mengecek..." : "Cek tagihan"}
          </Button>
          {bill ? (
            <section className="rounded-xl border border-line bg-surface p-4">
              <p className="text-sm font-semibold">{bill.customerName || "Tanpa nama"}</p>
              <p className="text-xs text-faint">{bill.customerNo}</p>
              {bill.lines.map((line) => (
                <p key={line} className="mt-1 text-sm text-muted">
                  {line}
                </p>
              ))}
              <p className="mt-3 font-mono text-lg tabular-nums">{bill.status === "Sukses" ? rupiah(bill.sell) : "—"}</p>
              <p className="text-xs text-faint">
                Modal {rupiah(bill.cost)} · {explainRc(bill.rc, bill.message)}
              </p>
              {bill.status === "Sukses" ? (
                <Button className="mt-3 w-full" onClick={() => void runPay()} disabled={busy}>
                  {busy ? "Membayar..." : "Bayar tagihan"}
                </Button>
              ) : null}
            </section>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-faint">
            {products.length > shown.length ? `Menampilkan ${shown.length} dari ${products.length}. Persempit pencarian.` : `${shown.length} produk`}
          </p>
          {shown.length === 0 ? (
            <p className="rounded-xl border border-line bg-surface px-4 py-6 text-sm text-muted">
              Tidak ada produk di kategori ini. Coba merek lain, atau tarik harga kalau akun sudah tersambung.
            </p>
          ) : (
            shown.map((product) => {
              const ready = productReady(product);
              const closed = inCutoff(product.start_cut_off, product.end_cut_off);
              const markup = markupFor(settings, product.category, product.buyer_sku_code);
              return (
                <button
                  key={product.buyer_sku_code}
                  type="button"
                  disabled={!ready || closed}
                  onClick={() => openPrepaid(product)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left disabled:opacity-45"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{product.product_name}</span>
                    <span className="block truncate text-xs text-faint">
                      Modal {rupiah(product.price)}
                      {closed ? " · cut off" : ready ? "" : " · gangguan"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-sm tabular-nums">{rupiah(product.price + markup)}</span>
                    <span className="block text-xs text-faint">laba {rupiah(markup)}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}

      {draft || result ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-overlay/80 p-0 lg:items-center lg:p-6">
          <div className="sheet-in w-full max-w-md rounded-t-xl bg-surface p-4 lg:rounded-xl">
            {result ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-medium text-muted">Hasil</p>
                <h2 className="text-xl font-semibold">{result.status}</h2>
                <p className="text-sm text-muted">{explainRc(result.rc, result.message)}</p>
                {result.sn ? <p className="break-all font-mono text-sm">SN {result.sn}</p> : null}
                <p className="font-mono text-lg tabular-nums">{rupiah(result.sell)}</p>
                <Button onClick={() => go("receipt", { ref: result.refId })}>Lihat struk</Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDraft(null);
                    setResult(null);
                  }}
                >
                  Tutup
                </Button>
              </div>
            ) : draft ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted">Konfirmasi</p>
                    <h2 className="text-lg font-semibold">{draft.name}</h2>
                    <p className="font-mono text-sm text-muted">{draft.customerNo}</p>
                  </div>
                  <button type="button" className="text-sm text-muted" onClick={() => setDraft(null)}>
                    Tutup
                  </button>
                </div>
                {draft.sandbox ? (
                  <p className="text-sm text-muted">Harga mengikuti balasan sandbox Digiflazz. Deposit asli tidak dipakai untuk kasus uji.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <Mini label="Modal" value={rupiah(draft.cost)} />
                    <Mini label="Jual" value={rupiah(draft.sell)} />
                    <Mini label="Laba" value={rupiah(draft.sell - draft.cost)} />
                  </div>
                )}
                {settings.payNote ? <p className="rounded-lg bg-raised px-3 py-2 text-sm">{settings.payNote}</p> : null}
                <div className="grid grid-cols-2 gap-2">
                  <Chip active={payMethod === "Tunai"} onClick={() => setPayMethod("Tunai")}>
                    Sudah tunai
                  </Chip>
                  <Chip active={payMethod === "Transfer"} onClick={() => setPayMethod("Transfer")}>
                    Sudah transfer
                  </Chip>
                </div>
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Catatan, opsional"
                  aria-label="Catatan"
                  className="h-11 rounded-lg border border-line bg-raised px-3 text-sm outline-none placeholder:text-faint"
                />
                <Button onClick={() => void processDraft()} disabled={busy}>
                  {busy ? "Memproses..." : "Proses ke Digiflazz"}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "h-9 shrink-0 rounded-full bg-primary px-3 text-sm font-semibold text-primary-ink"
          : "h-9 shrink-0 rounded-full border border-line px-3 text-sm text-muted"
      }
    >
      {children}
    </button>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-raised px-2 py-2">
      <p className="text-xs text-faint">{label}</p>
      <p className="font-mono text-xs tabular-nums">{value}</p>
    </div>
  );
}
