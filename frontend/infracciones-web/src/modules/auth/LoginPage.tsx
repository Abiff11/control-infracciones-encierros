import { useState, type FormEvent } from 'react';

import type { LoginRequest } from '../../types/auth.types';
import { showWarningAlert } from '../../utils/sweetAlert';
import './LoginPage.css';

const DEFAULT_FORM: LoginRequest = {
  email: '',
  password: '',
};

const INSTITUTIONAL_LOGO_SRC = `${import.meta.env.BASE_URL}policia-vial-estatal-oaxaca-seeklogo.png`;

interface LoginPageProps {
  error: string | null;
  loading: boolean;
  onSubmit: (credentials: LoginRequest) => Promise<void> | void;
}

function LoginPage({ error, loading, onSubmit }: LoginPageProps) {
  const [form, setForm] = useState<LoginRequest>(DEFAULT_FORM);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.email.trim() || !form.password.trim()) {
      await showWarningAlert('Datos incompletos', 'Ingresa correo y contrasena.');
      return;
    }

    void onSubmit({
      email: form.email.trim(),
      password: form.password,
    });
  }

  return (
    <main className="login-access-shell">
      <section className="login-access-card">
        <form className="login-access-form" onSubmit={(event) => void handleSubmit(event)}>
          <p className="eyebrow login-access-eyebrow">Acceso</p>

          <div className="login-logo-wrap">
            <img
              className="institutional-logo login-logo"
              src={INSTITUTIONAL_LOGO_SRC}
              alt="Policia Vial Estatal de Oaxaca"
            />
          </div>

          <div className="login-access-copy">
            <h1>Control de infracciones y encierros</h1>
            <p>Ingresa con tu cuenta para acceder a tu panel operativo.</p>
          </div>

          <div className="field login-field">
            <label htmlFor="login-email">Correo</label>
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
            />
          </div>

          <div className="field login-field">
            <label htmlFor="login-password">Contrasena</label>
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
            />
          </div>

          {error ? <div className="notice notice-error login-notice">{error}</div> : null}

          <button className="button-primary login-submit-button" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
