import { useMemo, useState } from "react";
import { StatusText } from "@/components/kasir/bits";
import { formatWhen, rupiah } from "@/lib/money";
import { useKasir } from "@/lib/store";
import type { TxnStatus } from "@/lib/types";

const FILTERS: { id: "all" | TxnStatus; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "Sukses", label: "Sukses" },
  { id: "Pending", label: "Pending" },
  { id: "Gagal", label: "Gagal" },
];

export function HistoryScreen() {
  const txns = useKasir((state) => state.txns);
  const go = useKasir((state) => state.go);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return txns.filter((txn) => {
      if (filter !== "all" && txn.status !== filter) return false;
      if (!needle) return true;
      return `${txn.productName} ${txn.customerNo} ${txn.sn} ${txn.refId} ${txn.customerName}`
        .toLowerCase()
        .includes(needle);
    });
  }, [filter, query, txns]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Riwayat</h1>
        <p className="text-sm text-muted">Ketuk baris untuk membuka struk atau cek status pending.</p>
      </div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Cari nomor, SN, atau ref"
        className="h-11 rounded-lg border border-line bg-raised px-3 text-base text-fg outline-none placeholder:text-faint"
        aria-label="Cari transaksi"
      />
      <div className="scroll-x flex gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={
              filter === item.id
                ? "h-9 shrink-0 rounded-full bg-primary px-3 text-sm font-semibold text-primary-ink"
                : "h-9 shrink-0 rounded-full border border-line bg-surface px-3 text-sm text-muted"
            }
          >
            {item.label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface px-4 py-8 text-sm text-muted">
          Tidak ada transaksi di filter ini.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((txn) => (
            <li key={txn.refId}>
              <button
                type="button"
                onClick={() => go("receipt", { ref: txn.refId })}
                className="flex w-full items-start justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{txn.productName}</span>
                  <span className="block truncate text-xs text-faint">
                    {txn.customerNo}
                    {txn.customerName ? ` · ${txn.customerName}` : ""}
                  </span>
                  <span className="mt-1 block text-xs text-faint">{formatWhen(txn.createdAt)}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-sm tabular-nums">{rupiah(txn.sell)}</span>
                  <StatusText status={txn.status} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
