import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuthStore } from "@modules/auth/store/useAuthStore";

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role_code)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
