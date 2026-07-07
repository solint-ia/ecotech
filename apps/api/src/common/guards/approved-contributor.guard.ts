import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Guards write interactions (posts, stories, comments, likes) so that only
 * fully-onboarded members can contribute content.
 *
 * A user is blocked from writing when:
 *  - their approval is not APROVADO (pending / rejected students, teachers and
 *    school managers awaiting approval), or
 *  - they have the plain USER role (no school membership / pending teacher).
 *
 * Read access is unaffected — this guard is only applied to write endpoints.
 * Must run after JwtAuthGuard so that `request.user` is populated.
 */
@Injectable()
export class ApprovedContributorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Autenticação necessária.');
    }

    if (user.role === 'USER') {
      throw new ForbiddenException(
        'Vincule-se a uma escola e aguarde a aprovação para interagir no feed.',
      );
    }

    if (user.roleStatus !== 'APROVADO') {
      throw new ForbiddenException(
        'Seu cadastro ainda não foi aprovado. Você poderá publicar e interagir após a aprovação.',
      );
    }

    return true;
  }
}
