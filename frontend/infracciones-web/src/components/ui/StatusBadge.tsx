interface StatusBadgeProps {
  value: string;
}

function getStatusClass(value: string): string {
  switch (value) {
    case 'VEHICULO_ENTREGADO':
      return 'status-badge status-badge-success';
    case 'LIBERADO_PENDIENTE_SALIDA':
    case 'PAGADO_PENDIENTE_LIBERACION':
      return 'status-badge status-badge-info';
    case 'EN_ENCIERRO_SIN_PAGO':
      return 'status-badge status-badge-danger';
    case 'SIN_RETENCION':
      return 'status-badge status-badge-neutral';
    default:
      return 'status-badge';
  }
}

export function StatusBadge({ value }: StatusBadgeProps) {
  return <span className={getStatusClass(value)}>{value}</span>;
}
