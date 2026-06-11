import { useEffect, useState } from 'react';

import { clearStoredToken, loadStoredToken, saveStoredToken } from '../lib/session';
import {
  createInfraccion,
  createLiberacion,
  createPago,
  createRetencion,
  createSalida,
  getCatalogosBundle,
  getErrorMessage,
  getInfracciones,
  getProfile,
  isUnauthorizedError,
  login as loginRequest,
  swaggerUrl,
  type InfraccionesQuery,
  type LoginRequest,
  type LoginResponseUsuario,
} from '../lib/api';
import LoginPage from '../modules/auth/LoginPage';
import DashboardPage from '../modules/dashboard/DashboardPage';
import InfraccionesListPage from '../modules/infracciones/InfraccionesListPage';
import InfraccionCreatePage from '../modules/infracciones/InfraccionCreatePage';
import PagoCreatePage from '../modules/pagos/PagoCreatePage';
import LiberacionCreatePage from '../modules/liberaciones/LiberacionCreatePage';
import RetencionCreatePage from '../modules/encierros/RetencionCreatePage';
import SalidaCreatePage from '../modules/encierros/SalidaCreatePage';
import type { CatalogosBundle } from '../modules/catalogos/catalogos.types';
import type {
  InfraccionesResponse,
  InfraccionFlujoResponse,
  CreateInfraccionCompletaPayload,
  GenerarLiberacionPayload,
  RegistrarPagoPayload,
  RegistrarRetencionPayload,
  RegistrarSalidaPayload,
} from '../modules/infracciones/infracciones.types';
import type { PageKey } from './app.types';
import './App.css';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface LoadState<T> {
  status: LoadStatus;
  data: T | null;
  error: string | null;
}

interface SessionState {
  token: string;
  user: LoginResponseUsuario;
}

const DEFAULT_INFRACCIONES_QUERY: InfraccionesQuery = {
  folioInfraccion: '',
  page: 1,
  limit: 10,
};

const NAV_ITEMS: Array<{ key: PageKey; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'infracciones', label: 'Infracciones' },
  { key: 'nueva-infraccion', label: 'Nueva infracción' },
  { key: 'pago', label: 'Pago' },
  { key: 'liberacion', label: 'Liberación' },
  { key: 'retencion', label: 'Retención' },
  { key: 'salida', label: 'Salida' },
];

function createIdleState<T>(): LoadState<T> {
  return {
    status: 'idle',
    data: null,
    error: null,
  };
}

function App() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');
  const [catalogsState, setCatalogsState] = useState<LoadState<CatalogosBundle>>(
    createIdleState<CatalogosBundle>(),
  );
  const [infraccionesState, setInfraccionesState] = useState<
    LoadState<InfraccionesResponse>
  >(createIdleState<InfraccionesResponse>());
  const [infraccionesQuery, setInfraccionesQuery] = useState<InfraccionesQuery>(
    DEFAULT_INFRACCIONES_QUERY,
  );

  function resetOperationalState(): void {
    setCatalogsState(createIdleState<CatalogosBundle>());
    setInfraccionesState(createIdleState<InfraccionesResponse>());
    setInfraccionesQuery(DEFAULT_INFRACCIONES_QUERY);
    setCurrentPage('dashboard');
  }

  function handleSessionExpired(message: string): void {
    clearStoredToken();
    setSession(null);
    setAuthMessage(message);
    setAuthLoading(false);
    setBootstrapping(false);
    resetOperationalState();
  }

  async function bootstrapSession(activeToken: string): Promise<void> {
    setCatalogsState({
      status: 'loading',
      data: null,
      error: null,
    });
    setInfraccionesState({
      status: 'loading',
      data: null,
      error: null,
    });
    setInfraccionesQuery(DEFAULT_INFRACCIONES_QUERY);

    const [catalogosResult, infraccionesResult] = await Promise.allSettled([
      getCatalogosBundle(),
      getInfracciones(activeToken, DEFAULT_INFRACCIONES_QUERY),
    ]);

    if (catalogosResult.status === 'fulfilled') {
      setCatalogsState({
        status: 'ready',
        data: catalogosResult.value,
        error: null,
      });
    } else if (isUnauthorizedError(catalogosResult.reason)) {
      handleSessionExpired('La sesión expiró. Vuelve a iniciar sesión.');
      throw new Error('Sesión expirada');
    } else {
      setCatalogsState({
        status: 'error',
        data: null,
        error: getErrorMessage(catalogosResult.reason),
      });
    }

    if (infraccionesResult.status === 'fulfilled') {
      setInfraccionesState({
        status: 'ready',
        data: infraccionesResult.value,
        error: null,
      });
    } else if (isUnauthorizedError(infraccionesResult.reason)) {
      handleSessionExpired('La sesión expiró. Vuelve a iniciar sesión.');
      throw new Error('Sesión expirada');
    } else {
      setInfraccionesState({
        status: 'error',
        data: null,
        error: getErrorMessage(infraccionesResult.reason),
      });
    }
  }

  async function activateSession(
    user: LoginResponseUsuario,
    token: string,
  ): Promise<void> {
    saveStoredToken(token);
    setSession({ token, user });
    setAuthMessage(null);
    setCurrentPage('dashboard');
    await bootstrapSession(token);
  }

  async function restoreSession(storedToken: string): Promise<void> {
    try {
      const profile = await getProfile(storedToken);
      await activateSession(profile, storedToken);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        handleSessionExpired('La sesión anterior expiró. Inicia sesión de nuevo.');
      } else {
        handleSessionExpired(
          `No se pudo restaurar la sesión: ${getErrorMessage(error)}`,
        );
      }
    } finally {
      setBootstrapping(false);
    }
  }

  /* eslint-disable react-hooks/exhaustive-deps -- restore is one-shot on mount */
  useEffect(() => {
    const storedToken = loadStoredToken();

    if (!storedToken) {
      setBootstrapping(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void restoreSession(storedToken);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  async function handleLogin(credentials: LoginRequest): Promise<void> {
    setAuthLoading(true);
    setAuthMessage(null);

    try {
      const response = await loginRequest(credentials);
      await activateSession(response.usuario, response.accessToken);
    } catch (error) {
      setAuthMessage(`No se pudo iniciar sesión: ${getErrorMessage(error)}`);
      clearStoredToken();
    } finally {
      setAuthLoading(false);
      setBootstrapping(false);
    }
  }

  function handleLogout(): void {
    clearStoredToken();
    setSession(null);
    setAuthMessage(null);
    setAuthLoading(false);
    setBootstrapping(false);
    resetOperationalState();
  }

  async function executeProtected<T>(
    action: (token: string) => Promise<T>,
  ): Promise<T> {
    if (!session?.token) {
      throw new Error('No hay una sesión activa.');
    }

    try {
      return await action(session.token);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        handleSessionExpired('La sesión expiró. Vuelve a iniciar sesión.');
        throw new Error('La sesión expiró. Vuelve a iniciar sesión.', {
          cause: error,
        });
      }

      throw error;
    }
  }

  async function refreshInfracciones(): Promise<void> {
    if (!session?.token) {
      return;
    }

    setInfraccionesState((current) => ({
      ...current,
      status: 'loading',
      error: null,
    }));

    try {
      const response = await executeProtected((token) =>
        getInfracciones(token, infraccionesQuery),
      );

      setInfraccionesState({
        status: 'ready',
        data: response,
        error: null,
      });
    } catch (error) {
      setInfraccionesState((current) => ({
        ...current,
        status: 'error',
        error: getErrorMessage(error),
      }));
    }
  }

  async function submitInfraccion(
    payload: CreateInfraccionCompletaPayload,
  ): Promise<InfraccionFlujoResponse> {
    return executeProtected((token) => createInfraccion(token, payload));
  }

  async function submitPago(payload: RegistrarPagoPayload): Promise<unknown> {
    return executeProtected((token) => createPago(token, payload));
  }

  async function submitLiberacion(
    payload: GenerarLiberacionPayload,
  ): Promise<unknown> {
    return executeProtected((token) => createLiberacion(token, payload));
  }

  async function submitRetencion(
    payload: RegistrarRetencionPayload,
  ): Promise<unknown> {
    return executeProtected((token) => createRetencion(token, payload));
  }

  async function submitSalida(
    payload: RegistrarSalidaPayload,
  ): Promise<unknown> {
    return executeProtected((token) => createSalida(token, payload));
  }

  const apiStatusLabel = !session
    ? 'No autenticado'
    : catalogsState.status === 'error' || infraccionesState.status === 'error'
      ? 'Con alertas'
      : catalogsState.status === 'loading' || infraccionesState.status === 'loading'
        ? 'Sincronizando'
        : 'Operativa';

  if (bootstrapping) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="auth-copy">
            <p className="eyebrow">Inicializando</p>
            <h1>Restaurando sesión</h1>
            <p>Cargando perfil y datos operativos del backend real...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <LoginPage
        error={authMessage}
        loading={authLoading}
        onSubmit={handleLogin}
      />
    );
  }

  const activeSession = session;

  function renderPage() {
    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardPage
            catalogs={catalogsState.data}
            infraccionesMeta={infraccionesState.data?.meta ?? null}
            apiStatusLabel={apiStatusLabel}
            notice={catalogsState.error ?? infraccionesState.error}
            user={activeSession.user}
            onNavigate={setCurrentPage}
          />
        );
      case 'infracciones':
        return (
          <InfraccionesListPage
            error={infraccionesState.error}
            folioInfraccion={infraccionesQuery.folioInfraccion ?? ''}
            items={infraccionesState.data?.data ?? []}
            loading={infraccionesState.status === 'loading'}
            meta={infraccionesState.data?.meta ?? null}
            onFolioInfraccionChange={(value) =>
              setInfraccionesQuery((current) => ({
                ...current,
                folioInfraccion: value,
              }))
            }
            onNavigateCreate={() => setCurrentPage('nueva-infraccion')}
            onRefresh={() => void refreshInfracciones()}
          />
        );
      case 'nueva-infraccion':
        return (
          <InfraccionCreatePage
            catalogs={catalogsState.data}
            loading={catalogsState.status === 'loading'}
            onCreated={() => void refreshInfracciones()}
            onSubmit={submitInfraccion}
          />
        );
      case 'pago':
        return (
          <PagoCreatePage
            onCompleted={() => void refreshInfracciones()}
            onSubmit={submitPago}
          />
        );
      case 'liberacion':
        return (
          <LiberacionCreatePage
            onCompleted={() => void refreshInfracciones()}
            onSubmit={submitLiberacion}
          />
        );
      case 'retencion':
        return (
          <RetencionCreatePage
            catalogs={catalogsState.data}
            onCompleted={() => void refreshInfracciones()}
            onSubmit={submitRetencion}
          />
        );
      case 'salida':
        return (
          <SalidaCreatePage
            onCompleted={() => void refreshInfracciones()}
            onSubmit={submitSalida}
          />
        );
      default:
        return null;
    }
  }

  return (
    <main className="app-shell">
      <header className="shell-header">
        <div>
          <p className="eyebrow">Sistema operativo</p>
          <h1>Control de infracciones y encierros</h1>
          <p className="page-description">
            Flujo mínimo funcional con sesión, consultas y captura operativa.
          </p>
        </div>

        <div className="session-box">
          <div>
            <p className="session-label">Usuario</p>
            <strong>{activeSession.user.nombreUsuario}</strong>
          </div>

          <div>
            <p className="session-label">Rol</p>
            <strong>{activeSession.user.rol?.nombreRol ?? 'Sin rol'}</strong>
          </div>

          <button className="button-secondary" type="button" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="app-layout">
        <aside className="sidebar">
          <nav className="sidebar-nav" aria-label="Menú principal">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                className={`nav-item ${currentPage === item.key ? 'is-active' : ''}`}
                type="button"
                onClick={() => setCurrentPage(item.key)}
              >
                {item.label}
              </button>
            ))}

            <a
              className="nav-item nav-link"
              href={swaggerUrl}
              target="_blank"
              rel="noreferrer"
            >
              Swagger
            </a>
          </nav>
        </aside>

        <section className="content">{renderPage()}</section>
      </div>
    </main>
  );
}

export default App;
