import { useCallback, useEffect, useState } from 'react';

import { getErrorMessage, isUnauthorizedError } from '../services/api/apiClient';
import { getProfile, login as loginRequest } from '../services/api/auth.api';
import type {
  LoginRequest,
  LoginResponseUsuario,
  SessionState,
} from '../types/auth.types';
import {
  clearStoredToken,
  loadStoredToken,
  saveStoredToken,
} from '../utils/session';

export function useAuth() {
  const [storedToken] = useState(() => loadStoredToken());
  const [bootstrapping, setBootstrapping] = useState(Boolean(storedToken));
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);

  const handleSessionExpired = useCallback((message: string): void => {
    clearStoredToken();
    setSession(null);
    setAuthMessage(message);
    setAuthLoading(false);
    setBootstrapping(false);
  }, []);

  const activateSession = useCallback(
    async (user: LoginResponseUsuario, token: string): Promise<void> => {
      saveStoredToken(token);
      setSession({ token, user });
      setAuthMessage(null);
    },
    [],
  );

  const restoreSession = useCallback(
    async (token: string): Promise<void> => {
      try {
        const profile = await getProfile(token);
        await activateSession(profile, token);
      } catch (error) {
        if (isUnauthorizedError(error)) {
          handleSessionExpired(
            'La sesion anterior expiro. Inicia sesion de nuevo.',
          );
        } else {
          handleSessionExpired(
            `No se pudo restaurar la sesion: ${getErrorMessage(error)}`,
          );
        }
      } finally {
        setBootstrapping(false);
      }
    },
    [activateSession, handleSessionExpired],
  );

  const login = useCallback(
    async (credentials: LoginRequest): Promise<void> => {
      setAuthLoading(true);
      setAuthMessage(null);

      try {
        const response = await loginRequest(credentials);
        await activateSession(response.usuario, response.accessToken);
      } catch (error) {
        setAuthMessage(`No se pudo iniciar sesion: ${getErrorMessage(error)}`);
        clearStoredToken();
      } finally {
        setAuthLoading(false);
        setBootstrapping(false);
      }
    },
    [activateSession],
  );

  const logout = useCallback((): void => {
    clearStoredToken();
    setSession(null);
    setAuthMessage(null);
    setAuthLoading(false);
    setBootstrapping(false);
  }, []);

  async function runProtectedRequest<T>(
    action: (token: string) => Promise<T>,
  ): Promise<T> {
    if (!session?.token) {
      throw new Error('No hay una sesion activa.');
    }

    try {
      return await action(session.token);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        handleSessionExpired('La sesion expiro. Vuelve a iniciar sesion.');
        throw new Error('La sesion expiro. Vuelve a iniciar sesion.', {
          cause: error,
        });
      }

      throw error;
    }
  }

  useEffect(() => {
    if (!storedToken) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void restoreSession(storedToken);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [restoreSession, storedToken]);

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
