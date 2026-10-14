import { useState } from "react";
import { useNavigate } from "react-router";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { authApi } from "@/auth/auth-api";
import { ApiError } from "@/lib/http";
import { AuthError, AuthLayout } from "@/components/layout/AuthLayout";
import { Wordmark } from "@/components/ui/Wordmark";

/**
 * The mockup's Login screen. One deliberate difference: the mockup draws
 * its own white "Sign in with Google" pill, but only Google's rendered
 * button (@react-oauth/google) can produce the ID token
 * service-finder-backend's POST /auth/google verifies — so it's Google's
 * button, set to the closest look its API allows (outline, pill, full
 * card width). While the backend checks the token, the button gives way
 * to the mockup's "Connecting to Google…" pill.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleCredential(credential: CredentialResponse) {
    if (!credential.credential) return;
    setPending(true);
    setError(null);

    try {
      const outcome = await authApi.loginWithGoogle(credential.credential);

      if (outcome.status === "mfa_setup_required") {
        navigate("/mfa/setup", { state: { setupToken: outcome.setupToken }, replace: true });
      } else {
        navigate("/mfa/challenge", {
          state: { challengeToken: outcome.challengeToken },
          replace: true,
        });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign-in failed. Please try again.");
      setPending(false);
    }
  }

  return (
    <AuthLayout
      brand={<Wordmark size="lg" />}
      subtitle="Internal access only"
      footer={
        <p className="m-0 max-w-[340px] text-center font-sans text-xs leading-[1.6] text-pretty text-bo-faint">
          Access restricted to authorized ServiceFinder staff Google accounts.
        </p>
      }
    >
      {pending ? (
        <div className="box-border flex h-[50px] w-full items-center justify-center rounded-full border border-bo-border bg-bo-hover font-sans text-[15px] leading-none font-medium text-bo-muted">
          Connecting to Google…
        </div>
      ) : (
        <div className="flex min-h-[50px] items-center justify-center">
          <GoogleLogin
            onSuccess={handleCredential}
            onError={() => setError("Google sign-in was cancelled or failed.")}
            theme="outline"
            shape="pill"
            size="large"
            text="signin_with"
            logo_alignment="center"
            width={344}
          />
        </div>
      )}
      {error && <AuthError>{error}</AuthError>}
    </AuthLayout>
  );
}

export default LoginPage;
