import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'operativo' })
export class Operativo {
  @PrimaryGeneratedColumn({ name: 'id_operativo' })
  idOperativo!: number;

  @Column({
    name: 'nombre_operativo',
    type: 'varchar',
    length: 120,
    unique: true,
  })
  nombreOperativo!: string;
}
