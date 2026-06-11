import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Infraccion } from '../../infracciones/entities/infraccion.entity';
import { PagoInfraccion } from '../../pagos/entities/pago-infraccion.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity({ name: 'liberacion_vehiculo' })
export class LiberacionVehiculo {
  @PrimaryGeneratedColumn({ name: 'id_liberacion_vehiculo' })
  idLiberacionVehiculo!: number;

  @ManyToOne(() => Infraccion, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_infraccion' })
  infraccion!: Infraccion;

  @ManyToOne(() => PagoInfraccion, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_pago_infraccion' })
  pagoInfraccion!: PagoInfraccion;

  @ManyToOne(() => Usuario, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_usuario_libera' })
  usuarioLibera!: Usuario;

  @Column({ name: 'folio_liberacion', type: 'varchar', length: 50 })
  folioLiberacion!: string;

  @Column({ name: 'fecha_liberacion', type: 'timestamp' })
  fechaLiberacion!: Date;

  @Column({ name: 'liberado_por', type: 'varchar', length: 100 })
  liberadoPor!: string;

  @Column({ name: 'nombre_recibe_liberacion', type: 'varchar', length: 100 })
  nombreRecibeLiberacion!: string;

  @Column({ name: 'observacion', type: 'text', nullable: true })
  observacion!: string | null;
}
