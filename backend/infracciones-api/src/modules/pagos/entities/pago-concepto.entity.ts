import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { ConceptoPago } from './concepto-pago.entity';
import { PagoInfraccion } from './pago-infraccion.entity';

@Entity({ name: 'pago_concepto' })
@Unique('UQ_pago_concepto_id_pago_id_concepto', [
  'pagoInfraccion',
  'conceptoPago',
])
@Check('CHK_pago_concepto_monto_positivo', '"monto" > 0')
@Check('CHK_pago_concepto_orden_positivo', '"orden" > 0')
export class PagoConcepto {
  @PrimaryGeneratedColumn({ name: 'id_pago_concepto' })
  idPagoConcepto!: number;

  @ManyToOne(() => PagoInfraccion, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_pago_infraccion' })
  pagoInfraccion!: PagoInfraccion;

  @ManyToOne(() => ConceptoPago, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_concepto_pago' })
  conceptoPago!: ConceptoPago;

  @Column({ name: 'monto', type: 'decimal', precision: 10, scale: 2 })
  monto!: string;

  @Column({ name: 'orden', type: 'int' })
  orden!: number;
}
