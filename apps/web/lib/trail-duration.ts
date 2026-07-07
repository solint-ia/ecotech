// The trail duration uses the same native time picker (<input type="time">,
// HH:MM) as the partner opening-hours form. Internally we store a friendly
// string ("2h 30min") for display; these helpers convert to/from the HH:MM
// value the picker needs (and parse legacy free-text like "2h30").

/** Friendly duration string -> "HH:MM" value for <input type="time">. */
export function durationToTimeInput(value?: string | null): string {
  if (!value) return '';
  const v = value.trim();

  // Already HH:MM.
  const hm = v.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) {
    const h = Math.min(23, parseInt(hm[1], 10));
    const m = Math.min(59, parseInt(hm[2], 10));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  let hours = 0;
  let mins = 0;
  const hMatch = v.match(/(\d+)\s*h/i);
  if (hMatch) hours = parseInt(hMatch[1], 10);
  const minMatch = v.match(/(\d+)\s*min/i);
  if (minMatch) {
    mins = parseInt(minMatch[1], 10);
  } else {
    // Compact "2h30" — digits right after the "h".
    const compact = v.match(/\d+\s*h\s*(\d{1,2})\b/i);
    if (compact) mins = parseInt(compact[1], 10);
  }

  if (!hMatch && !minMatch) return '';

  hours = Math.min(23, hours);
  mins = Math.min(59, mins);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/** "HH:MM" value from the picker -> friendly duration string for storage. */
export function timeInputToDuration(hhmm?: string | null): string {
  if (!hhmm) return '';
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return '';
  const hours = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  if (hours && mins) return `${hours}h ${mins}min`;
  if (hours) return `${hours}h`;
  if (mins) return `${mins}min`;
  return '';
}
