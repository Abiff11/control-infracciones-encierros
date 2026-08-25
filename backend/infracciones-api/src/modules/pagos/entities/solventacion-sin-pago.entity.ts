import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Infraccion } from '../../infracciones/entities/infraccion.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity({ name: 'solventacion_sin_pago' })
export class SolventacionSinPago {
  @PrimaryGeneratedColumn({ name: 'id_solventacion_sin_pago' })
  idSolventacionSinPago!: number;

  @ManyToOne(() => Infraccion, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_infraccion' })
  infraccion!: Infraccion;

  @ManyToOne(() => Usuario, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_usuario_registra' })
  usuarioRegistra!: Usuario;

  @Column({ name: 'motivo', type: 'text' })
  motivo!: string;

  @Column({ name: 'fecha_solventacion', type: 'timestamp' })
  fechaSolventacion!: Date;
}
