import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Infraccion } from '../../infracciones/entities/infraccion.entity';
import { Encierro } from './encierro.entity';

@Entity({ name: 'retencion_vehiculo' })
export class RetencionVehiculo {
  @PrimaryGeneratedColumn({ name: 'id_retencion_vehiculo' })
  idRetencionVehiculo!: number;

  @ManyToOne(() => Infraccion, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_infraccion' })
  infraccion!: Infraccion;

  @ManyToOne(() => Encierro, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_encierro' })
  encierro!: Encierro;

  @Column({ name: 'fecha_ingreso', type: 'timestamp' })
  fechaIngreso!: Date;

  @Column({ name: 'recibido_por', type: 'varchar', length: 100 })
  recibidoPor!: string;

  @Column({ name: 'folio_resguardo', type: 'varchar', length: 30, nullable: true })
  folioResguardo!: string | null;

  @Column({ name: 'observaciones_ingreso', type: 'text', nullable: true })
  observacionesIngreso!: string | null;

  @Column({ name: 'estado_ingreso', type: 'varchar', length: 50, nullable: true })
  estadoIngreso!: string | null;
}
