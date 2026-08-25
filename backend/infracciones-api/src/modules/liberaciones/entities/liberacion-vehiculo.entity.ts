import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Infraccion } from '../../infracciones/entities/infraccion.entity';
import { PagoInfraccion } from '../../pagos/entities/pago-infraccion.entity';
import { SolventacionSinPago } from '../../pagos/entities/solventacion-sin-pago.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity({ name: 'liberacion_vehiculo' })
export class LiberacionVehiculo {
  @PrimaryGeneratedColumn({ name: 'id_liberacion_vehiculo' })
  idLiberacionVehiculo!: number;

  @ManyToOne(() => Infraccion, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_infraccion' })
  infraccion!: Infraccion;

  @ManyToOne(() => PagoInfraccion, { nullable: true, eager: false })
  @JoinColumn({ name: 'id_pago_infraccion' })
  pagoInfraccion!: PagoInfraccion | null;

  @ManyToOne(() => SolventacionSinPago, { nullable: true, eager: false })
  @JoinColumn({ name: 'id_solventacion_sin_pago' })
  solventacionSinPago!: SolventacionSinPago | null;

  @ManyToOne(() => Usuario, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_usuario_libera' })
  usuarioLibera!: Usuario;

  @Column({ name: 'folio_liberacion', type: 'varchar', length: 50 })
  folioLiberacion!: string;

  @Column({ name: 'fecha_liberacion', type: 'timestamp' })
  fechaLiberacion!: Date;

  @Column({ name: 'liberado_por', type: 'varchar', length: 100 })
  liberadoPor!: string;

  @Column({
    name: 'nombre_recibe_liberacion',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  nombreRecibeLiberacion!: string | null;

  @Column({ name: 'observacion', type: 'text', nullable: true })
  observacion!: string | null;
}
