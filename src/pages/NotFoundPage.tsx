import { Link } from "react-router";
import { Wordmark } from "@/components/ui/Wordmark";

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-bo-page px-5 text-center">
      <Wordmark size="md" />
      <span className="font-mono text-[11px] leading-none font-medium tracking-[0.14em] text-bo-accent uppercase">
        404
      </span>
      <h1 className="m-0 font-sans text-[30px] leading-[1.15] font-bold tracking-[-0.03em] text-bo-ink">
        Page not found
      </h1>
      <Link to="/" className="font-sans text-[13px] font-semibold">
        Back to dashboard
      </Link>
    </main>
  );
}

export default NotFoundPage;
