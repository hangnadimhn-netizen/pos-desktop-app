import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";

import { appRouter } from "@app/router";
import { useAuthStore } from "@modules/auth/store/useAuthStore";
import { getCurrentSession } from "@shared/services/tauri";

function App() {
  const sessionToken = useAuthStore((state) => state.sessionToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    if (!sessionToken || !isAuthenticated) {
      return;
    }

    let cancelled = false;

    const validateSession = async () => {
      try {
        const response = await getCurrentSession(sessionToken);

        if (cancelled) {
          return;
        }

        setAuth(
          {
            userId: response.user.user_id,
            username: response.user.username,
            full_name: response.user.full_name,
            role_code: response.user.role_code,
            role_name: response.user.role_name,
          },
          response.session_token,
        );
      } catch {
        if (!cancelled) {
          clearAuth();
        }
      }
    };

    void validateSession();

    return () => {
      cancelled = true;
    };
  }, [clearAuth, isAuthenticated, sessionToken, setAuth]);

  return <RouterProvider router={appRouter} />;
}

export default App;
