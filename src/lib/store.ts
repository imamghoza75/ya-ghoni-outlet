import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEMO_PASCA, DEMO_PREPAID } from "@/lib/demo-catalog";
import type { CatalogSource, PascaProduct, PrepaidProduct, Screen, Settings, Txn } from "@/lib/types";

export const DEFAULT_MARKUP: Record<string, number> = {
  Pulsa: 1500,
  Data: 2000,
  PLN: 1500,
  "E-Money": 1500,
  Games: 2000,
  Voucher: 1500,
  Streaming: 2000,
  Pascabayar: 1000,
  Lainnya: 1500,
};

const defaultSettings = (): Settings => ({
  outletName: "Ya Ghoni Outlet",
  outletCity: "",
  whatsapp: "",
  payNote: "",
  footer: "Simpan struk sebagai bukti.",
  username: "",
  apiKey: "",
  testing: true,
  markup: { ...DEFAULT_MARKUP },
  productMarkup: {},
});

type CatalogPatch = {
  prepaid: PrepaidProduct[];
  pasca: PascaProduct[];
  at: string;
};

type Store = {
  screen: Screen;
  sellFocus: string;
  selectedRef: string | null;
  settings: Settings;
  prepaid: PrepaidProduct[];
  pasca: PascaProduct[];
  catalogSource: CatalogSource;
  catalogAt: string | null;
  balance: number | null;
  demoBalance: number;
  txns: Txn[];
  patchSettings: (patch: Partial<Settings>) => void;
  setMarkup: (category: string, value: number) => void;
  setProductMarkup: (sku: string, value: number | null) => void;
  go: (screen: Screen, extra?: { sellFocus?: string; ref?: string | null }) => void;
  setCatalog: (patch: CatalogPatch) => void;
  useDemoCatalog: () => void;
  setBalance: (balance: number | null) => void;
  setDemoBalance: (balance: number) => void;
  addTxn: (txn: Txn) => void;
  replaceTxn: (txn: Txn) => void;
  clearTxns: () => void;
};

const memory = new Map<string, string>();

const safeStorage = {
  getItem: (key: string) => {
    if (typeof window === "undefined") return memory.get(key) ?? null;
    return localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === "undefined") {
      memory.set(key, value);
      return;
    }
    try {
      localStorage.setItem(key, value);
    } catch {
      /* quota — transaksi tetap ada di memori sesi */
    }
  },
  removeItem: (key: string) => {
    if (typeof window === "undefined") memory.delete(key);
    else localStorage.removeItem(key);
  },
};

export const useKasir = create<Store>()(
  persist(
    (set) => ({
      screen: "home",
      sellFocus: "Pulsa",
      selectedRef: null,
      settings: defaultSettings(),
      prepaid: DEMO_PREPAID,
      pasca: DEMO_PASCA,
      catalogSource: "demo",
      catalogAt: null,
      balance: null,
      demoBalance: 250000,
      txns: [],
      patchSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      setMarkup: (category, value) =>
        set((state) => ({
          settings: {
            ...state.settings,
            markup: { ...state.settings.markup, [category]: value },
          },
        })),
      setProductMarkup: (sku, value) =>
        set((state) => {
          const next = { ...state.settings.productMarkup };
          if (value == null) delete next[sku];
          else next[sku] = value;
          return { settings: { ...state.settings, productMarkup: next } };
        }),
      go: (screen, extra) =>
        set((state) => ({
          screen,
          sellFocus: extra?.sellFocus ?? state.sellFocus,
          selectedRef: extra && "ref" in extra ? (extra.ref ?? null) : state.selectedRef,
        })),
      setCatalog: ({ prepaid, pasca, at }) =>
        set({ prepaid, pasca, catalogSource: "live", catalogAt: at }),
      useDemoCatalog: () =>
        set({
          prepaid: DEMO_PREPAID,
          pasca: DEMO_PASCA,
          catalogSource: "demo",
          catalogAt: null,
          balance: null,
        }),
      setBalance: (balance) => set({ balance }),
      setDemoBalance: (demoBalance) => set({ demoBalance }),
      addTxn: (txn) => set((state) => ({ txns: [txn, ...state.txns].slice(0, 200) })),
      replaceTxn: (txn) =>
        set((state) => ({ txns: state.txns.map((item) => (item.refId === txn.refId ? txn : item)) })),
      clearTxns: () => set({ txns: [] }),
    }),
    {
      name: "yaghonioutlet.v1",
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        settings: state.settings,
        prepaid: state.prepaid,
        pasca: state.pasca,
        catalogSource: state.catalogSource,
        catalogAt: state.catalogAt,
        balance: state.balance,
        demoBalance: state.demoBalance,
        txns: state.txns,
      }),
    },
  ),
);
