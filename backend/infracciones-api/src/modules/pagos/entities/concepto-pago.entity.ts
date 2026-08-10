import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { PagoConcepto } from './pago-concepto.entity';

@Entity({ name: 'concepto_pago' })
@Unique('UQ_concepto_pago_clave_concepto', ['claveConcepto'])
export class ConceptoPago {
  @PrimaryGeneratedColumn({ name: 'id_concepto_pago' })
  idConceptoPago!: number;

  @Column({ name: 'clave_concepto', type: 'varchar', length: 50 })
  claveConcepto!: string;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo!: boolean;

  @OneToMany(() => PagoConcepto, (pagoConcepto) => pagoConcepto.conceptoPago)
  pagos!: PagoConcepto[];
}
