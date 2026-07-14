import { XCircle } from 'lucide-react';

interface RejectionNoticeProps {
  reason?: string | null;
  className?: string;
}

/**
 * The admin's justification, shown back to the author of a rejected submission.
 * Renders nothing when there is no reason — older rejections, made before the
 * justification field existed, simply have none.
 */
export default function RejectionNotice({ reason, className = '' }: RejectionNoticeProps) {
  if (!reason) return null;

  return (
    <div className={`rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 ${className}`}>
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-red-700 mb-1">
        <XCircle className="w-3.5 h-3.5 shrink-0" />
        Motivo da reprovação
      </p>
      <p className="text-sm text-red-900 leading-relaxed whitespace-pre-line break-words">
        {reason}
      </p>
    </div>
  );
}
