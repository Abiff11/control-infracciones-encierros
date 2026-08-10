import { useEffect, useMemo, useState } from "react";

import { Button } from "../../components/ui/Button";
import { Field, TextInput } from "../../components/ui/Field";
import { findConceptosPago } from "../../services/api/pagos.api";
import type { ConceptoPagoOption } from "../../types/operaciones.types";
import "./PagoConceptosEditor.css";

export interface PagoConceptoFormRow {
  claveConcepto: string;
  monto: string;
}

interface PagoConceptosEditorProps {
  rows: PagoConceptoFormRow[];
  token: string;
  onChange: (rows: PagoConceptoFormRow[]) => void;
}

const EMPTY_ROW: PagoConceptoFormRow = {
  claveConcepto: "",
  monto: "",
};

export function createEmptyPagoConceptoRow(): PagoConceptoFormRow {
  return { ...EMPTY_ROW };
}

export function PagoConceptosEditor({
  onChange,
  rows,
  token,
}: PagoConceptosEditorProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ConceptoPagoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      setSuggestions([]);
      setLoading(false);
      setSearchError(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      setSearchError(false);

      void findConceptosPago(token, normalizedQuery, 12)
        .then((result) => {
          if (!cancelled) {
            setSuggestions(result);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSuggestions([]);
            setSearchError(true);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [query, token]);

  const suggestionKeys = useMemo(
    () => Array.from(new Set(suggestions.map((item) => item.claveConcepto))),
    [suggestions],
  );

  function updateRow(
    index: number,
    field: keyof PagoConceptoFormRow,
    value: string,
  ): void {
    onChange(
      rows.map((row, currentIndex) =>
        currentIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  }

  function removeRow(index: number): void {
    if (rows.length === 1) {
      onChange([createEmptyPagoConceptoRow()]);
      return;
    }

    onChange(rows.filter((_, currentIndex) => currentIndex !== index));
  }

  function addRow(): void {
    onChange([...rows, createEmptyPagoConceptoRow()]);
  }

  return (
    <section className="payment-concepts" aria-label="Conceptos de la línea de captura">
      <div className="payment-concepts-heading">
        <div>
          <span className="section-label">Conceptos</span>
          <strong>Claves de la línea de captura</strong>
          <p>
            Escribe una clave existente o captura una nueva. Las nuevas claves se
            guardarán al registrar el pago y estarán disponibles en capturas futuras.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={addRow}>
          + Agregar clave
        </Button>
      </div>

      <datalist id="pago-conceptos-sugerencias">
        {suggestionKeys.map((clave) => (
          <option key={clave} value={clave} />
        ))}
      </datalist>

      <div className="payment-concepts-list">
        {rows.map((row, index) => (
          <div className="payment-concept-row" key={`concepto-${index}`}>
            <Field
              htmlFor={`operacion-pago-clave-${index}`}
              label={`Clave ${index + 1}`}
            >
              <TextInput
                id={`operacion-pago-clave-${index}`}
                list="pago-conceptos-sugerencias"
                value={row.claveConcepto}
                onFocus={() => setQuery(row.claveConcepto)}
                onChange={(event) => {
                  const value = event.target.value.toUpperCase();
                  updateRow(index, "claveConcepto", value);
                  setQuery(value);
                }}
                autoComplete="off"
                maxLength={50}
                placeholder="Buscar o escribir clave"
                required
              />
            </Field>

            <Field
              htmlFor={`operacion-pago-monto-${index}`}
              label="Monto"
            >
              <TextInput
                id={`operacion-pago-monto-${index}`}
                type="number"
                min="0.01"
                step="0.01"
                value={row.monto}
                onChange={(event) =>
                  updateRow(index, "monto", event.target.value)
                }
                placeholder="0.00"
                required
              />
            </Field>

            <Button
              type="button"
              variant="secondary"
              onClick={() => removeRow(index)}
            >
              Eliminar
            </Button>
          </div>
        ))}
      </div>

      <p className="payment-concepts-status" aria-live="polite">
        {loading
          ? "Buscando coincidencias..."
          : searchError
            ? "No se pudieron consultar coincidencias. Puedes capturar una clave nueva."
            : query.trim()
              ? `${suggestionKeys.length} coincidencia(s) disponibles.`
              : "Escribe una clave para consultar coincidencias guardadas."}
      </p>
    </section>
  );
}
