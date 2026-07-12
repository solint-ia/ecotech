import { ForbiddenException } from '@nestjs/common';

/**
 * Single source of truth for "may this user change this record?".
 *
 * RolesGuard already rejects TEACHER/SCHOOL_MANAGER whose roleStatus is not
 * APROVADO, so these helpers only decide ownership — never approval state.
 */
export interface RequestingUser {
  id: string;
  role: string;
  schoolId?: string | null;
}

export interface TrailOwnership {
  schoolId?: string | null;
  createdById?: string | null;
}

/**
 * Trails and everything nested under them (educational points, biodiversity
 * items, trail photos):
 *
 *  - ADMIN          → any trail
 *  - SCHOOL_MANAGER → trails that belong to their school
 *  - TEACHER        → only trails they created
 *
 * A teacher may be linked to several schools, so school membership alone is not
 * enough to grant write access — it would let any teacher of a school rewrite a
 * colleague's trail.
 */
export function canManageTrail(user: RequestingUser, trail: TrailOwnership): boolean {
  if (user.role === 'ADMIN') return true;

  if (user.role === 'SCHOOL_MANAGER') {
    return !!user.schoolId && trail.schoolId === user.schoolId;
  }

  if (user.role === 'TEACHER') {
    return !!trail.createdById && trail.createdById === user.id;
  }

  return false;
}

export function assertCanManageTrail(
  user: RequestingUser,
  trail: TrailOwnership,
  message = 'Você só pode gerenciar trilhas de sua autoria.',
): void {
  if (!canManageTrail(user, trail)) {
    throw new ForbiddenException(message);
  }
}

/**
 * Partners are owned by whoever registered them — a school manager does not
 * inherit the partners registered by the teachers of their school.
 */
export function canManagePartner(
  user: RequestingUser,
  partner: { createdById?: string | null },
): boolean {
  if (user.role === 'ADMIN') return true;

  if (user.role === 'SCHOOL_MANAGER' || user.role === 'TEACHER') {
    return !!partner.createdById && partner.createdById === user.id;
  }

  return false;
}

export function assertCanManagePartner(
  user: RequestingUser,
  partner: { createdById?: string | null },
  message = 'Você só pode gerenciar parceiros cadastrados por você.',
): void {
  if (!canManagePartner(user, partner)) {
    throw new ForbiddenException(message);
  }
}
