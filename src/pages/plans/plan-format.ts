import type { BillingInterval } from "@/lib/billing-api";
import { ApiError } from "@/lib/http";

/** The TanStack Query key for GET /billing/products/admin — every Plans mutation invalidates it. */
export const ADMIN_CATALOG_KEY = ["billing", "admin-catalog"] as const;

/** Every cadence, in the order the backend sorts them. */
export const CYCLES: ReadonlyArray<{ value: BillingInterval; label: string }> = [
  { value: "month", label: "Monthly" },
  { value: "quarter", label: "Quarterly" },
  { value: "half_year", label: "Bi-Annual" },
  { value: "year", label: "Annual" },
];

export const CYCLE_LABEL = Object.fromEntries(CYCLES.map((c) => [c.value, c.label])) as Record<
  BillingInterval,
  string
>;

/**
 * Currencies Stripe counts in whole units rather than hundredths — 1000
 * JPY is unit_amount 1000, not 100000. Anything else is two-decimal.
 * https://docs.stripe.com/currencies#zero-decimal
 */
const ZERO_DECIMAL = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);

/** Stripe's integer amount as money: 4900 usd → "$49.00", 1000 jpy → "¥1,000". */
export function formatMoney(unitAmount: number, currency: string): string {
  const zeroDecimal = ZERO_DECIMAL.has(currency.toLowerCase());
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(zeroDecimal ? unitAmount : unitAmount / 100);
}

/**
 * A stable internal `key` from the display name ("Pro Plus" → "pro_plus",
 * "Café" → "cafe"). The backend requires one — it's the never-renamed
 * identifier code can gate features on — but the New Product dialog,
 * like the mockup, only asks for a name, so it's derived rather than
 * making an admin think about an internal id. Matches the backend's rule:
 * lowercase letters and digits joined by single underscores.
 */
export function slugifyKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : fallback;
}

/** "14" → 14, "" → undefined, anything else → null (invalid). */
export function parseWholeNumber(raw: string, { min }: { min: number }): number | undefined | null {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number.parseInt(trimmed, 10);
  return value >= min ? value : null;
}

/** "49", "49.5", "49.50" → 4950 cents; anything else (or ≤ 0) → null. */
export function parseMoneyToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const cents = Math.round(Number.parseFloat(trimmed) * 100);
  return cents > 0 ? cents : null;
}
