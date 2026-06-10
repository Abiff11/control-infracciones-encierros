import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'rol' })
export class Rol {
  @PrimaryGeneratedColumn({ name: 'id_rol' })
  idRol!: number;

  @Column({ name: 'nombre_rol', type: 'varchar', length: 50, unique: true })
  nombreRol!: string;
}
