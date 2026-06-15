import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'clase_vehiculo' })
export class ClaseVehiculo {
  @PrimaryGeneratedColumn({ name: 'id_clase_vehiculo' })
  idClaseVehiculo!: number;

  @Column({
    name: 'nombre_clase_vehiculo',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  nombreClaseVehiculo!: string;
}
