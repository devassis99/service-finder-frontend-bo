import type { ButtonHTMLAttributes } from "react";

/**
 * The mockup's buttons. Every action button is a pill; the variant says
 * how much weight it carries.
 *
 * - primary   — teal, white text: the one main action on a screen ("+ New Product").
 * - secondary — white with a hairline border: the alternatives beside it.
 * - danger    — solid red, for the second click of a destructive action.
 * - link      — bare teal text, for row actions ("+ Price", "Review").
 * - linkDanger, linkInk — the same, in red or ink ("Delete", "Copy").
 */
const VARIANTS = {
  primary:
    "h-[42px] rounded-full border-0 bg-bo-accent px-[18px] text-[13px] font-semibold text-white hover:bg-bo-accent-hover disabled:cursor-not-allowed disabled:bg-bo-disabled-bg disabled:text-bo-faint",
  secondary:
    "h-[42px] rounded-full border border-bo-input-border bg-bo-paper px-4 text-[13px] font-semibold text-bo-ink hover:border-bo-input-border-hover hover:bg-bo-hover disabled:cursor-not-allowed disabled:opacity-50",
  danger:
    "h-[42px] rounded-full border-0 bg-bo-danger px-[18px] text-[13px] font-semibold text-white hover:bg-bo-danger-hover disabled:cursor-not-allowed disabled:opacity-60",
  link: "border-0 bg-transparent py-1.5 text-[13px] font-semibold text-bo-accent hover:underline disabled:cursor-not-allowed disabled:opacity-50",
  linkDanger:
    "border-0 bg-transparent py-1.5 text-[13px] font-semibold text-bo-danger hover:underline disabled:cursor-not-allowed disabled:opacity-50",
  linkInk:
    "border-0 bg-transparent py-1.5 text-[13px] font-semibold text-bo-ink hover:underline disabled:cursor-not-allowed disabled:opacity-50",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;

export function buttonClass(variant: ButtonVariant = "primary", extra = ""): string {
  // Border and background live in each variant, never here: two
  // utilities for the same property don't resolve by class order, so a
  // shared bg-transparent here would quietly beat the primary's teal.
  return `inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 font-sans leading-none ${VARIANTS[variant]} ${extra}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  // oxlint-disable-next-line react/button-has-type -- `type` is a prop, defaulting to "button"
  return <button type={type} className={buttonClass(variant, className)} {...rest} />;
}

/**
 * The second click of a destructive row action, straight from the
 * mockup's Plans table: "Delete" turns into a small red "Confirm delete"
 * pill for a few seconds, so a slip of the mouse costs nothing and a
 * deliberate delete needs no dialog.
 */
export const confirmPillClass =
  "inline-flex cursor-pointer items-center rounded-full border-0 bg-bo-danger px-[11px] py-[7px] font-sans text-xs font-semibold leading-none text-white hover:bg-bo-danger-hover disabled:cursor-not-allowed disabled:opacity-60";

export default Button;
