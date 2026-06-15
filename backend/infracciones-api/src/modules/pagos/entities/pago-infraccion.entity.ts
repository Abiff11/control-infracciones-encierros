import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Infraccion } from '../../infracciones/entities/infraccion.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity({ name: 'pago_infraccion' })
export class PagoInfraccion {
  @PrimaryGeneratedColumn({ name: 'id_pago_infraccion' })
  idPagoInfraccion!: number;

  @ManyToOne(() => Infraccion, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_infraccion' })
  infraccion!: Infraccion;

  @ManyToOne(() => Usuario, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_usuario_registra_pago' })
  usuarioRegistraPago!: Usuario;

  @Column({ name: 'folio_pago', type: 'varchar', length: 50 })
  folioPago!: string;

  @Column({ name: 'monto', type: 'decimal', precision: 10, scale: 2 })
  monto!: string;

  @Column({ name: 'fecha_pago', type: 'timestamp' })
  fechaPago!: Date;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones!: string | null;
}
