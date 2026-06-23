import { useEffect, useState } from 'react';

import {
  clearAuthSession,
  getAuthSession,
  subscribeAuthSession,
  updateAuthSession,
} from '../services/api/authSession';
import {
  ensureCsrfToken,
  getErrorMessage,
  isUnauthorizedError,
} from '../services/api/apiClient';
import {
  login as loginRequest,
  logout as logoutRequest,
  logoutTolerant as logoutTolerantRequest,
  refresh as refreshRequest,
} from '../services/api/auth.api';
import type {
  LoginRequest,
  LoginResponseUsuario,
  SessionState,
} from '../types/auth.types';

export function useAuth() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [session, setSession] = useState<SessionState | null>(getAuthSession());

  useEffect(
    () =>
      subscribeAuthSession(() => {
        setSession(getAuthSession());
      }),
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSession(): Promise<void> {
      try {
        await ensureCsrfToken();
        const response = await refreshRequest();
        if (!cancelled) {
          updateAuthSession(response.accessToken, response.usuario);
          setAuthMessage(null);
        }
      } catch {
        if (!cancelled) {
          clearAuthSession();
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    }

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSessionExpired = (message: string): void => {
    clearAuthSession();
    setAuthMessage(message);
    setAuthLoading(false);
    setBootstrapping(false);
  };

  const activateSession = async (
    user: LoginResponseUsuario,
    token: string,
  ): Promise<void> => {
    updateAuthSession(token, user);
    setAuthMessage(null);
    setBootstrapping(false);
  };

  const login = async (credentials: LoginRequest): Promise<void> => {
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
      setBootstrapping(false);
    }
  };

  const logout = async (): Promise<void> => {
    setAuthLoading(true);

    try {
      const token = session?.token;

      if (token) {
        await logoutRequest(token);
      } else {
        await logoutTolerantRequest();
      }
    } catch {
      await logoutTolerantRequest();
    } finally {
      clearAuthSession();
      setAuthMessage(null);
      setAuthLoading(false);
      setBootstrapping(false);
    }
  };

  const runProtectedRequest = async <T,>(
    action: (token: string) => Promise<T>,
  ): Promise<T> => {
    const token = session?.token;

    if (!token) {
      throw new Error('No hay una sesion activa.');
    }

    try {
      return await action(token);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        handleSessionExpired('La sesion expiro. Vuelve a iniciar sesion.');
        throw new Error('La sesion expiro. Vuelve a iniciar sesion.', {
          cause: error,
        });
      }

      throw error;
    }
  };

  return {
    authLoading,
    authMessage,
    bootstrapping,
    login,
    logout,
    runProtectedRequest,
    session,
  };
}
