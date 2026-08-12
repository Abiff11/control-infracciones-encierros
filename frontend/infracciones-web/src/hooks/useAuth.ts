import { useCallback, useEffect, useState } from "react";

import {
  clearAuthSession,
  getAuthSession,
  subscribeAuthSession,
  updateAuthSession,
} from "../services/api/authSession";
import {
  ensureCsrfToken,
  getErrorMessage,
  isUnauthorizedError,
  restoreAuthSession,
} from "../services/api/apiClient";
import {
  login as loginRequest,
  logout as logoutRequest,
  logoutTolerant as logoutTolerantRequest,
} from "../services/api/auth.api";
import type {
  AuthStatus,
  LoginRequest,
  LoginResponseUsuario,
  SessionState,
} from "../types/auth.types";

export function useAuth() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>(() =>
    getAuthSession() ? "authenticated" : "checking",
  );
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [session, setSession] = useState<SessionState | null>(getAuthSession());

  useEffect(
    () =>
      subscribeAuthSession(() => {
        const nextSession = getAuthSession();
        setSession(nextSession);
        setAuthStatus(nextSession ? "authenticated" : "unauthenticated");
      }),
    [],
  );

  useEffect(() => {
    if (getAuthSession()) {
      return;
    }

    let cancelled = false;

    async function bootstrapSession(): Promise<void> {
      try {
        const restoredSession = await restoreAuthSession();

        if (!cancelled) {
          setSession(restoredSession);
          setAuthStatus(restoredSession ? "authenticated" : "unauthenticated");
          setAuthMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          clearAuthSession();
          setSession(null);
          setAuthStatus("unauthenticated");
          setAuthMessage(
            `No se pudo restaurar la sesion: ${getErrorMessage(error)}`,
          );
        }
      }
    }

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSessionExpired = useCallback((message: string): void => {
    clearAuthSession();
    setAuthMessage(message);
    setAuthLoading(false);
    setSession(null);
    setAuthStatus("unauthenticated");
  }, []);

  const activateSession = useCallback(
    async (user: LoginResponseUsuario, token: string): Promise<void> => {
      updateAuthSession(token, user);
      setSession({ token, user });
      setAuthStatus("authenticated");
      setAuthMessage(null);
    },
    [],
  );

  const login = useCallback(
    async (credentials: LoginRequest): Promise<void> => {
      setAuthLoading(true);
      setAuthMessage(null);

      try {
        await ensureCsrfToken();
        const response = await loginRequest(credentials);
        await activateSession(response.usuario, response.accessToken);
      } catch (error) {
        setAuthMessage(`No se pudo iniciar sesion: ${getErrorMessage(error)}`);
      } finally {
        setAuthLoading(false);
      }
    },
    [activateSession],
  );

  const logout = useCallback(async (): Promise<void> => {
    setAuthLoading(true);
    const token = session?.token;

    try {
      if (token) {
        await logoutRequest(token);
      } else {
        await logoutTolerantRequest();
      }
    } catch {
      await logoutTolerantRequest();
    } finally {
      clearAuthSession();
      setSession(null);
      setAuthStatus("unauthenticated");
      setAuthMessage(null);
      setAuthLoading(false);
    }
  }, [session]);

  const runProtectedRequest = useCallback(
    async <T>(action: (token: string) => Promise<T>): Promise<T> => {
      const token = session?.token;

      if (!token) {
        throw new Error("No hay una sesion activa.");
      }

      try {
        return await action(token);
      } catch (error) {
        if (isUnauthorizedError(error)) {
          handleSessionExpired("La sesion expiro. Vuelve a iniciar sesion.");
          throw new Error("La sesion expiro. Vuelve a iniciar sesion.", {
            cause: error,
          });
        }

        throw error;
      }
    },
    [handleSessionExpired, session?.token],
  );

  return {
    authLoading,
    authMessage,
    authStatus,
    bootstrapping: authStatus === "checking",
    login,
    logout,
    runProtectedRequest,
    session,
  };
}
