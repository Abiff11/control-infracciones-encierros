import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'marca_vehiculo' })
export class MarcaVehiculo {
  @PrimaryGeneratedColumn({ name: 'id_marca_vehiculo' })
  idMarcaVehiculo!: number;

  @Column({
    name: 'nombre_marca_vehiculo',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  nombreMarcaVehiculo!: string;
}
