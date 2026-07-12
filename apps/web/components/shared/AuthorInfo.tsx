import { GraduationCap, School, Shield, User } from 'lucide-react';

export interface Author {
  id?: string;
  name: string;
  role?: string;
  school?: { id?: string; name: string } | null;
}

/** How each role signs the content it publishes. */
const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  SCHOOL_MANAGER: 'Escola',
  TEACHER: 'Professor',
  STUDENT: 'Estudante',
  USER: 'Usuário',
};

const ROLE_ICONS: Record<string, typeof User> = {
  ADMIN: Shield,
  SCHOOL_MANAGER: School,
  TEACHER: GraduationCap,
};

interface AuthorInfoProps {
  author?: Author | null;
  /** Falls back to the content's own school when the author has none. */
  school?: { name: string } | null;
  className?: string;
}

/**
 * Name of whoever submitted a trail / material / partner, plus what kind of
 * account they hold — so an admin reviewing a queue knows who to hold to it.
 */
export function AuthorInfo({ author, school, className = '' }: AuthorInfoProps) {
  if (!author?.name) {
    return <span className={`text-sm text-foreground/40 ${className}`}>Autor não informado</span>;
  }

  const roleLabel = author.role ? ROLE_LABELS[author.role] : undefined;
  const Icon = (author.role && ROLE_ICONS[author.role]) || User;
  // A school manager already *is* the school, so repeating its name adds nothing.
  const affiliation =
    author.role === 'SCHOOL_MANAGER' ? null : (author.school?.name ?? school?.name ?? null);

  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-sm font-medium text-foreground/80 truncate">{author.name}</p>
      {(roleLabel || affiliation) && (
        <p className="text-xs text-foreground/50 flex items-center gap-1 truncate">
          <Icon className="w-3 h-3 shrink-0" />
          {roleLabel}
          {affiliation && <span className="truncate">· {affiliation}</span>}
        </p>
      )}
    </div>
  );
}

export default AuthorInfo;
