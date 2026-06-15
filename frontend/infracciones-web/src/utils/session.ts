const SESSION_TOKEN_KEY = 'infracciones-web-token';

export function loadStoredToken(): string | null {
  return window.localStorage.getItem(SESSION_TOKEN_KEY);
}

export function saveStoredToken(token: string): void {
  window.localStorage.setItem(SESSION_TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  window.localStorage.removeItem(SESSION_TOKEN_KEY);
}
