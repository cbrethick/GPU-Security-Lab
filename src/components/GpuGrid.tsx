import { memo } from 'react';

/**
 * Visual metaphor of GPU lanes: each cell lights up as its share of tasks completes.
 * `progress` 0..1. Cells are filled in "waves" to illustrate SIMT-style batches.
 */
export const GpuGrid = memo(function GpuGrid({ progress, cells = 256, color = '#22d3ee', cols = 32, active = false }: { progress: number; cells?: number; color?: string; cols?: number; active?: boolean }) {
  const lit = Math.floor(progress * cells);
  return (
    <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-hidden>
      {Array.from({ length: cells }, (_, i) => {
        const on = i < lit;
        const edge = active && i >= lit && i < lit + cols;
        return (
          <div key={i} className="aspect-square rounded-[2px] transition-colors duration-150"
            style={{ background: on ? color : edge ? `${color}55` : 'rgba(148,163,184,0.08)', boxShadow: on ? `0 0 6px ${color}88` : undefined }} />
        );
      })}
    </div>
  );
});

export const CpuCores = memo(function CpuCores({ progress, cores, color = '#a78bfa', active = false }: { progress: number; cores: number; color?: string; active?: boolean }) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-8" aria-hidden>
      {Array.from({ length: cores }, (_, i) => (
        <div key={i} className="rounded-lg border border-white/10 bg-ink-950/70 p-2">
          <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500"><span>Core {i}</span>{active && <span className="h-1.5 w-1.5 animate-pulseglow rounded-full" style={{ background: color }} />}</div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
});
