import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { authApi } from "@/auth/auth-api";
import { useAuthStore } from "@/auth/auth-store";
import { Wordmark } from "@/components/ui/Wordmark";
import { EmptyState } from "@/components/ui/Page";

/**
 * Every tab in the sidebar. A new area adds one entry here, a route in
 * routes/router.tsx, and its permission keys in service-finder-backend's
 * modules/roles/bo-permissions.seed.ts — the same key gates the tab here
 * and the API behind it there.
 *
 * `group: "secondary"` puts an item below the divider, where the mockup
 * keeps Platform Settings; the divider only appears once something
 * visible is there.
 */
const NAV_ITEMS: Array<{
  to: string;
  label: string;
  /** bo_permissions key gating this tab — hides it from the sidebar and blocks direct navigation into it (see accessAllowed below). */
  permission: string;
  group?: "primary" | "secondary";
}> = [
  { to: "/", label: "Overview", permission: "overview.view" },
  { to: "/users", label: "User Management", permission: "users.view" },
];

/** Matches a pathname against a nav item's `to`, the same way NavLink's own `end` matching works, for the direct-navigation permission gate below. */
function matchesNavItem(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-[10px] px-3 py-[11px] font-sans text-sm leading-[1.2] no-underline hover:no-underline ${
    isActive
      ? "bg-bo-accent-bg font-semibold text-bo-accent-deep hover:text-bo-accent-deep"
      : "font-medium text-bo-body hover:bg-bo-nav-hover hover:text-bo-ink"
  }`;

/**
 * Layout for every authenticated route — the mockup's app frame: a
 * 248px warm sidebar (wordmark, text-only nav with a soft teal active
 * item, the signed-in account at the foot) beside the page.
 *
 * Also the single place permission gating for page-level routes lives:
 * the sidebar only lists tabs the current role has permission for, and
 * typing a gated URL directly renders an access-denied message instead
 * of the page (the backend independently enforces the same permission on
 * every API call that page would make, so this is a UX nicety, not the
 * security boundary).
 */
export function AppShell() {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const navigate = useNavigate();
  const location = useLocation();

  const visible = NAV_ITEMS.filter((item) => permissions.includes(item.permission));
  const primary = visible.filter((item) => item.group !== "secondary");
  const secondary = visible.filter((item) => item.group === "secondary");

  const currentNavItem = NAV_ITEMS.find((item) => matchesNavItem(location.pathname, item.to));
  const accessAllowed = !currentNavItem || hasPermission(currentNavItem.permission);

  async function handleLogout() {
    const { refreshToken } = useAuthStore.getState();
    useAuthStore.getState().clearSession();
    if (refreshToken) {
      // Best-effort: the session is already cleared locally regardless of
      // whether this network call succeeds.
      authApi.logout(refreshToken).catch(() => {});
    }
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-bo-page">
      <aside className="sticky top-0 box-border flex h-screen w-[248px] flex-none flex-col border-r border-bo-border bg-bo-surface px-3.5 pt-[26px] pb-[18px]">
        <div className="px-3">
          <Wordmark size="md" />
        </div>

        <nav aria-label="Main" className="mt-[30px] flex flex-col gap-0.5">
          {primary.map((item) => (
            // Exact matching only for "/", which would otherwise match every
            // route. Everything else stays highlighted on its own sub-routes —
            // the same rule matchesNavItem above uses for the permission gate.
            <NavLink key={item.to} to={item.to} end={item.to === "/"} className={navItemClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {secondary.length > 0 && (
          <>
            <div className="mx-3 my-3.5 h-px bg-bo-divider" />
            <nav aria-label="Settings" className="flex flex-col gap-0.5">
              {secondary.map((item) => (
                <NavLink key={item.to} to={item.to} className={navItemClass}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </>
        )}

        <div className="mt-auto flex items-center gap-[11px] border-t border-bo-divider px-3 pt-4">
          <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-bo-ink font-sans text-[13px] leading-none font-semibold text-white">
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </span>
          <div className="flex min-w-0 flex-col items-start gap-[5px]">
            <NavLink
              to="/account"
              title="Account & two-factor settings"
              className="max-w-full truncate font-sans text-[13px] leading-[1.2] font-semibold text-bo-ink hover:text-bo-ink"
            >
              {user?.email}
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="cursor-pointer border-0 bg-transparent p-0 font-sans text-xs leading-none font-medium text-bo-muted hover:text-bo-ink hover:underline"
            >
              Log out
            </button>
          </div>
        </div>
      </aside>

      <main className="box-border flex min-w-0 flex-1 flex-col gap-7 px-10 pt-[38px] pb-14">
        {accessAllowed ? (
          <Outlet />
        ) : (
          <>
            <h1 className="m-0 font-sans text-[30px] leading-[1.1] font-bold tracking-[-0.03em] text-bo-ink">
              Access denied
            </h1>
            <EmptyState
              action={
                <NavLink to="/" className="font-sans text-[13px] font-semibold">
                  Back to Overview
                </NavLink>
              }
            >
              Your role doesn't include{" "}
              <code className="font-mono text-xs text-bo-ink">{currentNavItem?.permission}</code>.
              Ask an admin to grant it if you need this page.
            </EmptyState>
          </>
        )}
      </main>
    </div>
  );
}

export default AppShell;
