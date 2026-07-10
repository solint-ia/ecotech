'use client';

import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  text: string;
  /** Accessible name for the trigger button. */
  label?: string;
  /**
   * Which edge of the trigger the popover is anchored to. Use 'end' when the
   * trigger sits near the right of its card (popover opens leftwards) and
   * 'start' when it sits near the left, so the panel never runs off-screen.
   */
  align?: 'start' | 'end';
}

export function InfoTooltip({
  text,
  label = 'Como este valor é calculado',
  align = 'end',
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={label}
        aria-expanded={open}
        className="w-5 h-5 rounded-full border border-gray-200 bg-white text-gray-400 hover:text-forest hover:border-forest/30 flex items-center justify-center transition-colors shrink-0"
      >
        <Info className="w-3 h-3" />
      </button>

      {open && (
        <div
          role="tooltip"
          className={`absolute z-50 top-full mt-2 w-56 max-w-[70vw] rounded-xl border border-border-custom bg-white p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-foreground/80 shadow-xl ${
            align === 'end' ? 'right-0' : 'left-0'
          }`}
        >
          {text}
        </div>
      )}
    </div>
  );
}
