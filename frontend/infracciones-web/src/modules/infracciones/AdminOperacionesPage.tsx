import { useState, type FormEvent } from "react";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ErrorMessage } from "../../components/ui/ErrorMessage";
import { Field, TextInput } from "../../components/ui/Field";
import { LoadingMessage } from "../../components/ui/LoadingMessage";
import { getErrorMessage } from "../../services/api/apiClient";
import {
  getAdminExpediente,
  getInfracciones,
} from "../../services/api/infracciones.api";
import type { AdminExpedienteSnapshot } from "../../types/admin-expediente.types";
import { AdminOperacionesPanel } from "./AdminOperacionesPanel";
import "./AdminExpedientesPage.css";

interface AdminOperacionesPageProps {
  token: string;
  onChanged: () => void;
}

function fullName(snapshot: AdminExpedienteSnapshot): string {
  return [
    snapshot.infraccion.nombre,
    snapshot.infraccion.apellidoPaterno,
    snapshot.infraccion.apellidoMaterno,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function AdminOperacionesPage({
  token,
  onChanged,
}: AdminOperacionesPageProps) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<AdminExpedienteSnapshot | null>(null);

  async function resolveByFolio(value: string): Promise<AdminExpedienteSnapshot> {
    const folio = value.trim();
    if (!folio) {
      throw new Error("Captura el folio o número de infracción");
    }

    const response = await getInfracciones(token, {
      folioInfraccion: folio,
      page: 1,
      limit: 30,
    });
    const normalized = folio.toUpperCase();
    const matches = response.data.filter(
      (item) => item.folioInfraccion.trim().toUpperCase() === normalized,
    );

    if (matches.length === 0) {
      throw new Error(`No se encontró la infracción con folio ${folio}`);
    }
    if (matches.length > 1) {
      throw new Error(
        `Se encontraron ${matches.length} infracciones con el folio ${folio}. Resuelve la duplicidad antes de corregir operaciones.`,
      );
    }

    return getAdminExpediente(token, matches[0].idInfraccion);
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const loaded = await resolveByFolio(search);
      setSnapshot(loaded);
      setSearch(loaded.infraccion.folioInfraccion);
    } catch (currentError) {
      setSnapshot(null);
      setError(getErrorMessage(currentError));
    } finally {
      setLoading(false);
    }
  }

  function handleUpdated(updated: AdminExpedienteSnapshot): void {
    setSnapshot(updated);
    setSearch(updated.infraccion.folioInfraccion);
    setError(null);
    onChanged();
  }

  return (
    <section className="admin-expedientes-page page-stack">
      <header className="admin-expedientes-hero">
        <div>
          <p className="eyebrow">Administración</p>
          <h1>Corregir operaciones</h1>
          <p className="page-description">
            Retira pagos, liberaciones, salidas o retenciones registrados por error
            sin eliminar la infracción. Toda eliminación queda auditada.
          </p>
        </div>
        <div className="admin-hero-badges" aria-label="Controles de seguridad">
          <span className="admin-pill">Solo ADMIN</span>
          <span className="admin-pill">Impacto confirmado</span>
          <span className="admin-pill">Auditoría crítica</span>
        </div>
      </header>

      <Card className="admin-search-card">
        <div className="admin-search-heading">
          <div>
            <p className="section-label">Localizar infracción</p>
            <h2>Buscar por folio / número de infracción</h2>
            <p>
              Usa el número visible de la infracción. La coincidencia debe ser
              exacta.
            </p>
          </div>
        </div>
        <form className="admin-search-form" onSubmit={handleSearch}>
          <Field htmlFor="admin-operaciones-search" label="Folio / número">
            <TextInput
              id="admin-operaciones-search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setError(null);
              }}
              placeholder="Ej. 117243"
              autoComplete="off"
            />
          </Field>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Buscando..." : "Cargar operaciones"}
          </Button>
        </form>
      </Card>

      {loading ? <LoadingMessage message="Cargando operaciones..." /> : null}
      <ErrorMessage message={error} />

      {snapshot ? (
        <div className="admin-editor-layout">
          <Card className="admin-editor-card">
            <div className="admin-editor-intro">
              <p className="section-label">Infracción cargada</p>
              <h2>Infracción {snapshot.infraccion.folioInfraccion}</h2>
              <p>
                {fullName(snapshot) || "Sin nombre"} · {snapshot.infraccion.placas || "Sin placas"}
              </p>
            </div>

            <div className="admin-record-meta-grid">
              <div className="admin-meta-item">
                <span>Pagos</span>
                <strong>{snapshot.pagos.length}</strong>
              </div>
              <div className="admin-meta-item">
                <span>Retención</span>
                <strong>{snapshot.retencion ? 1 : 0}</strong>
              </div>
              <div className="admin-meta-item">
                <span>Liberaciones</span>
                <strong>{snapshot.liberaciones.length}</strong>
              </div>
              <div className="admin-meta-item">
                <span>Salidas</span>
                <strong>{snapshot.salidas.length}</strong>
              </div>
            </div>

            <div className="page-stack">
              <p className="page-description">
                Recomendación: si necesitas retroceder el flujo completo, elimina
                primero la operación más avanzada. El sistema también puede retirar
                dependencias automáticamente cuando lo confirmes.
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSnapshot(null);
                  setSearch("");
                  setError(null);
                }}
              >
                Nueva búsqueda
              </Button>
            </div>
          </Card>

          <aside className="admin-action-sidebar">
            <AdminOperacionesPanel
              token={token}
              snapshot={snapshot}
              hasUnsavedChanges={false}
              onUpdated={handleUpdated}
              onError={setError}
            />
          </aside>
        </div>
      ) : null}
    </section>
  );
}
