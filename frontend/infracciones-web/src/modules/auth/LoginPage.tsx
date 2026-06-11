import { useState, type FormEvent } from 'react';

import type { LoginRequest } from '../../lib/api';
import { swaggerUrl } from '../../lib/api';

const DEFAULT_FORM: LoginRequest = {
  email: 'admin@example.com',
  password: 'Admin123!',
};

interface LoginPageProps {
  error: string | null;
  loading: boolean;
  onSubmit: (credentials: LoginRequest) => Promise<void> | void;
}

function LoginPage({ error, loading, onSubmit }: LoginPageProps) {
  const [form, setForm] = useState<LoginRequest>(DEFAULT_FORM);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit(form);
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-copy">
          <p className="eyebrow">Sistema operativo</p>
          <h1>Control de infracciones y encierros</h1>
          <p>
            Inicia sesión para consultar catálogos, revisar infracciones y
            operar pagos, liberaciones, retenciones y salidas.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              autoComplete="email"
              placeholder="admin@example.com"
            />
          </div>

          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              autoComplete="current-password"
              placeholder="Admin123!"
            />
          </div>

          {error ? <div className="notice notice-error">{error}</div> : null}

          <div className="button-row">
            <button className="button-primary" type="submit" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>

            <a className="button-link" href={swaggerUrl} target="_blank" rel="noreferrer">
              Abrir Swagger
            </a>
          </div>

          <p className="form-hint">
            Credenciales de prueba: <strong>admin@example.com</strong> /
            <strong> Admin123!</strong>
          </p>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
