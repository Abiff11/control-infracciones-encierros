import { useEffect, useState } from 'react';

import { AppLayout } from '../components/layout/AppLayout';
import { Sidebar } from '../components/layout/Sidebar';
import { Button } from '../components/ui/Button';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useAuth } from '../hooks/useAuth';
import { useCatalogos } from '../hooks/useCatalogos';
import { swaggerUrl } from '../services/api/apiClient';
import { createRetencion, createSalida } from '../services/api/encierros.api';
import { createLiberacion } from '../services/api/liberaciones.api';
import { createPago } from '../services/api/pagos.api';
import {
  createInfraccion,
  getInfraccionFlujo,
  getInfracciones,
} from '../services/api/infracciones.api';
import CatalogosPage from '../pages/CatalogosPage';
import DashboardPage from '../pages/DashboardPage';
import EncierrosVehiculosPage from '../modules/encierros/EncierrosVehiculosPage';
import FlujoOperativoPage from '../pages/FlujoOperativoPage';
import ImportacionesPage from '../pages/ImportacionesPage';
import InfraccionCreatePage from '../pages/InfraccionCreatePage';
import InfraccionesListPage from '../pages/InfraccionesListPage';
import LiberacionCreatePage from '../pages/LiberacionCreatePage';
import LoginPage from '../pages/LoginPage';
import PagoCreatePage from '../pages/PagoCreatePage';
import RetencionCreatePage from '../pages/RetencionCreatePage';
import SalidaCreatePage from '../pages/SalidaCreatePage';
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
import '../app/App.restore.css';

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
          getInfracciones(token, { page: 1, limit: 5 }),
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

  function bumpRefresh(): void {
    setRefreshKey((current) => current + 1);
  }

  function handleNavigate(page: PageKey): void {
    setCurrentPage(page);
  }

  async function handleCreateInfraccion(payload: CreateInfraccionCompletaPayload) {
    if (!session?.token) {
      throw new Error('Sesion no valida');
    }

    const response = await runProtectedRequest((token) => createInfraccion(token, payload));
    bumpRefresh();
    setCurrentPage('infracciones');
    return response;
  }

  async function handleRegistrarPago(payload: RegistrarPagoPayload) {
    if (!session?.token) {
      throw new Error('Sesion no valida');
    }

    const response = await runProtectedRequest((token) => createPago(token, payload));
    bumpRefresh();
    setCurrentPage('encierros-vehiculos');
    return response;
  }

  async function handleGenerarLiberacion(payload: GenerarLiberacionPayload) {
    if (!session?.token) {
      throw new Error('Sesion no valida');
    }

    const response = await runProtectedRequest((token) => createLiberacion(token, payload));
    bumpRefresh();
    setCurrentPage('encierros-vehiculos');
    return response;
  }

  async function handleRegistrarRetencion(payload: RegistrarRetencionPayload) {
    if (!session?.token) {
      throw new Error('Sesion no valida');
    }

    const response = await runProtectedRequest((token) => createRetencion(token, payload));
    bumpRefresh();
    setCurrentPage('encierros-vehiculos');
    return response;
  }

  async function handleRegistrarSalida(payload: RegistrarSalidaPayload) {
    if (!session?.token) {
      throw new Error('Sesion no valida');
    }

    const response = await runProtectedRequest((token) => createSalida(token, payload));
    bumpRefresh();
    setCurrentPage('encierros-vehiculos');
    return response;
  }

  async function handleFetchFlujo(idInfraccion: number): Promise<InfraccionFlujoResponse> {
    if (!session?.token) {
      throw new Error('Sesion no valida');
    }

    return runProtectedRequest((token) => getInfraccionFlujo(token, idInfraccion));
  }

  if (authLoading || bootstrapping) {
    return <LoginPage loading error={authMessage} onSubmit={login} />;
  }

  if (!session) {
    return <LoginPage loading={authLoading} error={authMessage} onSubmit={login} />;
  }

  const apiStatusLabel =
    dashboardState.status === 'ready'
      ? 'En linea'
      : dashboardState.status === 'loading'
        ? 'Consultando'
        : dashboardState.status === 'error'
          ? 'Error'
          : 'Inactivo';

  return (
    <AppLayout
      sidebar={<Sidebar currentPage={currentPage} items={NAV_ITEMS} onNavigate={handleNavigate} swaggerUrl={swaggerUrl} />}
      header={
        <div className="shell-header">
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
              <strong>{session.user.nombreUsuario}</strong>
            </div>
            <div>
              <p className="session-label">Rol</p>
              <strong>{session.user.rol?.nombreRol ?? 'Sin rol'}</strong>
            </div>
            <Button variant="secondary" type="button" onClick={logout}>
              Cerrar sesion
            </Button>
          </div>
        </div>
      }
    >
      {catalogsLoading ? <p className="notice">Cargando catalogos operativos...</p> : null}
      <ErrorMessage message={catalogsError} />

      {currentPage === 'dashboard' ? (
        <DashboardPage
          catalogs={catalogs}
          infraccionesMeta={dashboardState.data?.meta ?? null}
          apiStatusLabel={apiStatusLabel}
          notice={dashboardState.error}
          user={session.user}
          onNavigate={handleNavigate}
        />
      ) : null}

      {currentPage === 'infracciones' ? (
        <InfraccionesListPage
          catalogs={catalogs}
          refreshKey={refreshKey}
          token={session.token}
          onNavigateCreate={() => setCurrentPage('nueva-infraccion')}
        />
      ) : null}

      {currentPage === 'nueva-infraccion' ? (
        <InfraccionCreatePage
          catalogs={catalogs}
          loading={catalogsLoading}
          onCreated={bumpRefresh}
          onSubmit={handleCreateInfraccion}
        />
      ) : null}

      {currentPage === 'pago' ? (
        <PagoCreatePage
          initialIdInfraccion={pagoInitialId}
          onCompleted={() => setCurrentPage('encierros-vehiculos')}
          onSubmit={handleRegistrarPago}
        />
      ) : null}

      {currentPage === 'liberacion' ? (
        <LiberacionCreatePage
          initialIdInfraccion={liberacionInitialId}
          onCompleted={() => setCurrentPage('encierros-vehiculos')}
          onSubmit={handleGenerarLiberacion}
        />
      ) : null}

      {currentPage === 'retencion' ? (
        <RetencionCreatePage
          catalogs={catalogs}
          onCompleted={() => setCurrentPage('encierros-vehiculos')}
          onSubmit={handleRegistrarRetencion}
        />
      ) : null}

      {currentPage === 'salida' ? (
        <SalidaCreatePage
          initialIdRetencionVehiculo={salidaInitialId}
          onCompleted={() => setCurrentPage('encierros-vehiculos')}
          onSubmit={handleRegistrarSalida}
        />
      ) : null}

      {currentPage === 'flujo-operativo' ? (
        <FlujoOperativoPage onSubmit={handleFetchFlujo} />
      ) : null}

      {currentPage === 'catalogos' ? (
        <CatalogosPage
          catalogs={catalogs}
          loading={catalogsLoading}
          error={catalogsError}
          onRefreshCatalogs={refreshCatalogs}
          token={session.token}
        />
      ) : null}

      {currentPage === 'importaciones' ? (
        <ImportacionesPage
          catalogs={catalogs}
          token={session.token}
          onImportCompleted={async () => {
            await refreshCatalogs();
            bumpRefresh();
          }}
        />
      ) : null}

      {currentPage === 'encierros-vehiculos' ? (
        <EncierrosVehiculosPage
          catalogs={catalogs}
          refreshKey={refreshKey}
          token={session.token}
          onNavigatePago={(idInfraccion) => {
            setPagoInitialId(idInfraccion);
            setCurrentPage('pago');
          }}
          onNavigateLiberacion={(idInfraccion) => {
            setLiberacionInitialId(idInfraccion);
            setCurrentPage('liberacion');
          }}
          onNavigateSalida={(idRetencionVehiculo) => {
            setSalidaInitialId(idRetencionVehiculo);
            setCurrentPage('salida');
          }}
        />
      ) : null}
    </AppLayout>
  );
}

export default App;
