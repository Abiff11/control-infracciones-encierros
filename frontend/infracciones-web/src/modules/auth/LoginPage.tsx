import { useState, type FormEvent } from 'react';

import { swaggerUrl } from '../../services/api/apiClient';
import type { LoginRequest } from '../../types/auth.types';
import { showWarningAlert } from '../../utils/sweetAlert';

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
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-copy">
          <div className="brand-logo-wrap login-logo-wrap">
            <img className="institutional-logo" src={INSTITUTIONAL_LOGO_SRC} alt="Policia Vial Estatal de Oaxaca" />
          </div>
          <p className="eyebrow">Sistema institucional</p>
          <h1>Control de Infracciones y Encierros</h1>
          <p>
            Inicia sesion para consultar catalogos, revisar infracciones y operar pagos,
            liberaciones, retenciones y salidas.
          </p>
        </div>

        <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
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
              placeholder="usuario@dominio.gob.mx"
            />
          </div>

          <div className="field">
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
              placeholder="Ingresa tu contrasena"
            />
          </div>

          {error ? <div className="notice notice-error">{error}</div> : null}

          <div className="button-row">
            <button className="button-primary" type="submit" disabled={loading}>
              {loading ? 'Iniciando sesion...' : 'Iniciar sesion'}
            </button>

            <a className="button-link" href={swaggerUrl} target="_blank" rel="noreferrer">
              Abrir Swagger
            </a>
          </div>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
