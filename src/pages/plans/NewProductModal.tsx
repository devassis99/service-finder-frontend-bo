import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, formInputClass } from "@/components/ui/FormField";
import { InlineError } from "@/components/ui/Page";
import { billingApi } from "@/lib/billing-api";
import { ADMIN_CATALOG_KEY, errorMessage, parseWholeNumber, slugifyKey } from "./plan-format";

/**
 * "+ New Product". POST /billing/products creates the Stripe Product
 * before writing our row, so a successful submit means it's already live
 * in Stripe — with no prices yet, which is what the table's "No prices
 * yet" row then says.
 *
 * The seat limit goes into the product's `limits.seats`, the number the
 * table's SEATS column shows. (iGroom's Add Price dialog asked for a seat
 * limit it never saved; seats are a property of the plan, not of one
 * billing cycle, so it's asked for here instead.)
 */
export function NewProductModal({
  open,
  onClose,
  sortOrder,
}: {
  open: boolean;
  onClose: () => void;
  /** Where the new product goes in the table — after every existing one. */
  sortOrder: number;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [seats, setSeats] = useState("");

  const key = slugifyKey(name);
  const seatLimit = parseWholeNumber(seats, { min: 1 });

  const create = useMutation({
    mutationFn: () =>
      billingApi.createProduct({
        key,
        name: name.trim(),
        description: description.trim() || undefined,
        limits: typeof seatLimit === "number" ? { seats: seatLimit } : undefined,
        sortOrder,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_CATALOG_KEY });
      handleClose();
    },
  });

  function handleClose() {
    setName("");
    setDescription("");
    setSeats("");
    create.reset();
    onClose();
  }

  const nameProblem = name.trim() && !key ? "Use at least one letter or digit." : null;
  const seatsProblem = seatLimit === null ? "A whole number of 1 or more, or blank." : null;
  const canSubmit = key.length > 0 && !seatsProblem && !create.isPending;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New product"
      description="A product is a plan tier, like Pro. Add its billing-cycle prices once it exists."
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} disabled={!canSubmit}>
            {create.isPending ? "Creating…" : "Create product"}
          </Button>
        </>
      }
    >
      <Field
        label="Product name"
        hint={nameProblem ?? (key ? `Internal key: ${key} — fixed once created.` : undefined)}
      >
        <input
          type="text"
          placeholder="e.g. Pro"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={255}
          // The dialog exists to type a name into.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          className={formInputClass}
        />
      </Field>

      <Field label="Description" hint="Shown with the plan on the pricing page and in Stripe.">
        <textarea
          placeholder="Who this plan is for"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${formInputClass} resize-none`}
        />
      </Field>

      <Field
        label="Seat limit"
        hint={seatsProblem ?? "Blank means unlimited. Enforced by the app, not billed by Stripe."}
      >
        <input
          type="text"
          inputMode="numeric"
          placeholder="Unlimited"
          value={seats}
          onChange={(e) => setSeats(e.target.value)}
          aria-invalid={seatsProblem ? true : undefined}
          className={formInputClass}
        />
      </Field>

      <p className="m-0 rounded-xl bg-bo-hover px-3.5 py-3 font-sans text-xs leading-relaxed text-bo-muted">
        Saving creates this product in Stripe. Add its prices next — one per billing cycle (Monthly,
        Quarterly, Bi-Annual, Annual), each with its own trial period.
      </p>

      {create.isError && (
        <InlineError>{errorMessage(create.error, "Failed to create the product.")}</InlineError>
      )}
    </Modal>
  );
}
