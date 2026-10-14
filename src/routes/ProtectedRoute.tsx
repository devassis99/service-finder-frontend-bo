import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthStore } from "@/auth/auth-store";
import { LoadingScreen } from "@/components/layout/LoadingScreen";

/**
 * Gates every route under it on an authenticated session. Shows the
 * branded loading screen while status is "unknown" — the brief window
 * use-auth-bootstrap.ts is still resolving a persisted refresh token —
 * because redirecting to /login during it would flash the login page for
 * already-authenticated users on every hard reload.
 */
export function ProtectedRoute() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status === "unknown") return <LoadingScreen />;

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
