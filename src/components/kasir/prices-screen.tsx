import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/kasir/bits";
import { pullCatalog } from "@/lib/checkout";
import { formatWhen, isConnected, markupFor, messageOf, rupiah } from "@/lib/money";
import { useKasir } from "@/lib/store";
import { productReady } from "@/lib/tiles";

export function PricesScreen() {
  const settings = useKasir((state) => state.settings);
  const prepaid = useKasir((state) => state.prepaid);
  const pasca = useKasir((state) => state.pasca);
  const catalogSource = useKasir((state) => state.catalogSource);
  const catalogAt = useKasir((state) => state.catalogAt);
  const setMarkup = useKasir((state) => state.setMarkup);
  const setProductMarkup = useKasir((state) => state.setProductMarkup);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const connected = isConnected(settings);

  const categories = useMemo(() => {
    const names = new Set<string>(Object.keys(settings.markup));
    for (const product of prepaid) names.add(product.category || "Lainnya");
    names.add("Pascabayar");
    return [...names];
  }, [prepaid, settings.markup]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return prepaid
      .filter((product) => {
        if (!needle) return true;
        return `${product.product_name} ${product.brand} ${product.buyer_sku_code} ${product.category}`
          .toLowerCase()
          .includes(needle);
      })
      .slice(0, 40);
  }, [prepaid, query]);

  async function refresh() {
    setBusy(true);
    try {
      const result = await pullCatalog();
      toast.success(`${result.prepaid.length} produk prabayar siap`);
      if (result.pascaError) toast.error(result.pascaError);
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Harga</h1>
        <p className="text-sm text-muted">
          Harga jual = modal Digiflazz + markup. {catalogSource === "live" ? "Sumber: akun kamu." : "Sumber: katalog demo."}
          {catalogAt ? ` Ditarik ${formatWhen(catalogAt)}.` : ""}
        </p>
      </div>
      <Button onClick={() => void refresh()} disabled={!connected || busy}>
        {busy ? "Menarik harga..." : connected ? "Tarik harga dari Digiflazz" : "Sambungkan akun dulu"}
      </Button>
      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">Markup per kategori</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {categories.map((category) => (
            <label key={category} className="block">
              <span className="mb-1 block truncate text-xs text-muted">{category}</span>
              <input
                inputMode="numeric"
                type="number"
                value={settings.markup[category] ?? 0}
                onChange={(event) => setMarkup(category, Number(event.target.value || 0))}
                className="h-11 w-full rounded-lg border border-line bg-raised px-3 font-mono text-sm text-fg outline-none"
                aria-label={`Markup ${category}`}
              />
            </label>
          ))}
        </div>
      </section>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Cari produk atau SKU"
        aria-label="Cari produk"
        className="h-11 rounded-lg border border-line bg-raised px-3 text-base outline-none placeholder:text-faint"
      />
      <p className="text-xs text-faint">
        Menampilkan {rows.length} dari {prepaid.length} prabayar · {pasca.length} pascabayar
      </p>
      <ul className="flex flex-col gap-2">
        {rows.map((product) => {
          const markup = markupFor(settings, product.category, product.buyer_sku_code);
          const ready = productReady(product);
          return (
            <li key={product.buyer_sku_code} className="rounded-xl border border-line bg-surface p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{product.product_name}</p>
                  <p className="truncate text-xs text-faint">
                    {product.brand} · {product.buyer_sku_code}
                    {ready ? "" : " · gangguan"}
                  </p>
                </div>
                <p className="shrink-0 text-right font-mono text-sm tabular-nums">{rupiah(product.price + markup)}</p>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted">
                <span className="font-mono tabular-nums">Modal {rupiah(product.price)}</span>
                <label className="flex items-center gap-2">
                  Markup
                  <input
                    inputMode="numeric"
                    type="number"
                    value={settings.productMarkup[product.buyer_sku_code] ?? markup}
                    onChange={(event) => {
                      const next = Number(event.target.value || 0);
                      const categoryDefault = settings.markup[product.category] ?? settings.markup.Lainnya ?? 1500;
                      setProductMarkup(product.buyer_sku_code, next === categoryDefault ? null : next);
                    }}
                    className="h-9 w-24 rounded-md border border-line bg-raised px-2 font-mono text-sm text-fg outline-none"
                    aria-label={`Markup ${product.product_name}`}
                  />
                </label>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
