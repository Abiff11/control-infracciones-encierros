import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RoleName } from '../constants/roles.constants';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RoleAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const http = context.switchToHttp();
    const req = http.getRequest();
    const role = req?.user?.rol?.nombreRol;

    return Boolean(role && required.includes(role));
  }
}
