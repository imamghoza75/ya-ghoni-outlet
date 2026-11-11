const RULES: { brand: string; prefixes: string[] }[] = [
  { brand: "TELKOMSEL", prefixes: ["0811", "0812", "0813", "0821", "0822", "0823", "0851", "0852", "0853"] },
  { brand: "INDOSAT", prefixes: ["0814", "0815", "0816", "0855", "0856", "0857", "0858"] },
  { brand: "XL", prefixes: ["0817", "0818", "0819", "0859", "0877", "0878"] },
  { brand: "AXIS", prefixes: ["0831", "0832", "0833", "0838"] },
  { brand: "TRI", prefixes: ["0895", "0896", "0897", "0898", "0899"] },
  { brand: "SMARTFREN", prefixes: ["0881", "0882", "0883", "0884", "0885", "0886", "0887", "0888", "0889"] },
];

export function digitsOnly(raw: string) {
  return raw.replace(/[^\d]/g, "");
}

export function normalizeMsisdn(raw: string) {
  let digits = digitsOnly(raw);
  if (digits.startsWith("62")) digits = `0${digits.slice(2)}`;
  else if (digits.startsWith("8")) digits = `0${digits}`;
  return digits;
}

export function detectBrand(raw: string) {
  const digits = normalizeMsisdn(raw);
  if (digits.length < 4) return null;
  return RULES.find((rule) => rule.prefixes.some((prefix) => digits.startsWith(prefix)))?.brand ?? null;
}

export function brandMatches(productBrand: string, detected: string) {
  const brand = productBrand.toUpperCase();
  if (detected === "TRI") return brand.includes("TRI") || brand.includes("THREE");
  if (detected === "INDOSAT") return brand.includes("INDOSAT") || brand.includes("IM3") || brand.includes("MENTARI");
  if (detected === "TELKOMSEL") {
    return brand.includes("TELKOMSEL") || brand.includes("SIMPATI") || brand.includes("BY.U") || brand.includes("BYU");
  }
  if (detected === "XL") return brand.includes("XL") && !brand.includes("AXIS");
  return brand.includes(detected);
}

export function cleanCustomerNo(raw: string) {
  return raw.replace(/\s+/g, "").trim();
}
