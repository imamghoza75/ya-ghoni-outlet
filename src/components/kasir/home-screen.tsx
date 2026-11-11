import { TILES, matchesTile } from "@/lib/tiles";
import { isConnected, jakartaDateKey, recentDayKeys, rupiah, weekdayOfKey } from "@/lib/money";
import { useKasir } from "@/lib/store";
import { StatusText } from "@/components/kasir/bits";

export function HomeScreen() {
  const settings = useKasir((state) => state.settings);
  const prepaid = useKasir((state) => state.prepaid);
  const pasca = useKasir((state) => state.pasca);
  const txns = useKasir((state) => state.txns);
  const balance = useKasir((state) => state.balance);
  const demoBalance = useKasir((state) => state.demoBalance);
  const catalogSource = useKasir((state) => state.catalogSource);
  const go = useKasir((state) => state.go);
  const connected = isConnected(settings);
  const today = jakartaDateKey(new Date());
  const suksesToday = txns.filter((txn) => txn.status === "Sukses" && jakartaDateKey(txn.createdAt) === today);
  const omzet = suksesToday.reduce((sum, txn) => sum + txn.sell, 0);
  const laba = suksesToday.reduce((sum, txn) => sum + (txn.sell - txn.cost), 0);
  const days = recentDayKeys(7).map((key) => ({
    key,
    label: weekdayOfKey(key),
    total: txns
      .filter((txn) => txn.status === "Sukses" && jakartaDateKey(txn.createdAt) === key)
      .reduce((sum, txn) => sum + txn.sell, 0),
  }));
  const peak = Math.max(...days.map((day) => day.total), 1);
  const saldo = connected ? balance : demoBalance;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kasir</h1>
        <p className="text-sm text-muted">
          {connected
            ? settings.testing
              ? "Mode uji. Transaksi memakai sandbox Digiflazz, saldo yang tampil tetap saldo akun."
              : "Mode live. Transaksi memotong deposit Digiflazz."
            : "Mode demo. Harga dan saldo di bawah ini simulasi, belum terhubung ke Digiflazz."}
        </p>
      </div>

      <section className="rounded-xl border border-line bg-surface p-4">
        <p className="text-xs font-medium text-muted">{connected ? "Saldo deposit" : "Saldo demo"}</p>
        <p className="mt-1 font-mono text-3xl font-medium tabular-nums tracking-tight">
          {saldo == null ? "—" : rupiah(saldo)}
        </p>
        <p className="mt-2 text-xs text-faint">
          {connected
            ? catalogSource === "live"
              ? "Uang pelanggan kamu terima sendiri. Deposit hanya terpotong saat transaksi ke Digiflazz sukses."
              : "Tarik daftar harga dulu di menu Harga sebelum jual produk asli."
            : "Sambungkan username dan API key di menu Atur untuk transaksi sungguhan."}
        </p>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <Stat label="Omzet hari ini" value={rupiah(omzet)} />
        <Stat label="Laba" value={rupiah(laba)} />
        <Stat label="Sukses" value={String(suksesToday.length)} />
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <p className="text-xs font-medium text-muted">Tujuh hari terakhir</p>
        <div className="mt-3 flex items-end gap-2">
          {days.map((day) => (
            <div key={day.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="flex h-16 w-full items-end">
                <div
                  className="w-full rounded-sm bg-primary"
                  style={{
                    height: day.total ? `${Math.max(12, Math.round((day.total / peak) * 100))}%` : "2px",
                    opacity: day.total ? 1 : 0.3,
                  }}
                />
              </div>
              <span className="text-xs text-faint">{day.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Jual cepat</h2>
        <div className="grid grid-cols-2 gap-2">
          {TILES.map((tile) => {
            const count =
              tile.id === "Tagihan"
                ? pasca.length
                : prepaid.filter((product) => matchesTile(product.category, product.brand, tile.id)).length;
            const Icon = tile.icon;
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => go("sell", { sellFocus: tile.id })}
                className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-surface p-3 text-left"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-raised text-fg">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{tile.label}</span>
                  <span className="block truncate text-xs text-faint">
                    {count} produk
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Terbaru</h2>
          <button type="button" className="text-xs font-medium text-muted" onClick={() => go("history")}>
            Semua
          </button>
        </div>
        {txns.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface px-4 py-6 text-sm text-muted">
            Belum ada transaksi. Pilih produk, masukkan nomor, lalu proses.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {txns.slice(0, 4).map((txn) => (
              <li key={txn.refId}>
                <button
                  type="button"
                  onClick={() => go("receipt", { ref: txn.refId })}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{txn.productName}</span>
                    <span className="block truncate text-xs text-faint">{txn.customerNo}</span>
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
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <p className="text-xs text-faint">{label}</p>
      <p className="mt-1 font-mono text-sm font-medium tabular-nums">{value}</p>
    </div>
  );
}
