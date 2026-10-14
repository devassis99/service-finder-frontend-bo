import { useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { StatusPill } from "@/components/ui/StatusPill";
import { Modal } from "@/components/ui/Modal";
import { OtpInput } from "@/components/ui/OtpInput";
import { Button } from "@/components/ui/Button";
import { Card, InlineError, PageTitle } from "@/components/ui/Page";
import { useAuthStore } from "@/auth/auth-store";
import { accountApi } from "@/lib/account-api";
import { ApiError } from "@/lib/http";

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : fallback;
}

/**
 * Two cases, one mutation:
 *  - MFA on: ask for the current 6-digit code before touching anything,
 *    like re-entering a password to change a security setting.
 *  - MFA off: a previous reset was started but never finished — there's
 *    no secret left to check a code against, so this continues straight
 *    into setup.
 * Either way, success hands off to MfaSetupPage exactly like a first
 * sign-in would.
 */
function ResetMfaModal({
  open,
  onClose,
  mfaEnabled,
}: {
  open: boolean;
  onClose: () => void;
  mfaEnabled: boolean;
}) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  const reset = useMutation({
    mutationFn: (currentCode?: string) => accountApi.resetMfa(currentCode),
    onSuccess: ({ setupToken }) => {
      handleClose();
      navigate("/mfa/setup", { state: { setupToken } });
    },
  });

  function handleClose() {
    setCode("");
    reset.reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={mfaEnabled ? "Reset two-factor" : "Finish two-factor setup"}
      description={
        mfaEnabled
          ? "Enter the current code from your authenticator app to confirm it's you. You'll then scan a new QR code — useful if you got a new phone."
          : "Your last setup wasn't finished, so there's no current code to check — continue straight into setup."
      }
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={() => reset.mutate(mfaEnabled ? code : undefined)}
            disabled={reset.isPending || (mfaEnabled && code.length !== 6)}
          >
            {reset.isPending ? "Continuing…" : "Continue"}
          </Button>
        </>
      }
    >
      {mfaEnabled && (
        <OtpInput
          value={code}
          onChange={setCode}
          disabled={reset.isPending}
          invalid={reset.isError}
        />
      )}
      {reset.isError && (
        <InlineError>{errorMessage(reset.error, "Failed to start the reset.")}</InlineError>
      )}
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-bo-row-divider py-3.5 first:border-t-0 first:pt-0 last:pb-0">
      <span className="font-mono text-[10.5px] leading-none font-medium tracking-[0.07em] text-bo-faint uppercase">
        {label}
      </span>
      <span className="font-sans text-sm font-medium text-bo-ink">{children}</span>
    </div>
  );
}

/**
 * Every signed-in user's own account — not gated by any bo_permissions
 * key, since it's about your own account rather than a module someone
 * can be blocked from. Email and role (read-only), and two-factor status
 * with its reset.
 */
export function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const [resetOpen, setResetOpen] = useState(false);
  const mfaEnabled = user?.mfaEnabled ?? false;

  return (
    <>
      <PageTitle>My Account</PageTitle>

      <div className="flex max-w-[620px] flex-col gap-4">
        <Card title="Profile">
          <div className="flex flex-col">
            <Row label="Email">{user?.email}</Row>
            <Row label="Role">{role?.name ?? "—"}</Row>
          </div>
        </Card>

        <Card
          title="Two-factor authentication"
          aside={
            <StatusPill tone={mfaEnabled ? "success" : "warning"}>
              {mfaEnabled ? "Enabled" : "Setup incomplete"}
            </StatusPill>
          }
        >
          <p className="m-0 font-sans text-[13px] leading-normal text-bo-muted">
            {mfaEnabled
              ? "Required for every back-office sign-in. Reset it if you've lost access to your authenticator app."
              : "A previous setup wasn't finished — you'll be asked to set it up on your next sign-in, or you can finish it now."}
          </p>
          <div>
            <Button variant="secondary" onClick={() => setResetOpen(true)}>
              {mfaEnabled ? "Reset two-factor" : "Finish setup"}
            </Button>
          </div>
        </Card>
      </div>

      <ResetMfaModal open={resetOpen} onClose={() => setResetOpen(false)} mfaEnabled={mfaEnabled} />
    </>
  );
}

export default AccountPage;
