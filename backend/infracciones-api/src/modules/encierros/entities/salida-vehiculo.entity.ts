import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { LiberacionVehiculo } from '../../liberaciones/entities/liberacion-vehiculo.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { RetencionVehiculo } from './retencion-vehiculo.entity';

@Entity({ name: 'salida_vehiculo' })
export class SalidaVehiculo {
  @PrimaryGeneratedColumn({ name: 'id_salida_vehiculo' })
  idSalidaVehiculo!: number;

  @ManyToOne(() => RetencionVehiculo, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_retencion_vehiculo' })
  retencionVehiculo!: RetencionVehiculo;

  @ManyToOne(() => LiberacionVehiculo, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_liberacion_vehiculo' })
  liberacionVehiculo!: LiberacionVehiculo;

  @ManyToOne(() => Usuario, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_usuario_valida_salida' })
  usuarioValidaSalida!: Usuario;

  @Column({ name: 'fecha_salida', type: 'timestamp' })
  fechaSalida!: Date;

  @Column({ name: 'validado_por', type: 'varchar', length: 100 })
  validadoPor!: string;

  @Column({ name: 'persona_recibe_vehiculo', type: 'varchar', length: 100 })
  personaRecibeVehiculo!: string;

  @Column({ name: 'observaciones_salida', type: 'text', nullable: true })
  observacionesSalida!: string | null;

  @Column({ name: 'estado_salida', type: 'varchar', length: 50 })
  estadoSalida!: string;
}
