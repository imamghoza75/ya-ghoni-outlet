export type TxnStatus = "Sukses" | "Pending" | "Gagal";
export type PayMethod = "Tunai" | "Transfer";
export type CatalogSource = "demo" | "live";
export type Screen = "home" | "sell" | "history" | "prices" | "settings" | "receipt";

export type PrepaidProduct = {
  product_name: string;
  category: string;
  brand: string;
  type: string;
  seller_name: string;
  price: number;
  buyer_sku_code: string;
  buyer_product_status: boolean;
  seller_product_status: boolean;
  unlimited_stock: boolean;
  stock: number;
  multi: boolean;
  start_cut_off: string;
  end_cut_off: string;
  desc: string;
};

export type PascaProduct = {
  product_name: string;
  category: string;
  brand: string;
  seller_name: string;
  admin: number;
  commission: number;
  buyer_sku_code: string;
  buyer_product_status: boolean;
  seller_product_status: boolean;
  desc: string;
};

export type Settings = {
  outletName: string;
  outletCity: string;
  whatsapp: string;
  payNote: string;
  footer: string;
  username: string;
  apiKey: string;
  testing: boolean;
  markup: Record<string, number>;
  productMarkup: Record<string, number>;
};

export type Txn = {
  refId: string;
  kind: "prepaid" | "pasca";
  sku: string;
  productName: string;
  brand: string;
  category: string;
  customerNo: string;
  customerName: string;
  cost: number;
  sell: number;
  status: TxnStatus;
  rc: string;
  message: string;
  sn: string;
  payMethod: PayMethod;
  note: string;
  createdAt: string;
  source: "demo" | "live";
  billLines: string[];
  demoResolve?: TxnStatus;
};

export type Bill = {
  refId: string;
  sku: string;
  productName: string;
  brand: string;
  category: string;
  customerNo: string;
  customerName: string;
  cost: number;
  baseSell: number;
  sell: number;
  admin: number;
  status: TxnStatus;
  rc: string;
  message: string;
  lines: string[];
  source: "demo" | "live";
};

export type TxPayload = {
  ref_id: string;
  customer_no: string;
  buyer_sku_code: string;
  message: string;
  status: string;
  rc: string;
  sn: string;
  buyer_last_saldo: number | null;
  price: number | null;
  selling_price: number | null;
  customer_name: string;
  admin: number | null;
  lines: string[];
};
