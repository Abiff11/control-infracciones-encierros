import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Delegacion } from '../../catalogos/entities/delegacion.entity';
import { Region } from '../../catalogos/entities/region.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { ImportacionInfraccionError } from './importacion-infraccion-error.entity';

export enum ImportacionInfraccionesEstado {
  PREVIEW = 'PREVIEW',
  IMPORTADA = 'IMPORTADA',
  IMPORTADA_CON_ERRORES = 'IMPORTADA_CON_ERRORES',
  FALLIDA = 'FALLIDA',
}

export enum ImportacionInfraccionesModoDuplicados {
  OMITIR = 'OMITIR',
  ERROR = 'ERROR',
}

@Entity({ name: 'importacion_infracciones' })
export class ImportacionInfracciones {
  @PrimaryGeneratedColumn({ name: 'id_importacion_infracciones' })
  idImportacionInfracciones!: number;

  @Column({ name: 'anio', type: 'int' })
  anio!: number;

  @ManyToOne(() => Region, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_region' })
  region!: Region;

  @ManyToOne(() => Delegacion, { nullable: true, eager: false })
  @JoinColumn({ name: 'id_delegacion_default' })
  delegacionDefault!: Delegacion | null;

  @Column({ name: 'nombre_archivo', type: 'varchar', length: 255 })
  nombreArchivo!: string;

  @Column({ name: 'nombre_hoja', type: 'varchar', length: 100 })
  nombreHoja!: string;

  @Column({ name: 'total_filas', type: 'int', default: 0 })
  totalFilas!: number;

  @Column({ name: 'filas_validas', type: 'int', default: 0 })
  filasValidas!: number;

  @Column({ name: 'filas_importadas', type: 'int', default: 0 })
  filasImportadas!: number;

  @Column({ name: 'filas_con_error', type: 'int', default: 0 })
  filasConError!: number;

  @Column({ name: 'filas_omitidas', type: 'int', default: 0 })
  filasOmitidas!: number;

  @Column({ name: 'estado', type: 'varchar', length: 30 })
  estado!: ImportacionInfraccionesEstado;

  @Column({ name: 'modo_duplicados', type: 'varchar', length: 20 })
  modoDuplicados!: ImportacionInfraccionesModoDuplicados;

  @Column({
    name: 'crear_catalogos_faltantes',
    type: 'boolean',
    default: false,
  })
  crearCatalogosFaltantes!: boolean;

  @Column({
    name: 'crear_delegaciones_faltantes',
    type: 'boolean',
    default: false,
  })
  crearDelegacionesFaltantes!: boolean;

  @ManyToOne(() => Usuario, { nullable: false, eager: false })
  @JoinColumn({ name: 'creado_por_usuario_id' })
  creadoPorUsuario!: Usuario;

  @Column({
    name: 'fecha_creacion',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion!: Date;

  @Column({ name: 'fecha_importacion', type: 'timestamp', nullable: true })
  fechaImportacion!: Date | null;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones!: string | null;

  @OneToMany(
    () => ImportacionInfraccionError,
    (error) => error.importacionInfracciones,
  )
  errores!: ImportacionInfraccionError[];
}
