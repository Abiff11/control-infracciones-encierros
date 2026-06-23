import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

@Entity({ name: 'auditoria' })
export class Auditoria {
  @PrimaryGeneratedColumn({ name: 'id_auditoria' })
  idAuditoria!: number;

  @Column({ name: 'id_usuario', type: 'integer', nullable: true })
  idUsuario!: number | null;

  @Column({ name: 'accion', type: 'varchar', length: 80 })
  accion!: string;

  @Column({ name: 'entidad', type: 'varchar', length: 100 })
  entidad!: string;

  @Column({ name: 'entidad_id', type: 'varchar', length: 100, nullable: true })
  entidadId!: string | null;

  @Column({ name: 'antes_json', type: 'jsonb', nullable: true })
  antesJson!: JsonValue | null;

  @Column({ name: 'despues_json', type: 'jsonb', nullable: true })
  despuesJson!: JsonValue | null;

  @Column({ name: 'ip', type: 'varchar', length: 80, nullable: true })
  ip!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
