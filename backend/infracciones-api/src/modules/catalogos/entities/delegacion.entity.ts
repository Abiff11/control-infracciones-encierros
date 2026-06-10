import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { Region } from './region.entity';

@Entity({ name: 'delegacion' })
@Unique('UQ_delegacion_id_region_nombre_delegacion', ['region', 'nombreDelegacion'])
export class Delegacion {
  @PrimaryGeneratedColumn({ name: 'id_delegacion' })
  idDelegacion!: number;

  @ManyToOne(() => Region, { nullable: false, eager: false })
  @JoinColumn({ name: 'id_region' })
  region!: Region;

  @Column({ name: 'nombre_delegacion', type: 'varchar', length: 120 })
  nombreDelegacion!: string;
}
