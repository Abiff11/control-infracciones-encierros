import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'lugar_infraccion' })
export class LugarInfraccion {
  @PrimaryGeneratedColumn({ name: 'id_lugar_infraccion' })
  idLugarInfraccion!: number;

  @Column({ name: 'nombre_lugar_infraccion', type: 'varchar', length: 200, unique: true })
  nombreLugarInfraccion!: string;
}
