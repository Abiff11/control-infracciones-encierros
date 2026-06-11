import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ClaseVehiculo } from '../../catalogos/entities/clase-vehiculo.entity';
import { LineaVehiculo } from '../../catalogos/entities/linea-vehiculo.entity';
import { Servicio } from '../../catalogos/entities/servicio.entity';

@Entity({ name: 'vehiculo' })
export class Vehiculo {
  @PrimaryGeneratedColumn({ name: 'id_vehiculo' })
  idVehiculo!: number;

  @ManyToOne(() => ClaseVehiculo, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_clase_vehiculo' })
  claseVehiculo!: ClaseVehiculo;

  @ManyToOne(() => LineaVehiculo, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_linea_vehiculo' })
  lineaVehiculo!: LineaVehiculo;

  @ManyToOne(() => Servicio, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_servicio' })
  servicio!: Servicio;

  @Column({ name: 'anio_modelo', type: 'int', nullable: true })
  anioModelo!: number | null;

  @Column({
    name: 'sitio_servicio_publico',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  sitioServicioPublico!: string | null;

  @Column({ name: 'color', type: 'varchar', length: 20, nullable: true })
  color!: string | null;

  @Column({ name: 'placas', type: 'varchar', length: 20, nullable: true })
  placas!: string | null;

  @Column({
    name: 'estado_placas',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  estadoPlacas!: string | null;

  @Column({ name: 'serie', type: 'varchar', length: 20, nullable: true })
  serie!: string | null;

  @Column({ name: 'motor', type: 'varchar', length: 20, nullable: true })
  motor!: string | null;
}
