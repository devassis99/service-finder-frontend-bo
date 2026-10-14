import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { authApi } from "@/auth/auth-api";
import { useAuthStore } from "@/auth/auth-store";
import { ApiError } from "@/lib/http";
import { OtpInput } from "@/components/ui/OtpInput";
import {
  AuthError,
  AuthLayout,
  authButtonClass,
  authFooterLinkClass,
} from "@/components/layout/AuthLayout";
import type { MfaSetupDetails } from "@/auth/types";

interface LocationState {
  setupToken?: string;
}

/**
 * First sign-in (and after an MFA reset from AccountPage):
 * service-finder-backend requires MFA enrollment before a session is ever
 * issued. Not a screen in the mockup, so it's the challenge screen's
 * layout with one addition — the QR code, on white, above the same code
 * boxes and button.
 */
export function MfaSetupPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const setupToken = (location.state as LocationState | null)?.setupToken;

  const [details, setDetails] = useState<MfaSetupDetails | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!setupToken) return;
    authApi
      .beginMfaSetup(setupToken)
      .then(setDetails)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not start MFA setup."),
      );
  }, [setupToken]);

  if (!setupToken) {
    return <Navigate to="/login" replace />;
  }

  async function submit(fullCode: string) {
    if (!setupToken || pending || fullCode.length !== 6) return;
    setPending(true);
    setError(null);

    try {
      const tokens = await authApi.completeMfaSetup(setupToken, fullCode);
      const { user, role, permissions } = await authApi.me(tokens.accessToken);
      useAuthStore.getState().setSession({ ...tokens, user, role, permissions });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid code. Please try again.");
      setCode("");
      setPending(false);
    }
  }

  return (
    <AuthLayout
      width="md"
      eyebrow="Step 2 of 2"
      title="Set up two-factor"
      subtitle="Scan this with an authenticator app (Google Authenticator, Authy, 1Password), then enter the 6-digit code it shows."
      footer={
        <button
          type="button"
          onClick={() => navigate("/login", { replace: true })}
          className={authFooterLinkClass}
        >
          Use a different account
        </button>
      }
    >
      <div className="flex h-[196px] items-center justify-center rounded-[14px] border border-bo-card-border bg-bo-paper">
        {details ? (
          <img
            src={details.qrCodeDataUrl}
            alt="QR code to scan with your authenticator app"
            className="h-44 w-44"
          />
        ) : (
          <span className="font-mono text-[11px] tracking-[0.07em] text-bo-faint uppercase">
            {error ? "Unavailable" : "Generating code…"}
          </span>
        )}
      </div>

      <OtpInput
        value={code}
        onChange={(next) => {
          setCode(next);
          if (error && details) setError(null);
        }}
        onComplete={submit}
        disabled={pending || !details}
        invalid={error !== null && details !== null}
      />
      {error && <AuthError>{error}</AuthError>}
      <button
        type="button"
        onClick={() => submit(code)}
        disabled={pending || code.length !== 6 || !details}
        className={authButtonClass(
          pending ? "busy" : code.length === 6 && details ? "ready" : "idle",
        )}
      >
        {pending ? "Verifying…" : "Confirm & finish setup"}
      </button>
    </AuthLayout>
  );
}

export default MfaSetupPage;
