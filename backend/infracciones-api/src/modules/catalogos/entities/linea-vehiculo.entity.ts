import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { MarcaVehiculo } from './marca-vehiculo.entity';

@Entity({ name: 'linea_vehiculo' })
@Unique('UQ_linea_vehiculo_id_marca_vehiculo_nombre_linea_vehiculo', [
  'marcaVehiculo',
  'nombreLineaVehiculo',
])
export class LineaVehiculo {
  @PrimaryGeneratedColumn({ name: 'id_linea_vehiculo' })
  idLineaVehiculo!: number;

  @ManyToOne(() => MarcaVehiculo, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_marca_vehiculo' })
  marcaVehiculo!: MarcaVehiculo;

  @Column({ name: 'nombre_linea_vehiculo', type: 'varchar', length: 100 })
  nombreLineaVehiculo!: string;
}
