'use client';

import { Plus, Trash2 } from 'lucide-react';
import { WEEK_DAYS, DayKey, DaySchedule, OpeningHours, Shift, markAll24h } from '../../lib/opening-hours';

interface OpeningHoursEditorProps {
  value: OpeningHours;
  onChange: (value: OpeningHours) => void;
}

export function OpeningHoursEditor({ value, onChange }: OpeningHoursEditorProps) {
  const updateDay = (day: DayKey, updater: (d: DaySchedule) => DaySchedule) => {
    onChange(value.map((d) => (d.day === day ? updater(d) : d)));
  };

  const toggleDay = (day: DayKey) => {
    updateDay(day, (d) => ({ ...d, enabled: !d.enabled }));
  };

  const updateShift = (day: DayKey, index: number, field: keyof Shift, val: string) => {
    updateDay(day, (d) => ({
      ...d,
      shifts: d.shifts.map((s, i) => (i === index ? { ...s, [field]: val } : s)),
    }));
  };

  const addShift = (day: DayKey) => {
    updateDay(day, (d) => ({ ...d, shifts: [...d.shifts, { open: '08:00', close: '18:00' }] }));
  };

  const removeShift = (day: DayKey, index: number) => {
    updateDay(day, (d) => ({ ...d, shifts: d.shifts.filter((_, i) => i !== index) }));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-primary">Horário de Funcionamento *</label>
        <button
          type="button"
          onClick={() => onChange(markAll24h())}
          className="text-xs font-semibold text-secondary hover:underline"
        >
          Marcar tudo como 24h
        </button>
      </div>

      <div className="space-y-2">
        {WEEK_DAYS.map(({ key, label }) => {
          const day = value.find((d) => d.day === key);
          if (!day) return null;

          return (
            <div
              key={key}
              className={`rounded-lg border p-3 transition-colors ${
                day.enabled ? 'border-border-custom bg-white' : 'border-border-custom bg-beige/40'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={() => toggleDay(key)}
                    className="rounded text-secondary focus:ring-secondary cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-primary">{label}</span>
                </label>
                {!day.enabled && <span className="text-xs text-foreground/50">Fechado</span>}
              </div>

              {day.enabled && (
                <div className="mt-3 space-y-2">
                  {day.shifts.map((shift, index) => {
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="time"
                          required
                          value={shift.open}
                          onChange={(e) => updateShift(key, index, 'open', e.target.value)}
                          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border-custom bg-white text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
                        />
                        <span className="text-foreground/40 text-xs shrink-0">até</span>
                        <input
                          type="time"
                          required
                          value={shift.close}
                          onChange={(e) => updateShift(key, index, 'close', e.target.value)}
                          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border-custom bg-white text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
                        />
                        {day.shifts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeShift(key, index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                            title="Remover turno"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => addShift(key)}
                    className="flex items-center gap-1 text-xs font-semibold text-secondary hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar turno
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
