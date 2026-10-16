import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Select, formInputClass } from "@/components/ui/FormField";
import { InlineError } from "@/components/ui/Page";
import { billingApi, type BillingInterval, type CatalogEntry } from "@/lib/billing-api";
import {
  ADMIN_CATALOG_KEY,
  CYCLES,
  CYCLE_LABEL,
  errorMessage,
  formatMoney,
  parseMoneyToCents,
  parseWholeNumber,
} from "./plan-format";

/**
 * A row's "+ Price", scoped to that row's product. POST
 * /billing/products/:productId/prices creates a real Stripe Price and
 * replaces whatever was active for the same cycle — the old one is
 * archived (here and in Stripe), and anyone already subscribed to it
 * keeps it. The dialog says so before it happens, with the price being
 * replaced.
 *
 * Amounts are entered in US dollars; the API takes any currency, the
 * form doesn't offer one yet.
 */
export function AddPriceModal({
  product,
  fromCycle,
  onClose,
}: {
  /** The product to price, or null when closed. */
  product: CatalogEntry | null;
  /** The cycle of the row whose "+ Price" was clicked, if it had one. */
  fromCycle?: BillingInterval;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [chosenCycle, setCycle] = useState<BillingInterval | null>(null);
  // Opens on the first cycle the product has no price for — the likely
  // reason for adding one — and otherwise on the clicked row's own cycle,
  // which is then a re-price.
  const cycle =
    chosenCycle ??
    CYCLES.find((c) => !product?.prices.some((p) => p.isActive && p.billingInterval === c.value))
      ?.value ??
    fromCycle ??
    "month";
  const [amount, setAmount] = useState("");
  const [trialDays, setTrialDays] = useState("");

  const cents = parseMoneyToCents(amount);
  const trial = parseWholeNumber(trialDays, { min: 0 });
  const replacing = product?.prices.find((p) => p.isActive && p.billingInterval === cycle) ?? null;

  const create = useMutation({
    mutationFn: () => {
      if (!product || cents === null || trial === null) {
        throw new Error("Check the highlighted fields.");
      }
      return billingApi.createPrice(product.id, {
        billingInterval: cycle,
        unitAmount: cents,
        trialDaysOverride: trial,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_CATALOG_KEY });
      handleClose();
    },
  });

  function handleClose() {
    setCycle(null);
    setAmount("");
    setTrialDays("");
    create.reset();
    onClose();
  }

  const amountProblem = amount.trim() && cents === null ? "An amount like 49 or 49.50." : null;
  const trialProblem = trial === null ? "A whole number of days, or blank." : null;
  const canSubmit = cents !== null && trial !== null && !create.isPending;
  const productTrial = product?.trialDays ?? 0;

  return (
    <Modal
      open={product !== null}
      onClose={handleClose}
      title="Add price"
      description={
        <>
          A billing cycle for <span className="font-semibold text-bo-ink">{product?.name}</span>
          {product && <span className="font-mono text-xs text-bo-faint"> · {product.key}</span>}
        </>
      }
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} disabled={!canSubmit}>
            {create.isPending ? "Creating…" : replacing ? "Replace price" : "Create price"}
          </Button>
        </>
      }
    >
      <Field label="Billing cycle">
        <Select block value={cycle} onChange={(e) => setCycle(e.target.value as BillingInterval)}>
          {CYCLES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Price (USD)" hint={amountProblem ?? `Charged every ${cycleNoun(cycle)}.`}>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-invalid={amountProblem ? true : undefined}
          // The first thing to fill in once the cycle is right.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          className={`${formInputClass} tabular-nums`}
        />
      </Field>

      <Field
        label="Trial period (days)"
        hint={
          trialProblem ??
          `Blank uses the product's default — ${productTrial ? `${productTrial} days` : "no trial"}.`
        }
      >
        <input
          type="text"
          inputMode="numeric"
          placeholder={productTrial ? String(productTrial) : "No trial"}
          value={trialDays}
          onChange={(e) => setTrialDays(e.target.value)}
          aria-invalid={trialProblem ? true : undefined}
          className={formInputClass}
        />
      </Field>

      {replacing ? (
        <p className="m-0 rounded-xl bg-bo-warning-bg px-3.5 py-3 font-sans text-xs leading-relaxed text-bo-warning">
          This replaces the current {CYCLE_LABEL[cycle]} price,{" "}
          <span className="font-semibold">
            {formatMoney(replacing.unitAmount, replacing.currency)}
          </span>
          . Existing subscribers keep it; new signups get this one.
        </p>
      ) : (
        <p className="m-0 rounded-xl bg-bo-hover px-3.5 py-3 font-sans text-xs leading-relaxed text-bo-muted">
          Prices can't be edited in Stripe once created — to change the amount or trial later, add a
          new price for the same cycle and it replaces this one.
        </p>
      )}

      {create.isError && (
        <InlineError>{errorMessage(create.error, "Failed to create the price.")}</InlineError>
      )}
    </Modal>
  );
}

function cycleNoun(cycle: BillingInterval): string {
  switch (cycle) {
    case "month":
      return "month";
    case "quarter":
      return "3 months";
    case "half_year":
      return "6 months";
    case "year":
      return "year";
  }
}
