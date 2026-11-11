import { useState } from "react";
import * as Switch from "@radix-ui/react-switch";
import { toast } from "sonner";
import { Button, Field } from "@/components/kasir/bits";
import { pullBalance, pullCatalog } from "@/lib/checkout";
import { dfServerIp } from "@/lib/digiflazz.functions";
import { isConnected, messageOf, rupiah } from "@/lib/money";
import { useKasir } from "@/lib/store";

export function SettingsScreen() {
  const settings = useKasir((state) => state.settings);
  const patchSettings = useKasir((state) => state.patchSettings);
  const useDemoCatalog = useKasir((state) => state.useDemoCatalog);
  const clearTxns = useKasir((state) => state.clearTxns);
  const setDemoBalance = useKasir((state) => state.setDemoBalance);
  const [busy, setBusy] = useState<"test" | "ip" | null>(null);
  const [ip, setIp] = useState("");
  const [confirmLive, setConfirmLive] = useState(false);
  const connected = isConnected(settings);

  async function testConnection() {
    setBusy("test");
    try {
      const deposit = await pullBalance();
      toast.success(`Terhubung. Saldo ${rupiah(deposit)}`);
      try {
        const list = await pullCatalog();
        toast.success(`${list.prepaid.length} produk prabayar ditarik`);
      } catch (error) {
        toast.error(messageOf(error));
      }
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setBusy(null);
    }
  }

  async function showIp() {
    setBusy("ip");
    try {
      const result = await dfServerIp();
      setIp(result.ip);
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pengaturan</h1>
        <p className="text-sm text-muted">
          Kunci API tersimpan di perangkat ini, bukan di server Ya Ghoni Outlet. Request ke Digiflazz lewat server supaya tanda tangan tidak dibuat di browser.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">Outlet</h2>
        <Field label="Nama di struk" value={settings.outletName} onChange={(event) => patchSettings({ outletName: event.target.value })} />
        <Field label="Kota" value={settings.outletCity} onChange={(event) => patchSettings({ outletCity: event.target.value })} />
        <Field
          label="WhatsApp outlet"
          inputMode="tel"
          value={settings.whatsapp}
          onChange={(event) => patchSettings({ whatsapp: event.target.value })}
          placeholder="08..."
        />
        <Field
          label="Instruksi bayar ke pelanggan"
          value={settings.payNote}
          onChange={(event) => patchSettings({ payNote: event.target.value })}
          placeholder="Tunai, atau transfer ke DANA 08..."
        />
        <Field label="Footer struk" value={settings.footer} onChange={(event) => patchSettings({ footer: event.target.value })} />
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">Digiflazz</h2>
        <Field
          label="Username"
          autoComplete="off"
          value={settings.username}
          onChange={(event) => patchSettings({ username: event.target.value })}
        />
        <Field
          label="API key"
          type="password"
          autoComplete="off"
          value={settings.apiKey}
          onChange={(event) => patchSettings({ apiKey: event.target.value })}
          hint="Dari panel member Digiflazz, menu koneksi API."
        />
        <div className="flex items-center justify-between gap-3 rounded-lg bg-raised px-3 py-3">
          <div>
            <p className="text-sm font-medium">Mode uji</p>
            <p className="text-xs text-faint">Kirim testing=true. Pakai SKU sandbox, jangan matikan sebelum siap.</p>
          </div>
          <Switch.Root
            checked={settings.testing}
            onCheckedChange={(next) => {
              if (next) {
                patchSettings({ testing: true });
                setConfirmLive(false);
                return;
              }
              setConfirmLive(true);
            }}
            className="relative h-7 w-12 shrink-0 rounded-full bg-line data-[state=checked]:bg-primary"
            aria-label="Mode uji Digiflazz"
          >
            <Switch.Thumb className="block h-5 w-5 translate-x-1 rounded-full bg-fg transition-transform duration-150 data-[state=checked]:translate-x-6 data-[state=checked]:bg-primary-ink" />
          </Switch.Root>
        </div>
        {confirmLive && settings.testing ? (
          <div className="rounded-lg border border-line p-3">
            <p className="text-sm">Mode live memotong deposit asli. Lanjutkan hanya kalau IP sudah di-whitelist dan SKU buyer sudah aktif.</p>
            <div className="mt-3 flex gap-2">
              <Button
                onClick={() => {
                  patchSettings({ testing: false });
                  setConfirmLive(false);
                }}
              >
                Ya, mode live
              </Button>
              <Button variant="ghost" onClick={() => setConfirmLive(false)}>
                Batalkan
              </Button>
            </div>
          </div>
        ) : null}
        <Button onClick={() => void testConnection()} disabled={!connected || busy != null}>
          {busy === "test" ? "Menghubungi..." : "Tes koneksi dan tarik harga"}
        </Button>
        <Button variant="ghost" onClick={() => void showIp()} disabled={busy != null}>
          {busy === "ip" ? "Membaca IP..." : "Lihat IP server untuk whitelist"}
        </Button>
        {ip ? (
          <button
            type="button"
            className="rounded-lg bg-raised px-3 py-3 text-left font-mono text-sm"
            onClick={() => {
              void navigator.clipboard.writeText(ip);
              toast.success("IP disalin");
            }}
          >
            {ip}
            <span className="mt-1 block font-sans text-xs text-faint">Ketuk untuk salin. Daftarkan di panel Digiflazz. IP ini bisa berubah.</span>
          </button>
        ) : null}
        {connected ? (
          <Button
            variant="quiet"
            onClick={() => {
              patchSettings({ username: "", apiKey: "" });
              useDemoCatalog();
              toast.success("Kembali ke mode demo");
            }}
          >
            Putuskan akun
          </Button>
        ) : null}
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
        <h2 className="text-sm font-semibold text-fg">Cara sambung</h2>
        <p>1. Daftar sebagai buyer Digiflazz, isi deposit lewat transfer yang mereka sediakan.</p>
        <p>2. Di panel, aktifkan produk dan isi kode SKU buyer. Daftar harga di sini mengikuti kode itu.</p>
        <p>3. Whitelist IP server. Kalau ditolak, responsnya RC 45.</p>
        <p>4. Tempel username plus API key, tes koneksi, jual dulu lewat mode uji.</p>
        <p>Aplikasi ini tidak menampung uang pelanggan dan tidak menerbitkan QRIS. Pelanggan bayar ke kamu, kamu proses dari deposit Digiflazz.</p>
      </section>

      <section className="flex gap-2">
        <Button variant="ghost" onClick={() => setDemoBalance(250000)}>
          Isi saldo demo
        </Button>
        <Button variant="quiet" onClick={() => clearTxns()}>
          Hapus riwayat
        </Button>
      </section>
    </div>
  );
}
