import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Infraccion } from '../../infracciones/entities/infraccion.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { PagoConcepto } from './pago-concepto.entity';

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

  @Column({ name: 'folio_linea_captura', type: 'varchar', length: 50 })
  folioLineaCaptura!: string;

  /**
   * Alias temporal de compatibilidad para consumidores internos que todavia
   * leen `folioPago`. No corresponde a una segunda columna en PostgreSQL.
   */
  get folioPago(): string {
    return this.folioLineaCaptura;
  }

  set folioPago(value: string) {
    this.folioLineaCaptura = value;
  }

  @Column({ name: 'monto', type: 'decimal', precision: 10, scale: 2 })
  monto!: string;

  @Column({
    name: 'monto_infraccion',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  montoInfraccion!: string;

  @Column({ name: 'dias_piso_cobrados', type: 'int' })
  diasPisoCobrados!: number;

  @Column({ name: 'monto_dias_piso', type: 'decimal', precision: 10, scale: 2 })
  montoDiasPiso!: string;

  @Column({ name: 'fecha_pago', type: 'timestamp' })
  fechaPago!: Date;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones!: string | null;

  @OneToMany(() => PagoConcepto, (pagoConcepto) => pagoConcepto.pagoInfraccion)
  conceptos!: PagoConcepto[];
}
