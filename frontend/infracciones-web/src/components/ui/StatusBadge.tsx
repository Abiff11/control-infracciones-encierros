import type { EstadoOperativoVehiculo } from '../../types/infracciones.types';

interface StatusBadgeProps {
  value: EstadoOperativoVehiculo | string;
  compact?: boolean;
}

const STATUS_LABELS: Record<EstadoOperativoVehiculo, string> = {
  SIN_RETENCION: 'Sin retencion',
  EN_ENCIERRO_SIN_PAGO: 'En encierro sin pago',
  PAGADO_PENDIENTE_LIBERACION: 'Pagado, pendiente de liberacion',
  LIBERADO_PENDIENTE_SALIDA: 'Liberado, pendiente de salida',
  VEHICULO_ENTREGADO: 'Vehiculo entregado',
};

function getStatusClass(value: string): string {
  switch (value) {
    case 'VEHICULO_ENTREGADO':
      return 'status-badge status-badge-success badge-state';
    case 'LIBERADO_PENDIENTE_SALIDA':
    case 'PAGADO_PENDIENTE_LIBERACION':
      return 'status-badge status-badge-info badge-state';
    case 'EN_ENCIERRO_SIN_PAGO':
      return 'status-badge status-badge-danger badge-state';
    case 'SIN_RETENCION':
      return 'status-badge status-badge-neutral badge-state';
    default:
      return 'status-badge badge-state';
  }
}

function getStatusLabel(value: string): string {
  if (value in STATUS_LABELS) {
    return STATUS_LABELS[value as EstadoOperativoVehiculo];
  }

  return value.replaceAll('_', ' ');
}

export function StatusBadge({ compact, value }: StatusBadgeProps) {
  return (
    <span className={getStatusClass(value)} title={value}>
      {compact ? getStatusLabel(value) : getStatusLabel(value)}
    </span>
  );
}
