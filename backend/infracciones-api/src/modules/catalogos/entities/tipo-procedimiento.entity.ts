import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tipo_procedimiento' })
export class TipoProcedimiento {
  @PrimaryGeneratedColumn({ name: 'id_tipo_procedimiento' })
  idTipoProcedimiento!: number;

  @Column({
    name: 'clave_tipo_procedimiento',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  claveTipoProcedimiento!: string;

  @Column({
    name: 'nombre_tipo_procedimiento',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  nombreTipoProcedimiento!: string;

  @Column({
    name: 'es_tipo_expediente',
    type: 'boolean',
    default: false,
  })
  esTipoExpediente!: boolean;

  @Column({
    name: 'requiere_folio_infraccion',
    type: 'boolean',
    default: false,
  })
  requiereFolioInfraccion!: boolean;

  @Column({
    name: 'requiere_num_parte_informativo',
    type: 'boolean',
    default: false,
  })
  requiereNumParteInformativo!: boolean;

  @Column({
    name: 'requiere_motivos',
    type: 'boolean',
    default: false,
  })
  requiereMotivos!: boolean;

  @Column({
    name: 'permite_retencion',
    type: 'boolean',
    default: false,
  })
  permiteRetencion!: boolean;

  @Column({
    name: 'activo',
    type: 'boolean',
    default: true,
  })
  activo!: boolean;
}
