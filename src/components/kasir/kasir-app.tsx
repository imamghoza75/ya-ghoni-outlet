import { useEffect } from "react";
import { History, Home, Settings, Smartphone, Tags } from "lucide-react";
import { Mark } from "@/components/kasir/bits";
import { HistoryScreen } from "@/components/kasir/history-screen";
import { HomeScreen } from "@/components/kasir/home-screen";
import { PricesScreen } from "@/components/kasir/prices-screen";
import { ReceiptView } from "@/components/kasir/receipt-view";
import { SellScreen } from "@/components/kasir/sell-screen";
import { SettingsScreen } from "@/components/kasir/settings-screen";
import { isConnected } from "@/lib/money";
import { useKasir } from "@/lib/store";
import type { Screen } from "@/lib/types";

const NAV: { id: Screen; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Beranda", icon: Home },
  { id: "sell", label: "Jual", icon: Smartphone },
  { id: "history", label: "Riwayat", icon: History },
  { id: "prices", label: "Harga", icon: Tags },
  { id: "settings", label: "Atur", icon: Settings },
];

export function KasirApp() {
  const screen = useKasir((state) => state.screen);
  const settings = useKasir((state) => state.settings);
  const go = useKasir((state) => state.go);
  const connected = isConnected(settings);

  useEffect(() => {
    void useKasir.persist.rehydrate();
  }, []);

  const mode = !connected ? "Demo" : settings.testing ? "Uji" : "Live";
  const modeClass = mode === "Live" ? "text-danger" : "text-muted";

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto flex min-h-dvh max-w-6xl">
        <aside className="no-print hidden w-60 shrink-0 flex-col border-r border-line p-4 lg:flex">
          <div className="mb-6 flex items-center gap-3">
            <Mark />
            <div>
              <p className="text-sm font-semibold">Ya Ghoni Outlet</p>
              <p className="text-xs text-faint">Kasir Digiflazz</p>
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = screen === item.id || (screen === "receipt" && item.id === "history");
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => go(item.id)}
                  className={
                    active
                      ? "flex h-11 items-center gap-3 rounded-lg bg-raised px-3 text-sm font-semibold"
                      : "flex h-11 items-center gap-3 rounded-lg px-3 text-sm text-muted"
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="no-print flex h-14 items-center justify-between gap-3 border-b border-line px-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="lg:hidden">
                <Mark />
              </span>
              <p className="truncate text-sm font-semibold">{settings.outletName || "Ya Ghoni Outlet"}</p>
            </div>
            <p className={`text-xs font-semibold ${modeClass}`}>{mode}</p>
          </header>
          <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4 pb-28 lg:pb-8">
            {screen === "home" ? <HomeScreen /> : null}
            {screen === "sell" ? <SellScreen /> : null}
            {screen === "history" ? <HistoryScreen /> : null}
            {screen === "prices" ? <PricesScreen /> : null}
            {screen === "settings" ? <SettingsScreen /> : null}
            {screen === "receipt" ? <ReceiptView /> : null}
          </main>
        </div>
      </div>
      <nav className="dock no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = screen === item.id || (screen === "receipt" && item.id === "history");
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                className={
                  active
                    ? "flex h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold text-fg"
                    : "flex h-14 flex-col items-center justify-center gap-0.5 text-xs text-faint"
                }
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
