import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UsuarioRolDto {
  @ApiProperty()
  idRol!: number;

  @ApiProperty()
  nombreRol!: string;
}

export class UsuarioResponseDto {
  @ApiProperty()
  idUsuario!: number;

  @ApiProperty()
  nombreUsuario!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  activo!: boolean;

  @ApiProperty({ type: UsuarioRolDto })
  rol!: UsuarioRolDto;
}

export class PaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class UsuarioListResponseDto {
  @ApiProperty({ type: [UsuarioResponseDto] })
  data!: UsuarioResponseDto[];

  @ApiPropertyOptional({ type: PaginationMetaDto })
  meta?: PaginationMetaDto;
}
