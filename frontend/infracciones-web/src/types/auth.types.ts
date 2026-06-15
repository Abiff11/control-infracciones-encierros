export interface LoginResponseRol {
  idRol: number;
  nombreRol: string;
}

export interface LoginResponseUsuario {
  idUsuario: number;
  nombreUsuario: string;
  email: string;
  activo: boolean;
  rol?: LoginResponseRol;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  usuario: LoginResponseUsuario;
}

export interface SessionState {
  token: string;
  user: LoginResponseUsuario;
}
