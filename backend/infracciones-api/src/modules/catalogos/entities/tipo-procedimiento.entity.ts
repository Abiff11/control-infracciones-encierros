import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tipo_procedimiento' })
export class TipoProcedimiento {
  @PrimaryGeneratedColumn({ name: 'id_tipo_procedimiento' })
  idTipoProcedimiento!: number;

  @Column({
    name: 'nombre_tipo_procedimiento',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  nombreTipoProcedimiento!: string;
}
