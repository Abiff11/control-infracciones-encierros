import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'encierro' })
@Unique('UQ_encierro_nombre_encierro', ['nombreEncierro'])
export class Encierro {
  @PrimaryGeneratedColumn({ name: 'id_encierro' })
  idEncierro!: number;

  @Column({ name: 'nombre_encierro', type: 'varchar', length: 100 })
  nombreEncierro!: string;
}
