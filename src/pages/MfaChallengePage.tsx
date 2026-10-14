import { useState } from "react";
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

interface LocationState {
  challengeToken?: string;
}

/**
 * The mockup's MFA challenge screen: every sign-in after the first. The
 * code comes from the authenticator app enrolled on MfaSetupPage (TOTP) —
 * nothing is sent, so there's no "resend code". The API's own message is
 * shown on failure, because it's the one that knows the difference
 * between a wrong code and "too many wrong codes, try again in 15
 * minutes".
 */
export function MfaChallengePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const challengeToken = (location.state as LocationState | null)?.challengeToken;

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!challengeToken) {
    return <Navigate to="/login" replace />;
  }

  async function submit(fullCode: string) {
    if (!challengeToken || pending || fullCode.length !== 6) return;
    setPending(true);
    setError(null);

    try {
      const tokens = await authApi.verifyMfaChallenge(challengeToken, fullCode);
      const { user, role, permissions } = await authApi.me(tokens.accessToken);
      useAuthStore.getState().setSession({ ...tokens, user, role, permissions });
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "That code didn't match. Wait for a fresh code in your app and try again.",
      );
      setCode("");
      setPending(false);
    }
  }

  return (
    <AuthLayout
      width="md"
      eyebrow="Step 2 of 2"
      title="Enter verification code"
      subtitle="Open your authenticator app and enter the current code."
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
      <OtpInput
        value={code}
        onChange={(next) => {
          setCode(next);
          if (error) setError(null);
        }}
        onComplete={submit}
        disabled={pending}
        invalid={error !== null}
      />
      {error && <AuthError>{error}</AuthError>}
      <button
        type="button"
        onClick={() => submit(code)}
        disabled={pending || code.length !== 6}
        className={authButtonClass(pending ? "busy" : code.length === 6 ? "ready" : "idle")}
      >
        {pending ? "Verifying…" : "Verify & sign in"}
      </button>
    </AuthLayout>
  );
}

export default MfaChallengePage;
