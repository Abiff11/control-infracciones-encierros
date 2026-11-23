import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Infraccion } from '../../infracciones/entities/infraccion.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { SalidaVehiculo } from './salida-vehiculo.entity';

export type CampoObservado =
  | 'PLACAS'
  | 'MARCA'
  | 'LINEA'
  | 'CLASE'
  | 'COLOR'
  | 'ANIO_MODELO'
  | 'ESTADO_PLACAS'
  | 'SERIE'
  | 'MOTOR';
export type EstadoObservacion =
  | 'PENDIENTE'
  | 'EN_REVISION'
  | 'CORREGIDA'
  | 'RECHAZADA';

@Entity({ name: 'observacion_expediente' })
export class ObservacionExpediente {
  @PrimaryGeneratedColumn({ name: 'id_observacion' })
  idObservacion!: number;

  @ManyToOne(() => Infraccion, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_infraccion' })
  infraccion!: Infraccion;

  @ManyToOne(() => SalidaVehiculo, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_salida_vehiculo' })
  salidaVehiculo!: SalidaVehiculo;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario_reporta' })
  usuarioReporta!: Usuario;

  @Column({ name: 'campo_observado', type: 'varchar', length: 30 })
  campoObservado!: CampoObservado;

  @Column({ name: 'valor_original', type: 'varchar', length: 150 })
  valorOriginal!: string;

  @Column({ name: 'valor_reportado', type: 'varchar', length: 150 })
  valorReportado!: string;

  @Column({ name: 'motivo_reporte', type: 'text' })
  motivoReporte!: string;

  @Column({ name: 'referencia_evidencia', type: 'varchar', length: 255 })
  referenciaEvidencia!: string;

  @Column({
    name: 'estatus',
    type: 'varchar',
    length: 20,
    default: 'PENDIENTE',
  })
  estatus!: EstadoObservacion;

  @CreateDateColumn({ name: 'fecha_reporte', type: 'timestamptz' })
  fechaReporte!: Date;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario_resuelve' })
  usuarioResuelve!: Usuario | null;

  @Column({ name: 'resolucion', type: 'text', nullable: true })
  resolucion!: string | null;

  @Column({ name: 'fecha_resolucion', type: 'timestamptz', nullable: true })
  fechaResolucion!: Date | null;
}
