/**
 * UI mirror of the API's `common/authorization/content-ownership.ts`.
 *
 * This only decides what to *render* — the API re-checks every one of these
 * rules on the request itself, so hiding a button is a courtesy, never the
 * control. Keep the two in sync: if a rule changes here, change it there too.
 */

export interface SessionUser {
  id?: string;
  role?: string;
  roleStatus?: string;
  schoolId?: string | null;
}

type MaybeUser = SessionUser | null | undefined;

const CONTRIBUTOR_ROLES = ['ADMIN', 'SCHOOL_MANAGER', 'TEACHER'];

/**
 * Mirrors RolesGuard: a teacher or school whose registration is still pending
 * (or was rejected) cannot create, edit or delete anything.
 */
export function isApprovedContributor(user: MaybeUser): boolean {
  if (!user?.role || !CONTRIBUTOR_ROLES.includes(user.role)) return false;
  return user.role === 'ADMIN' || user.roleStatus === 'APROVADO';
}

export function canCreateContent(user: MaybeUser): boolean {
  return isApprovedContributor(user);
}

/** ADMIN, the owning school, or the teacher who created the trail. */
export function canManageTrail(
  user: MaybeUser,
  trail: { schoolId?: string | null; createdById?: string | null },
): boolean {
  if (!isApprovedContributor(user)) return false;
  if (user!.role === 'ADMIN') return true;

  if (user!.role === 'SCHOOL_MANAGER') {
    return !!user!.schoolId && trail.schoolId === user!.schoolId;
  }

  if (user!.role === 'TEACHER') {
    return !!trail.createdById && trail.createdById === user!.id;
  }

  return false;
}

/** Partners belong to whoever registered them — schools do not inherit them. */
export function canManagePartner(
  user: MaybeUser,
  partner: { createdById?: string | null },
): boolean {
  if (!isApprovedContributor(user)) return false;
  if (user!.role === 'ADMIN') return true;
  return !!partner.createdById && partner.createdById === user!.id;
}
