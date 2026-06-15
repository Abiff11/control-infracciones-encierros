import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Sexo } from '../../catalogos/entities/sexo.entity';

@Entity({ name: 'infractor' })
export class Infractor {
  @PrimaryGeneratedColumn({ name: 'id_infractor' })
  idInfractor!: number;

  @ManyToOne(() => Sexo, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_sexo' })
  sexo!: Sexo;

  @Column({ name: 'nombre', type: 'varchar', length: 100 })
  nombre!: string;

  @Column({
    name: 'apellido_paterno',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  apellidoPaterno!: string | null;

  @Column({
    name: 'apellido_materno',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  apellidoMaterno!: string | null;

  @Column({ name: 'licencia', type: 'varchar', length: 30, nullable: true })
  licencia!: string | null;

  @Column({ name: 'curp', type: 'varchar', length: 18, nullable: true })
  curp!: string | null;
}
