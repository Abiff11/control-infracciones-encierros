import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'sexo' })
export class Sexo {
  @PrimaryGeneratedColumn({ name: 'id_sexo' })
  idSexo!: number;

  @Column({ name: 'nombre_sexo', type: 'varchar', length: 30, unique: true })
  nombreSexo!: string;
}
