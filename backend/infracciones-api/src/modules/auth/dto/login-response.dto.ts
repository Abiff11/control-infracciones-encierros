import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseRolDto {
  @ApiProperty()
  idRol!: number;

  @ApiProperty()
  nombreRol!: string;
}

export class LoginResponseUsuarioDto {
  @ApiProperty()
  idUsuario!: number;

  @ApiProperty()
  nombreUsuario!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  activo!: boolean;

  @ApiProperty({ type: LoginResponseRolDto, required: false })
  rol?: LoginResponseRolDto;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ example: '8h' })
  expiresIn!: string;

  @ApiProperty({ type: LoginResponseUsuarioDto })
  usuario!: LoginResponseUsuarioDto;
}
