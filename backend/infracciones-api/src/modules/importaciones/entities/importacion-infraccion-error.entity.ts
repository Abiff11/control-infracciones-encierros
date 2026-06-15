import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ImportacionInfracciones } from './importacion-infracciones.entity';

export enum ImportacionInfraccionErrorTipo {
  ERROR = 'ERROR',
  ADVERTENCIA = 'ADVERTENCIA',
}

@Entity({ name: 'importacion_infraccion_error' })
export class ImportacionInfraccionError {
  @PrimaryGeneratedColumn({ name: 'id_importacion_infraccion_error' })
  idImportacionInfraccionError!: number;

  @ManyToOne(() => ImportacionInfracciones, {
    nullable: false,
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_importacion_infracciones' })
  importacionInfracciones!: ImportacionInfracciones;

  @Column({ name: 'numero_fila', type: 'int' })
  numeroFila!: number;

  @Column({ name: 'tipo', type: 'varchar', length: 20 })
  tipo!: ImportacionInfraccionErrorTipo;

  @Column({ name: 'campo', type: 'varchar', length: 100 })
  campo!: string;

  @Column({ name: 'valor', type: 'varchar', length: 255, nullable: true })
  valor!: string | null;

  @Column({ name: 'mensaje', type: 'text' })
  mensaje!: string;

  @Column({ name: 'raw_row', type: 'jsonb' })
  rawRow!: Record<string, unknown>;

  @Column({
    name: 'fecha_creacion',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion!: Date;
}
