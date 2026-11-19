import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, KeyRound, Lightbulb, Lock, RefreshCw, ShieldCheck, Sparkles, Timer, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, CardTitle, PageHeader, SafetyNote } from '../components/ui';
import { useApp } from '../context/AppContext';
import { fmtDuration } from '../lib/format';
import { analyzePassword, estimateSeconds, ILLUSTRATIVE_RATES, STRENGTH_COLORS } from '../lib/password';
import type { StrengthCategory } from '../types';

const CATEGORIES: StrengthCategory[] = ['VERY WEAK', 'WEAK', 'MODERATE', 'STRONG', 'VERY STRONG'];

const PASSPHRASE_WORDS = [
  'orbit', 'velvet', 'cactus', 'lantern', 'glacier', 'pixel', 'harbor', 'meadow', 'quartz', 'falcon', 'tundra', 'violet', 'ember', 'canyon',
  'nebula', 'saffron', 'willow', 'copper', 'mango', 'thunder', 'zephyr', 'basalt', 'prism', 'coral', 'kettle', 'maple', 'ripple', 'sonar',
  'tidal', 'ivory', 'jungle', 'lunar', 'marble', 'nickel', 'oasis', 'pepper', 'quiver', 'rocket', 'summit', 'timber', 'umbra', 'vortex',
];

function secureRandomInt(max: number) {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] % max;
}

const DEMOS = ['password123', 'Summer2024!', 'P@ssw0rd', 'qwerty', 'Tr0ub4dor&3', 'orbit-velvet-cactus-lantern'];

export default function PasswordAnalyzer() {
  const { setLastStrength } = useApp();
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const a = useMemo(() => analyzePassword(pw), [pw]);
  const color = STRENGTH_COLORS[a.category];
  const catIndex = CATEGORIES.indexOf(a.category);

  useEffect(() => {
    if (!pw) return;
    const t = setTimeout(() => setLastStrength({ category: a.category, entropy: a.entropy }), 400);
    return () => clearTimeout(t);
  }, [pw, a.category, a.entropy, setLastStrength]);

  const generate = () => {
    const words = Array.from({ length: 5 }, () => PASSPHRASE_WORDS[secureRandomInt(PASSPHRASE_WORDS.length)]);
    setPw(words.join('-') + secureRandomInt(100));
    setShow(true);
  };

  const checks = [
    { label: 'Length', value: a.length, ok: a.length >= 12, hint: '≥ 12' },
    { label: 'Uppercase', value: a.upper, ok: a.upper > 0 },
    { label: 'Lowercase', value: a.lower, ok: a.lower > 0 },
    { label: 'Numbers', value: a.digits, ok: a.digits > 0 },
    { label: 'Special', value: a.symbols + a.spaces, ok: a.symbols + a.spaces > 0 },
    { label: 'Repeated', value: a.repeatedChars, ok: a.repeatedChars === 0, invert: true },
  ];

  return (
    <div>
      <PageHeader icon={<KeyRound size={26} />} title="Password Analyzer" subtitle="Estimate password strength entirely inside your browser" />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card glow className="lg:col-span-3">
          <CardTitle icon={<Lock size={16} />} title="Enter a password to analyze" subtitle="Analysis runs locally as you type — nothing is transmitted or saved" />
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              className="input mono pr-24 text-base"
              placeholder="Type a sample password…"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              name="lab-analyzer-input"
              aria-label="Password to analyze"
              maxLength={256}
            />
            <div className="absolute inset-y-0 right-2 flex items-center gap-1">
              <button type="button" className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              <button type="button" className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30" onClick={() => setPw('')} disabled={!pw} aria-label="Clear"><Trash2 size={16} /></button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Try a synthetic example:</span>
            {DEMOS.map((d) => <button key={d} className="mono rounded-md border border-white/10 px-2 py-0.5 text-xs text-slate-300 hover:border-accent/40 hover:text-accent" onClick={() => { setPw(d); setShow(true); }}>{d}</button>)}
            <button className="btn-ghost ml-auto px-3 py-1 text-xs" onClick={generate}><RefreshCw size={13} /> Generate passphrase</button>
          </div>

          {/* Strength meter */}
          <div className="mt-6">
            <div className="mb-2 flex items-end justify-between">
              <div>
                <p className="label mb-0">Strength</p>
                <motion.p key={a.category + (pw ? '' : '-empty')} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold" style={{ color: pw ? color : '#64748b' }}>
                  {pw ? a.category : 'Awaiting input'}
                </motion.p>
              </div>
              <div className="text-right">
                <p className="label mb-0">Effective entropy</p>
                <p className="mono text-2xl font-bold text-white">{a.entropy.toFixed(1)} <span className="text-sm text-slate-400">bits</span></p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {CATEGORIES.map((c, i) => (
                <div key={c} className="h-2.5 overflow-hidden rounded-full bg-white/5">
                  <motion.div className="h-full rounded-full" initial={false} animate={{ width: pw && i <= catIndex ? '100%' : '0%' }} transition={{ duration: 0.3, delay: i * 0.04 }}
                    style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
                </div>
              ))}
            </div>
            <div className="mt-1.5 grid grid-cols-5 gap-1.5 text-center text-[10px] text-slate-500">
              {CATEGORIES.map((c) => <span key={c}>{c}</span>)}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {checks.map((c) => (
              <div key={c.label} className={`rounded-xl border p-3 ${!pw ? 'border-white/10' : c.ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{c.label}</span>
                  {pw && (c.ok ? <CheckCircle2 size={14} className="text-emerald-400" /> : <AlertTriangle size={14} className="text-amber-400" />)}
                </div>
                <p className="mono mt-1 text-xl font-semibold text-white">{c.value}{c.hint && <span className="ml-1 text-xs text-slate-500">{c.hint}</span>}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 rounded-xl border border-white/10 bg-ink-950/50 p-4 text-xs sm:grid-cols-3">
            <div><p className="text-slate-500">Character pool</p><p className="mono mt-0.5 text-sm text-slate-200">{a.poolSize} symbols</p></div>
            <div><p className="text-slate-500">Raw entropy (L × log₂ pool)</p><p className="mono mt-0.5 text-sm text-slate-200">{a.rawEntropy.toFixed(1)} bits</p></div>
            <div><p className="text-slate-500">Pattern penalty</p><p className="mono mt-0.5 text-sm text-slate-200">−{Math.max(0, a.rawEntropy - a.entropy).toFixed(1)} bits</p></div>
          </div>

          <div className="mt-4"><SafetyNote>Privacy: this input is held only in page memory, has autocomplete disabled, and is never written to history, local storage, or the network. Only the strength category is shown on the Overview for this session.</SafetyNote></div>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card delay={0.05}>
            <CardTitle icon={<AlertTriangle size={16} />} title="Detected Patterns" subtitle="Predictable structures reduce effective entropy" />
            {!pw ? <p className="text-sm text-slate-500">Enter a password to scan for patterns.</p> : a.patterns.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 size={16} /> No common patterns detected.</p>
            ) : (
              <ul className="space-y-2">
                {a.patterns.map((p, i) => (
                  <li key={i} className="rounded-lg border border-white/10 bg-ink-950/50 p-2.5">
                    <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-200">{p.label}</span><Badge tone="warning">−{Math.max(0, p.penaltyBits).toFixed(0)} bits</Badge></div>
                    <p className="mt-0.5 text-xs text-slate-400">{p.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card delay={0.1}>
            <CardTitle icon={<Timer size={16} />} title="Estimated Offline Guessing Time" subtitle="Average case if the hash leaked — illustrative single-GPU rates" />
            <ul className="space-y-2">
              {ILLUSTRATIVE_RATES.map((r) => {
                const s = pw ? estimateSeconds(a.entropy, r.rate) : NaN;
                const bad = s < 86400 * 30;
                return (
                  <li key={r.algo} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-300">{r.algo}<span className="block text-[10px] text-slate-500">{r.note}</span></span>
                    <span className={`mono text-right ${!pw ? 'text-slate-600' : bad ? 'text-rose-300' : 'text-emerald-300'}`}>{pw ? fmtDuration(s) : '—'}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[11px] text-slate-500">Assumes ~2^(entropy−1) guesses. Real attacks use pattern-aware guessing, so predictable passwords fall far faster than this model suggests.</p>
          </Card>

          <Card delay={0.15}>
            <CardTitle icon={<Lightbulb size={16} />} title="Suggestions" />
            <ul className="space-y-2">
              {(pw ? a.suggestions : ['Prefer long passphrases of several random words.', 'Use a unique password for every account.', 'Avoid personal information like names and birthdays.']).map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm text-slate-300"><Sparkles size={14} className="mt-0.5 shrink-0 text-accent" />{s}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card delay={0.2} className="mt-4">
        <CardTitle icon={<ShieldCheck size={16} />} title="How the estimate works" />
        <div className="grid gap-4 text-sm text-slate-400 md:grid-cols-3">
          <p><span className="font-medium text-slate-200">1. Character pool.</span> Lowercase (26), uppercase (26), digits (10), symbols (33) and space (1) are summed according to which classes appear.</p>
          <p><span className="font-medium text-slate-200">2. Raw entropy.</span> length × log₂(pool) — the theoretical maximum if every character were chosen uniformly at random.</p>
          <p><span className="font-medium text-slate-200">3. Pattern penalties.</span> Dictionary words, leetspeak, sequences, keyboard walks, years and repetition are subtracted, since attackers try these first.</p>
        </div>
      </Card>
    </div>
  );
}
