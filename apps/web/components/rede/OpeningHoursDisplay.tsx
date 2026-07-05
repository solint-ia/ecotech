import { Clock } from 'lucide-react';
import { OpeningHours, groupScheduleForDisplay } from '../../lib/opening-hours';

interface OpeningHoursDisplayProps {
  schedule: OpeningHours;
}

export function OpeningHoursDisplay({ schedule }: OpeningHoursDisplayProps) {
  const allClosed = schedule.length === 0 || schedule.every((d) => !d.enabled);

  return (
    <section className="bg-white rounded-2xl p-6 sm:p-8 border border-border-custom shadow-sm">
      <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
        <Clock className="w-6 h-6 text-secondary" />
        Horário de Funcionamento
      </h2>

      {allClosed ? (
        <p className="text-sm text-foreground/50">Horário de funcionamento não informado.</p>
      ) : (
        <>
          {/* Desktop: table-like grid spanning the full section width */}
          <div className="hidden md:block rounded-xl border border-border-custom overflow-hidden">
            {groupScheduleForDisplay(schedule).map((g, i) => (
              <div
                key={i}
                className={`grid grid-cols-2 px-5 py-3 text-sm ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFCFA]'} ${
                  i > 0 ? 'border-t border-border-custom' : ''
                }`}
              >
                <span className="font-semibold text-primary">{g.label}</span>
                <span className={g.hoursText === 'Fechado' ? 'text-foreground/40' : 'text-foreground/80'}>
                  {g.hoursText}
                </span>
              </div>
            ))}
          </div>

          {/* Mobile: compact grouped list */}
          <ul className="md:hidden space-y-2">
            {groupScheduleForDisplay(schedule).map((g, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-border-custom bg-white text-sm"
              >
                <span className="font-semibold text-primary">{g.label}</span>
                <span className={g.hoursText === 'Fechado' ? 'text-foreground/40' : 'text-foreground/70'}>
                  {g.hoursText}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
