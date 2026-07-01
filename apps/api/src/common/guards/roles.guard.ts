import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from 'shared-types';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return false;
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException('Acesso negado: Perfil sem permissão para esta ação.');
    }

    // Require APROVADO status for SCHOOL_MANAGER and TEACHER
    if (['SCHOOL_MANAGER', 'TEACHER'].includes(user.role)) {
      if (user.roleStatus !== 'APROVADO') {
        throw new ForbiddenException('Acesso negado: Seu cadastro ainda não foi aprovado.');
      }
    }

    return true;
  }
}
