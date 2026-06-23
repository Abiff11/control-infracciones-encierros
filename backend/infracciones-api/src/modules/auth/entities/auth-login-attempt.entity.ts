import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'auth_login_attempts' })
export class AuthLoginAttempt {
  @PrimaryGeneratedColumn({ name: 'id_auth_login_attempt' })
  idAuthLoginAttempt!: number;

  @Column({ name: 'email', type: 'varchar', length: 150 })
  email!: string;

  @Column({ name: 'id_usuario', type: 'integer', nullable: true })
  idUsuario!: number | null;

  @Column({ name: 'success', type: 'boolean', default: false })
  success!: boolean;

  @Column({ name: 'reason', type: 'varchar', length: 100, nullable: true })
  reason!: string | null;

  @Column({ name: 'ip', type: 'varchar', length: 80, nullable: true })
  ip!: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
