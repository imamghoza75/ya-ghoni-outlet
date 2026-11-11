import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/kasir/bits";
import { checkStatus } from "@/lib/checkout";
import { buildStruk, formatWhen, messageOf, rupiah, waTarget } from "@/lib/money";
import { explainRc } from "@/lib/rc";
import { useKasir } from "@/lib/store";

export function ReceiptView() {
  const ref = useKasir((state) => state.selectedRef);
  const txns = useKasir((state) => state.txns);
  const settings = useKasir((state) => state.settings);
  const go = useKasir((state) => state.go);
  const txn = txns.find((item) => item.refId === ref) ?? null;
  const [busy, setBusy] = useState(false);

  if (!txn) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Struk</h1>
        <p className="text-sm text-muted">Transaksi tidak ditemukan di perangkat ini.</p>
        <Button variant="ghost" onClick={() => go("history")}>
          Kembali ke riwayat
        </Button>
      </div>
    );
  }

  const text = buildStruk(txn, settings);
  const target = waTarget(txn.customerNo);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Struk disalin");
    } catch {
      toast.error("Gagal menyalin");
    }
  }

  async function refresh() {
    if (!txn) return;
    setBusy(true);
    try {
      await checkStatus(txn);
      toast.success("Status diperbarui");
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Struk</h1>
        <button type="button" className="text-sm text-muted" onClick={() => go("history")}>
          Tutup
        </button>
      </div>
      <article className="struk-paper rounded-xl bg-paper p-5 text-ink">
        <p className="text-center font-mono text-xs tracking-widest text-paper-muted">YA GHONI OUTLET</p>
        <h2 className="mt-1 text-center text-lg font-semibold">{settings.outletName || "Ya Ghoni Outlet"}</h2>
        {settings.outletCity ? <p className="text-center text-xs text-paper-muted">{settings.outletCity}</p> : null}
        <p className="mt-4 text-center font-mono text-xs text-paper-muted">{formatWhen(txn.createdAt)}</p>
        <p className="text-center font-mono text-xs text-paper-muted">{txn.refId}</p>
        <hr className="my-4 border-dashed border-ink/20" />
        <p className="font-medium">{txn.productName}</p>
        <p className="font-mono text-sm">{txn.customerNo}</p>
        {txn.customerName ? <p className="text-sm">{txn.customerName}</p> : null}
        {txn.billLines.map((line) => (
          <p key={line} className="text-sm text-paper-muted">
            {line}
          </p>
        ))}
        <hr className="my-4 border-dashed border-ink/20" />
        <Row label="Harga" value={rupiah(txn.sell)} />
        <Row label="Bayar" value={txn.payMethod} />
        <div className="mt-1 flex items-center justify-between text-sm">
          <span>Status</span>
          <span
            className={
              txn.status === "Sukses"
                ? "font-semibold text-paper-ok"
                : txn.status === "Gagal"
                  ? "font-semibold text-paper-bad"
                  : "font-semibold text-ink"
            }
          >
            {txn.status}
          </span>
        </div>
        {txn.sn ? (
          <p className="mt-3 break-all font-mono text-sm">
            SN
            <br />
            {txn.sn}
          </p>
        ) : null}
        {txn.status !== "Sukses" ? (
          <p className="mt-3 text-sm">{explainRc(txn.rc, txn.message)}</p>
        ) : null}
        <hr className="my-4 border-dashed border-ink/20" />
        <p className="text-center text-xs text-paper-muted">{settings.footer || "Terima kasih"}</p>
      </article>
      <div className="no-print grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={() => void copy()}>
          Salin
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            const url = `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
            window.open(target ? url : `https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
          }}
        >
          WhatsApp
        </Button>
        {txn.status === "Pending" ? (
          <Button className="col-span-2" onClick={() => void refresh()} disabled={busy}>
            {busy ? "Mengecek..." : "Cek status"}
          </Button>
        ) : (
          <Button className="col-span-2" onClick={() => go("sell")}>
            Transaksi baru
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}
