export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');

export function fmtCompact(n: number): string {
  if (!isFinite(n)) return '∞';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(n);
}

/** Format very large numbers in scientific notation when needed. */
export function fmtBig(n: number): string {
  if (!isFinite(n)) return '> 1.8e308';
  if (n < 1e15) return fmtInt(n);
  const exp = Math.floor(Math.log10(n));
  const mant = n / 10 ** exp;
  return `${mant.toFixed(2)} × 10^${exp}`;
}

export function fmtMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)} µs`;
  if (ms < 1000) return `${ms.toFixed(ms < 10 ? 2 : 0)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/** Human readable duration from seconds (handles astronomically large values). */
export function fmtDuration(seconds: number): string {
  if (!isFinite(seconds)) return 'longer than the age of the universe';
  if (seconds < 1e-3) return 'instant (< 1 ms)';
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)} milliseconds`;
  const units: [string, number][] = [
    ['years', 31_557_600], ['days', 86_400], ['hours', 3_600], ['minutes', 60], ['seconds', 1],
  ];
  if (seconds > 31_557_600 * 1e12) return `${fmtBig(seconds / 31_557_600)} years`;
  if (seconds > 31_557_600 * 1000) return `${fmtCompact(seconds / 31_557_600)} years`;
  for (const [name, size] of units) {
    if (seconds >= size) {
      const v = seconds / size;
      return `${v < 10 ? v.toFixed(1) : fmtInt(v)} ${name}`;
    }
  }
  return `${seconds.toFixed(1)} seconds`;
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });

export const uid = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
