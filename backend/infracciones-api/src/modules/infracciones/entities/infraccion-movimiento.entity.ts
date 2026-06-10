import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { EstatusInfraccion } from '../../catalogos/entities/estatus-infraccion.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Infraccion } from './infraccion.entity';

@Entity({ name: 'infraccion_movimiento' })
export class InfraccionMovimiento {
  @PrimaryGeneratedColumn({ name: 'id_infraccion_movimiento' })
  idInfraccionMovimiento!: number;

  @ManyToOne(() => Infraccion, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_infraccion' })
  infraccion!: Infraccion;

  @ManyToOne(() => EstatusInfraccion, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_estatus_infraccion' })
  estatusInfraccion!: EstatusInfraccion;

  @ManyToOne(() => Usuario, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_usuario' })
  usuario!: Usuario;

  @Column({ name: 'accion', type: 'varchar', length: 100 })
  accion!: string;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones!: string | null;

  @Column({ name: 'fecha_movimiento', type: 'timestamp' })
  fechaMovimiento!: Date;
}
