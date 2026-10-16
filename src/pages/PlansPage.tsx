import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, confirmPillClass } from "@/components/ui/Button";
import { Select } from "@/components/ui/FormField";
import { StatusPill } from "@/components/ui/StatusPill";
import { Switch } from "@/components/ui/Switch";
import {
  DataTable,
  DataTableHead,
  DataTableMessage,
  DataTableRow,
} from "@/components/ui/DataTable";
import { InlineError, PageTitle, SectionHeader } from "@/components/ui/Page";
import { useAuthStore } from "@/auth/auth-store";
import { useTwoStepConfirm } from "@/lib/use-two-step-confirm";
import { useFlash } from "@/lib/use-flash";
import { copyText } from "@/lib/clipboard";
import {
  billingApi,
  type BillingInterval,
  type BillingPrice,
  type CatalogEntry,
} from "@/lib/billing-api";
import {
  ADMIN_CATALOG_KEY,
  CYCLES,
  CYCLE_LABEL,
  errorMessage,
  formatMoney,
} from "./plans/plan-format";
import { NewProductModal } from "./plans/NewProductModal";
import { AddPriceModal } from "./plans/AddPriceModal";
import { CreatePaymentLinkModal } from "./plans/CreatePaymentLinkModal";
import { SignupLinkModal } from "./plans/SignupLinkModal";

/** The mockup's Plans table columns, verbatim. */
const PLAN_COLUMNS = "1.1fr 1fr 1.6fr .8fr .9fr .6fr 1.1fr .9fr 1.7fr";
const PLAN_LABELS = [
  "Product",
  "Billing cycle",
  "Price ID",
  "Price",
  "Seats",
  "Trial",
  "Status",
  "Self-signup",
  "",
];

type RowStatus = "active" | "archived" | "none";

const STATUS_PILL: Record<RowStatus, { tone: "success" | "neutral" | "warning"; label: string }> = {
  active: { tone: "success", label: "Active" },
  archived: { tone: "neutral", label: "Archived" },
  none: { tone: "warning", label: "No prices yet" },
};

/**
 * One row per Stripe price, as in the mockup — plus one placeholder row
 * for a product with no prices yet, so a just-created product shows up
 * in the table (with "+ Price" right there) instead of only in the
 * product filter.
 */
interface PlanRow {
  /** The price's id, or `product:<id>` for a placeholder row. */
  key: string;
  product: CatalogEntry;
  price: BillingPrice | null;
  status: RowStatus;
}

function toRows(products: CatalogEntry[]): PlanRow[] {
  const rows: PlanRow[] = [];
  for (const product of products) {
    if (product.prices.length === 0) {
      rows.push({
        key: `product:${product.id}`,
        product,
        price: null,
        // A deleted (archived) product has nothing left to be "waiting for".
        status: product.isActive ? "none" : "archived",
      });
      continue;
    }
    for (const price of product.prices) {
      // A price of an archived product can't be sold either, whatever
      // its own flag says — the public catalog and signup links both
      // refuse it — so it reads as archived here too.
      const sellable = price.isActive && product.isActive;
      rows.push({ key: price.id, product, price, status: sellable ? "active" : "archived" });
    }
  }
  return rows;
}

function seatsLabel(product: CatalogEntry): string {
  const seats = product.limits.seats;
  return seats === undefined ? "Unlimited" : String(seats);
}

function trialLabel(row: PlanRow): string {
  const days = row.price?.trialDaysOverride ?? row.product.trialDays;
  return days ? `${days}d` : "—";
}

/** Small sync-status badge beside "Stripe Products", with the mockup's teal dot. */
function SyncedBadge() {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-bo-neutral-bg px-[9px] py-[5px] font-mono text-[10px] leading-none font-medium tracking-[0.06em] text-bo-ink uppercase">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-bo-accent" />
      Synced with Stripe
    </span>
  );
}

/**
 * The mockup's Plans screen (ServiceFinder Backoffice.dc.html), wired to
 * service-finder-backend's /billing routes the way iGroom's Plans page
 * is wired to its own:
 *
 *  - The table is GET /billing/products/admin — every product and price,
 *    archived ones included (that's what the Archived filter is for).
 *  - SELF-SIGNUP shows or hides one price on the public pricing catalog
 *    without archiving it — optimistic, and locked per row while saving.
 *  - "Copy" gets-or-creates the price's reusable signup link
 *    (<tenant app>/join/<token>) and puts it on the clipboard.
 *  - "Delete" archives — in Stripe too, since a Stripe price can't be
 *    deleted once it exists — with the mockup's two-click confirm.
 *    Existing subscribers keep an archived price.
 *
 * Viewing needs plans.view (AppShell gates the tab); every action needs
 * plans.manage, so a view-only role sees the table without them.
 */
export function PlansPage() {
  const queryClient = useQueryClient();
  const canManage = useAuthStore((s) => s.hasPermission("plans.manage"));

  const [productFilter, setProductFilter] = useState("all");
  const [cycleFilter, setCycleFilter] = useState<"all" | BillingInterval>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | RowStatus>("all");
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [createLinkOpen, setCreateLinkOpen] = useState(false);
  const [addPriceFor, setAddPriceFor] = useState<{
    product: CatalogEntry;
    fromCycle?: BillingInterval;
  } | null>(null);
  const [manualLink, setManualLink] = useState<{ url: string; plan: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const confirmDelete = useTwoStepConfirm();
  const linkCopied = useFlash();
  const priceIdCopied = useFlash();

  const catalog = useQuery({ queryKey: ADMIN_CATALOG_KEY, queryFn: billingApi.listAdminCatalog });
  // Memoised: `?? []` would be a new array every render while loading,
  // re-running every memo below that depends on it.
  const products = useMemo(() => catalog.data?.products ?? [], [catalog.data]);
  const rows = useMemo(() => toRows(products), [products]);
  const filteredRows = rows.filter(
    (row) =>
      (productFilter === "all" || row.product.id === productFilter) &&
      (cycleFilter === "all" || row.price?.billingInterval === cycleFilter) &&
      (statusFilter === "all" || row.status === statusFilter),
  );
  const filtered = productFilter !== "all" || cycleFilter !== "all" || statusFilter !== "all";

  function clearFilters() {
    setProductFilter("all");
    setCycleFilter("all");
    setStatusFilter("all");
  }

  function failed(fallback: string) {
    return (error: unknown) => setActionError(errorMessage(error, fallback));
  }

  const archivePrice = useMutation({
    mutationFn: (priceId: string) => billingApi.archivePrice(priceId),
    onMutate: () => setActionError(null),
    onError: failed("Couldn't delete that price."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_CATALOG_KEY }),
  });

  const archiveProduct = useMutation({
    mutationFn: (productId: string) => billingApi.archiveProduct(productId),
    onMutate: () => setActionError(null),
    onError: failed("Couldn't delete that product."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_CATALOG_KEY }),
  });

  const copyLink = useMutation({
    mutationFn: (row: PlanRow) => billingApi.getOrCreateDefaultPaymentLink(row.key),
    onMutate: () => setActionError(null),
    onError: failed("Couldn't create a signup link."),
    onSuccess: async ({ paymentLink }, row) => {
      if (await copyText(paymentLink.url)) {
        linkCopied.flash(row.key);
      } else {
        setManualLink({
          url: paymentLink.url,
          plan: `${row.product.name}, ${CYCLE_LABEL[paymentLink.billingInterval]}`,
        });
      }
    },
  });

  // Optimistic and per row: the switch flips the moment it's clicked,
  // and only that row's switch is locked while its request is in flight
  // — toggling three cycles doesn't mean waiting out three round trips.
  const [savingPriceIds, setSavingPriceIds] = useState<ReadonlySet<string>>(() => new Set());
  const updateVisibility = useMutation({
    mutationKey: ["billing", "price-visibility"],
    mutationFn: ({ priceId, showOnSignup }: { priceId: string; showOnSignup: boolean }) =>
      billingApi.updatePriceVisibility(priceId, showOnSignup),
    onMutate: async ({ priceId, showOnSignup }) => {
      setActionError(null);
      setSavingPriceIds((prev) => new Set(prev).add(priceId));
      // A refetch landing mid-flight would briefly paint the old value back.
      await queryClient.cancelQueries({ queryKey: ADMIN_CATALOG_KEY });
      setPriceVisibility(priceId, showOnSignup);
    },
    // Undo just this price, not a whole-cache snapshot — a snapshot taken
    // here would also roll back any other row toggled in the meantime.
    onError: (error, { priceId, showOnSignup }) => {
      setPriceVisibility(priceId, !showOnSignup);
      setActionError(errorMessage(error, "Couldn't change self-signup for that price."));
    },
    onSettled: (_data, _error, { priceId }) => {
      setSavingPriceIds((prev) => {
        const next = new Set(prev);
        next.delete(priceId);
        return next;
      });
      // Resync once the last in-flight toggle lands, not after each one —
      // an early refetch would return before the others' writes and flip
      // their switches back for a moment.
      if (queryClient.isMutating({ mutationKey: ["billing", "price-visibility"] }) <= 1) {
        void queryClient.invalidateQueries({ queryKey: ADMIN_CATALOG_KEY });
      }
    },
  });

  function setPriceVisibility(priceId: string, showOnSignup: boolean) {
    queryClient.setQueryData<{ products: CatalogEntry[] }>(ADMIN_CATALOG_KEY, (old) =>
      old
        ? {
            products: old.products.map((product) => ({
              ...product,
              prices: product.prices.map((price) =>
                price.id === priceId ? { ...price, showOnSignup } : price,
              ),
            })),
          }
        : old,
    );
  }

  function remove(row: PlanRow) {
    if (!confirmDelete.ask(row.key)) return;
    if (row.price) archivePrice.mutate(row.price.id);
    else archiveProduct.mutate(row.product.id);
  }

  function isDeleting(row: PlanRow) {
    return row.price
      ? archivePrice.isPending && archivePrice.variables === row.price.id
      : archiveProduct.isPending && archiveProduct.variables === row.product.id;
  }

  return (
    <>
      <PageTitle>Plans</PageTitle>

      <section className="flex flex-col gap-[18px]">
        <SectionHeader
          title="Stripe Products"
          badge={<SyncedBadge />}
          description="Plans and prices billed via Stripe, mapped to each subscription tier"
          actions={
            canManage && (
              <>
                <Button variant="secondary" onClick={() => setCreateLinkOpen(true)}>
                  Create Payment Link
                </Button>
                <Button onClick={() => setNewProductOpen(true)}>+ New Product</Button>
              </>
            )
          }
        />

        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            aria-label="Product"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
          >
            <option value="all">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Billing cycle"
            value={cycleFilter}
            onChange={(e) => setCycleFilter(e.target.value as "all" | BillingInterval)}
          >
            <option value="all">All Billing Cycles</option>
            {CYCLES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | RowStatus)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="none">No Prices Yet</option>
          </Select>
          {filtered && (
            <Button variant="link" className="px-1.5" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        {actionError && <InlineError>{actionError}</InlineError>}

        <DataTable minWidth={1120}>
          <DataTableHead columns={PLAN_COLUMNS} labels={PLAN_LABELS} />
          {catalog.isLoading ? (
            <DataTableMessage>Loading plans…</DataTableMessage>
          ) : catalog.isError ? (
            <DataTableMessage tone="danger">
              Couldn't load plans: {errorMessage(catalog.error, "unknown error")}
            </DataTableMessage>
          ) : rows.length === 0 ? (
            <DataTableMessage>
              <span className="text-bo-ink">No plans yet</span>
              {canManage && (
                <Button variant="link" onClick={() => setNewProductOpen(true)}>
                  + New Product
                </Button>
              )}
            </DataTableMessage>
          ) : filteredRows.length === 0 ? (
            <DataTableMessage>
              <span className="text-bo-ink">No products match these filters</span>
              <Button variant="link" onClick={clearFilters}>
                Clear filters
              </Button>
            </DataTableMessage>
          ) : (
            filteredRows.map((row) => {
              const { product, price, status } = row;
              const pill = STATUS_PILL[status];
              const label = `${product.name}${price ? ` ${CYCLE_LABEL[price.billingInterval]}` : ""}`;
              return (
                <DataTableRow key={row.key} columns={PLAN_COLUMNS}>
                  <span className="truncate font-semibold" title={product.name}>
                    {product.name}
                  </span>
                  <span className="text-bo-body">
                    {price ? CYCLE_LABEL[price.billingInterval] : "—"}
                  </span>
                  {price ? (
                    <button
                      type="button"
                      title={`${price.stripePriceId} — click to copy`}
                      onClick={async () => {
                        if (await copyText(price.stripePriceId)) priceIdCopied.flash(price.id);
                      }}
                      className={`min-w-0 cursor-pointer truncate border-0 bg-transparent p-0 text-left font-mono text-xs leading-none ${
                        priceIdCopied.is(price.id) ? "text-bo-accent-deep" : "text-bo-muted"
                      }`}
                    >
                      {priceIdCopied.is(price.id) ? "Copied" : price.stripePriceId}
                    </button>
                  ) : (
                    <span className="font-mono text-xs leading-none text-bo-muted">—</span>
                  )}
                  <span className="font-medium tabular-nums">
                    {price ? formatMoney(price.unitAmount, price.currency) : "—"}
                  </span>
                  <span className="text-bo-body">{seatsLabel(product)}</span>
                  <span className="text-bo-body tabular-nums">{trialLabel(row)}</span>
                  <span className="flex">
                    <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                  </span>
                  <span className="flex">
                    {price && (
                      <Switch
                        label={`Show ${label} on self-signup`}
                        checked={price.showOnSignup}
                        disabled={!canManage || status !== "active" || savingPriceIds.has(price.id)}
                        title={
                          status !== "active"
                            ? "Archived — never offered on self-signup"
                            : !canManage
                              ? "Needs the plans.manage permission"
                              : price.showOnSignup
                                ? "On the pricing page — click to sell it by link only"
                                : "Link only — click to show it on the pricing page"
                        }
                        onChange={(next) =>
                          updateVisibility.mutate({ priceId: price.id, showOnSignup: next })
                        }
                      />
                    )}
                  </span>
                  {/* min-w-0: the armed "Confirm delete" pill is wider than
                      "Delete", and without it this one row's grid would
                      re-flow to make room. With it the pill spills left,
                      into the switch column's spare space, and every
                      column stays where it was. */}
                  <span className="flex min-w-0 items-center justify-end gap-[18px]">
                    {canManage && product.isActive && (
                      <Button
                        variant="link"
                        onClick={() =>
                          setAddPriceFor({ product, fromCycle: price?.billingInterval })
                        }
                      >
                        + Price
                      </Button>
                    )}
                    {canManage &&
                      status === "active" &&
                      (linkCopied.is(row.key) ? (
                        <span className="py-1.5 font-sans text-[13px] leading-none font-semibold text-bo-accent-deep">
                          Copied
                        </span>
                      ) : (
                        <Button
                          variant="linkInk"
                          disabled={copyLink.isPending && copyLink.variables?.key === row.key}
                          title={`Copy a signup link for ${label} — whoever opens it signs up on this price`}
                          onClick={() => copyLink.mutate(row)}
                        >
                          Copy
                        </Button>
                      ))}
                    {canManage && status !== "archived" && (
                      <button
                        type="button"
                        disabled={isDeleting(row)}
                        title={
                          price
                            ? "Archives this price in Stripe. Existing subscribers keep it; new signups can't choose it. Stripe prices can't be restored."
                            : "Archives this product in Stripe. It has no prices, so nothing else changes."
                        }
                        onClick={() => remove(row)}
                        className={
                          confirmDelete.isArmed(row.key)
                            ? confirmPillClass
                            : "cursor-pointer border-0 bg-transparent py-1.5 font-sans text-[13px] leading-none font-semibold text-bo-danger hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        }
                      >
                        {isDeleting(row)
                          ? "Deleting…"
                          : confirmDelete.isArmed(row.key)
                            ? "Confirm delete"
                            : "Delete"}
                      </button>
                    )}
                  </span>
                </DataTableRow>
              );
            })
          )}
        </DataTable>
      </section>

      <NewProductModal
        open={newProductOpen}
        onClose={() => setNewProductOpen(false)}
        sortOrder={products.reduce((max, p) => Math.max(max, p.sortOrder + 1), 0)}
      />
      <AddPriceModal
        product={addPriceFor?.product ?? null}
        fromCycle={addPriceFor?.fromCycle}
        onClose={() => setAddPriceFor(null)}
      />
      <CreatePaymentLinkModal
        open={createLinkOpen}
        onClose={() => setCreateLinkOpen(false)}
        products={products}
      />
      <SignupLinkModal link={manualLink} onClose={() => setManualLink(null)} />
    </>
  );
}

export default PlansPage;
