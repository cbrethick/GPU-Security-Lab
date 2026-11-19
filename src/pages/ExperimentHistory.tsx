import { ArrowDown, ArrowUp, ArrowUpDown, Download, FlaskConical, History, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge, Card, ConfirmButton, EmptyState, PageHeader, SafetyNote } from '../components/ui';
import { useApp } from '../context/AppContext';
import { fmtDate, fmtInt, fmtMs } from '../lib/format';
import { downloadBlob, experimentsToCsv } from '../lib/report';
import type { Experiment } from '../types';

type SortKey = 'name' | 'date' | 'algorithm' | 'inputSize' | 'cpuTimeMs' | 'gpuTimeMs' | 'ratio' | 'status';

const COLS: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'name', label: 'Experiment' },
  { key: 'date', label: 'Date' },
  { key: 'algorithm', label: 'Algorithm / Workload' },
  { key: 'inputSize', label: 'Input size', align: 'right' },
  { key: 'cpuTimeMs', label: 'Sim. CPU', align: 'right' },
  { key: 'gpuTimeMs', label: 'Sim. GPU', align: 'right' },
  { key: 'ratio', label: 'Ratio', align: 'right' },
  { key: 'status', label: 'Status' },
];

const statusTone = (s: Experiment['status']) => (s === 'completed' ? 'good' : s === 'aborted' ? 'warning' : 'info');

export default function ExperimentHistory() {
  const { history, deleteExperiment, clearHistory, notify, navigate } = useApp();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | Experiment['status']>('all');
  const [algo, setAlgo] = useState('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'date', dir: -1 });

  const algos = useMemo(() => [...new Set(history.map((h) => h.algorithm))], [history]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return history
      .filter((h) => (status === 'all' || h.status === status) && (algo === 'all' || h.algorithm === algo))
      .filter((h) => !needle || h.name.toLowerCase().includes(needle) || h.algorithm.toLowerCase().includes(needle))
      .sort((a, b) => {
        const av = a[sort.key], bv = b[sort.key];
        return (typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))) * sort.dir;
      });
  }, [history, q, status, algo, sort]);

  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'name' || key === 'algorithm' ? 1 : -1 }));

  const avgRatio = list.length ? list.reduce((s, e) => s + e.ratio, 0) / list.length : 0;

  return (
    <div>
      <PageHeader icon={<History size={26} />} title="Experiment History" subtitle="Safe experiment metadata stored only in this browser"
        right={
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" disabled={!list.length} onClick={() => { downloadBlob(experimentsToCsv(list), `gpu-lab-experiments-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8'); notify('CSV downloaded', 'success'); }}><Download size={16} /> Export CSV</button>
            <ConfirmButton onConfirm={() => { clearHistory(); notify('History cleared', 'success'); }} confirmText="Confirm clear all"><Trash2 size={16} /> Clear history</ConfirmButton>
          </div>
        } />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card><p className="text-xs uppercase tracking-wider text-slate-400">Showing</p><p className="mono mt-1 text-2xl font-bold text-white">{list.length} <span className="text-sm text-slate-500">of {history.length}</span></p></Card>
        <Card><p className="text-xs uppercase tracking-wider text-slate-400">Average ratio</p><p className="mono mt-1 text-2xl font-bold text-accent">{avgRatio.toFixed(2)}x</p></Card>
        <Card><p className="text-xs uppercase tracking-wider text-slate-400">Completed runs</p><p className="mono mt-1 text-2xl font-bold text-white">{history.filter((h) => h.status === 'completed').length}</p></Card>
      </div>

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input pl-9" placeholder="Search experiments…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search experiments" />
          </div>
          <select className="input md:w-44" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Filter by status">
            <option value="all">All statuses</option><option value="completed">Completed</option><option value="aborted">Stopped</option><option value="sample">Sample</option>
          </select>
          <select className="input md:w-64" value={algo} onChange={(e) => setAlgo(e.target.value)} aria-label="Filter by algorithm">
            <option value="all">All algorithms / workloads</option>
            {algos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {list.length === 0 ? (
          <EmptyState icon={<FlaskConical size={22} />} title={history.length ? 'No matching experiments' : 'No experiments yet'}
            text={history.length ? 'Try a different search or filter.' : 'Run an experiment in the GPU Simulation lab and it will appear here.'}
            action={!history.length && <button className="btn-primary" onClick={() => navigate('gpu')}>Open GPU Simulation</button>} />
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-500">
                  {COLS.map((c) => (
                    <th key={c.key} className={`px-3 py-2 font-medium ${c.align === 'right' ? 'text-right' : ''}`}>
                      <button className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-slate-200 ${sort.key === c.key ? 'text-accent' : ''}`} onClick={() => toggleSort(c.key)}>
                        {c.label}{sort.key === c.key ? (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-40" />}
                      </button>
                    </th>
                  ))}
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-3 py-3"><p className="font-medium text-slate-100">{e.name}</p><p className="text-[11px] text-slate-500">{e.module}</p></td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-400">{fmtDate(e.date)}</td>
                    <td className="px-3 py-3 text-slate-300">{e.algorithm}</td>
                    <td className="mono px-3 py-3 text-right text-slate-300">{fmtInt(e.inputSize)}</td>
                    <td className="mono px-3 py-3 text-right text-violet-300">{fmtMs(e.cpuTimeMs)}</td>
                    <td className="mono px-3 py-3 text-right text-cyan-300">{fmtMs(e.gpuTimeMs)}</td>
                    <td className="mono px-3 py-3 text-right font-semibold text-white">{e.ratio.toFixed(2)}x</td>
                    <td className="px-3 py-3"><Badge tone={statusTone(e.status)}>{e.status === 'aborted' ? 'stopped' : e.status}</Badge></td>
                    <td className="px-3 py-3 text-right">
                      <button className="rounded-md p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300" onClick={() => { deleteExperiment(e.id); notify('Experiment deleted'); }} aria-label={`Delete ${e.name}`}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4"><SafetyNote>Only experiment metadata (name, date, workload, task count, simulated timings, status) is stored. Passwords and hash inputs are never saved.</SafetyNote></div>
      </Card>
    </div>
  );
}
