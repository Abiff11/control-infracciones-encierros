import { useEffect, useState, type FormEvent } from 'react';

import {
  getInfracciones,
  getProfile,
  getRoles,
  login as loginRequest,
  swaggerUrl,
  type InfraccionesResponse,
  type LoginResponse,
  type LoginResponseUsuario,
} from '../lib/api';
import '../App.css';

const STORAGE_KEY = 'infracciones-web-token';

const INITIAL_LOGIN = {
  email: 'admin@example.com',
  password: 'Admin123!',
};

type ApiAction = 'login' | 'profile' | 'catalogos' | 'infracciones';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Error desconocido';
}

function App() {
  const [loginForm, setLoginForm] = useState(INITIAL_LOGIN);
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<LoginResponseUsuario | null>(
    null,
  );
  const [apiResult, setApiResult] = useState<unknown>(null);
  const [apiResultLabel, setApiResultLabel] = useState('Sin resultados');
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<ApiAction | null>(null);

  async function restoreSession(storedToken: string) {
    setLoadingAction('profile');

    try {
      const profile = await getProfile(storedToken);
      setToken(storedToken);
      setCurrentUser(profile);
      setError(null);
      setApiResultLabel('Perfil restaurado');
      setApiResult(profile);
    } catch (error) {
      window.localStorage.removeItem(STORAGE_KEY);
      setToken(null);
      setCurrentUser(null);
      setError(
        `No se pudo restaurar la sesión: ${getErrorMessage(error)}`,
      );
    } finally {
      setLoadingAction(null);
    }
  }

  useEffect(() => {
    const storedToken = window.localStorage.getItem(STORAGE_KEY);

    if (!storedToken) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void restoreSession(storedToken);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function handleLogout() {
    window.localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setCurrentUser(null);
    setError(null);
    setApiResultLabel('Sin resultados');
    setApiResult(null);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingAction('login');

    try {
      const response: LoginResponse = await loginRequest(loginForm);
      window.localStorage.setItem(STORAGE_KEY, response.accessToken);
      setToken(response.accessToken);
      setCurrentUser(response.usuario);
      setError(null);
      setApiResultLabel('Respuesta de login');
      setApiResult(response);
    } catch (error) {
      setError(`No se pudo iniciar sesión: ${getErrorMessage(error)}`);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleProfileTest() {
    if (!token) {
      setError('Primero inicia sesión para probar /auth/profile.');
      return;
    }

    setLoadingAction('profile');

    try {
      const profile = await getProfile(token);
      setCurrentUser(profile);
      setError(null);
      setApiResultLabel('Perfil autenticado');
      setApiResult(profile);
    } catch (error) {
      setError(`Error en /auth/profile: ${getErrorMessage(error)}`);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handlePublicCatalogsTest() {
    setLoadingAction('catalogos');

    try {
      const roles = await getRoles();
      setError(null);
      setApiResultLabel('Catálogos públicos');
      setApiResult({ roles });
    } catch (error) {
      setError(`Error en catálogos públicos: ${getErrorMessage(error)}`);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleProtectedInfraccionesTest() {
    if (!token) {
      setError('Primero inicia sesión para probar /infracciones.');
      return;
    }

    setLoadingAction('infracciones');

    try {
      const infracciones: InfraccionesResponse = await getInfracciones(token);
      setError(null);
      setApiResultLabel('Infracciones protegidas');
      setApiResult(infracciones);
    } catch (error) {
      setError(`Error en /infracciones: ${getErrorMessage(error)}`);
    } finally {
      setLoadingAction(null);
    }
  }

  const isLoggedIn = Boolean(token && currentUser);
  const displayedRole = currentUser?.rol?.nombreRol ?? 'Sin rol';
  const displayedToken = token ? 'JWT cargado' : 'Sin token';

  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="app-title">
        <div>
          <p className="eyebrow">Frontend de validación</p>
          <h1 id="app-title">Control de infracciones y encierros</h1>
          <p>
            Pantalla mínima para validar login JWT, perfil, catálogos públicos,
            endpoints protegidos e integración con Swagger.
          </p>
        </div>

        <a
          className="swagger-link"
          href={swaggerUrl}
          rel="noreferrer"
          target="_blank"
        >
          Abrir Swagger
        </a>
      </section>

      <div className="dashboard">
        <section className="panel" aria-labelledby="login-title">
          <h2 id="login-title">Sesión</h2>

          <form className="form" onSubmit={handleLogin}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                autoComplete="email"
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                autoComplete="current-password"
              />
            </div>

            <div className="button-row">
              <button
                className="primary"
                type="submit"
                disabled={loadingAction === 'login'}
              >
                {loadingAction === 'login'
                  ? 'Iniciando sesión...'
                  : 'Iniciar sesión'}
              </button>

              <button
                className="ghost"
                type="button"
                onClick={handleLogout}
                disabled={!token}
              >
                Cerrar sesión
              </button>
            </div>
          </form>
        </section>

        <section className="panel" aria-labelledby="validation-title">
          <h2 id="validation-title">Validación</h2>

          <dl className="session-grid">
            <div className="meta-card">
              <dt>Usuario</dt>
              <dd>{currentUser?.nombreUsuario ?? 'No autenticado'}</dd>
            </div>

            <div className="meta-card">
              <dt>Rol</dt>
              <dd>{displayedRole}</dd>
            </div>

            <div className="meta-card">
              <dt>Estado</dt>
              <dd>{isLoggedIn ? 'Sesión activa' : 'Sesión cerrada'}</dd>
            </div>

            <div className="meta-card">
              <dt>Token</dt>
              <dd>{displayedToken}</dd>
            </div>
          </dl>

          <p className="section-title">Pruebas rápidas</p>
          <div className="actions">
            <button
              className="secondary"
              type="button"
              onClick={handleProfileTest}
              disabled={loadingAction === 'profile'}
            >
              {loadingAction === 'profile'
                ? 'Probando perfil...'
                : 'Probar perfil'}
            </button>

            <button
              className="secondary"
              type="button"
              onClick={handlePublicCatalogsTest}
              disabled={loadingAction === 'catalogos'}
            >
              {loadingAction === 'catalogos'
                ? 'Probando catálogos...'
                : 'Probar catálogos públicos'}
            </button>

            <button
              className="secondary"
              type="button"
              onClick={handleProtectedInfraccionesTest}
              disabled={loadingAction === 'infracciones'}
            >
              {loadingAction === 'infracciones'
                ? 'Probando infracciones...'
                : 'Probar infracciones protegidas'}
            </button>
          </div>

          {error ? <div className="notice error">{error}</div> : null}

          <div className="result">
            <div className="result-head">
              <p className="section-title" style={{ margin: 0 }}>
                Resultado
              </p>
              <span className="pill">{apiResultLabel}</span>
            </div>

            <pre>
              {apiResult
                ? JSON.stringify(apiResult, null, 2)
                : 'Ejecuta una prueba para ver el JSON aquí.'}
            </pre>
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
