import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Delegacion } from '../../catalogos/entities/delegacion.entity';
import { EstatusInfraccion } from '../../catalogos/entities/estatus-infraccion.entity';
import { LugarInfraccion } from '../../catalogos/entities/lugar-infraccion.entity';
import { Operativo } from '../../catalogos/entities/operativo.entity';
import { TipoProcedimiento } from '../../catalogos/entities/tipo-procedimiento.entity';
import { Encierro } from '../../encierros/entities/encierro.entity';
import { Vehiculo } from '../../vehiculos/entities/vehiculo.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Infractor } from '../../infractores/entities/infractor.entity';

@Entity({ name: 'infracciones' })
export class Infraccion {
  @PrimaryGeneratedColumn({ name: 'id_infraccion' })
  idInfraccion!: number;

  @ManyToOne(() => Infractor, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_infractor' })
  infractor!: Infractor;

  @ManyToOne(() => Delegacion, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_delegacion' })
  delegacion!: Delegacion;

  @ManyToOne(() => Vehiculo, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_vehiculo' })
  vehiculo!: Vehiculo;

  @ManyToOne(() => LugarInfraccion, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_lugar_infraccion' })
  lugarInfraccion!: LugarInfraccion;

  @ManyToOne(() => TipoProcedimiento, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_tipo_procedimiento' })
  tipoProcedimiento!: TipoProcedimiento;

  @ManyToOne(() => Operativo, { nullable: true, eager: false })
  @JoinColumn({ name: 'id_operativo' })
  operativo!: Operativo | null;

  @ManyToOne(() => Encierro, { nullable: true, eager: false })
  @JoinColumn({ name: 'id_encierro' })
  encierro!: Encierro | null;

  @ManyToOne(() => EstatusInfraccion, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_estatus_infraccion' })
  estatusInfraccion!: EstatusInfraccion;

  @ManyToOne(() => Usuario, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_usuario_captura' })
  usuarioCaptura!: Usuario;

  @Column({
    name: 'folio_infraccion',
    type: 'varchar',
    length: 50,
    unique: true,
  })
  folioInfraccion!: string;

  @Column({ name: 'fecha_infraccion', type: 'date' })
  fechaInfraccion!: string;

  @Column({ name: 'hora_infraccion', type: 'time' })
  horaInfraccion!: string;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones!: string | null;

  @Column({
    name: 'clave_policia',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  clavePolicia!: string | null;

  @Column({
    name: 'num_parte_informativo',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  numParteInformativo!: string | null;
}
