import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'motivo' })
export class Motivo {
  @PrimaryGeneratedColumn({ name: 'id_motivo' })
  idMotivo!: number;

  @Column({ name: 'nombre_motivo', type: 'varchar', length: 255, unique: true })
  nombreMotivo!: string;
}
