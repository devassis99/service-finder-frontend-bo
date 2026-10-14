import { createBrowserRouter } from "react-router";
import { ProtectedRoute } from "./ProtectedRoute";

/**
 * Route-level code splitting via react-router's `lazy` field: each page's
 * JS only downloads when its route is actually visited, instead of one
 * monolithic bundle shipping every screen upfront. ProtectedRoute stays
 * eagerly imported since it's needed for almost every navigation anyway.
 *
 * A new area: one lazy route under AppShell's children below, plus its
 * entry in AppShell.tsx's NAV_ITEMS (which is what gates it).
 */
export const router = createBrowserRouter([
  {
    path: "/login",
    lazy: () => import("@/pages/LoginPage").then((m) => ({ Component: m.default })),
  },
  {
    path: "/mfa/setup",
    lazy: () => import("@/pages/MfaSetupPage").then((m) => ({ Component: m.default })),
  },
  {
    path: "/mfa/challenge",
    lazy: () => import("@/pages/MfaChallengePage").then((m) => ({ Component: m.default })),
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        lazy: () => import("@/components/layout/AppShell").then((m) => ({ Component: m.default })),
        children: [
          {
            index: true,
            lazy: () => import("@/pages/DashboardPage").then((m) => ({ Component: m.default })),
          },
          {
            path: "users",
            lazy: () => import("@/pages/UsersPage").then((m) => ({ Component: m.default })),
          },
          {
            path: "account",
            lazy: () => import("@/pages/AccountPage").then((m) => ({ Component: m.default })),
          },
        ],
      },
    ],
  },
  {
    path: "*",
    lazy: () => import("@/pages/NotFoundPage").then((m) => ({ Component: m.default })),
  },
]);
