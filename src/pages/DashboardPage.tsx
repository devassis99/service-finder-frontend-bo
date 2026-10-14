import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/ui/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { Card, EmptyState, PageTitle } from "@/components/ui/Page";
import { useAuthStore } from "@/auth/auth-store";
import { env } from "@/lib/env";
import { request } from "@/lib/http";
import { rolesApi, usersApi } from "@/lib/users-api";

/**
 * The Overview tab, laid out like the Admin screens' Marketplace health
 * (A03): a row of stat tiles, then content cards.
 *
 * Everything on it is real: there are no metrics endpoints yet, so
 * instead of placeholder numbers it shows what the API can already answer
 * — the back-office team, the caller's own access, and whether the API is
 * reachable. Each team tile only appears for a role that can read it
 * (users.view / roles.view); asking anyway would just be a 403.
 *
 * ServiceFinder's own figures belong in the stat row once their modules
 * exist — one query and one StatCard each.
 */
export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const permissions = useAuthStore((s) => s.permissions);
  const canViewUsers = permissions.includes("users.view");
  const canViewRoles = permissions.includes("roles.view");

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: usersApi.list,
    enabled: canViewUsers,
  });
  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: rolesApi.list,
    enabled: canViewRoles,
  });
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: () => request<{ status: string }>("/health"),
    refetchInterval: 60_000,
  });

  const users = usersQuery.data?.users;
  const activeUsers = users?.filter((u) => u.isActive && u.claimed).length;
  const pendingInvites = users?.filter((u) => u.isActive && !u.claimed).length;
  const deactivated = users?.filter((u) => !u.isActive).length;
  const roles = rolesQuery.data?.roles;

  const apiUp = healthQuery.data?.status === "ok";
  const sortedPermissions = [...permissions];
  // oxlint-disable-next-line unicorn/no-array-sort -- sorts the fresh copy above; toSorted() is ES2023 and tsconfig targets ES2022
  sortedPermissions.sort();

  return (
    <>
      <PageTitle subtitle={`Signed in as ${user?.email ?? "—"}`}>Overview</PageTitle>

      {(canViewUsers || canViewRoles) && (
        <div className="grid grid-cols-3 gap-4">
          {canViewUsers && (
            <StatCard
              label="Active team members"
              value={activeUsers === undefined ? "—" : String(activeUsers)}
              note={deactivated ? { text: `${deactivated} deactivated`, tone: "muted" } : undefined}
            />
          )}
          {canViewUsers && (
            <StatCard
              label="Pending invites"
              value={pendingInvites === undefined ? "—" : String(pendingInvites)}
              note={
                pendingInvites
                  ? { text: "Waiting for a first Google sign-in", tone: "muted" }
                  : undefined
              }
            />
          )}
          {canViewRoles && (
            <StatCard
              label="Roles"
              value={roles === undefined ? "—" : String(roles.length)}
              note={
                roles
                  ? {
                      text: `${roles.filter((r) => r.userCount === 0).length} with nobody assigned`,
                      tone: "muted",
                    }
                  : undefined
              }
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <Card
          title="Your access"
          aside={
            <span className="font-sans text-[13px] leading-none font-semibold text-bo-ink">
              {role?.name ?? "—"}
            </span>
          }
        >
          {sortedPermissions.length === 0 ? (
            <p className="m-0 font-sans text-[13px] text-bo-muted">No permissions granted.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {sortedPermissions.map((key) => (
                <code
                  key={key}
                  className="rounded-full bg-bo-neutral-bg px-[9px] py-1.5 font-mono text-[11px] leading-none text-bo-body"
                >
                  {key}
                </code>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="API"
          aside={
            healthQuery.isLoading ? (
              <StatusPill tone="neutral">Checking</StatusPill>
            ) : (
              <StatusPill tone={apiUp ? "success" : "danger"}>
                {apiUp ? "Reachable" : "Unreachable"}
              </StatusPill>
            )
          }
        >
          <span className="truncate font-mono text-xs text-bo-muted">{env.VITE_API_BASE_URL}</span>
          <a
            href={`${env.VITE_API_BASE_URL}/docs`}
            target="_blank"
            rel="noreferrer"
            className="w-fit font-sans text-xs font-medium"
          >
            Open API docs
          </a>
        </Card>
      </div>

      <EmptyState>More of ServiceFinder will appear here as it's built.</EmptyState>
    </>
  );
}

export default DashboardPage;
