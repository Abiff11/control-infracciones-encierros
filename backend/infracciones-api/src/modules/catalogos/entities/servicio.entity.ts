import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'servicio' })
export class Servicio {
  @PrimaryGeneratedColumn({ name: 'id_servicio' })
  idServicio!: number;

  @Column({
    name: 'nombre_servicio',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  nombreServicio!: string;
}
