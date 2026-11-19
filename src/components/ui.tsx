import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { AlertTriangle, CheckCircle2, FlaskConical, Info, ShieldAlert, XCircle } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export function Card({ children, className = '', glow = false, delay = 0 }: { children: ReactNode; className?: string; glow?: boolean; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={`glass ${glow ? 'glow-border' : ''} p-5 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function CardTitle({ icon, title, subtitle, right }: { icon?: ReactNode; title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && <div className="mt-0.5 rounded-lg border border-accent/25 bg-accent/10 p-2 text-accent">{icon}</div>}
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

export function PageHeader({ title, subtitle, icon, right }: { title: string; subtitle: string; icon: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex items-center gap-4">
        <div className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-accent shadow-[0_0_30px_-8px_rgb(var(--accent)/0.6)]">{icon}</div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
      </div>
      {right}
    </div>
  );
}

type Tone = 'good' | 'warning' | 'critical' | 'info' | 'neutral' | 'accent';
const toneCls: Record<Tone, string> = {
  good: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  critical: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  info: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  neutral: 'border-white/10 bg-white/5 text-slate-300',
  accent: 'border-accent/40 bg-accent/10 text-accent',
};
const toneIcon: Partial<Record<Tone, ReactNode>> = {
  good: <CheckCircle2 size={12} />, warning: <AlertTriangle size={12} />, critical: <XCircle size={12} />, info: <Info size={12} />,
};

export function Badge({ tone = 'neutral', children, icon = true }: { tone?: Tone; children: ReactNode; icon?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneCls[tone]}`}>
      {icon && toneIcon[tone]}
      {children}
    </span>
  );
}

export function SimBanner({ text = 'Educational Simulation — Not a Real GPU Benchmark', detail }: { text?: string; detail?: string }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 text-sm">
      <FlaskConical size={18} className="mt-0.5 shrink-0 text-amber-300" />
      <div>
        <p className="font-semibold text-amber-200">{text}</p>
        {detail && <p className="mt-0.5 text-xs text-amber-100/70">{detail}</p>}
      </div>
    </div>
  );
}

export function SafetyNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-200/90">
      <ShieldAlert size={14} className="mt-0.5 shrink-0 text-emerald-300" />
      <span>{children}</span>
    </div>
  );
}

export function AnimatedNumber({ value, format = (n: number) => Math.round(n).toLocaleString('en-US'), duration = 1.2 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => format(v));
  const [display, setDisplay] = useState(format(0));
  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: 'easeOut' });
    const unsub = text.on('change', setDisplay);
    return () => { controls.stop(); unsub(); };
  }, [value, duration, mv, text]);
  return <span>{display}</span>;
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block text-sm font-medium text-slate-200">{label}</span>
        {description && <span className="block text-xs text-slate-400">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full border transition ${checked ? 'border-accent/60 bg-accent/30' : 'border-white/15 bg-white/5'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${checked ? 'left-6 bg-accent shadow-[0_0_10px_rgb(var(--accent))]' : 'left-1 bg-slate-400'}`} />
      </button>
    </label>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, size = 'md' }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; size?: 'sm' | 'md' }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg border border-white/10 bg-ink-950/60 p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-md ${size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} font-medium transition ${
            value === o.value ? 'bg-accent/20 text-accent shadow-[0_0_12px_-4px_rgb(var(--accent))]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({ label, value, min, max, step = 1, onChange, format = (v: number) => v.toLocaleString(), disabled }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string; disabled?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="label mb-0">{label}</span>
        <span className="mono text-sm text-accent">{format(value)}</span>
      </div>
      <input type="range" className="w-full" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
    </div>
  );
}

/** Two-step confirm without browser dialogs. */
export function ConfirmButton({ onConfirm, children, confirmText = 'Click again to confirm', className = 'btn-danger' }: { onConfirm: () => void; children: ReactNode; confirmText?: string; className?: string }) {
  const [armed, setArmed] = useState(false);
  const t = useRef<number>();
  useEffect(() => () => window.clearTimeout(t.current), []);
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (armed) { setArmed(false); onConfirm(); return; }
        setArmed(true);
        t.current = window.setTimeout(() => setArmed(false), 3000);
      }}
    >
      {armed ? confirmText : children}
    </button>
  );
}

export function ChartTooltip({ active, payload, label, unit = '', formatter }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string | number; unit?: string; formatter?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-ink-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      {label !== undefined && <p className="mb-1 font-medium text-slate-300">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-slate-200">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="mono">{formatter ? formatter(p.value) : `${p.value.toLocaleString()}${unit}`}</span>
        </p>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-slate-400">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />{i.label}</span>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 rounded-full border border-white/10 bg-white/5 p-4 text-slate-400">{icon}</div>
      <p className="font-medium text-slate-200">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-400">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
