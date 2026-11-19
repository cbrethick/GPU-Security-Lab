import { Download, FileSpreadsheet, FileText, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card, CardTitle, PageHeader, SimBanner, Toggle } from '../components/ui';
import { useApp } from '../context/AppContext';
import { fmtInt, fmtMs } from '../lib/format';
import { downloadBlob, experimentsToCsv, generatePdf, type ReportSection } from '../lib/report';
import { TEAM } from '../lib/project';

const DEFAULT_OBJECTIVE = 'To investigate, through safe in-browser simulation, why GPU parallelism accelerates hash computation, how this affects the security of stored passwords, and which defensive techniques (salting, slow and memory-hard hashing, length, MFA) mitigate the risk.';
const DEFAULT_CONCLUSION = 'GPU-style parallelism provides a large throughput advantage on independent, uniform workloads once launch and transfer overhead are amortized. Because password guessing is exactly such a workload, fast unsalted hashes like MD5, SHA-1 and plain SHA-256 are unsuitable for password storage. Salted, adaptive, memory-hard functions — Argon2id in particular — combined with long passphrases and multi-factor authentication remain the most effective defenses.';

export default function Reports() {
  const { history, notify } = useApp();
  const [title, setTitle] = useState('GPU-Based Password Cracking — An Educational Deep Dive');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [objective, setObjective] = useState(DEFAULT_OBJECTIVE);
  const [conclusion, setConclusion] = useState(DEFAULT_CONCLUSION);
  const [includeSamples, setIncludeSamples] = useState(true);
  const [busy, setBusy] = useState(false);

  const exps = useMemo(() => history.filter((h) => includeSamples || h.status !== 'sample'), [history, includeSamples]);
  const done = exps.filter((e) => e.status !== 'aborted');

  const stats = useMemo(() => {
    if (!done.length) return null;
    const sum = (f: (e: (typeof done)[0]) => number) => done.reduce((s, e) => s + f(e), 0);
    const best = done.reduce((a, b) => (b.ratio > a.ratio ? b : a));
    const worst = done.reduce((a, b) => (b.ratio < a.ratio ? b : a));
    return {
      n: done.length,
      cpuAvg: sum((e) => e.cpuTimeMs) / done.length,
      gpuAvg: sum((e) => e.gpuTimeMs) / done.length,
      ratioAvg: sum((e) => e.ratio) / done.length,
      tasks: sum((e) => e.inputSize),
      best, worst,
      algos: [...new Set(done.map((e) => e.algorithm))],
    };
  }, [done]);

  const sections: ReportSection[] = useMemo(() => [
    { heading: 'Objective', body: [objective] },
    { heading: 'Methodology', body: [
      'All experiments ran locally in a web browser using synthetic data. No real accounts, credentials, or external systems were involved.',
      'For each GPU-simulation run, a safe workload (floating-point math, integer bit-mixing, or SHA-256 over random data) was executed on the host CPU to measure the real average cost of one task. CPU time was then modeled as ceil(tasks / cpu_workers) x t_task, and GPU-style time as launch overhead + transfer cost + ceil(tasks / gpu_lanes) x t_task x 12 (lane slowdown).',
      'Hash outputs were produced with the browser Web Crypto API (SHA-1, SHA-256, SHA-512) and an educational JavaScript MD5 implementation. Password-strength estimates were computed in-browser from character-pool entropy minus pattern penalties.',
    ] },
    { heading: 'Algorithms Used', body: [
      'Hash functions studied: MD5 (broken), SHA-1 (legacy/insecure), SHA-256 and SHA-512 (secure general-purpose hashes), compared conceptually with bcrypt and Argon2id (password-hashing functions).',
      stats ? `Simulation workloads used: ${stats.algos.join('; ')}.` : 'No simulation workloads recorded yet.',
    ] },
    { heading: 'CPU Simulation Results', body: [stats ? `Across ${stats.n} experiment(s) covering ${fmtInt(stats.tasks)} simulated tasks, the average modeled CPU processing time was ${fmtMs(stats.cpuAvg)}.` : 'No completed experiments available.'] },
    { heading: 'GPU Simulation Results', body: [stats ? `The average modeled GPU-style processing time was ${fmtMs(stats.gpuAvg)}. These figures are educational simulations and not real GPU benchmarks.` : 'No completed experiments available.'] },
    { heading: 'Performance Comparison', body: [stats ? `Average speedup ratio: ${stats.ratioAvg.toFixed(2)}x. Highest: ${stats.best.ratio.toFixed(2)}x ("${stats.best.name}", ${fmtInt(stats.best.inputSize)} tasks). Lowest: ${stats.worst.ratio.toFixed(2)}x ("${stats.worst.name}", ${fmtInt(stats.worst.inputSize)} tasks). Small batches show low or sub-1x speedup because fixed GPU launch overhead dominates; large batches approach the lane-count advantage.` : 'Run experiments to populate this section.'] },
    { heading: 'Security Findings', body: [
      'Fast hashes allow extremely high offline guessing rates; illustrative single-GPU figures are on the order of 10^11 guesses/s for MD5 versus roughly 10^3 guesses/s for bcrypt (cost 12) or Argon2id.',
      'Dictionary and pattern-based guessing defeat human-chosen passwords (word + number, name + year, capitalized word + symbol) orders of magnitude faster than naive brute force.',
      'Search space grows exponentially with length (charset^length), so length contributes more to strength than forced complexity rules.',
    ] },
    { heading: 'Recommendations', body: [
      '1. Store passwords with Argon2id (OWASP baseline m=19 MiB, t=2, p=1) or bcrypt with cost >= 10; never MD5, SHA-1, or unsalted SHA-256.',
      '2. Use a unique random salt per password (handled automatically by bcrypt/Argon2 libraries).',
      '3. Encourage long passphrases, screen against common/breached passwords, and rate-limit login attempts.',
      '4. Enable multi-factor authentication, preferably phishing-resistant (FIDO2 security keys or passkeys).',
      '5. Educate users about credential reuse and encourage password managers.',
    ] },
    { heading: 'Conclusion', body: [conclusion] },
  ], [objective, conclusion, stats]);

  const author = TEAM.map((t) => t.name).join(', ');

  const pdf = () => {
    setBusy(true);
    try {
      const doc = generatePdf({ title, author, date, sections, experiments: exps });
      doc.save(`gpu-lab-report-${date}.pdf`);
      notify('PDF report downloaded', 'success');
    } catch (e) {
      notify(`PDF generation failed: ${(e as Error).message}`, 'error');
    } finally { setBusy(false); }
  };
  const csv = () => {
    downloadBlob(experimentsToCsv(exps), `gpu-lab-results-${date}.csv`, 'text/csv;charset=utf-8');
    notify('CSV results downloaded', 'success');
  };

  return (
    <div>
      <PageHeader icon={<FileText size={26} />} title="Report Generator" subtitle="Produce a project experiment report from your local results"
        right={<div className="flex flex-wrap gap-2"><button className="btn-primary" onClick={pdf} disabled={busy}><Download size={16} /> Download PDF</button><button className="btn-ghost" onClick={csv} disabled={!exps.length}><FileSpreadsheet size={16} /> Download CSV</button></div>} />
      <SimBanner detail="Reports include simulated results and are labeled as such in the exported PDF and CSV." />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardTitle icon={<Settings2 size={16} />} title="Report settings" />
          <div className="space-y-4">
            <div><label className="label" htmlFor="rt">Project title</label><input id="rt" className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><label className="label" htmlFor="rd">Experiment date</label><input id="rd" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><label className="label" htmlFor="ro">Objective</label><textarea id="ro" className="input min-h-[110px]" value={objective} onChange={(e) => setObjective(e.target.value)} /></div>
            <div><label className="label" htmlFor="rc">Conclusion</label><textarea id="rc" className="input min-h-[130px]" value={conclusion} onChange={(e) => setConclusion(e.target.value)} /></div>
            <Toggle checked={includeSamples} onChange={setIncludeSamples} label="Include sample experiments" description={`${exps.length} experiment(s) will be included`} />
          </div>
        </Card>

        <Card glow className="lg:col-span-3">
          <CardTitle title="Live preview" subtitle="This content is exported to the PDF" />
          <div className="max-h-[760px] overflow-y-auto rounded-xl border border-white/10 bg-ink-950/70 p-6">
            <h2 className="text-xl font-bold text-accent">{title}</h2>
            <p className="mt-1 text-xs text-slate-400">{author} · {date}</p>
            <p className="mt-1 text-xs text-amber-300">Educational Simulation — Not a Real GPU Benchmark</p>
            {sections.map((s) => (
              <section key={s.heading} className="mt-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">{s.heading}</h3>
                {s.body.map((p, i) => <p key={i} className="mt-1.5 text-sm leading-relaxed text-slate-400">{p}</p>)}
              </section>
            ))}
            {exps.length > 0 && (
              <section className="mt-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">Appendix — Experiment Results</h3>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-xs">
                    <thead className="text-slate-500"><tr><th className="py-1.5">Experiment</th><th className="text-right">Tasks</th><th className="text-right">CPU (sim)</th><th className="text-right">GPU (sim)</th><th className="text-right">Ratio</th></tr></thead>
                    <tbody>{exps.slice(0, 20).map((e) => <tr key={e.id} className="border-t border-white/5 text-slate-300"><td className="py-1.5 pr-2">{e.name}</td><td className="mono text-right">{fmtInt(e.inputSize)}</td><td className="mono text-right">{fmtMs(e.cpuTimeMs)}</td><td className="mono text-right">{fmtMs(e.gpuTimeMs)}</td><td className="mono text-right">{e.ratio.toFixed(2)}x</td></tr>)}</tbody>
                  </table>
                  {exps.length > 20 && <p className="mt-1 text-[11px] text-slate-500">+ {exps.length - 20} more in the PDF/CSV</p>}
                </div>
              </section>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
