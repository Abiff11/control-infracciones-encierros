import { useState } from 'react';

import { AppLayout } from '../components/layout/AppLayout';
import { Sidebar } from '../components/layout/Sidebar';
import { Button } from '../components/ui/Button';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useAuth } from '../hooks/useAuth';
import { useCatalogos } from '../hooks/useCatalogos';
import { getSwaggerUrl } from '../services/api/apiClient';
import { createRetencion, createSalida } from '../services/api/encierros.api';
import { createLiberacion } from '../services/api/liberaciones.api';
import { createPago } from '../services/api/pagos.api';
import { createInfraccion, getInfraccionFlujo } from '../services/api/infracciones.api';
import CatalogosPage from '../pages/CatalogosPage';
import DashboardPage from '../modules/dashboard/DashboardPage';
import EncierrosVehiculosPage from '../modules/encierros/EncierrosVehiculosPage';
import FlujoOperativoPage from '../modules/infracciones/FlujoOperativoPage';
import ImportacionesPage from '../modules/importaciones/ImportacionesPage';
import InfraccionCreatePage from '../modules/infracciones/InfraccionCreatePage';
import InfraccionesListPage from '../modules/infracciones/InfraccionesListPage';
import InfraccionesReportPage from '../modules/infracciones/InfraccionesReportPage';
import UsuariosPage from '../modules/usuarios/UsuariosPage';
import LiberacionCreatePage from '../modules/liberaciones/LiberacionCreatePage';
import LoginPage from '../modules/auth/LoginPage';
import PagoCreatePage from '../modules/pagos/PagoCreatePage';
import RetencionCreatePage from '../modules/encierros/RetencionCreatePage';
import SalidaCreatePage from '../modules/encierros/SalidaCreatePage';
import type { PageKey } from './app.types';
import { NAV_ITEMS } from './navigation';
import type {
  CreateInfraccionCompletaPayload,
  InfraccionFlujoResponse,
} from '../types/infracciones.types';
import type {
  GenerarLiberacionPayload,
  RegistrarPagoPayload,
  RegistrarRetencionPayload,
  RegistrarSalidaPayload,
} from '../types/operaciones.types';
import '../app/App.css';
import '../app/App.restore.css';

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
  const [pagoInitialId, setPagoInitialId] = useState<number | null>(null);
  const [liberacionInitialId, setLiberacionInitialId] = useState<number | null>(null);
  const [salidaInitialId, setSalidaInitialId] = useState<number | null>(null);
  const [operationReturnPage, setOperationReturnPage] = useState<PageKey>('infracciones');
  const roleName = session?.user.rol?.nombreRol?.toUpperCase();
  const isAdmin = roleName === 'ADMIN';

  function bumpRefresh(): void {
    setRefreshKey((current) => current + 1);
  }

  function handleNavigate(page: PageKey): void {
    if (
      roleName === 'INFRACCIONES' &&
      ['encierros-vehiculos', 'importaciones', 'catalogos'].includes(page)
    ) {
      return;
    }

    setCurrentPage(page);
  }

  function completeOperation(): void {
    setCurrentPage(operationReturnPage);
  }

  function openPagoFrom(page: PageKey, idInfraccion: number): void {
    setOperationReturnPage(page);
    setPagoInitialId(idInfraccion);
    setCurrentPage('pago');
  }

  function openLiberacionFrom(page: PageKey, idInfraccion: number): void {
    setOperationReturnPage(page);
    setLiberacionInitialId(idInfraccion);
    setCurrentPage('liberacion');
  }

  function openSalidaFrom(page: PageKey, idRetencionVehiculo: number): void {
    setOperationReturnPage(page);
    setSalidaInitialId(idRetencionVehiculo);
    setCurrentPage('salida');
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
    return response;
  }

  async function handleGenerarLiberacion(payload: GenerarLiberacionPayload) {
    if (!session?.token) {
      throw new Error('Sesion no valida');
    }

    const response = await runProtectedRequest((token) => createLiberacion(token, payload));
    bumpRefresh();
    return response;
  }

  async function handleRegistrarRetencion(payload: RegistrarRetencionPayload) {
    if (!session?.token) {
      throw new Error('Sesion no valida');
    }

    const response = await runProtectedRequest((token) => createRetencion(token, payload));
    bumpRefresh();
    return response;
  }

  async function handleRegistrarSalida(payload: RegistrarSalidaPayload) {
    if (!session?.token) {
      throw new Error('Sesion no valida');
    }

    const response = await runProtectedRequest((token) => createSalida(token, payload));
    bumpRefresh();
    return response;
  }

  async function handleFetchFlujo(folioInfraccion: string): Promise<InfraccionFlujoResponse> {
    if (!session?.token) {
      throw new Error('Sesion no valida');
    }

    return runProtectedRequest((token) => getInfraccionFlujo(token, folioInfraccion));
  }

  if (authLoading || bootstrapping) {
    return <LoginPage loading error={authMessage} onSubmit={login} />;
  }

  if (!session) {
    return <LoginPage loading={authLoading} error={authMessage} onSubmit={login} />;
  }

  const apiStatusLabel = 'En linea';

  return (
    <AppLayout
      sidebar={
        <Sidebar
          currentPage={currentPage}
          items={NAV_ITEMS}
          onLogout={logout}
          onNavigate={handleNavigate}
          swaggerUrl={getSwaggerUrl()}
          user={session.user}
        />
      }
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
          apiStatusLabel={apiStatusLabel}
          notice={null}
          refreshKey={refreshKey}
          runProtectedRequest={runProtectedRequest}
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

      {currentPage === 'reportes-infracciones' ? (
        <InfraccionesReportPage refreshKey={refreshKey} token={session.token} />
      ) : null}

      {currentPage === 'usuarios' && isAdmin ? (
        <UsuariosPage
          currentUser={session.user}
          runProtectedRequest={runProtectedRequest}
          token={session.token}
        />
      ) : null}

      {currentPage === 'usuarios' && !isAdmin ? (
        <p className="notice notice-error">No tienes permisos para ver la sección de usuarios.</p>
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
          onCompleted={completeOperation}
          onSubmit={handleRegistrarPago}
        />
      ) : null}

      {currentPage === 'liberacion' ? (
        <LiberacionCreatePage
          initialIdInfraccion={liberacionInitialId}
          onCompleted={completeOperation}
          onSubmit={handleGenerarLiberacion}
        />
      ) : null}

      {currentPage === 'retencion' ? (
        <RetencionCreatePage
          catalogs={catalogs}
          onCompleted={completeOperation}
          onSubmit={handleRegistrarRetencion}
        />
      ) : null}

      {currentPage === 'salida' ? (
        <SalidaCreatePage
          initialIdRetencionVehiculo={salidaInitialId}
          onCompleted={completeOperation}
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
          onNavigatePago={(idInfraccion) => openPagoFrom('encierros-vehiculos', idInfraccion)}
          onNavigateLiberacion={(idInfraccion) =>
            openLiberacionFrom('encierros-vehiculos', idInfraccion)
          }
          onNavigateSalida={(idRetencionVehiculo) =>
            openSalidaFrom('encierros-vehiculos', idRetencionVehiculo)
          }
        />
      ) : null}
    </AppLayout>
  );
}

export default App;

