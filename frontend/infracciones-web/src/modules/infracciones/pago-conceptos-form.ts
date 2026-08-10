export interface PagoConceptoFormRow {
  claveConcepto: string;
  monto: string;
}

const EMPTY_ROW: PagoConceptoFormRow = {
  claveConcepto: "",
  monto: "",
};

export function createEmptyPagoConceptoRow(): PagoConceptoFormRow {
  return { ...EMPTY_ROW };
}
