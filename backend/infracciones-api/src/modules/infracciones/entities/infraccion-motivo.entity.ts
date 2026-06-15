import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { Motivo } from '../../motivos/entities/motivo.entity';
import { Infraccion } from './infraccion.entity';

@Entity({ name: 'infraccion_motivo' })
@Unique('UQ_infraccion_motivo_id_infraccion_id_motivo', [
  'infraccion',
  'motivo',
])
export class InfraccionMotivo {
  @PrimaryGeneratedColumn({ name: 'id_infraccion_motivo' })
  idInfraccionMotivo!: number;

  @ManyToOne(() => Infraccion, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_infraccion' })
  infraccion!: Infraccion;

  @ManyToOne(() => Motivo, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_motivo' })
  motivo!: Motivo;
}
