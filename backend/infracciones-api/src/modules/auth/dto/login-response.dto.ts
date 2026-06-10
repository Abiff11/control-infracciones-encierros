export class LoginResponseRolDto {
  idRol!: number;
  nombreRol!: string;
}

export class LoginResponseUsuarioDto {
  idUsuario!: number;
  nombreUsuario!: string;
  email!: string;
  activo!: boolean;
  rol?: LoginResponseRolDto;
}

export class LoginResponseDto {
  accessToken!: string;
  tokenType!: 'Bearer';
  expiresIn!: string;
  usuario!: LoginResponseUsuarioDto;
}
