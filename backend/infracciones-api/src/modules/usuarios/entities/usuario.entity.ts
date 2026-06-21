import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Rol } from '../../roles/entities/rol.entity';

@Entity({ name: 'usuarios' })
export class Usuario {
  @PrimaryGeneratedColumn({ name: 'id_usuario' })
  idUsuario!: number;

  @ManyToOne(() => Rol, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_rol' })
  rol!: Rol;

  @Column({ name: 'nombre_usuario', type: 'varchar', length: 100 })
  nombreUsuario!: string;

  @Column({ name: 'email', type: 'varchar', length: 100, unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo!: boolean;
}
