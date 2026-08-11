import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { PASSWORD_MAX_LENGTH } from '../../../common/security/password-hasher';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com', maxLength: 100 })
  @IsEmail()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  email!: string;

  @ApiProperty({ example: 'Frase de acceso segura', maxLength: PASSWORD_MAX_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}
