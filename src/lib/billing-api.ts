import { apiRequest } from "./api-client";

export type BillingInterval = "month" | "quarter" | "half_year" | "year";

export interface BillingPrice {
  id: string;
  productId: string;
  stripePriceId: string;
  billingInterval: BillingInterval;
  /** Minor units (cents), as Stripe stores it. */
  unitAmount: number;
  currency: string;
  /** Overrides the product's trialDays for this cadence; null inherits it. */
  trialDaysOverride: number | null;
  isActive: boolean;
  /** Independent of isActive — whether this price appears in the public self-signup catalog (GET /billing/products). Per price, so each billing cycle of a plan toggles on its own. */
  showOnSignup: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BillingProduct {
  id: string;
  key: string;
  stripeProductId: string;
  name: string;
  description: string | null;
  features: string[];
  /** App-enforced caps, e.g. { seats: 5 }. A missing key means unlimited. */
  limits: Record<string, number>;
  trialDays: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** A product with its prices nested — what both catalog endpoints return. */
export interface CatalogEntry extends BillingProduct {
  prices: BillingPrice[];
}

export interface CreateProductInput {
  key: string;
  name: string;
  description?: string;
  features?: string[];
  limits?: Record<string, number>;
  trialDays?: number;
  sortOrder?: number;
}

export interface CreatePriceInput {
  billingInterval: BillingInterval;
  unitAmount: number;
  currency?: string;
  trialDaysOverride?: number;
}

export type PaymentLinkDiscountType = "percent" | "amount";

export interface BillingPaymentLink {
  id: string;
  productId: string;
  priceId: string;
  billingInterval: BillingInterval;
  /** A tenant-app signup link (/join/<token>) when `token` is set — what "Copy" hands out — otherwise a Stripe Payment Link (the "Create Payment Link" dialog). */
  url: string;
  token: string | null;
  isDefault: boolean;
  /** Recorded on the link for whoever provisions the account — not a checkout quantity. */
  seatOverride: number | null;
  trialDaysOverride: number | null;
  discountType: PaymentLinkDiscountType | null;
  discountValue: number | null;
  /** The buyer enters this at checkout to redeem the discount — Stripe Payment Links can't apply a coupon automatically. Null unless a discount was set. */
  promotionCode: string | null;
  /** Record-keeping only for a Stripe Payment Link — nothing deactivates it in Stripe once this passes. */
  expiresAt: string | null;
  isActive: boolean;
}

export interface CreatePaymentLinkInput {
  productId: string;
  /** One link per cycle listed — see BillingPaymentLink's doc comment. */
  billingIntervals: BillingInterval[];
  seatOverride?: number;
  trialDaysOverride?: number;
  discountType?: PaymentLinkDiscountType;
  /** Whole percent (1–100), or minor units (cents) for "amount". */
  discountValue?: number;
  expiresInDays?: number | null;
}

/**
 * Thin, 1:1 wrappers around service-finder-backend's /billing/* routes
 * (src/modules/products, prices and payment-links) — same pattern as
 * src/lib/users-api.ts. Every call here goes through apiRequest, so it's
 * bearer-token authenticated and gets the automatic 401 refresh-and-retry.
 * The public GET /billing/products (for a pricing page) isn't wrapped:
 * the back office has no reason to call it.
 */
export const billingApi = {
  listAdminCatalog: () => apiRequest<{ products: CatalogEntry[] }>("/billing/products/admin"),

  createProduct: (input: CreateProductInput) =>
    apiRequest<{ product: BillingProduct }>("/billing/products", {
      method: "POST",
      body: input,
    }),

  archiveProduct: (productId: string) =>
    apiRequest<{ product: BillingProduct }>(`/billing/products/${productId}/archive`, {
      method: "PATCH",
    }),

  updatePriceVisibility: (priceId: string, showOnSignup: boolean) =>
    apiRequest<{ price: BillingPrice }>(`/billing/prices/${priceId}/visibility`, {
      method: "PATCH",
      body: { showOnSignup },
    }),

  createPrice: (productId: string, input: CreatePriceInput) =>
    apiRequest<{ price: BillingPrice }>(`/billing/products/${productId}/prices`, {
      method: "POST",
      body: input,
    }),

  archivePrice: (priceId: string) =>
    apiRequest<{ price: BillingPrice }>(`/billing/prices/${priceId}/archive`, {
      method: "PATCH",
    }),

  /** "Create Payment Link" dialog — may return more than one link (one per selected cycle). */
  createPaymentLinks: (input: CreatePaymentLinkInput) =>
    apiRequest<{ paymentLinks: BillingPaymentLink[] }>("/billing/payment-links", {
      method: "POST",
      body: input,
    }),

  /** The price row's "Copy" action — a tenant-app signup link (/join/<token>) for this price. Idempotent: reuses the existing one if there is one. */
  getOrCreateDefaultPaymentLink: (priceId: string) =>
    apiRequest<{ paymentLink: BillingPaymentLink }>(`/billing/prices/${priceId}/payment-link`, {
      method: "POST",
    }),
};
