import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { Field, TextInput } from '../../components/ui/Field';
import { LoadingMessage } from '../../components/ui/LoadingMessage';
import { Modal } from '../../components/ui/Modal';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { SelectField } from '../../components/ui/SelectField';
import { confirmAction, showErrorAlert, showSuccessAlert } from '../../utils/sweetAlert';
import { getErrorMessage } from '../../services/api/apiClient';
import { createUsuario, deactivateUsuario, updateUsuario, getUsuarios } from '../../services/api/usuarios.api';
import { getRoles } from '../../services/api/roles.api';
import type { LoginResponseUsuario } from '../../types/auth.types';
import type { RolResponse } from '../../types/roles.types';
import type {
  CreateUsuarioPayload,
  UpdateUsuarioPayload,
  UsuarioListResponse,
  UsuarioResponse,
  UsuariosQueryParams,
} from '../../types/usuarios.types';
import './UsuariosPage.css';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface LoadState<T> {
  status: LoadStatus;
  data: T | null;
  error: string | null;
}

interface UsuariosFilters {
  search: string;
  rol: string;
  activo: 'all' | 'true' | 'false';
  page: string;
  limit: string;
}

interface UsuarioFormState {
  nombreUsuario: string;
  email: string;
  password: string;
  idRol: string;
  activo: 'true' | 'false';
}

interface UsuariosPageProps {
  currentUser: LoginResponseUsuario;
  runProtectedRequest: <T,>(action: (token: string) => Promise<T>) => Promise<T>;
  token: string;
}

const DEFAULT_LIMIT = '10';

const DEFAULT_FILTERS: UsuariosFilters = {
  search: '',
  rol: '',
  activo: 'all',
  page: '1',
  limit: DEFAULT_LIMIT,
};

const DEFAULT_FORM: UsuarioFormState = {
  nombreUsuario: '',
  email: '',
  password: '',
  idRol: '',
  activo: 'true',
};

function createIdleState<T>(): LoadState<T> {
  return {
    status: 'idle',
    data: null,
    error: null,
  };
}

function toNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildQuery(filters: UsuariosFilters): UsuariosQueryParams {
  return {
    search: filters.search.trim() || undefined,
    rol: toNumber(filters.rol),
    activo:
      filters.activo === 'all' ? undefined : filters.activo === 'true',
    page: toNumber(filters.page),
    limit: toNumber(filters.limit),
  };
}

function getStatusLabel(activo: boolean): string {
  return activo ? 'Activo' : 'Inactivo';
}

function getStatusClass(activo: boolean): string {
  return activo ? 'usuario-status usuario-status-active' : 'usuario-status usuario-status-inactive';
}

export function UsuariosPage({
  currentUser,
  runProtectedRequest,
  token,
}: UsuariosPageProps) {
  const [rolesState, setRolesState] = useState<LoadState<RolResponse[]>>(createIdleState());
  const [usuariosState, setUsuariosState] =
    useState<LoadState<UsuarioListResponse>>(createIdleState());
  const [draftFilters, setDraftFilters] = useState<UsuariosFilters>(DEFAULT_FILTERS);
  const [activeFilters, setActiveFilters] = useState<UsuariosFilters>(DEFAULT_FILTERS);
  const [refreshKey, setRefreshKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioResponse | null>(null);
  const [formValues, setFormValues] = useState<UsuarioFormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const query = useMemo(() => buildQuery(activeFilters), [activeFilters]);
  const roles = rolesState.data ?? [];
  const items = usuariosState.data?.data ?? [];
  const meta = usuariosState.data?.meta ?? null;
  const totalActivos = items.filter((item) => item.activo).length;
  const totalInactivos = items.filter((item) => !item.activo).length;
  const totalAdmins = items.filter((item) => item.rol.nombreRol === 'ADMIN').length;
  const isEditing = editingUser !== null;

  useEffect(() => {
    let mounted = true;

    async function loadRoles(): Promise<void> {
      setRolesState((current) => ({
        ...current,
        status: 'loading',
        error: null,
      }));

      try {
        const response = await runProtectedRequest((currentToken) => getRoles(currentToken));

        if (!mounted) {
          return;
        }

        setRolesState({
          status: 'ready',
          data: response,
          error: null,
        });
      } catch (error) {
        if (!mounted) {
          return;
        }

        setRolesState({
          status: 'error',
          data: null,
          error: getErrorMessage(error),
        });
      }
    }

    void loadRoles();

    return () => {
      mounted = false;
    };
  }, [runProtectedRequest, token]);

  useEffect(() => {
    let mounted = true;

    async function loadUsuarios(): Promise<void> {
      setUsuariosState((current) => ({
        ...current,
        status: 'loading',
        error: null,
      }));

      try {
        const response = await runProtectedRequest((currentToken) =>
          getUsuarios(currentToken, query),
        );

        if (!mounted) {
          return;
        }

        setUsuariosState({
          status: 'ready',
          data: response,
          error: null,
        });
      } catch (error) {
        if (!mounted) {
          return;
        }

        setUsuariosState({
          status: 'error',
          data: null,
          error: getErrorMessage(error),
        });
      }
    }

    void loadUsuarios();

    return () => {
      mounted = false;
    };
  }, [query, refreshKey, runProtectedRequest, token]);

  function updateDraftFilter<K extends keyof UsuariosFilters>(
    field: K,
    value: UsuariosFilters[K],
  ): void {
    setDraftFilters((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openCreateModal(): void {
    setEditingUser(null);
    setFormValues(DEFAULT_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(usuario: UsuarioResponse): void {
    setEditingUser(usuario);
    setFormValues({
      nombreUsuario: usuario.nombreUsuario,
      email: usuario.email,
      password: '',
      idRol: String(usuario.rol.idRol),
      activo: usuario.activo ? 'true' : 'false',
    });
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal(): void {
    setModalOpen(false);
    setEditingUser(null);
    setFormValues(DEFAULT_FORM);
    setFormError(null);
  }

  function applyFilters(event?: FormEvent<HTMLFormElement>): void {
    event?.preventDefault();
    setActiveFilters({
      ...draftFilters,
      page: '1',
    });
  }

  function resetFilters(): void {
    setDraftFilters(DEFAULT_FILTERS);
    setActiveFilters(DEFAULT_FILTERS);
  }

  function changePage(page: number): void {
    const nextPage = String(page);
    setDraftFilters((current) => ({
      ...current,
      page: nextPage,
    }));
    setActiveFilters((current) => ({
      ...current,
      page: nextPage,
    }));
  }

  async function refreshUsuarios(): Promise<void> {
    setRefreshKey((current) => current + 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    const nombreUsuario = formValues.nombreUsuario.trim();
    const email = formValues.email.trim();
    const password = formValues.password.trim();
    const idRol = Number(formValues.idRol);
    const activo = formValues.activo === 'true';

    if (!nombreUsuario || !email || !Number.isFinite(idRol)) {
      setFormError('Completa nombre, correo y rol.');
      setSaving(false);
      return;
    }

    if (!isEditing && !password) {
      setFormError('La contraseña es obligatoria para crear el usuario.');
      setSaving(false);
      return;
    }

    try {
      if (editingUser) {
        const payload: UpdateUsuarioPayload = {
          nombreUsuario,
          email,
          idRol,
          activo,
        };

        if (password) {
          payload.password = password;
        }

        await runProtectedRequest((currentToken) =>
          updateUsuario(currentToken, editingUser.idUsuario, payload),
        );
        await showSuccessAlert('Usuario actualizado', `${nombreUsuario} fue actualizado.`);
      } else {
        const payload: CreateUsuarioPayload = {
          nombreUsuario,
          email,
          password,
          idRol,
          activo,
        };

        await runProtectedRequest((currentToken) => createUsuario(currentToken, payload));
        await showSuccessAlert('Usuario creado', `${nombreUsuario} ya está disponible.`);
      }

      closeModal();
      await refreshUsuarios();
    } catch (error) {
      const message = getErrorMessage(error);
      setFormError(message);
      await showErrorAlert('No se pudo guardar el usuario', message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(usuario: UsuarioResponse): Promise<void> {
    const actionLabel = usuario.activo ? 'desactivar' : 'activar';
    const successTitle = usuario.activo ? 'Usuario desactivado' : 'Usuario activado';
    const successText = usuario.activo
      ? `${usuario.nombreUsuario} fue desactivado.`
      : `${usuario.nombreUsuario} fue activado.`;
    const confirmed = await confirmAction({
      title: `${usuario.activo ? 'Desactivar' : 'Activar'} usuario`,
      text: `¿Deseas ${actionLabel} a ${usuario.nombreUsuario}?`,
      confirmButtonText: usuario.activo ? 'Desactivar' : 'Activar',
      cancelButtonText: 'Cancelar',
    });

    if (!confirmed) {
      return;
    }

    try {
      if (usuario.activo) {
        await runProtectedRequest((currentToken) => deactivateUsuario(currentToken, usuario.idUsuario));
      } else {
        await runProtectedRequest((currentToken) =>
          updateUsuario(currentToken, usuario.idUsuario, { activo: true }),
        );
      }

      await showSuccessAlert(successTitle, successText);
      await refreshUsuarios();
    } catch (error) {
      const message = getErrorMessage(error);
      await showErrorAlert('No se pudo cambiar el estado', message);
    }
  }

  return (
    <section className="page-stack usuarios-page">
      <header className="page-header usuarios-header">
        <div>
          <p className="eyebrow">Administración</p>
          <h1>Usuarios</h1>
          <p className="page-description">
            Crea, edita y controla accesos sin salir del panel operativo.
          </p>
        </div>

        <div className="button-row usuarios-header-actions">
          <Button type="button" variant="primary" onClick={openCreateModal}>
            Nuevo usuario
          </Button>
        </div>
      </header>

      <div className="usuarios-summary-grid">
        <Card className="usuarios-summary-card">
          <span>Usuarios visibles</span>
          <strong>{meta?.total ?? items.length}</strong>
        </Card>
        <Card className="usuarios-summary-card">
          <span>Activos en página</span>
          <strong>{totalActivos}</strong>
        </Card>
        <Card className="usuarios-summary-card">
          <span>Inactivos en página</span>
          <strong>{totalInactivos}</strong>
        </Card>
        <Card className="usuarios-summary-card">
          <span>Administradores</span>
          <strong>{totalAdmins}</strong>
        </Card>
      </div>

      <Card>
        <div className="page-stack">
          <div className="table-field-toolbar usuarios-toolbar">
            <div>
              <p className="section-label">Filtros</p>
              <h2>Listado de usuarios</h2>
              <div className="table-field-meta">
                <span>{meta ? `Página ${meta.page} de ${meta.totalPages}` : 'Sin resultados'}</span>
                <span>{meta ? `Total ${meta.total}` : 'Total 0'}</span>
              </div>
            </div>

            <div className="button-row">
              <Button type="button" variant="secondary" onClick={resetFilters}>
                Limpiar
              </Button>
              <Button type="button" variant="primary" onClick={() => void applyFilters()}>
                Aplicar
              </Button>
            </div>
          </div>

          <form className="usuarios-filters" onSubmit={applyFilters}>
            <Field htmlFor="usuarios-search" label="Búsqueda">
              <TextInput
                id="usuarios-search"
                value={draftFilters.search}
                onChange={(event) => updateDraftFilter('search', event.target.value)}
                placeholder="Buscar por nombre, correo o rol"
              />
            </Field>

            <Field htmlFor="usuarios-rol" label="Rol">
              <SelectField
                id="usuarios-rol"
                value={draftFilters.rol}
                onChange={(event) => updateDraftFilter('rol', event.target.value)}
              >
                <option value="">Todos</option>
                {roles.map((role) => (
                  <option key={role.idRol} value={role.idRol}>
                    {role.nombreRol}
                  </option>
                ))}
              </SelectField>
            </Field>

            <Field htmlFor="usuarios-estado" label="Estado">
              <SelectField
                id="usuarios-estado"
                value={draftFilters.activo}
                onChange={(event) =>
                  updateDraftFilter('activo', event.target.value as UsuariosFilters['activo'])
                }
              >
                <option value="all">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </SelectField>
            </Field>
          </form>

          {rolesState.status === 'loading' || usuariosState.status === 'loading' ? (
            <LoadingMessage message="Cargando usuarios..." />
          ) : null}
          <ErrorMessage message={rolesState.error} />
          <ErrorMessage message={usuariosState.error} />

          <div className="table-wrap usuarios-table-wrap">
            <table className="data-table usuarios-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-state">
                      {usuariosState.status === 'loading'
                        ? 'Cargando usuarios...'
                        : 'No hay usuarios para mostrar.'}
                    </td>
                  </tr>
                ) : (
                  items.map((usuario) => {
                    const isCurrentUser = usuario.idUsuario === currentUser.idUsuario;

                    return (
                      <tr key={usuario.idUsuario}>
                        <td>
                          <div className="table-cell-stack">
                            <strong>{usuario.nombreUsuario}</strong>
                            <span>ID {usuario.idUsuario}</span>
                          </div>
                        </td>
                        <td>
                          <div className="table-cell-stack">
                            <strong>{usuario.email}</strong>
                            <span>{usuario.activo ? 'Acceso habilitado' : 'Acceso suspendido'}</span>
                          </div>
                        </td>
                        <td>{usuario.rol.nombreRol}</td>
                        <td>
                          <span className={getStatusClass(usuario.activo)}>
                            {getStatusLabel(usuario.activo)}
                          </span>
                        </td>
                        <td>
                          <div className="button-row usuarios-actions">
                            <Button type="button" variant="secondary" onClick={() => openEditModal(usuario)}>
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={isCurrentUser && usuario.activo}
                              onClick={() => void handleToggleActive(usuario)}
                            >
                              {usuario.activo ? 'Desactivar' : 'Activar'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {meta ? (
            <PaginationControls
              page={meta.page}
              limit={meta.limit}
              total={meta.total}
              totalPages={meta.totalPages}
              onPageChange={changePage}
            />
          ) : null}
        </div>
      </Card>

      <Modal
        open={modalOpen}
        title={isEditing ? 'Editar usuario' : 'Nuevo usuario'}
        description={
          isEditing
            ? 'Actualiza los datos, el rol o el estado sin salir de la pantalla.'
            : 'Crea un usuario nuevo para el panel administrativo.'
        }
        eyebrowLabel={isEditing ? 'Edición de usuario' : 'Alta de usuario'}
        className="usuarios-modal"
        onClose={closeModal}
      >
        <form className="usuarios-modal-form" onSubmit={handleSubmit}>
          <div className="usuarios-modal-grid">
            <Field htmlFor="usuarios-nombre" label="Nombre">
              <TextInput
                id="usuarios-nombre"
                value={formValues.nombreUsuario}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    nombreUsuario: event.target.value,
                  }))
                }
                placeholder="Nombre del usuario"
                required
              />
            </Field>

            <Field htmlFor="usuarios-email" label="Correo">
              <TextInput
                id="usuarios-email"
                type="email"
                value={formValues.email}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="correo@dominio.gob.mx"
                required
              />
            </Field>

            <Field htmlFor="usuarios-password" label={isEditing ? 'Contraseña nueva' : 'Contraseña'}>
              <TextInput
                id="usuarios-password"
                type="password"
                value={formValues.password}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder={isEditing ? 'Dejar vacío para conservar la actual' : 'Contraseña segura'}
                required={!isEditing}
              />
            </Field>

            <Field htmlFor="usuarios-rol-form" label="Rol">
              <SelectField
                id="usuarios-rol-form"
                value={formValues.idRol}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    idRol: event.target.value,
                  }))
                }
                required
              >
                <option value="">Selecciona un rol</option>
                {roles.map((role) => (
                  <option key={role.idRol} value={role.idRol}>
                    {role.nombreRol}
                  </option>
                ))}
              </SelectField>
            </Field>

            <Field htmlFor="usuarios-activo" label="Estado">
              <SelectField
                id="usuarios-activo"
                value={formValues.activo}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    activo: event.target.value as UsuarioFormState['activo'],
                  }))
                }
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </SelectField>
            </Field>

            <div className="usuarios-modal-note">
              <span>Nota</span>
              <p>
                {isEditing
                  ? 'Si no cambias la contraseña, el acceso actual se conserva.'
                  : 'El nuevo usuario podrá entrar al sistema con el rol asignado.'}
              </p>
            </div>
          </div>

          <ErrorMessage message={formError} />

          <div className="modal-actions usuarios-modal-actions">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default UsuariosPage;
