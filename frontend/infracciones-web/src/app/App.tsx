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

    async function loadDashboard(token: string): Promise<void> {
      setDashboardState((current) => ({
        ...current,
        status: 'loading',
        error: null,
      }));

      try {
        const response = await getInfracciones(token, { page: 1, limit: 5 });
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

    void loadDashboard(session.token);

    return () => {
      mounted = false;
    };
  }, [session?.token, refreshKey]);

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

    const response = await runProtectedRequest(() => createInfraccion(session.token, payload));
    bumpRefresh();
    setCurrentPage('infracciones');
    return response;
  }

  async function handleRegistrarPago(payload: RegistrarPagoPayload) {
    if (!session?.token) {
      throw new Error('Sesion no valida');
    }

    const response = await runProtectedRequest(() => createPago(session.token, payload));
    bumpRefresh();
    setCurrentPage('flujo');
    return response;
  }

  async function handleGenerarLiberacion(payload: GenerarLiberacionPayload) {
    if (!session?.token) {
      throw new Error('Sesion no valida');
    }

    const response = await runProtectedRequest(() => createLiberacion(session.token, payload));
    bumpRefresh();
    setCurrentPage('flujo');
    return response;
  }

  async function handleRegistrarRetencion(payload: RegistrarRetencionPayload) {
    if (!session?.token) {
      throw new Error('Sesion no valida');
    }

    const response = await runProtectedRequest(() => createRetencion(session.token, payload));
    bumpRefresh();
    setCurrentPage('vehiculos-encierro');
    return response;
  }

  async function handleRegistrarSalida(payload: RegistrarSalidaPayload) {
    if (!session?.token) {
      throw new Error('Sesion no valida');
    }

    const response = await runProtectedRequest(() => createSalida(session.token, payload));
    bumpRefresh();
    setCurrentPage('vehiculos-encierro');
    return response;
  }

  async function handleFetchFlujo(idInfraccion: number): Promise<InfraccionFlujoResponse> {
    if (!session?.token) {
      throw new Error('Sesion no valida');
    }

    return runProtectedRequest(() => getInfraccionFlujo(session.token, idInfraccion));
  }

  if (authLoading || bootstrapping) {
    return <LoginPage loading message="Validando sesion..." onSubmit={login} />;
  }

  if (!session) {
    return <LoginPage loading={authLoading} message={authMessage} onSubmit={login} />;
  }

  const protectedProps = {
    catalogs,
    token: session.token,
    refreshKey,
  };

  return (
    <AppLayout
      sidebar={<Sidebar currentPage={currentPage} items={NAV_ITEMS} onNavigate={handleNavigate} />}
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
              <strong>{session.usuario.nombreUsuario}</strong>
            </div>
            <div>
              <p className="session-label">Rol</p>
              <strong>{session.usuario.rol.nombreRol}</strong>
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
          state={dashboardState}
          onNavigateInfracciones={() => setCurrentPage('infracciones')}
          swaggerUrl={swaggerUrl}
        />
      ) : null}

      {currentPage === 'infracciones' ? (
        <InfraccionesListPage
          {...protectedProps}
          onNavigateCreate={() => setCurrentPage('nueva-infraccion')}
        />
      ) : null}

      {currentPage === 'nueva-infraccion' ? (
        <InfraccionCreatePage
          catalogs={catalogs}
          loadingCatalogs={catalogsLoading}
          onSubmit={handleCreateInfraccion}
        />
      ) : null}

      {currentPage === 'pago' ? (
        <PagoCreatePage
          catalogs={catalogs}
          initialIdInfraccion={pagoInitialId}
          onSubmit={handleRegistrarPago}
        />
      ) : null}

      {currentPage === 'liberacion' ? (
        <LiberacionCreatePage
          catalogs={catalogs}
          initialIdInfraccion={liberacionInitialId}
          onSubmit={handleGenerarLiberacion}
        />
      ) : null}

      {currentPage === 'retencion' ? (
        <RetencionCreatePage catalogs={catalogs} onSubmit={handleRegistrarRetencion} />
      ) : null}

      {currentPage === 'salida' ? (
        <SalidaCreatePage
          catalogs={catalogs}
          initialIdRetencionVehiculo={salidaInitialId}
          onSubmit={handleRegistrarSalida}
        />
      ) : null}

      {currentPage === 'flujo' ? <FlujoOperativoPage onFetch={handleFetchFlujo} /> : null}

      {currentPage === 'catalogos' ? (
        <CatalogosPage catalogs={catalogs} onRefresh={refreshCatalogs} />
      ) : null}

      {currentPage === 'importaciones' ? <ImportacionesPage token={session.token} /> : null}

      {currentPage === 'vehiculos-encierro' ? (
        <EncierrosVehiculosPage
          {...protectedProps}
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
