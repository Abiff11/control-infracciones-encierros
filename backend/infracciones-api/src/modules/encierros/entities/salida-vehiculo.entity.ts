import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { LiberacionVehiculo } from '../../liberaciones/entities/liberacion-vehiculo.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { RetencionVehiculo } from './retencion-vehiculo.entity';

export interface DatosVehiculoCotejados {
  placas: string;
  estadoPlacas?: string | null;
  marca?: string | null;
  linea?: string | null;
  clase?: string | null;
  anioModelo?: number | null;
  color?: string | null;
  serie?: string | null;
  motor?: string | null;
}

@Entity({ name: 'salida_vehiculo' })
export class SalidaVehiculo {
  @PrimaryGeneratedColumn({ name: 'id_salida_vehiculo' })
  idSalidaVehiculo!: number;

  @ManyToOne(() => RetencionVehiculo, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_retencion_vehiculo' })
  retencionVehiculo!: RetencionVehiculo;

  @ManyToOne(() => LiberacionVehiculo, { nullable: true, eager: false })
  @JoinColumn({ name: 'id_liberacion_vehiculo' })
  liberacionVehiculo!: LiberacionVehiculo | null;

  @ManyToOne(() => Usuario, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_usuario_valida_salida' })
  usuarioValidaSalida!: Usuario;

  @Column({ name: 'fecha_salida', type: 'timestamp' })
  fechaSalida!: Date;

  @Column({ name: 'validado_por', type: 'varchar', length: 100 })
  validadoPor!: string;

  @Column({ name: 'persona_recibe_vehiculo', type: 'varchar', length: 100 })
  personaRecibeVehiculo!: string;

  @Column({ name: 'observaciones_salida', type: 'text', nullable: true })
  observacionesSalida!: string | null;

  @Column({ name: 'estado_salida', type: 'varchar', length: 50 })
  estadoSalida!: string;

  @Column({
    name: 'modalidad_salida',
    type: 'varchar',
    length: 20,
    default: 'ORDINARIA',
  })
  modalidadSalida!: 'ORDINARIA' | 'ANTICIPADA';

  @Column({
    name: 'folio_liberacion_presentado',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  folioLiberacionPresentado!: string | null;

  @Column({
    name: 'placas_cotejadas',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  placasCotejadas!: string | null;

  @Column({ name: 'datos_vehiculo_cotejados', type: 'jsonb', nullable: true })
  datosVehiculoCotejados!: DatosVehiculoCotejados | null;

  @Column({
    name: 'nombre_propietario_declarado',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  nombrePropietarioDeclarado!: string | null;

  @Column({
    name: 'autorizacion_documental_verificada',
    type: 'boolean',
    nullable: true,
  })
  autorizacionDocumentalVerificada!: boolean | null;

  @Column({
    name: 'referencia_documento_liberacion',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  referenciaDocumentoLiberacion!: string | null;
}
