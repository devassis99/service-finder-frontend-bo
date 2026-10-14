import type { ReactNode } from "react";

interface AuthLayoutProps {
  /** Above everything — the wordmark on the sign-in screen. */
  brand?: ReactNode;
  /** Small teal mono caps above the title ("STEP 2 OF 2"). */
  eyebrow?: string;
  title?: string;
  subtitle?: ReactNode;
  /** Inside the raised card. */
  children: ReactNode;
  /** Under the card: fine print, a "use a different account" link. */
  footer?: ReactNode;
  width?: "sm" | "md";
}

/**
 * The frame every signed-out screen uses in the mockup: a centred column
 * on the paper background, a heading block, one raised card (20px radius,
 * 28px padding, the soft two-layer shadow), and whatever sits beneath it.
 */
export function AuthLayout({
  brand,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  width = "sm",
}: AuthLayoutProps) {
  return (
    <main className="box-border flex min-h-screen items-center justify-center bg-bo-page px-5 py-10">
      <div
        className={`flex w-full flex-col items-center gap-7 ${width === "sm" ? "max-w-[400px]" : "max-w-[420px]"}`}
      >
        <div className="flex flex-col items-center gap-2.5 text-center">
          {brand}
          {eyebrow && (
            <span className="font-mono text-[11px] leading-none font-medium tracking-[0.14em] text-bo-accent uppercase">
              {eyebrow}
            </span>
          )}
          {title && (
            <h1 className="m-0 font-sans text-[30px] leading-[1.15] font-bold tracking-[-0.03em] text-bo-ink">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="m-0 font-sans text-[15px] leading-normal text-pretty text-bo-muted">
              {subtitle}
            </p>
          )}
        </div>
        <div className="box-border flex w-full flex-col gap-[18px] rounded-[20px] border border-bo-border bg-bo-surface p-7 shadow-card">
          {children}
        </div>
        {footer}
      </div>
    </main>
  );
}

/**
 * The primary action inside an auth card: full width, 52px, 14px radius —
 * not a pill, per the mockup. Three looks: ready (teal), busy (the deeper
 * teal while a request is in flight) and idle (greyed until the code is
 * complete). Picked here rather than with disabled: variants, so the busy
 * and idle looks can't fight over the same disabled state.
 */
export function authButtonClass(state: "ready" | "busy" | "idle"): string {
  const looks = {
    ready: "cursor-pointer bg-bo-accent text-white hover:bg-bo-accent-hover",
    busy: "cursor-wait bg-bo-accent-deep text-white",
    idle: "cursor-not-allowed bg-bo-disabled-bg text-bo-faint",
  } as const;
  return `h-[52px] w-full rounded-[14px] border-0 font-sans text-[15px] leading-none font-semibold ${looks[state]}`;
}

/** The quiet text button under an auth card ("Use a different account"). */
export const authFooterLinkClass =
  "cursor-pointer border-0 bg-transparent p-1.5 font-sans text-[13px] leading-none font-medium text-bo-muted hover:text-bo-ink hover:underline";

export function AuthError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="m-0 font-sans text-[13px] leading-[1.45] font-medium text-bo-danger">
      {children}
    </p>
  );
}

export default AuthLayout;
