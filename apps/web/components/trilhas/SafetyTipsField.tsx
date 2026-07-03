'use client';

import { Plus, X } from 'lucide-react';

interface SafetyTipsFieldProps {
  tips: string[];
  onChange: (tips: string[]) => void;
}

export default function SafetyTipsField({ tips, onChange }: SafetyTipsFieldProps) {
  const updateTip = (index: number, value: string) => {
    const next = [...tips];
    next[index] = value;
    onChange(next);
  };

  const removeTip = (index: number) => {
    onChange(tips.filter((_, i) => i !== index));
  };

  const addTip = () => {
    onChange([...tips, '']);
  };

  return (
    <div className="space-y-2">
      {tips.map((tip, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            value={tip}
            onChange={(e) => updateTip(index, e.target.value)}
            placeholder="Ex: Leve água suficiente para toda a trilha"
            className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all"
          />
          <button
            type="button"
            onClick={() => removeTip(index)}
            className="shrink-0 p-2 text-foreground/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Remover dica"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addTip}
        className="flex items-center gap-1.5 text-sm font-medium text-forest hover:text-forest/80 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Adicionar dica
      </button>
    </div>
  );
}
