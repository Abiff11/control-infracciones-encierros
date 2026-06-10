import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'estatus_infraccion' })
export class EstatusInfraccion {
  @PrimaryGeneratedColumn({ name: 'id_estatus_infraccion' })
  idEstatusInfraccion!: number;

  @Column({ name: 'nombre_estatus', type: 'varchar', length: 50, unique: true })
  nombreEstatus!: string;
}
