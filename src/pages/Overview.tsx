import { motion } from 'framer-motion';
import { ArrowRight, Cpu, Gauge, Hash, KeyRound, LayoutDashboard, ShieldCheck, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CpuCores, GpuGrid } from '../components/GpuGrid';
import { AnimatedNumber, Badge, Card, CardTitle, ChartTooltip, Legend, PageHeader, SimBanner } from '../components/ui';
import { useApp } from '../context/AppContext';
import { AXIS, GRID, LINE, SERIES } from '../lib/chartColors';
import { fmtCompact, fmtDate, fmtMs } from '../lib/format';
import { ILLUSTRATIVE_RATES, STRENGTH_COLORS } from '../lib/password';

const CPU_OPS = 120_000;
const GPU_OPS = 1_850_000;

const SIZE_DATA = [
  { size: '1K tasks', CPU: 120_000, GPU: 310_000 },
  { size: '10K tasks', CPU: 120_000, GPU: 1_120_000 },
  { size: '100K tasks', CPU: 120_000, GPU: 1_780_000 },
  { size: '1M tasks', CPU: 120_000, GPU: 1_850_000 },
];

const PRACTICES = [
  { id: 'argon', label: 'Store passwords with Argon2id or bcrypt', weight: 25 },
  { id: 'salt', label: 'Unique random salt per password', weight: 15 },
  { id: 'mfa', label: 'Multi-factor authentication enabled', weight: 20 },
  { id: 'length', label: 'Minimum length ≥ 12 characters', weight: 15 },
  { id: 'breach', label: 'Block known-weak / common passwords', weight: 10 },
  { id: 'rate', label: 'Rate-limit online login attempts', weight: 10 },
  { id: 'nomd5', label: 'No MD5 / SHA-1 for credentials', weight: 5 },
];

function SecurityScore() {
  const [checked, setChecked] = useState<Record<string, boolean>>({ argon: true, salt: true, mfa: false, length: true, breach: false, rate: true, nomd5: true });
  const score = PRACTICES.reduce((s, p) => s + (checked[p.id] ? p.weight : 0), 0);
  const tone = score >= 85 ? '#22c55e' : score >= 60 ? '#eab308' : '#f43f5e';
  const R = 52, C = 2 * Math.PI * R;
  return (
    <Card delay={0.25}>
      <CardTitle icon={<ShieldCheck size={16} />} title="Security Score" subtitle="Toggle practices for a sample system" />
      <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r={R} stroke="rgba(148,163,184,0.12)" strokeWidth="10" fill="none" />
            <motion.circle cx="60" cy="60" r={R} stroke={tone} strokeWidth="10" fill="none" strokeLinecap="round"
              strokeDasharray={C} animate={{ strokeDashoffset: C * (1 - score / 100) }} transition={{ duration: 0.6 }}
              style={{ filter: `drop-shadow(0 0 6px ${tone})` }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white">{score}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500">/ 100</span>
          </div>
        </div>
        <ul className="w-full space-y-1.5">
          {PRACTICES.map((p) => (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" className="accent-[rgb(var(--accent))]" checked={!!checked[p.id]} onChange={(e) => setChecked((c) => ({ ...c, [p.id]: e.target.checked }))} />
                <span className="flex-1">{p.label}</span>
                <span className="mono text-slate-500">+{p.weight}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function LiveGpuViz() {
  const [p, setP] = useState(0);
  const { settings } = useApp();
  useEffect(() => {
    if (!settings.animations) { setP(0.62); return; }
    const id = setInterval(() => setP((v) => (v >= 1 ? 0 : v + 0.02)), 60);
    return () => clearInterval(id);
  }, [settings.animations]);
  const cpuP = (p * 1.6) % 1; // illustrative only
  return (
    <Card delay={0.3} className="lg:col-span-2">
      <CardTitle icon={<Zap size={16} />} title="Parallel Processing Visualization" subtitle="Few powerful cores vs. thousands of lightweight lanes (conceptual animation)" right={<Badge tone="warning">Illustrative</Badge>} />
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="label">CPU · 8 cores · sequential batches</p>
          <CpuCores cores={8} progress={cpuP} active />
          <p className="mt-3 text-xs text-slate-400">Each core is fast and handles complex branching logic, but there are only a few of them.</p>
        </div>
        <div>
          <p className="label">GPU · 512 lanes shown · SIMT waves</p>
          <GpuGrid progress={p} cells={512} cols={32} active />
          <p className="mt-3 text-xs text-slate-400">Each lane is simpler, but thousands run the same instruction on different data simultaneously.</p>
        </div>
      </div>
    </Card>
  );
}

export default function Overview() {
  const { history, navigate, lastStrength } = useApp();
  const recent = history.slice(0, 5);
  const hashData = useMemo(() => ILLUSTRATIVE_RATES.map((r) => ({ name: r.algo.replace(/ \(.*\)/, ''), full: r.algo, log: Math.log10(r.rate), rate: r.rate })), []);

  const metric = [
    { title: 'CPU Processing', value: CPU_OPS, suffix: 'ops/sec', icon: <Cpu size={18} />, color: LINE.cpu, note: 'Simulated · 8-core model' },
    { title: 'GPU Processing', value: GPU_OPS, suffix: 'ops/sec', icon: <Zap size={18} />, color: LINE.gpu, note: 'Simulated · 4,096-lane model' },
  ];

  return (
    <div>
      <PageHeader
        icon={<LayoutDashboard size={26} />}
        title="GPU-Based Password Security Lab"
        subtitle="Understanding GPU acceleration and password security"
        right={<button className="btn-primary" onClick={() => navigate('gpu')}>Run a simulation <ArrowRight size={16} /></button>}
      />
      <SimBanner detail="Metrics on this dashboard are simulated educational benchmark values. They are not measurements of your hardware." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metric.map((m, i) => (
          <Card key={m.title} glow delay={i * 0.05}>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase tracking-wider">{m.title}</span>
              <span style={{ color: m.color }}>{m.icon}</span>
            </div>
            <p className="mono mt-3 text-2xl font-bold text-white"><AnimatedNumber value={m.value} /></p>
            <p className="text-xs text-slate-400">{m.suffix}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
              <motion.div className="h-full rounded-full" style={{ background: m.color }} initial={{ width: 0 }} animate={{ width: `${(m.value / GPU_OPS) * 100}%` }} transition={{ duration: 1.2 }} />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">{m.note}</p>
          </Card>
        ))}
        <Card glow delay={0.1}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Hashing Algorithm</span>
            <Hash size={18} className="text-accent" />
          </div>
          <p className="mt-3 text-2xl font-bold text-white">SHA-256</p>
          <p className="text-xs text-slate-400">Default lab workload</p>
          <div className="mt-3 flex flex-wrap gap-1.5"><Badge tone="good">Integrity: secure</Badge><Badge tone="warning">Passwords: too fast</Badge></div>
          <p className="mt-2 text-[11px] text-slate-500">For password storage use Argon2id or bcrypt.</p>
        </Card>
        <Card glow delay={0.15}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Password Strength</span>
            <KeyRound size={18} className="text-accent-2" />
          </div>
          {lastStrength ? (
            <>
              <p className="mt-3 text-2xl font-bold" style={{ color: STRENGTH_COLORS[lastStrength.category] }}>{lastStrength.category}</p>
              <p className="text-xs text-slate-400">≈ {lastStrength.entropy.toFixed(1)} bits effective entropy</p>
              <p className="mt-3 text-[11px] text-slate-500">Last analysis this session · password never stored</p>
            </>
          ) : (
            <>
              <p className="mt-3 text-2xl font-bold text-white">—</p>
              <p className="text-xs text-slate-400">No analysis yet this session</p>
              <button className="btn-ghost mt-3 w-full py-1.5 text-xs" onClick={() => navigate('analyzer')}>Analyze a password locally</button>
            </>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Card delay={0.2} className="sm:col-span-1">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400"><Gauge size={16} className="text-accent" /> Performance Improvement</div>
          <p className="neon-text mono mt-3 text-5xl font-bold"><AnimatedNumber value={GPU_OPS / CPU_OPS} format={(n) => `${n.toFixed(1)}x`} /></p>
          <p className="mt-2 text-xs text-slate-400">Simulated GPU vs CPU throughput (1,850,000 ÷ 120,000) on an embarrassingly parallel workload.</p>
        </Card>
        <Card delay={0.22} className="sm:col-span-2">
          <CardTitle title="CPU vs GPU Throughput by Batch Size" subtitle="Simulated ops/sec — GPU advantage grows as overhead is amortized" right={<Legend items={[{ label: 'CPU', color: SERIES.cpu }, { label: 'GPU', color: SERIES.gpu }]} />} />
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={SIZE_DATA} barGap={2} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="size" stroke={AXIS} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis stroke={AXIS} tick={{ fontSize: 11 }} tickFormatter={fmtCompact} tickLine={false} axisLine={false} width={44} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<ChartTooltip formatter={(v) => `${v.toLocaleString()} ops/s`} />} />
                <Bar dataKey="CPU" fill={SERIES.cpu} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="GPU" fill={SERIES.gpu} radius={[4, 4, 0, 0]} maxBarSize={28}>
                  <LabelList dataKey="GPU" position="top" formatter={fmtCompact} style={{ fill: '#94a3b8', fontSize: 10 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card delay={0.24} className="lg:col-span-2">
          <CardTitle title="Hash Algorithm Comparison" subtitle="Illustrative offline guesses/sec on one high-end GPU (log₁₀ scale) — lower is safer for password storage" />
          <div className="h-60">
            <ResponsiveContainer>
              <BarChart data={hashData} layout="vertical" margin={{ top: 0, right: 56, left: 8, bottom: 0 }}>
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" domain={[0, 12]} stroke={AXIS} tick={{ fontSize: 11 }} tickFormatter={(v) => `10^${v}`} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke={AXIS} tick={{ fontSize: 11, fill: '#cbd5e1' }} width={72} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={({ active, payload }) => active && payload?.length ? (
                  <div className="rounded-lg border border-white/10 bg-ink-900/95 px-3 py-2 text-xs">
                    <p className="font-medium text-slate-200">{payload[0].payload.full}</p>
                    <p className="mono text-slate-400">≈ {fmtCompact(payload[0].payload.rate)} guesses/sec</p>
                  </div>) : null} />
                <Bar dataKey="log" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {hashData.map((d) => <Cell key={d.name} fill={d.log > 9 ? '#e11d48' : '#059669'} />)}
                  <LabelList dataKey="rate" position="right" formatter={(v: number) => fmtCompact(v) + '/s'} style={{ fill: '#94a3b8', fontSize: 10 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-3"><Badge tone="critical">Fast hash — GPU-friendly</Badge><Badge tone="good">Slow / memory-hard — GPU-resistant</Badge></div>
        </Card>
        <SecurityScore />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <LiveGpuViz />
        <Card delay={0.35}>
          <CardTitle title="Recent Experiments" subtitle={`${history.length} stored locally`} right={<button className="text-xs text-accent hover:underline" onClick={() => navigate('history')}>View all</button>} />
          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No experiments yet. Run the GPU Simulation to create one.</p>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500"><tr><th className="px-2 py-2 font-medium">Experiment</th><th className="px-2 py-2 font-medium">CPU / GPU</th><th className="px-2 py-2 text-right font-medium">Ratio</th></tr></thead>
                <tbody>
                  {recent.map((e) => (
                    <tr key={e.id} className="border-t border-white/5">
                      <td className="px-2 py-2"><p className="max-w-[160px] truncate text-slate-200">{e.name}</p><p className="text-[10px] text-slate-500">{fmtDate(e.date)}</p></td>
                      <td className="mono px-2 py-2 text-slate-400">{fmtMs(e.cpuTimeMs)} / {fmtMs(e.gpuTimeMs)}</td>
                      <td className="mono px-2 py-2 text-right text-accent">{e.ratio.toFixed(1)}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
