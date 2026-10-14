import { Wordmark } from "@/components/ui/Wordmark";

/**
 * Shown during the silent session bootstrap — see ProtectedRoute.tsx.
 * The mockup has no loading screen; this is its sign-in screen with the
 * card replaced by a small teal spinner.
 */
export function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-7 bg-bo-page">
      <Wordmark size="lg" />
      <div
        className="h-8 w-8 rounded-full border-[3px] border-bo-divider border-t-bo-accent"
        style={{ animation: "bo-spin 0.9s linear infinite" }}
        aria-hidden
      />
      <span className="font-mono text-[11px] leading-none font-medium tracking-[0.14em] text-bo-faint uppercase">
        Loading
      </span>
    </div>
  );
}

export default LoadingScreen;
