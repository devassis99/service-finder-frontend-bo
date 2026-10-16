import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Select, formInputClass, formInputCompactClass } from "@/components/ui/FormField";
import { InlineError } from "@/components/ui/Page";
import { copyText } from "@/lib/clipboard";
import { useFlash } from "@/lib/use-flash";
import {
  billingApi,
  type BillingInterval,
  type BillingPaymentLink,
  type BillingPrice,
  type CatalogEntry,
  type PaymentLinkDiscountType,
} from "@/lib/billing-api";
import {
  CYCLES,
  CYCLE_LABEL,
  errorMessage,
  formatMoney,
  parseMoneyToCents,
  parseWholeNumber,
} from "./plan-format";

type Expiry = "never" | "7" | "30";

const labelClass =
  "font-mono text-[10.5px] leading-none font-medium tracking-[0.07em] text-bo-faint uppercase";
const hintClass = "m-0 font-sans text-xs leading-snug text-bo-muted";

/**
 * "Create Payment Link" — POST /billing/payment-links, one real Stripe
 * Payment Link per selected cycle, with this dialog's trial, seat and
 * discount terms.
 *
 * What Stripe can't do shapes the dialog, the same way it shaped
 * iGroom's:
 *  - A Payment Link sells exactly one price, so several cycles means
 *    several links, all shown together once generated.
 *  - A link's URL only exists once Stripe has made it, so the links
 *    appear after "Generate", not as a preview before.
 *  - A discount can't be pre-applied to a Payment Link — it's a
 *    promotion code the buyer types at checkout, shown with the links.
 */
export function CreatePaymentLinkModal({
  open,
  onClose,
  products,
}: {
  open: boolean;
  onClose: () => void;
  products: CatalogEntry[];
}) {
  const [productId, setProductId] = useState("");
  const [cycles, setCycles] = useState<ReadonlySet<BillingInterval>>(() => new Set());
  const [seatOverride, setSeatOverride] = useState("");
  const [trialOverride, setTrialOverride] = useState("");
  const [discountType, setDiscountType] = useState<"" | PaymentLinkDiscountType>("");
  const [discountValue, setDiscountValue] = useState("");
  const [expires, setExpires] = useState<Expiry>("never");
  const [results, setResults] = useState<BillingPaymentLink[] | null>(null);

  const eligible = useMemo(
    () => products.filter((p) => p.isActive && p.prices.some((price) => price.isActive)),
    [products],
  );
  // Falls back to the first eligible product rather than syncing one in
  // with an effect: the catalog is often still loading when this mounts.
  const selected = eligible.find((p) => p.id === productId) ?? eligible[0] ?? null;
  const priceByCycle = useMemo(() => {
    const map = new Map<BillingInterval, BillingPrice>();
    for (const price of selected?.prices ?? []) {
      if (price.isActive) map.set(price.billingInterval, price);
    }
    return map;
  }, [selected]);

  const chosenPrices = CYCLES.filter((c) => cycles.has(c.value))
    .map((c) => priceByCycle.get(c.value))
    .filter((p): p is BillingPrice => p !== undefined);
  const currencies = new Set(chosenPrices.map((p) => p.currency));
  const discountCurrency = currencies.size === 1 ? [...currencies][0]!.toUpperCase() : null;

  const seat = parseWholeNumber(seatOverride, { min: 1 });
  const trial = parseWholeNumber(trialOverride, { min: 0 });
  const discount =
    discountType === "percent"
      ? parseWholeNumber(discountValue, { min: 1 })
      : discountType === "amount"
        ? parseMoneyToCents(discountValue)
        : undefined;

  const problems = {
    seat: seat === null ? "A whole number of 1 or more, or blank." : null,
    trial: trial === null ? "A whole number of days, or blank." : null,
    discount: !discountType
      ? null
      : !discountValue.trim()
        ? null
        : discount === null || discount === undefined
          ? discountType === "percent"
            ? "A whole percentage, 1 to 100."
            : "An amount like 10 or 9.50."
          : discountType === "percent" && discount > 100
            ? "A whole percentage, 1 to 100."
            : discountType === "amount" && currencies.size > 1
              ? "The selected cycles are priced in different currencies — use a percentage instead."
              : null,
  };

  const create = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("Choose a product.");
      return billingApi.createPaymentLinks({
        productId: selected.id,
        billingIntervals: chosenPrices.map((p) => p.billingInterval),
        seatOverride: seat ?? undefined,
        trialDaysOverride: trial ?? undefined,
        discountType: discountType || undefined,
        discountValue: discountType ? (discount ?? undefined) : undefined,
        expiresInDays: expires === "never" ? null : Number(expires),
      });
    },
    onSuccess: ({ paymentLinks }) => setResults(paymentLinks),
  });

  function toggleCycle(cycle: BillingInterval) {
    setCycles((prev) => {
      const next = new Set(prev);
      if (next.has(cycle)) next.delete(cycle);
      else next.add(cycle);
      return next;
    });
  }

  function resetForm() {
    setProductId("");
    setCycles(new Set());
    setSeatOverride("");
    setTrialOverride("");
    setDiscountType("");
    setDiscountValue("");
    setExpires("never");
    setResults(null);
    create.reset();
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  const canSubmit =
    selected !== null &&
    chosenPrices.length > 0 &&
    !problems.seat &&
    !problems.trial &&
    !problems.discount &&
    (!discountType || typeof discount === "number") &&
    !create.isPending;

  if (results) {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title={results.length > 1 ? `${results.length} payment links ready` : "Payment link ready"}
        description={`For ${selected?.name ?? "this plan"}. Each opens Stripe Checkout with the terms you set.`}
        footer={
          <>
            <Button variant="secondary" onClick={resetForm}>
              Create another
            </Button>
            <Button onClick={handleClose}>Done</Button>
          </>
        }
      >
        {results[0]?.promotionCode && (
          <CopyRow
            label="Discount code"
            value={results[0].promotionCode}
            note="The buyer enters this at checkout — a payment link can't apply a discount on its own."
            emphasis
          />
        )}
        {results.map((link) => (
          <CopyRow key={link.id} label={CYCLE_LABEL[link.billingInterval]} value={link.url} />
        ))}
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create payment link"
      description="A Stripe checkout link with exact terms — a longer trial, a discount — for a deal agreed outside self-signup."
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} disabled={!canSubmit}>
            {create.isPending
              ? "Generating…"
              : chosenPrices.length > 1
                ? `Generate ${chosenPrices.length} links`
                : "Generate link"}
          </Button>
        </>
      }
    >
      <Field label="Product">
        <Select
          block
          value={selected?.id ?? ""}
          onChange={(e) => {
            setProductId(e.target.value);
            setCycles(new Set());
          }}
          disabled={eligible.length === 0}
        >
          {eligible.length === 0 && <option value="">No products with an active price</option>}
          {eligible.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="flex flex-col gap-2">
        <span className={labelClass}>Billing cycles</span>
        <div className="flex flex-wrap gap-2">
          {CYCLES.map((c) => {
            const price = priceByCycle.get(c.value);
            const checked = cycles.has(c.value);
            return (
              // A real checkbox, visually hidden, inside a label drawn as
              // the chip — native keyboard and screen-reader behaviour,
              // the mockup's look.
              <label
                key={c.value}
                title={
                  price
                    ? undefined
                    : `${selected?.name ?? "This product"} has no active ${c.label} price`
                }
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2.5 font-sans text-xs leading-none font-medium has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-40 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-bo-accent ${
                  checked
                    ? "border-bo-accent bg-bo-accent-bg text-bo-accent-deep"
                    : "border-bo-input-border bg-bo-paper text-bo-ink hover:border-bo-input-border-hover"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  disabled={!price}
                  onChange={() => toggleCycle(c.value)}
                />
                <span
                  aria-hidden="true"
                  className={`flex h-3.5 w-3.5 items-center justify-center rounded-[4px] text-[10px] leading-none text-white ${
                    checked ? "bg-bo-accent" : "border-[1.5px] border-bo-input-border-hover"
                  }`}
                >
                  {checked ? "✓" : ""}
                </span>
                {c.label}
                {price && (
                  <span className="font-normal text-bo-muted tabular-nums">
                    {formatMoney(price.unitAmount, price.currency)}
                  </span>
                )}
              </label>
            );
          })}
        </div>
        <p className={hintClass}>
          One link per cycle — Stripe can't offer a choice of prices inside a single link.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Seat override" hint={problems.seat ?? undefined}>
          <input
            type="text"
            inputMode="numeric"
            placeholder={
              selected?.limits.seats !== undefined ? String(selected.limits.seats) : "Unlimited"
            }
            value={seatOverride}
            onChange={(e) => setSeatOverride(e.target.value)}
            aria-invalid={problems.seat ? true : undefined}
            className={formInputClass}
          />
        </Field>
        <Field label="Trial override (days)" hint={problems.trial ?? undefined}>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Price's own"
            value={trialOverride}
            onChange={(e) => setTrialOverride(e.target.value)}
            aria-invalid={problems.trial ? true : undefined}
            className={formInputClass}
          />
        </Field>
      </div>
      <p className={`-mt-2 ${hintClass}`}>
        The seat override is recorded on the link for whoever sets up the account — it doesn't
        change what's charged.
      </p>

      <Field label="Discount" hint={problems.discount ?? undefined}>
        <div className="flex gap-2.5">
          <span className="w-[150px] shrink-0">
            <Select
              block
              aria-label="Discount type"
              value={discountType}
              onChange={(e) => {
                setDiscountType(e.target.value as "" | PaymentLinkDiscountType);
                setDiscountValue("");
              }}
            >
              <option value="">No discount</option>
              <option value="percent">Percent off</option>
              <option value="amount">Amount off</option>
            </Select>
          </span>
          <input
            type="text"
            inputMode="decimal"
            aria-label="Discount amount"
            placeholder={
              discountType === "percent"
                ? "e.g. 20 (%)"
                : discountType === "amount"
                  ? `e.g. 10.00${discountCurrency ? ` (${discountCurrency})` : ""}`
                  : "—"
            }
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            disabled={!discountType}
            aria-invalid={problems.discount ? true : undefined}
            className={`${formInputCompactClass} min-w-0 flex-1 disabled:cursor-not-allowed disabled:bg-bo-hover`}
          />
        </div>
      </Field>

      <Field
        label="Link expires"
        hint="Recorded on the link — Stripe's payment links don't expire on their own, so switch it off in the Stripe Dashboard once it's been used."
      >
        <Select block value={expires} onChange={(e) => setExpires(e.target.value as Expiry)}>
          <option value="never">Never</option>
          <option value="7">In 7 days</option>
          <option value="30">In 30 days</option>
        </Select>
      </Field>

      {create.isError && (
        <InlineError>
          {errorMessage(create.error, "Failed to create the payment link.")}
        </InlineError>
      )}
    </Modal>
  );
}

/** One generated value — a link or the discount code — with its own Copy. */
function CopyRow({
  label,
  value,
  note,
  emphasis = false,
}: {
  label: string;
  value: string;
  note?: string;
  emphasis?: boolean;
}) {
  const copied = useFlash();
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <span className={labelClass}>{label}</span>
      <div
        className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${
          emphasis ? "border-bo-accent-bg bg-bo-accent-bg" : "border-bo-card-border bg-bo-paper"
        }`}
      >
        <input
          readOnly
          value={value}
          aria-label={label}
          onFocus={(e) => e.currentTarget.select()}
          className={`min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-xs outline-none ${
            emphasis ? "font-semibold text-bo-accent-deep" : "text-bo-body"
          }`}
        />
        {copied.is(value) ? (
          <span className="py-1.5 font-sans text-[13px] leading-none font-semibold text-bo-accent-deep">
            Copied
          </span>
        ) : (
          <Button
            variant={emphasis ? "link" : "linkInk"}
            onClick={async () => {
              const ok = await copyText(value);
              setFailed(!ok);
              if (ok) copied.flash(value);
            }}
          >
            Copy
          </Button>
        )}
      </div>
      {failed && <p className={hintClass}>Couldn't copy — select the text above and copy it.</p>}
      {note && <p className={hintClass}>{note}</p>}
    </div>
  );
}
