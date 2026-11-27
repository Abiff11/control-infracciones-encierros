import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAuthSession } from '../../services/api/authSession';
import { useAuth } from '../../hooks/useAuth';
import LoginPage from './LoginPage';

const EXPECTED_RATE_LIMIT_MESSAGE =
  'Se alcanzó temporalmente el límite de solicitudes. Espera un momento e intenta nuevamente.';
const TECHNICAL_RATE_LIMIT_MESSAGE = 'ThrottlerException: Too Many Requests';
const CSRF_COOKIE = 'cie_csrf_token';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

function LoginPageWithAuth() {
  const { authLoading, authMessage, authStatus, login } = useAuth();

  if (authStatus === 'checking') {
    return <div>Restaurando sesion...</div>;
  }

  return <LoginPage loading={authLoading} error={authMessage} onSubmit={login} />;
}

describe('LoginPage con useAuth', () => {
  afterEach(async () => {
    const { clearAuthSession } = await import('../../services/api/authSession');
    await act(async () => {
      clearAuthSession();
    });
    document.cookie = `${CSRF_COOKIE}=; Path=/; Max-Age=0`;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('Q4-I04 presenta el rechazo HTTP 429 y recupera el formulario de acceso', async () => {
    const loginResult = createDeferred<Response>();
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/auth/token-check')) {
        document.cookie = `${CSRF_COOKIE}=test-csrf; Path=/; SameSite=Lax`;
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }

      if (url.includes('/auth/refresh')) {
        return Promise.resolve(
          new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }),
        );
      }

      if (url.includes('/auth/login')) {
        return loginResult.promise;
      }

      throw new Error(`Solicitud no esperada: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<LoginPageWithAuth />);

    await screen.findByRole('button', { name: 'Entrar' });
    fireEvent.change(screen.getByLabelText('Correo'), {
      target: { value: 'qa429@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Contrasena'), {
      target: { value: 'fake-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('button', { name: 'Entrando...' })).toBeDisabled();
    await act(async () => {
      loginResult.resolve(
        new Response(JSON.stringify({ message: TECHNICAL_RATE_LIMIT_MESSAGE }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    const notice = await screen.findByText(
      `No se pudo iniciar sesion: ${EXPECTED_RATE_LIMIT_MESSAGE}`,
    );
    expect(notice).toHaveClass('login-notice');
    expect(screen.queryByText(/ThrottlerException/)).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled());
    expect(getAuthSession()).toBeNull();
    expect(
      fetchMock.mock.calls.filter(([input]) => String(input).includes('/auth/login')),
    ).toHaveLength(1);
  });
});
