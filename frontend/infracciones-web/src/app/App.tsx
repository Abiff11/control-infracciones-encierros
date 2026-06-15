import { useEffect, useState } from 'react';

import { AppLayout } from '../components/layout/AppLayout';
import { Sidebar } from '../components/layout/Sidebar';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useCatalogos } from '../hooks/useCatalogos';
import {
  createInfraccion,
  getInfraccionFlujo,
  getInfracciones,
} from '../services/api/infracciones.api';
import { createLiberacion } from '../services/api/liberaciones.api';
import { createPago } from '../services/api/pagos.api';
import { createRetencion, createSalida } from '../services/api/encierros.api';
import { swaggerUrl } from '../services/api/apiClient';
import CatalogosPage from '../pages/CatalogosPage';
import DashboardPage from '../pages/DashboardPage';
import InfraccionCreatePage from '../pages/InfraccionCreatePage';
import InfraccionesListPage from '../pages/InfraccionesListPage';
import LiberacionCreatePage from '../pages/LiberacionCreatePage';
import LoginPage from '../pages/LoginPage';
import PagoCreatePage from '../pages/PagoCreatePage';
import FlujoOperativoPage from '../pages/FlujoOperativoPage';
import RetencionCreatePage from '../pages/RetencionCreatePage';
import SalidaCreatePage from '../pages/SalidaCreatePage';
import type { PageKey } from './app.types';
import { NAV_ITEMS } from './navigation';
import type {
  CreateInfraccionCompletaPayload,
  InfraccionFlujoResponse,
  InfraccionesQuery,
  InfraccionesResponse,
} from '../types/infracciones.types';
import type {
  GenerarLiberacionPayload,
  RegistrarPagoPayload,
  RegistrarRetencionPayload,
  RegistrarSalidaPayload,
} from '../types/operaciones.types';
import '../app/App.css';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface LoadState<T> {
  status: LoadStatus;
  data: T | null;
  error: string | null;
}

const DEFAULT_INFRACCIONES_QUERY: InfraccionesQuery = {
  folioInfraccion: '',
  page: 1,
  limit: 10,
};

function createIdleState<T>(): LoadState<T> {
  return {
    status: 'idle',
    data: null,
    error: null,
  };
}

function App() {
  const { authLoading, authMessage, bootstrapping, login, logout, runProtectedRequest, session } =
    useAuth();
  const {
    catalogs,
    error: catalogsError,
    loading: catalogsLoading,
    refresh: refreshCatalogs,
  } = useCatalogos();
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');
  const [infraccionesState, setInfraccionesState] = useState<
    LoadState<InfraccionesResponse>
  >(createIdleState<InfraccionesResponse>());
  const [infraccionesQuery, setInfraccionesQuery] = useState<InfraccionesQuery>(
    DEFAULT_INFRACCIONES_QUERY,
  );

  /* eslint-disable react-hooks/exhaustive-deps -- session token is the trigger */
  useEffect(() => {
    if (!session?.token) {
      setCurrentPage('dashboard');
      setInfraccionesState(createIdleState<InfraccionesResponse>());
      setInfraccionesQuery(DEFAULT_INFRACCIONES_QUERY);
      return;
    }

    setCurrentPage('dashboard');
    setInfraccionesState({
      status: 'loading',
      data: null,
      error: null,
    });

    void refreshInfracciones();
  }, [session?.token]);
  /* eslint-enable react-hooks/exhaustive-deps */

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
      const response = await runProtectedRequest((requestToken) =>
        getInfracciones(requestToken, infraccionesQuery),
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
        error: error instanceof Error ? error.message : 'Error desconocido',
      }));
    }
  }

  async function submitInfraccion(
    payload: CreateInfraccionCompletaPayload,
  ): Promise<InfraccionFlujoResponse> {
    return runProtectedRequest((token) => createInfraccion(token, payload));
  }

  async function submitPago(payload: RegistrarPagoPayload): Promise<unknown> {
    return runProtectedRequest((token) => createPago(token, payload));
  }

  async function submitLiberacion(
    payload: GenerarLiberacionPayload,
  ): Promise<unknown> {
    return runProtectedRequest((token) => createLiberacion(token, payload));
  }

  async function submitRetencion(
    payload: RegistrarRetencionPayload,
  ): Promise<unknown> {
    return runProtectedRequest((token) => createRetencion(token, payload));
  }

  async function submitSalida(
    payload: RegistrarSalidaPayload,
  ): Promise<unknown> {
    return runProtectedRequest((token) => createSalida(token, payload));
  }

  async function submitFlujoOperativo(idInfraccion: number): Promise<InfraccionFlujoResponse> {
    return runProtectedRequest((token) => getInfraccionFlujo(token, idInfraccion));
  }

  const apiStatusLabel = !session
    ? 'No autenticado'
    : catalogsError || infraccionesState.status === 'error'
      ? 'Con alertas'
      : catalogsLoading || infraccionesState.status === 'loading'
        ? 'Sincronizando'
        : 'Operativa';

  if (bootstrapping) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="auth-copy">
            <p className="eyebrow">Inicializando</p>
            <h1>Restaurando sesion</h1>
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
        onSubmit={login}
      />
    );
  }

  const activeSession = session;

  function renderPage() {
    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardPage
            catalogs={catalogs}
            infraccionesMeta={infraccionesState.data?.meta ?? null}
            apiStatusLabel={apiStatusLabel}
            notice={catalogsError ?? infraccionesState.error}
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
            catalogs={catalogs}
            loading={catalogsLoading}
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
            catalogs={catalogs}
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
      case 'catalogos':
        return (
          <CatalogosPage
            catalogs={catalogs}
            error={catalogsError}
            loading={catalogsLoading}
            onRefreshCatalogs={() => void refreshCatalogs()}
            token={activeSession.token}
          />
        );
      case 'flujo-operativo':
        return <FlujoOperativoPage onSubmit={submitFlujoOperativo} />;
      default:
        return null;
    }
  }

  return (
    <AppLayout
      header={
        <header className="shell-header">
          <div>
            <p className="eyebrow">Sistema operativo</p>
            <h1>Control de infracciones y encierros</h1>
            <p className="page-description">
              Flujo minimo funcional con sesion, consultas y captura operativa.
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

            <Button variant="secondary" type="button" onClick={logout}>
              Cerrar sesion
            </Button>
          </div>
        </header>
      }
      sidebar={
        <Sidebar
          currentPage={currentPage}
          items={NAV_ITEMS}
          onNavigate={setCurrentPage}
          swaggerUrl={swaggerUrl}
        />
      }
    >
      {renderPage()}
    </AppLayout>
  );
}

export default App;
