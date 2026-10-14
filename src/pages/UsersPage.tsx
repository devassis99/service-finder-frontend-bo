import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StatusPill } from "@/components/ui/StatusPill";
import { Modal } from "@/components/ui/Modal";
import { Field, Select, formInputClass } from "@/components/ui/FormField";
import { Button, confirmPillClass } from "@/components/ui/Button";
import { ChipTabs } from "@/components/ui/ChipTabs";
import {
  DataTable,
  DataTableHead,
  DataTableMessage,
  DataTableRow,
} from "@/components/ui/DataTable";
import { InlineError, PageTitle, SectionHeader } from "@/components/ui/Page";
import { useAuthStore } from "@/auth/auth-store";
import { useTwoStepConfirm } from "@/lib/use-two-step-confirm";
import {
  usersApi,
  rolesApi,
  type BoUser,
  type BoRole,
  type PermissionCatalogEntry,
} from "@/lib/users-api";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Invites a back-office user — creates a pre-provisioned bo_users row via
 * POST /users, exactly like the seed does for the super admin. No email
 * is sent, so the dialog says to pass the Google account along directly.
 */
function InviteUserModal({
  open,
  onClose,
  roles,
}: {
  open: boolean;
  onClose: () => void;
  roles: BoRole[];
}) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("");

  const invite = useMutation({
    mutationFn: () =>
      usersApi.invite({
        email: email.trim(),
        name: name.trim(),
        roleId: roleId || roles[0]?.id || "",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      handleClose();
    },
  });

  function handleClose() {
    setEmail("");
    setName("");
    setRoleId("");
    invite.reset();
    onClose();
  }

  const selectedRoleId = roleId || roles[0]?.id || "";
  const canSubmit =
    email.trim().length > 0 &&
    name.trim().length > 0 &&
    selectedRoleId.length > 0 &&
    !invite.isPending;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Invite user"
      description="They sign in with this exact Google account and are walked through two-factor setup on their first sign-in."
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={() => invite.mutate()} disabled={!canSubmit}>
            {invite.isPending ? "Inviting…" : "Send invite"}
          </Button>
        </>
      }
    >
      <Field label="Name">
        <input
          type="text"
          placeholder="e.g. Jordan Lee"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={formInputClass}
        />
      </Field>

      <Field label="Email (Google account)">
        <input
          type="email"
          placeholder="jordan.lee@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={formInputClass}
        />
      </Field>

      <Field label="Role">
        <Select block value={selectedRoleId} onChange={(e) => setRoleId(e.target.value)}>
          {roles.length === 0 && <option value="">No roles yet — create one first</option>}
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </Select>
      </Field>

      <p className="m-0 rounded-xl bg-bo-hover px-3.5 py-3 font-sans text-xs leading-relaxed text-bo-muted">
        No email is sent automatically — tell them to sign in at the back office with this Google
        account.
      </p>

      {invite.isError && (
        <InlineError>{errorMessage(invite.error, "Failed to invite user.")}</InlineError>
      )}
    </Modal>
  );
}

const USER_COLUMNS = "1.3fr 1.7fr 1.2fr 1.3fr 0.9fr 1.3fr";

function UsersTab({
  users,
  roles,
  isLoading,
  isError,
  error,
  canManage,
}: {
  users: BoUser[];
  roles: BoRole[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [inviteOpen, setInviteOpen] = useState(false);
  const confirm = useTwoStepConfirm();

  const updateRole = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      usersApi.updateRole(userId, roleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const setActive = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      usersApi.setActive(userId, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const actionError = updateRole.error ?? setActive.error;

  return (
    <section className="flex flex-col gap-[18px]">
      <SectionHeader
        title="Back-office users"
        description="Invite teammates and control what they can see and do here."
        actions={
          canManage && (
            <Button onClick={() => setInviteOpen(true)} disabled={roles.length === 0}>
              + Invite User
            </Button>
          )
        }
      />

      {actionError && (
        <InlineError>{errorMessage(actionError, "That change couldn't be saved.")}</InlineError>
      )}

      <DataTable minWidth={900}>
        <DataTableHead
          columns={USER_COLUMNS}
          labels={["Name", "Email", "Role", "Status", "Last login", ""]}
        />
        {isLoading ? (
          <DataTableMessage>Loading users…</DataTableMessage>
        ) : isError ? (
          <DataTableMessage tone="danger">
            Couldn't load users: {errorMessage(error, "unknown error")}
          </DataTableMessage>
        ) : users.length === 0 ? (
          <DataTableMessage>No back-office users yet.</DataTableMessage>
        ) : (
          users.map((user) => {
            const isSelf = user.id === currentUserId;
            return (
              <DataTableRow key={user.id} columns={USER_COLUMNS}>
                <span className="flex items-baseline gap-1.5 font-semibold">
                  {user.name}
                  {isSelf && (
                    <span className="font-mono text-[10px] font-normal tracking-[0.05em] text-bo-faint uppercase">
                      You
                    </span>
                  )}
                </span>
                <span className="truncate text-bo-body">{user.email}</span>
                {canManage ? (
                  <Select
                    size="sm"
                    aria-label={`Role for ${user.name}`}
                    value={user.roleId}
                    disabled={isSelf || updateRole.isPending}
                    onChange={(e) => updateRole.mutate({ userId: user.id, roleId: e.target.value })}
                    title={isSelf ? "You can't change your own role" : undefined}
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <span className="text-bo-body">{user.roleName}</span>
                )}
                <span className="flex flex-wrap gap-1.5">
                  <StatusPill tone={user.isActive ? "success" : "danger"}>
                    {user.isActive ? "Active" : "Deactivated"}
                  </StatusPill>
                  {!user.claimed && <StatusPill tone="pending">Invited</StatusPill>}
                </span>
                <span className="text-bo-body tabular-nums">{formatDate(user.lastLoginAt)}</span>
                <span className="flex items-center justify-end gap-[18px]">
                  {canManage && !isSelf && user.isActive && (
                    <button
                      type="button"
                      disabled={setActive.isPending}
                      onClick={() =>
                        confirm.ask(user.id) &&
                        setActive.mutate({ userId: user.id, isActive: false })
                      }
                      className={
                        confirm.isArmed(user.id)
                          ? confirmPillClass
                          : "cursor-pointer border-0 bg-transparent py-1.5 font-sans text-[13px] font-semibold text-bo-danger hover:underline"
                      }
                    >
                      {confirm.isArmed(user.id) ? "Confirm deactivate" : "Deactivate"}
                    </button>
                  )}
                  {canManage && !isSelf && !user.isActive && (
                    <Button
                      variant="link"
                      disabled={setActive.isPending}
                      onClick={() => setActive.mutate({ userId: user.id, isActive: true })}
                    >
                      Reactivate
                    </Button>
                  )}
                </span>
              </DataTableRow>
            );
          })
        )}
      </DataTable>

      <InviteUserModal open={inviteOpen} onClose={() => setInviteOpen(false)} roles={roles} />
    </section>
  );
}

/**
 * Create-or-edit role form. The same dialog drives both "+ New Role" and
 * "Edit" — editing skips the name/description fields (the backend has no
 * rename endpoint) and only replaces the permission set.
 */
function RoleFormModal({
  mode,
  boRole,
  open,
  onClose,
  permissionCatalog,
}: {
  mode: "create" | "edit";
  /** Required when mode === "edit". */
  boRole: BoRole | null;
  open: boolean;
  onClose: () => void;
  permissionCatalog: PermissionCatalogEntry[];
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  // Reset local form state whenever the dialog is (re)opened for a
  // (possibly different) role — cheaper than syncing via useEffect since
  // this only needs to run at open time.
  const [lastOpenedFor, setLastOpenedFor] = useState<string | null>(null);
  const openKey = open ? (mode === "edit" ? (boRole?.id ?? "new") : "new") : null;
  if (open && openKey !== lastOpenedFor) {
    setLastOpenedFor(openKey);
    setName(mode === "edit" ? (boRole?.name ?? "") : "");
    setDescription(mode === "edit" ? (boRole?.description ?? "") : "");
    setSelectedKeys(mode === "edit" ? (boRole?.permissions ?? []) : []);
  }
  if (!open && lastOpenedFor !== null) setLastOpenedFor(null);

  const save = useMutation({
    mutationFn: () => {
      if (mode === "create") {
        return rolesApi.create({
          name: name.trim(),
          description: description.trim() || undefined,
          permissionKeys: selectedKeys,
        });
      }
      if (!boRole) throw new Error("No role selected.");
      return rolesApi.updatePermissions(boRole.id, selectedKeys);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      handleClose();
    },
  });

  function handleClose() {
    save.reset();
    onClose();
  }

  function toggleKey(key: string) {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  const canSubmit = (mode === "edit" || name.trim().length > 0) && !save.isPending;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={mode === "create" ? "New role" : `Edit ${boRole?.name ?? "role"}`}
      description={
        mode === "edit"
          ? "Changes apply on each member's next request — no need to sign out."
          : undefined
      }
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={!canSubmit}>
            {save.isPending ? "Saving…" : mode === "create" ? "Create role" : "Save permissions"}
          </Button>
        </>
      }
    >
      {mode === "create" && (
        <>
          <Field label="Role name">
            <input
              type="text"
              placeholder="e.g. Support Agent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={formInputClass}
            />
          </Field>
          <Field label="Description">
            <textarea
              placeholder="What this role is for"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${formInputClass} resize-none`}
            />
          </Field>
        </>
      )}

      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10.5px] leading-none font-medium tracking-[0.07em] text-bo-faint uppercase">
          Tabs & functionality · {selectedKeys.length} of {permissionCatalog.length}
        </span>
        <div className="flex max-h-72 flex-col overflow-y-auto rounded-[14px] border border-bo-card-border bg-bo-paper">
          {permissionCatalog.map((permission) => (
            <label
              key={permission.key}
              className="flex cursor-pointer items-start gap-3 border-t border-bo-row-divider px-4 py-3 first:border-t-0 hover:bg-bo-surface"
            >
              <input
                type="checkbox"
                checked={selectedKeys.includes(permission.key)}
                onChange={() => toggleKey(permission.key)}
                className="mt-0.5 h-4 w-4 accent-bo-accent"
              />
              <span className="flex flex-col gap-1">
                <span className="font-sans text-[13px] leading-tight font-semibold text-bo-ink">
                  {permission.name}
                </span>
                {permission.description && (
                  <span className="font-sans text-xs leading-snug text-bo-muted">
                    {permission.description}
                  </span>
                )}
                <code className="font-mono text-[10.5px] text-bo-faint">{permission.key}</code>
              </span>
            </label>
          ))}
        </div>
      </div>

      {save.isError && (
        <InlineError>{errorMessage(save.error, "Failed to save role.")}</InlineError>
      )}
    </Modal>
  );
}

const ROLE_COLUMNS = "1fr 1.8fr 0.8fr 0.6fr 1.2fr";

function RolesTab({
  roles,
  permissionCatalog,
  isLoading,
  isError,
  error,
  canManage,
}: {
  roles: BoRole[];
  permissionCatalog: PermissionCatalogEntry[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const [newRoleOpen, setNewRoleOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BoRole | null>(null);
  const confirm = useTwoStepConfirm();

  const remove = useMutation({
    mutationFn: (roleId: string) => rolesApi.remove(roleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });

  return (
    <section className="flex flex-col gap-[18px]">
      <SectionHeader
        title="Roles"
        description="Each role decides which tabs and API actions its members get — checked by the API on every request."
        actions={canManage && <Button onClick={() => setNewRoleOpen(true)}>+ New Role</Button>}
      />

      {remove.isError && (
        <InlineError>{errorMessage(remove.error, "That role couldn't be deleted.")}</InlineError>
      )}

      <DataTable minWidth={820}>
        <DataTableHead
          columns={ROLE_COLUMNS}
          labels={["Role", "Description", "Permissions", "Users", ""]}
        />
        {isLoading ? (
          <DataTableMessage>Loading roles…</DataTableMessage>
        ) : isError ? (
          <DataTableMessage tone="danger">
            Couldn't load roles: {errorMessage(error, "unknown error")}
          </DataTableMessage>
        ) : roles.length === 0 ? (
          <DataTableMessage>No roles yet.</DataTableMessage>
        ) : (
          roles.map((role) => (
            <DataTableRow key={role.id} columns={ROLE_COLUMNS}>
              <span className="font-semibold">{role.name}</span>
              <span className="truncate text-bo-body">{role.description || "—"}</span>
              <span className="text-bo-body tabular-nums">
                {role.permissions.length}
                <span className="text-bo-faint"> / {permissionCatalog.length || "—"}</span>
              </span>
              <span className="text-bo-body tabular-nums">{role.userCount}</span>
              <span className="flex items-center justify-end gap-[18px]">
                {role.name === "superadmin" && <StatusPill tone="neutral">Protected</StatusPill>}
                {canManage && (
                  <Button variant="link" onClick={() => setEditTarget(role)}>
                    Edit
                  </Button>
                )}
                {canManage && role.name !== "superadmin" && (
                  <button
                    type="button"
                    disabled={remove.isPending}
                    onClick={() => confirm.ask(role.id) && remove.mutate(role.id)}
                    className={
                      confirm.isArmed(role.id)
                        ? confirmPillClass
                        : "cursor-pointer border-0 bg-transparent py-1.5 font-sans text-[13px] font-semibold text-bo-danger hover:underline"
                    }
                  >
                    {confirm.isArmed(role.id) ? "Confirm delete" : "Delete"}
                  </button>
                )}
              </span>
            </DataTableRow>
          ))
        )}
      </DataTable>

      <RoleFormModal
        mode="create"
        boRole={null}
        open={newRoleOpen}
        onClose={() => setNewRoleOpen(false)}
        permissionCatalog={permissionCatalog}
      />
      <RoleFormModal
        mode="edit"
        boRole={editTarget}
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        permissionCatalog={permissionCatalog}
      />
    </section>
  );
}

const TABS = [
  { value: "users", label: "Users" },
  { value: "roles", label: "Roles & Permissions" },
] as const;

/**
 * User Management: back-office users, and the roles that decide what
 * each of them can reach. Two views onto the same RBAC model, switched
 * with the Admin screens' filter chips rather than split across two nav
 * entries.
 *
 * Every mutation here is independently permission-gated server-side
 * (users.manage / roles.manage) — hiding a button is a UX nicety, not
 * the enforcement.
 */
export function UsersPage() {
  const [tab, setTab] = useState<"users" | "roles">("users");
  const canManageUsers = useAuthStore((s) => s.hasPermission("users.manage"));
  const canManageRoles = useAuthStore((s) => s.hasPermission("roles.manage"));

  const usersQuery = useQuery({ queryKey: ["users"], queryFn: usersApi.list });
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: rolesApi.list });
  const permissionsQuery = useQuery({
    queryKey: ["roles", "permissions"],
    queryFn: rolesApi.listPermissions,
  });

  const users = usersQuery.data?.users ?? [];
  const roles = useMemo(() => rolesQuery.data?.roles ?? [], [rolesQuery.data]);
  const permissionCatalog = permissionsQuery.data?.permissions ?? [];

  return (
    <>
      <PageTitle>User Management</PageTitle>

      <ChipTabs label="User Management views" tabs={TABS} value={tab} onChange={setTab} />

      {tab === "users" ? (
        <UsersTab
          users={users}
          roles={roles}
          isLoading={usersQuery.isLoading}
          isError={usersQuery.isError}
          error={usersQuery.error}
          canManage={canManageUsers}
        />
      ) : (
        <RolesTab
          roles={roles}
          permissionCatalog={permissionCatalog}
          isLoading={rolesQuery.isLoading}
          isError={rolesQuery.isError}
          error={rolesQuery.error}
          canManage={canManageRoles}
        />
      )}
    </>
  );
}

export default UsersPage;
