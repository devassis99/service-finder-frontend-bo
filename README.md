# service-finder-frontend-bo

React + TypeScript back office for Service Finder, talking to
`service-finder-backend`'s Google OAuth + mandatory TOTP MFA auth flow. Same
stack, package versions and structure as `igroom-frontend-bo` (the lockfile was
seeded from iGroom's, so every package resolves to the same version).

## Stack, and why

| Concern            | Choice                            | Why                                                                                                                                          |
| ------------------ | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Package manager    | **pnpm**                          | Same as the backend. Strict `node_modules` linking catches phantom imports that npm/yarn hoisting hides.                                     |
| Build tool         | **Vite**                          | Native-ESM dev server, Rollup production build with tree-shaking and code splitting.                                                         |
| Linting/formatting | **oxlint + oxfmt**                | Same tools as the backend, plus the `react`, `react-perf` and `jsx-a11y` plugins.                                                            |
| Language           | **TypeScript, strict**            | `strict` plus `noUncheckedIndexedAccess`; `verbatimModuleSyntax` keeps Vite's per-file transpilation safe.                                   |
| Routing            | **react-router v7** (data router) | Route-level code splitting via the `lazy` field — see `src/routes/router.tsx`.                                                               |
| Server state       | **TanStack Query**                | Caching, dedup, retry and background refetch, with admin-app defaults in `src/lib/query-client.ts` (30s staleTime, no retry on 401/403/404). |
| Client state       | **Zustand**                       | One small store for the auth session (`src/auth/auth-store.ts`).                                                                             |
| Styling            | **Tailwind CSS v4**               | Design tokens in `src/styles/index.css`'s `@theme` — retheme from one file.                                                                  |
| Auth               | **@react-oauth/google**           | Gets the Google ID token client-side, which is what the backend's `POST /auth/google` verifies.                                              |
| Tests              | **Vitest + Testing Library**      | Shares Vite's transform pipeline.                                                                                                            |

## The auth flow

1. `LoginPage` gets a Google ID token client-side and sends it to
   `POST /auth/google`. That endpoint never creates a user — only a
   pre-provisioned `bo_users` row (the seeded super admin, or someone invited from
   User Management) can sign in — and returns either `mfa_setup_required` (first
   sign-in) or `mfa_challenge_required` (every one after), each with a 10-minute
   flow token.
2. `MfaSetupPage` (first sign-in, or after an MFA reset) shows a TOTP QR code to
   scan into an authenticator app and submits the 6-digit code to enroll.
   `MfaChallengePage` just asks for the code.
3. Either path ends with a real session: a 15-minute access token + a 30-day,
   single-use, rotating refresh token.
4. `src/lib/api-client.ts` attaches the access token to every request and, on a
   401, refreshes once and retries — de-duping concurrent refreshes into a single
   call, because refresh tokens are single-use.
5. `src/auth/use-auth-bootstrap.ts` runs once on load: a refresh token persisted
   from a previous visit silently re-establishes the session (refresh →
   `/auth/me`) before `ProtectedRoute` decides whether to redirect to `/login`.

**Trade-off worth knowing about:** the backend returns the refresh token in the
JSON body rather than an httpOnly cookie, so it's persisted in localStorage
(`auth-store.ts`'s `partialize`) to spare returning users Google + TOTP on every
visit. The access token stays memory-only. If that isn't acceptable, the fix is
on the backend: issue the refresh token as an httpOnly, `SameSite` cookie.

## What's here

| Page                              | Gated by        | Does                                                                                                      |
| --------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------- |
| Overview (`DashboardPage.tsx`)    | `overview.view` | Team counts (if the role can read them), the caller's own role and permissions, and whether the API is up |
| User Management (`UsersPage.tsx`) | `users.view`    | Users tab: invite, change role, deactivate. Roles & Permissions tab: create, edit permissions, delete     |
| My Account (`AccountPage.tsx`)    | signed in       | Email, role, and two-factor reset                                                                         |

`AppShell.tsx` hides a tab whose permission the role lacks and shows "Access
denied" for a gated URL typed directly. That's a convenience — the backend checks
the same key on every API call.

### Adding an area

1. Its API wrapper in `src/lib/<area>-api.ts` (same shape as `users-api.ts`).
2. Its page in `src/pages/`, using TanStack Query for reads and mutations.
3. A lazy route in `src/routes/router.tsx` under AppShell's children.
4. An entry in `AppShell.tsx`'s `NAV_ITEMS` with the `.view` permission key the
   backend's `bo-permissions.seed.ts` defines for it.

## Setup

```bash
cp .env.example .env
# VITE_API_BASE_URL defaults to http://localhost:4000 (the backend's local port).
# VITE_GOOGLE_CLIENT_ID must be the backend's GOOGLE_CLIENT_ID exactly — same
# OAuth client — and http://localhost:5273 must be one of its Authorised
# JavaScript origins.

pnpm install
pnpm dev          # http://localhost:5273
```

The dev server runs on **5273** (not Vite's 5173) so it can run alongside
iGroom's back office; the backend's default `CORS_ORIGINS` already allows it.

Other scripts: `pnpm typecheck`, `pnpm lint` / `pnpm lint:fix`, `pnpm fmt` /
`pnpm fmt:check`, `pnpm test`, `pnpm build`, `pnpm analyze` (bundle breakdown in
`stats.html`). `pnpm install` on a git repo wires up the husky + lint-staged
pre-commit hook.

## Design

Built from the ServiceFinder design mockups — `ServiceFinder Backoffice.dc.html`
(sign-in, verification code, the app frame and its Plans table) and the Admin
screens, A01–A04, of `Platform Screen Pack.dc.html` (stat tiles, filter chips,
content cards, status pills). Every colour, radius and type size is the mockups'
own value.

- **Type:** Libre Franklin for everything you read; Roboto Mono, small and
  uppercase, for labels, table headers, status pills, eyebrows and IDs.
- **Colour:** warm paper (`#EFEBE4` page, `#FDFBF7` surfaces, white tables),
  near-black ink `#16150F`, and one deep teal `#0E7C66` for everything
  actionable. All of it is in `src/styles/index.css` as `bo-*` tokens.
- **Shapes:** pill buttons; 12px inputs, 14–16px cards and tables, 20px dialogs
  and auth cards; a soft two-layer shadow only on raised surfaces.

The building blocks live in `src/components/ui/` — `Button`, `StatusPill`,
`StatCard`, `DataTable`, `ChipTabs`, `Field`/`Select`, `Modal`, `OtpInput`,
`Wordmark`, and `Page.tsx` (`PageTitle`, `SectionHeader`, `Card`, `EmptyState`,
`InlineError`) — plus `components/layout/AuthLayout.tsx` for the signed-out
screens. A new page should only need these.

Destructive row actions follow the mockup's Plans table: the first click on
"Deactivate" or "Delete" turns it into a red "Confirm …" pill for three
seconds, and the second click does it (`src/lib/use-two-step-confirm.ts`).

Where the build differs from the mockup, on purpose:

- **The Google button** is Google's own (`@react-oauth/google`), set to outline
  and pill at the card's width. A hand-drawn button can't produce the ID token
  the backend verifies.
- **The sign-in fine print** drops "All sign-ins are logged". The backend
  records each user's last sign-in time, not a log of every sign-in.
- **Screens the mockup doesn't draw** (2FA setup, Overview, User Management, My
  Account, dialogs, loading, 404) are composed from the same pieces.

Deploying: see [deploy/README.md](deploy/README.md).
