import type { LoginResponseUsuario, SessionState } from '../../types/auth.types';

type SessionListener = () => void;

let currentSession: SessionState | null = null;
const listeners = new Set<SessionListener>();

export function getAuthSession(): SessionState | null {
  return currentSession;
}

export function setAuthSession(session: SessionState | null): void {
  currentSession = session;
  for (const listener of listeners) {
    listener();
  }
}

export function updateAuthSession(token: string, user: LoginResponseUsuario): void {
  setAuthSession({ token, user });
}

export function clearAuthSession(): void {
  setAuthSession(null);
}

export function subscribeAuthSession(listener: SessionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
