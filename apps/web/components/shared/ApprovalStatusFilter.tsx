'use client';

const OPTIONS = [
  { key: 'ALL', label: 'Todos' },
  { key: 'PENDENTE', label: 'Pendentes' },
  { key: 'APROVADO', label: 'Aprovados' },
  { key: 'REPROVADO', label: 'Reprovados' },
] as const;

interface ApprovalStatusFilterProps {
  value: string;
  onChange: (value: string) => void;
}

/** Segmented control to filter submissions by approval status (admin screens). */
export default function ApprovalStatusFilter({ value, onChange }: ApprovalStatusFilterProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start overflow-x-auto max-w-full">
      {OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
            value === opt.key ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
