import { Cpu, Gauge, Info, Layers, Play, RotateCcw, Square, Timer, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CpuCores, GpuGrid } from '../components/GpuGrid';
import { Badge, Card, CardTitle, ChartTooltip, Legend, PageHeader, Segmented, SimBanner, Slider } from '../components/ui';
import { useApp } from '../context/AppContext';
import { calibrate, model, webgpuEngine, WORKLOAD_LABELS, type BenchmarkConfig, type Intensity, type Workload } from '../lib/benchmark';
import { AXIS, GRID, LINE, SERIES } from '../lib/chartColors';
import { fmtCompact, fmtInt, fmtMs } from '../lib/format';

type Phase = 'idle' | 'calibrating' | 'running' | 'done' | 'stopped';

const TASK_STEPS = [100, 500, 1_000, 5_000, 10_000, 50_000, 100_000, 500_000, 1_000_000];

interface RunResult { taskMs: number; samples: number; cpuTimeMs: number; gpuTimeMs: number; speedup: number; config: BenchmarkConfig; checksum: number }

export default function GpuSimulation() {
  const { addExperiment, settings, notify } = useApp();
  const [taskIdx, setTaskIdx] = useState(4);
  const [cpuWorkers, setCpuWorkers] = useState(8);
  const [gpuWorkers, setGpuWorkers] = useState(2048);
  const [workload, setWorkload] = useState<Workload>('float-math');
  const [intensity, setIntensity] = useState<Intensity>('medium');
  const tasks = TASK_STEPS[taskIdx];

  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<RunResult | null>(null);
  const [cpuP, setCpuP] = useState(0);
  const [gpuP, setGpuP] = useState(0);
  const [runs, setRuns] = useState<{ run: string; CPU: number; GPU: number; speedup: number }[]>([]);
  const [webgpu, setWebgpu] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const raf = useRef<number>();
  const stopRef = useRef(false);

  useEffect(() => { webgpuEngine.isAvailable().then((ok) => setWebgpu(ok ? 'available' : 'unavailable')); }, []);
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  const busy = phase === 'calibrating' || phase === 'running';

  const run = async () => {
    stopRef.current = false;
    setPhase('calibrating');
    setCpuP(0); setGpuP(0);
    const config: BenchmarkConfig = { tasks, cpuWorkers, gpuWorkers, workload, intensity };
    let cal;
    try {
      cal = await calibrate(workload, intensity);
    } catch (e) {
      setPhase('idle');
      notify(`Calibration failed: ${(e as Error).message}`, 'error');
      return;
    }
    if (stopRef.current) { setPhase('stopped'); return; }
    const m = model(config, cal.taskMs);
    const r: RunResult = { taskMs: cal.taskMs, samples: cal.samples, ...m, config, checksum: cal.checksum };
    setResult(r);
    setPhase('running');

    // Visual playback: slower side spans ~6s at 1x speed; faster side is proportional.
    const base = 6000 / settings.simulationSpeed;
    const slow = Math.max(m.cpuTimeMs, m.gpuTimeMs);
    const cpuDur = Math.max(250, (m.cpuTimeMs / slow) * base);
    const gpuDur = Math.max(250, (m.gpuTimeMs / slow) * base);
    const t0 = performance.now();
    const tick = (now: number) => {
      const el = now - t0;
      const c = Math.min(1, el / cpuDur);
      const g = Math.min(1, el / gpuDur);
      setCpuP(c); setGpuP(g);
      if (stopRef.current) {
        setPhase('stopped');
        addExperiment({ name: `${WORKLOAD_LABELS[workload].split(' (')[0]} · ${fmtCompact(tasks)} tasks (stopped)`, algorithm: WORKLOAD_LABELS[workload], inputSize: tasks, cpuTimeMs: m.cpuTimeMs, gpuTimeMs: m.gpuTimeMs, ratio: m.speedup, status: 'aborted', module: 'GPU Simulation' });
        return;
      }
      if (c < 1 || g < 1) { raf.current = requestAnimationFrame(tick); return; }
      setPhase('done');
      setRuns((rs) => [...rs.slice(-9), { run: `#${rs.length + 1}`, CPU: m.cpuTimeMs, GPU: m.gpuTimeMs, speedup: m.speedup }]);
      addExperiment({ name: `${WORKLOAD_LABELS[workload].split(' (')[0]} · ${fmtCompact(tasks)} tasks · ${intensity}`, algorithm: WORKLOAD_LABELS[workload], inputSize: tasks, cpuTimeMs: m.cpuTimeMs, gpuTimeMs: m.gpuTimeMs, ratio: m.speedup, status: 'completed', module: 'GPU Simulation' });
      notify('Experiment saved to history', 'success');
    };
    raf.current = requestAnimationFrame(tick);
  };

  const stop = () => { stopRef.current = true; };
  const reset = () => { if (raf.current) cancelAnimationFrame(raf.current); setPhase('idle'); setResult(null); setCpuP(0); setGpuP(0); };

  const scaling = useMemo(() => {
    if (!result) return [];
    return TASK_STEPS.map((t) => {
      const m = model({ ...result.config, tasks: t }, result.taskMs);
      return { tasks: fmtCompact(t), speedup: Number(m.speedup.toFixed(2)) };
    });
  }, [result]);

  const cpuDone = result ? Math.floor(cpuP * result.config.tasks) : 0;
  const gpuDone = result ? Math.floor(gpuP * result.config.tasks) : 0;
  const visibleCores = Math.min(cpuWorkers, 16);

  return (
    <div>
      <PageHeader icon={<Cpu size={26} />} title="GPU vs CPU Simulation Lab" subtitle="Explore how parallel workers change throughput on a safe computational workload" />
      <SimBanner detail="A real workload (math or SHA-256 on random sample data) runs on your CPU to calibrate per-task cost. CPU-core and GPU-lane parallelism is then MODELED — this is not CUDA or a real GPU measurement." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card glow className="lg:col-span-1">
          <CardTitle icon={<Layers size={16} />} title="Experiment Configuration" />
          <div className="space-y-5">
            <Slider label="Simulated tasks" value={taskIdx} min={0} max={TASK_STEPS.length - 1} onChange={setTaskIdx} format={() => fmtInt(tasks)} disabled={busy} />
            <Slider label="CPU workers (cores)" value={cpuWorkers} min={1} max={32} onChange={setCpuWorkers} disabled={busy} />
            <Slider label="GPU workers (lanes)" value={gpuWorkers} min={64} max={8192} step={64} onChange={setGpuWorkers} format={fmtInt} disabled={busy} />
            <div>
              <label className="label" htmlFor="wl">Processing workload</label>
              <select id="wl" className="input" value={workload} onChange={(e) => setWorkload(e.target.value as Workload)} disabled={busy}>
                {(Object.keys(WORKLOAD_LABELS) as Workload[]).map((w) => <option key={w} value={w}>{WORKLOAD_LABELS[w]}</option>)}
              </select>
            </div>
            <div>
              <p className="label">Intensity per task</p>
              <Segmented value={intensity} onChange={(v) => !busy && setIntensity(v)} options={[{ value: 'light', label: 'Light' }, { value: 'medium', label: 'Medium' }, { value: 'heavy', label: 'Heavy' }]} />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {!busy ? <button className="btn-primary flex-1" onClick={run}><Play size={16} /> Run experiment</button>
                : <button className="btn-danger flex-1" onClick={stop}><Square size={16} /> Stop</button>}
              <button className="btn-ghost" onClick={reset} disabled={busy}><RotateCcw size={16} /> Reset</button>
            </div>
            <p className="text-[11px] text-slate-500">Playback speed: {settings.simulationSpeed}x (change in Settings).</p>
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardTitle icon={<Cpu size={16} />} title={`CPU Processing · ${cpuWorkers} cores`} subtitle={visibleCores < cpuWorkers ? `Showing 16 of ${cpuWorkers} cores` : 'Few fast cores, sequential batches'}
              right={<span className="mono text-sm" style={{ color: LINE.cpu }}>{fmtInt(cpuDone)} / {fmtInt(result?.config.tasks ?? tasks)}</span>} />
            <CpuCores cores={visibleCores} progress={cpuP} color={LINE.cpu} active={phase === 'running' && cpuP < 1} />
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full" style={{ width: `${cpuP * 100}%`, background: LINE.cpu, boxShadow: `0 0 10px ${LINE.cpu}` }} /></div>
          </Card>
          <Card>
            <CardTitle icon={<Zap size={16} />} title={`GPU-style Parallel Processing · ${fmtInt(gpuWorkers)} lanes`} subtitle="Each cell ≈ 1/512 of the workload; waves illustrate SIMT batches"
              right={<span className="mono text-sm" style={{ color: LINE.gpu }}>{fmtInt(gpuDone)} / {fmtInt(result?.config.tasks ?? tasks)}</span>} />
            <GpuGrid progress={gpuP} cells={512} cols={32} color={LINE.gpu} active={phase === 'running' && gpuP < 1} />
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full" style={{ width: `${gpuP * 100}%`, background: LINE.gpu, boxShadow: `0 0 10px ${LINE.gpu}` }} /></div>
          </Card>
          {phase === 'calibrating' && <p className="flex items-center gap-2 text-sm text-amber-200"><Timer size={16} className="animate-pulse" /> Calibrating: running the real workload on your CPU (~0.2 s)…</p>}
        </div>
      </div>

      {result && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Simulated CPU time', value: fmtMs(result.cpuTimeMs), sub: `${fmtCompact(result.config.tasks / (result.cpuTimeMs / 1000))} tasks/s`, color: LINE.cpu },
            { label: 'Simulated GPU time', value: fmtMs(result.gpuTimeMs), sub: `${fmtCompact(result.config.tasks / (result.gpuTimeMs / 1000))} tasks/s`, color: LINE.gpu },
            { label: 'Speedup ratio', value: `${result.speedup.toFixed(2)}x`, sub: result.speedup >= 1 ? 'GPU model faster' : 'CPU faster — overhead dominates', color: '#e2e8f0' },
            { label: 'Measured task cost', value: fmtMs(result.taskMs), sub: `${fmtInt(result.samples)} real tasks ran on this CPU`, color: '#e2e8f0' },
          ].map((s) => (
            <Card key={s.label}>
              <p className="text-xs uppercase tracking-wider text-slate-400">{s.label}</p>
              <p className="mono mt-2 text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="mt-1 text-xs text-slate-500">{s.sub}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle icon={<Gauge size={16} />} title="Performance Graph — This Session" subtitle="Simulated processing time per run (lower is better)" right={<Legend items={[{ label: 'CPU', color: SERIES.cpu }, { label: 'GPU', color: SERIES.gpu }]} />} />
          {runs.length === 0 ? <p className="py-16 text-center text-sm text-slate-500">Complete a run to plot results.</p> : (
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={runs} barGap={2} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="run" stroke={AXIS} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis stroke={AXIS} tick={{ fontSize: 11 }} tickFormatter={(v) => fmtMs(v)} tickLine={false} axisLine={false} width={56} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<ChartTooltip formatter={fmtMs} />} />
                  <Bar dataKey="CPU" fill={SERIES.cpu} radius={[4, 4, 0, 0]} maxBarSize={26} />
                  <Bar dataKey="GPU" fill={SERIES.gpu} radius={[4, 4, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card>
          <CardTitle icon={<Layers size={16} />} title="Speedup vs Task Count" subtitle="Model output for your configuration — small batches can't hide GPU launch overhead" />
          {!result ? <p className="py-16 text-center text-sm text-slate-500">Run an experiment to compute the scaling curve.</p> : (
            <div className="h-56">
              <ResponsiveContainer>
                <LineChart data={scaling} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="tasks" stroke={AXIS} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis stroke={AXIS} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}x`} tickLine={false} axisLine={false} width={44} />
                  <ReferenceLine y={1} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'break-even', fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }} />
                  <Tooltip content={<ChartTooltip formatter={(v) => `${v}x`} />} />
                  <Line type="monotone" dataKey="speedup" name="Speedup" stroke={LINE.gpu} strokeWidth={2} dot={{ r: 4, fill: LINE.gpu, stroke: '#0a0e17', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle icon={<Info size={16} />} title="The model, transparently" />
          <div className="mono space-y-2 rounded-xl border border-white/10 bg-ink-950/60 p-4 text-xs text-slate-300">
            <p><span className="text-slate-500">t_task</span> = measured average time of one task on this CPU {result && <span className="text-accent">= {fmtMs(result.taskMs)}</span>}</p>
            <p><span style={{ color: LINE.cpu }}>T_cpu</span> = ⌈tasks ÷ cpu_workers⌉ × t_task</p>
            <p><span style={{ color: LINE.gpu }}>T_gpu</span> = launch_overhead (2.5 ms) + tasks × 0.4 µs transfer + ⌈tasks ÷ gpu_lanes⌉ × t_task × 12</p>
            <p><span className="text-slate-500">speedup</span> = T_cpu ÷ T_gpu</p>
          </div>
          <p className="mt-3 text-sm text-slate-400">The ×12 lane-slowdown reflects that an individual GPU lane is much simpler and slower than a CPU core; GPUs win by running thousands of lanes at once. These constants are illustrative teaching values, not properties of any specific GPU.</p>
        </Card>
        <Card>
          <CardTitle icon={<Zap size={16} />} title="WebGPU Module" subtitle="Architecture-ready for a real GPU benchmark" />
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-slate-400">WebGPU in this browser</span>
              {webgpu === 'checking' ? <Badge>Checking…</Badge> : webgpu === 'available' ? <Badge tone="good">Adapter available</Badge> : <Badge tone="neutral">Not available</Badge>}
            </div>
            <div className="flex items-center justify-between"><span className="text-slate-400">Benchmark engine</span><Badge tone="info">Planned module</Badge></div>
            <p className="text-xs text-slate-500">The app uses a <code className="mono text-slate-300">BenchmarkEngine</code> interface (<code className="mono text-slate-300">src/lib/benchmark.ts</code>). A future WebGPU compute-shader engine can plug in without UI changes. Until then, all GPU figures remain simulated.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
