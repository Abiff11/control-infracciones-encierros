import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'region' })
export class Region {
  @PrimaryGeneratedColumn({ name: 'id_region' })
  idRegion!: number;

  @Column({ name: 'nombre_region', type: 'varchar', length: 100, unique: true })
  nombreRegion!: string;
}
