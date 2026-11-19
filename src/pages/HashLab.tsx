import { motion } from 'framer-motion';
import { ArrowRight, Check, Copy, Gauge, Hash, KeyRound, Lock, Shuffle, Unlock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Card, CardTitle, ChartTooltip, PageHeader, SafetyNote } from '../components/ui';
import { useApp } from '../context/AppContext';
import { AXIS, GRID, SERIES } from '../lib/chartColors';
import { fmtCompact } from '../lib/format';
import { ALGORITHMS, bitDifference, hashBytes, hashText, normalize, webCryptoAvailable, type Normalization } from '../lib/hash';
import type { HashAlgorithm } from '../types';

const NORMS: { value: Normalization; label: string; desc: string }[] = [
  { value: 'none', label: 'None', desc: 'Bytes hashed exactly as typed (UTF-8).' },
  { value: 'trim', label: 'Trim', desc: 'Leading/trailing whitespace removed.' },
  { value: 'nfc', label: 'Unicode NFC', desc: 'Canonical Unicode composition, so é typed two ways hashes identically.' },
  { value: 'lower', label: 'Lowercase', desc: 'Case folded — shows how normalization changes the output.' },
];

function useHashes(text: string) {
  const [out, setOut] = useState<Partial<Record<HashAlgorithm, string>>>({});
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    Promise.all(ALGORITHMS.map(async (a) => [a.name, await hashText(text, a.name)] as const))
      .then((pairs) => { if (!cancelled) { setOut(Object.fromEntries(pairs)); setError(null); } })
      .catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [text]);
  return { out, error };
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  const { notify } = useApp();
  return (
    <button
      className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
      aria-label="Copy hash"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); }
        catch { notify('Clipboard unavailable in this context', 'error'); }
      }}
    >{ok ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}</button>
  );
}

function DiffHex({ a, b }: { a: string; b: string }) {
  return (
    <p className="mono break-all text-xs leading-relaxed">
      {[...b].map((ch, i) => <span key={i} className={ch !== a[i] ? 'text-accent' : 'text-slate-600'}>{ch}</span>)}
    </p>
  );
}

function flipLastChar(s: string) {
  if (!s) return 'a';
  const last = s.charCodeAt(s.length - 1);
  return s.slice(0, -1) + String.fromCharCode(last ^ 1);
}

export default function HashLab() {
  const [input, setInput] = useState('hello world');
  const [norm, setNorm] = useState<Normalization>('none');
  const normalized = normalize(input, norm);
  const { out, error } = useHashes(normalized);

  const [avA, setAvA] = useState('GPU Lab sample 1');
  const [avB, setAvB] = useState('GPU Lab sample 2');
  const [avAlgo, setAvAlgo] = useState<HashAlgorithm>('SHA-256');
  const [ha, setHa] = useState('');
  const [hb, setHb] = useState('');
  useEffect(() => {
    let c = false;
    Promise.all([hashText(avA, avAlgo), hashText(avB, avAlgo)]).then(([x, y]) => { if (!c) { setHa(x); setHb(y); } }).catch(() => undefined);
    return () => { c = true; };
  }, [avA, avB, avAlgo]);
  const bits = bitDifference(ha, hb);

  const [speed, setSpeed] = useState<{ name: string; rate: number }[] | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const measure = async () => {
    setMeasuring(true);
    const results: { name: string; rate: number }[] = [];
    const block = new Uint8Array(64);
    for (const a of ALGORITHMS) {
      let n = 0;
      const start = performance.now();
      while (performance.now() - start < 250) { crypto.getRandomValues(block); await hashBytes(block, a.name); n++; }
      results.push({ name: a.name, rate: n / ((performance.now() - start) / 1000) });
      await new Promise((r) => setTimeout(r, 0));
    }
    setSpeed(results);
    setMeasuring(false);
  };

  const steps = [
    { title: 'Input', value: input ? `"${input.length > 18 ? input.slice(0, 18) + '…' : input}"` : '(empty)', sub: `${new TextEncoder().encode(input).length} bytes` },
    { title: 'Normalization', value: NORMS.find((n) => n.value === norm)!.label, sub: `${new TextEncoder().encode(normalized).length} bytes` },
    { title: 'Hash Algorithm', value: 'SHA-256', sub: '64 rounds · 512-bit blocks' },
    { title: 'Hash Output', value: out['SHA-256'] ? out['SHA-256'].slice(0, 14) + '…' : '…', sub: '256 bits · 64 hex' },
  ];

  return (
    <div>
      <PageHeader icon={<Hash size={26} />} title="Hash Lab" subtitle="Explore cryptographic hash functions with browser-side implementations" />

      {!webCryptoAvailable && (
        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">Web Crypto API is unavailable in this context. Open the app via http://localhost or HTTPS to enable SHA algorithms.</div>
      )}

      <Card glow>
        <CardTitle icon={<KeyRound size={16} />} title="Sample input" subtitle="Use sample text only — do not enter real passwords here" />
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <textarea className="input mono min-h-[84px] resize-y" value={input} onChange={(e) => setInput(e.target.value)} maxLength={10000} aria-label="Sample text to hash" spellCheck={false} />
          <div className="md:w-64">
            <label className="label" htmlFor="norm">Normalization</label>
            <select id="norm" className="input" value={norm} onChange={(e) => setNorm(e.target.value as Normalization)}>
              {NORMS.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
            <p className="mt-1.5 text-xs text-slate-500">{NORMS.find((n) => n.value === norm)!.desc}</p>
          </div>
        </div>

        {/* Workflow */}
        <div className="mt-6 flex flex-col items-stretch gap-2 md:flex-row md:items-center">
          {steps.map((s, i) => (
            <div key={s.title} className="flex flex-1 flex-col items-center gap-2 md:flex-row">
              <motion.div key={s.value} initial={{ opacity: 0.4, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
                className={`w-full flex-1 rounded-xl border p-3 ${i === 3 ? 'border-accent/50 bg-accent/10' : 'border-white/10 bg-ink-950/60'}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Step {i + 1} · {s.title}</p>
                <p className="mono mt-1 truncate text-sm text-slate-100">{s.value}</p>
                <p className="text-[11px] text-slate-500">{s.sub}</p>
              </motion.div>
              {i < steps.length - 1 && <ArrowRight className="shrink-0 rotate-90 text-accent md:rotate-0" size={18} />}
            </div>
          ))}
        </div>
      </Card>

      {error && <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {ALGORITHMS.map((a, i) => (
          <Card key={a.name} delay={i * 0.05} className={a.tone === 'critical' ? 'border-rose-500/25' : a.tone === 'warning' ? 'border-amber-500/25' : ''}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{a.name}</h3>
                <Badge tone={a.tone}>{a.status}</Badge>
              </div>
              <span className="text-[11px] text-slate-500">via {a.source}</span>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-ink-950/70 p-3">
              <p className="mono flex-1 break-all text-xs leading-relaxed text-accent">{out[a.name] ?? '…'}</p>
              {out[a.name] && <CopyBtn text={out[a.name]!} />}
            </div>
            <p className="mt-2 text-xs text-slate-400">Output length: <span className="mono text-slate-200">{a.bits} bits</span> · <span className="mono text-slate-200">{a.bits / 4} hex chars</span> · <span className="mono text-slate-200">{a.bits / 8} bytes</span></p>
            <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
              <div><p className="mb-1 font-semibold text-emerald-300">Use cases</p><ul className="list-disc space-y-0.5 pl-4 text-slate-400">{a.useCases.map((u) => <li key={u}>{u}</li>)}</ul></div>
              <div><p className="mb-1 font-semibold text-amber-300">Limitations</p><ul className="list-disc space-y-0.5 pl-4 text-slate-400">{a.limitations.map((u) => <li key={u}>{u}</li>)}</ul></div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardTitle icon={<Shuffle size={16} />} title="Avalanche Effect" subtitle="A tiny input change produces a completely different hash"
            right={<select className="input w-auto py-1 text-xs" value={avAlgo} onChange={(e) => setAvAlgo(e.target.value as HashAlgorithm)} aria-label="Algorithm">{ALGORITHMS.map((a) => <option key={a.name}>{a.name}</option>)}</select>} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Input A</label><input className="input mono" value={avA} onChange={(e) => setAvA(e.target.value)} /></div>
            <div><label className="label">Input B</label>
              <div className="flex gap-2"><input className="input mono" value={avB} onChange={(e) => setAvB(e.target.value)} /><button className="btn-ghost shrink-0 px-3" title="Copy A and flip one bit of its last character" onClick={() => setAvB(flipLastChar(avA))}>Flip 1 bit</button></div>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div><p className="label">Hash A</p><p className="mono break-all text-xs text-slate-300">{ha}</p></div>
            <div><p className="label">Hash B (changed characters highlighted)</p><DiffHex a={ha} b={hb} /></div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs"><span className="text-slate-400">Output bits changed</span><span className="mono text-accent">{bits.diff} / {bits.total} ({bits.total ? ((bits.diff / bits.total) * 100).toFixed(1) : 0}%)</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5"><motion.div className="h-full rounded-full bg-accent" animate={{ width: `${bits.total ? (bits.diff / bits.total) * 100 : 0}%` }} /></div>
            <p className="mt-2 text-[11px] text-slate-500">A good hash function flips about 50% of output bits for any input change — so similar inputs reveal nothing about each other.</p>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle icon={<Lock size={16} />} title="Hashing vs Encryption" />
          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-3">
              <p className="flex items-center gap-2 font-semibold text-accent"><Hash size={15} /> Hashing is one-way</p>
              <p className="mt-1 text-slate-400">A hash maps any input to a fixed-length digest. There is no key and no inverse function — the original input cannot be computed back from the hash.</p>
            </div>
            <div className="rounded-xl border border-accent-2/30 bg-accent-2/5 p-3">
              <p className="flex items-center gap-2 font-semibold text-accent-2"><Unlock size={15} /> Encryption is reversible with a key</p>
              <p className="mt-1 text-slate-400">Ciphers like AES transform data so that anyone holding the correct key can decrypt it back to the original.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-ink-950/50 p-3">
              <p className="font-semibold text-slate-200">So why are leaked hashes dangerous?</p>
              <p className="mt-1 text-slate-400">A hash doesn't directly reveal its input, but an attacker can <em>guess</em> inputs, hash them, and compare. Fast hashes on GPUs make billions of such guesses per second — which is why password storage needs slow, salted algorithms.</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle icon={<Gauge size={16} />} title="Browser Hashing Speed (measured)" subtitle="Real measurement on this device's CPU via JavaScript / Web Crypto — not GPU"
          right={<button className="btn-primary" onClick={measure} disabled={measuring || !webCryptoAvailable}>{measuring ? 'Measuring…' : speed ? 'Re-measure' : 'Measure'}</button>} />
        {speed ? (
          <>
            <div className="h-52">
              <ResponsiveContainer>
                <BarChart data={speed} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" stroke={AXIS} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis stroke={AXIS} tick={{ fontSize: 11 }} tickFormatter={fmtCompact} tickLine={false} axisLine={false} width={44} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<ChartTooltip formatter={(v) => `${Math.round(v).toLocaleString()} hashes/s`} />} />
                  <Bar dataKey="rate" name="Hashes/sec" fill={SERIES.gpu} radius={[4, 4, 0, 0]} maxBarSize={48}>
                    <LabelList dataKey="rate" position="top" formatter={fmtCompact} style={{ fill: '#94a3b8', fontSize: 10 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Each async Web Crypto call carries per-call overhead, so these single-threaded browser figures are far below native or GPU throughput. MD5 here is pure JavaScript.</p>
          </>
        ) : (
          <SafetyNote>Hashes 64-byte blocks of random data for 250 ms per algorithm. No user input is involved.</SafetyNote>
        )}
      </Card>
    </div>
  );
}
