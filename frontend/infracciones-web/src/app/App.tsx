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
import ImportacionesPage from '../pages/ImportacionesPage';
import EncierrosVehiculosPage from '../modules/encierros/EncierrosVehiculosPage';
import type { PageKey } from './app.types';
import { NAV_ITEMS } from './navigation';
import type {
  CreateInfraccionCompletaPayload,
  InfraccionFlujoResponse,
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
  const [refreshKey, setRefreshKey] = useState(0);
  const [dashboardState, setDashboardState] = useState<LoadState<InfraccionesResponse>>(
    createIdleState<InfraccionesResponse>(),
  );
  const [pagoInitialId, setPagoInitialId] = useState<number | null>(null);
  const [liberacionInitialId, setLiberacionInitialId] = useState<number | null>(null);
  const [salidaInitialId, setSalidaInitialId] = useState<number | null>(null);

  useEffect(() => {
    if (!session?.token) {
      return;
    }

    let mounted = true;

    async function loadDashboard(): Promise<void> {
      setDashboardState((current) => ({
        ...current,
        status: 'loading',
        error: null,
      }));

      try {
        const response = await runProtectedRequest((token) =>
          getInfracciones(token, { page: 1, limit: 1 }),
        );

        if (!mounted) {
          return;
        }

        setDashboardState({
          status: 'ready',
          data: response,
          error: null,
        });
      } catch (error) {
        if (!mounted) {
          return;
        }

        setDashboardState({
          status: 'error',
          data: null,
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, [refreshKey, runProtectedRequest, session?.token]);

  function triggerRefresh(): void {
    setRefreshKey((current) => current + 1);
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

  function handleNavigate(page: PageKey): void {
    setCurrentPage(page);
    setPagoInitialId(null);
    setLiberacionInitialId(null);
    setSalidaInitialId(null);
  }

  function openPago(idInfraccion: number): void {
    setPagoInitialId(idInfraccion);
    setCurrentPage('pago');
  }

  function openLiberacion(idInfraccion: number): void {
    setLiberacionInitialId(idInfraccion);
    setCurrentPage('liberacion');
  }

  function openSalida(idRetencionVehiculo: number): void {
    setSalidaInitialId(idRetencionVehiculo);
    setCurrentPage('salida');
  }

  function handleLogout(): void {
    setCurrentPage('dashboard');
    setDashboardState(createIdleState<InfraccionesResponse>());
    setRefreshKey(0);
    setPagoInitialId(null);
    setLiberacionInitialId(null);
    setSalidaInitialId(null);
    logout();
  }

  const apiStatusLabel = !session
    ? 'No autenticado'
    : catalogsError || dashboardState.status === 'error'
      ? 'Con alertas'
      : catalogsLoading || dashboardState.status === 'loading'
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
    return <LoginPage error={authMessage} loading={authLoading} onSubmit={login} />;
  }

  const activeSession = session;

  function renderPage() {
    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardPage
            catalogs={catalogs}
            infraccionesMeta={dashboardState.data?.meta ?? null}
            apiStatusLabel={apiStatusLabel}
            notice={catalogsError ?? dashboardState.error}
            user={activeSession.user}
            onNavigate={handleNavigate}
          />
        );
      case 'infracciones':
        return (
          <InfraccionesListPage
            catalogs={catalogs}
            refreshKey={refreshKey}
            token={activeSession.token}
            onNavigateCreate={() => handleNavigate('nueva-infraccion')}
          />
        );
      case 'nueva-infraccion':
        return (
          <InfraccionCreatePage
            catalogs={catalogs}
            loading={catalogsLoading}
            onCreated={triggerRefresh}
            onSubmit={submitInfraccion}
          />
        );
      case 'pago':
        return (
          <PagoCreatePage
            initialIdInfraccion={pagoInitialId}
            onCompleted={triggerRefresh}
            onSubmit={submitPago}
          />
        );
      case 'liberacion':
        return (
          <LiberacionCreatePage
            initialIdInfraccion={liberacionInitialId}
            onCompleted={triggerRefresh}
            onSubmit={submitLiberacion}
          />
        );
      case 'retencion':
        return (
          <RetencionCreatePage
            catalogs={catalogs}
            onCompleted={triggerRefresh}
            onSubmit={submitRetencion}
          />
        );
      case 'salida':
        return (
          <SalidaCreatePage
            initialIdRetencionVehiculo={salidaInitialId}
            onCompleted={triggerRefresh}
            onSubmit={submitSalida}
          />
        );
      case 'encierros-vehiculos':
        return (
          <EncierrosVehiculosPage
            catalogs={catalogs}
            refreshKey={refreshKey}
            token={activeSession.token}
            onNavigatePago={openPago}
            onNavigateLiberacion={openLiberacion}
            onNavigateSalida={openSalida}
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
      case 'importaciones':
        return (
          <ImportacionesPage
            catalogs={catalogs}
            token={activeSession.token}
            onImportCompleted={triggerRefresh}
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

            <Button variant="secondary" type="button" onClick={handleLogout}>
              Cerrar sesion
            </Button>
          </div>
        </header>
      }
      sidebar={
        <Sidebar
          currentPage={currentPage}
          items={NAV_ITEMS}
          onNavigate={handleNavigate}
          swaggerUrl={swaggerUrl}
        />
      }
    >
      {renderPage()}
    </AppLayout>
  );
}

export default App;
