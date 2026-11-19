import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Cpu, Fingerprint, Gauge, Layers, Lightbulb, Lock, MemoryStick, Repeat, Ruler, ShieldCheck, Table2, Zap } from 'lucide-react';
import { Fragment, useState, type ReactNode } from 'react';
import { Badge, Card, CardTitle, PageHeader, Toggle } from '../components/ui';

const TOPICS: { icon: ReactNode; title: string; body: ReactNode }[] = [
  { icon: <Zap size={16} />, title: 'Why fast hashing is dangerous for password storage', body: <>General-purpose hashes like MD5 and SHA-256 are engineered for speed so they can checksum gigabytes quickly. If a database of such hashes leaks, an attacker can test guesses offline at the same blistering speed — billions per second on a single GPU. For passwords, speed is a weakness: we want each guess to be <em>expensive</em>.</> },
  { icon: <Cpu size={16} />, title: 'Why GPUs can accelerate parallel hash computations', body: <>Each password guess is independent of every other guess — an “embarrassingly parallel” problem. GPUs contain thousands of simple cores that execute the same instruction on different data (SIMT). Hashing many candidates at once maps perfectly onto that design, so a GPU can outpace a CPU by one to two orders of magnitude for fast hashes.</> },
  { icon: <Fingerprint size={16} />, title: 'Why MD5 and SHA-1 should not be used for password storage', body: <>Both are cryptographically broken for collision resistance (practical MD5 collisions since 2004; SHA-1 “SHAttered” collision in 2017), but the bigger issue for passwords is that they are extremely fast and unsalted by design. Neither has a work factor that can be raised as hardware improves. Use them only for non-security checksums or legacy compatibility.</> },
  { icon: <Layers size={16} />, title: 'Why salts matter', body: <>A salt is a unique random value stored alongside each password hash. It ensures two users with the same password get different hashes, defeats precomputed rainbow tables, and forces an attacker to attack each account separately rather than testing one guess against every account at once. Salts are not secret — their job is uniqueness.</> },
  { icon: <Lock size={16} />, title: 'Why bcrypt is useful', body: <>bcrypt (1999) builds in a 128-bit salt and a tunable cost factor: each +1 doubles the work. Its internal state (~4 KiB) and frequent pseudo-random memory access make it less efficient on GPUs than fast hashes. OWASP suggests a cost of at least 10. Note: bcrypt only uses the first 72 bytes of input.</> },
  { icon: <ShieldCheck size={16} />, title: 'Why Argon2 is useful', body: <>Argon2 won the Password Hashing Competition (2015) and is standardized in RFC 9106. Argon2id combines resistance to side-channel and GPU attacks, with tunable memory, time, and parallelism parameters. OWASP’s baseline recommendation is Argon2id with 19 MiB of memory, 2 iterations, and 1 degree of parallelism.</> },
  { icon: <MemoryStick size={16} />, title: 'Why memory-hard algorithms help resist GPU attacks', body: <>GPUs have enormous compute but limited fast memory per core. A memory-hard function requires each guess to fill and repeatedly read a large block of RAM (e.g. 19–64 MiB). Running thousands of guesses in parallel then needs gigabytes of memory bandwidth, so the GPU’s parallelism advantage collapses — and custom ASICs become far more expensive.</> },
  { icon: <Ruler size={16} />, title: 'Password length vs complexity', body: <>Each additional character multiplies the search space by the character-set size, while forced complexity rules mostly produce predictable patterns like “Password1!”. NIST SP 800-63B favors length (allowing at least 64 characters), screening against known-breached passwords, and dropping arbitrary composition rules and forced periodic resets.</> },
  { icon: <Fingerprint size={16} />, title: 'Multi-factor authentication', body: <>MFA requires something beyond the password — an authenticator app, hardware security key, or passkey. Even if a password is guessed or leaked, the attacker still lacks the second factor. Phishing-resistant methods such as FIDO2/WebAuthn security keys and passkeys provide the strongest protection; SMS codes are better than nothing but weaker.</> },
  { icon: <Repeat size={16} />, title: 'Credential reuse risks', body: <>When the same password is used on many sites, a breach of one weak site exposes them all. Attackers automate “credential stuffing” — replaying leaked username/password pairs elsewhere. A password manager makes unique passwords practical, and services should block passwords known to appear in breaches.</> },
];

type Level = 'bad' | 'mid' | 'good';
interface Row { algo: string; status: [string, Level]; speed: [string, Level]; salt: [string, Level]; storage: [string, Level]; gpu: [string, Level]; use: string; detail: string }

const ROWS: Row[] = [
  { algo: 'MD5', status: ['Broken', 'bad'], speed: ['Extremely fast', 'bad'], salt: ['No built-in salt', 'bad'], storage: ['No', 'bad'], gpu: ['None', 'bad'], use: 'Non-security checksums only', detail: '128-bit output. Collisions can be generated in seconds on commodity hardware. Never use for passwords, signatures, or certificates.' },
  { algo: 'SHA-1', status: ['Deprecated', 'bad'], speed: ['Very fast', 'bad'], salt: ['No built-in salt', 'bad'], storage: ['No', 'bad'], gpu: ['None', 'bad'], use: 'Legacy compatibility only', detail: '160-bit output. Practical collisions demonstrated (SHAttered, 2017). Disallowed by NIST for digital signatures.' },
  { algo: 'SHA-256', status: ['Secure (general hash)', 'good'], speed: ['Fast', 'bad'], salt: ['No built-in salt', 'mid'], storage: ['Not on its own', 'mid'], gpu: ['Low', 'bad'], use: 'Integrity, signatures, HMAC', detail: 'Excellent general-purpose hash. For passwords it is only acceptable inside PBKDF2-HMAC-SHA256 with a salt and a very high iteration count (OWASP: 600,000), and even then it is not memory-hard.' },
  { algo: 'bcrypt', status: ['Secure', 'good'], speed: ['Slow, tunable cost', 'good'], salt: ['Built-in 128-bit salt', 'good'], storage: ['Yes', 'good'], gpu: ['Moderate', 'mid'], use: 'Password storage (cost ≥ 10)', detail: 'Mature and widely supported. ~4 KiB state hinders GPU efficiency but is not truly memory-hard. Truncates input at 72 bytes.' },
  { algo: 'Argon2', status: ['Secure (PHC winner, RFC 9106)', 'good'], speed: ['Slow, tunable', 'good'], salt: ['Required salt input', 'good'], storage: ['Yes — Argon2id preferred', 'good'], gpu: ['High (memory-hard)', 'good'], use: 'Recommended for new systems', detail: 'Tunable memory, time and parallelism. OWASP baseline: Argon2id, m = 19 MiB, t = 2, p = 1. Increase memory where resources allow.' },
];

const FIELDS: { key: keyof Omit<Row, 'algo' | 'use' | 'detail'>; label: string }[] = [
  { key: 'status', label: 'Security status' }, { key: 'speed', label: 'Speed' }, { key: 'salt', label: 'Salt support' }, { key: 'storage', label: 'Password storage?' }, { key: 'gpu', label: 'GPU resistance' },
];
const lvl: Record<Level, string> = { bad: 'text-rose-300', mid: 'text-amber-300', good: 'text-emerald-300' };
const dot: Record<Level, string> = { bad: 'bg-rose-400', mid: 'bg-amber-400', good: 'bg-emerald-400' };

function Accordion() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-2">
      {TOPICS.map((t, i) => (
        <div key={t.title} className="glass overflow-hidden">
          <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
            <span className="rounded-lg border border-accent/25 bg-accent/10 p-1.5 text-accent">{t.icon}</span>
            <span className="flex-1 text-sm font-medium text-slate-100">{t.title}</span>
            <ChevronDown size={16} className={`text-slate-400 transition ${open === i ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <p className="px-4 pb-4 pl-[60px] text-sm leading-relaxed text-slate-400">{t.body}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export default function SecurityInsights() {
  const [onlySafe, setOnlySafe] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const rows = ROWS.filter((r) => !onlySafe || r.storage[1] === 'good');

  return (
    <div>
      <PageHeader icon={<Lightbulb size={26} />} title="Security Insights" subtitle="Defensive recommendations grounded in current guidance (OWASP, NIST SP 800-63B, RFC 9106)" />

      <Card glow>
        <CardTitle icon={<Table2 size={16} />} title="Algorithm Comparison" subtitle="Click a row for details · click a column header to highlight it"
          right={<div className="w-56"><Toggle checked={onlySafe} onChange={setOnlySafe} label="Password-safe only" /></div>} />
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2 font-medium">Algorithm</th>
                {FIELDS.map((f) => (
                  <th key={f.key} className="px-3 py-2 font-medium">
                    <button className={`uppercase tracking-wider hover:text-accent ${highlight === f.key ? 'text-accent' : ''}`} onClick={() => setHighlight(highlight === f.key ? null : f.key)}>{f.label}</button>
                  </th>
                ))}
                <th className="px-3 py-2 font-medium">Recommended use</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.algo}>
                  <tr onClick={() => setFocus(focus === r.algo ? null : r.algo)} className={`cursor-pointer border-t border-white/5 transition hover:bg-white/[0.03] ${focus === r.algo ? 'bg-accent/5' : ''}`}>
                    <td className="px-3 py-3 font-semibold text-white"><span className="flex items-center gap-2"><ChevronDown size={14} className={`text-slate-500 transition ${focus === r.algo ? 'rotate-180' : ''}`} />{r.algo}</span></td>
                    {FIELDS.map((f) => (
                      <td key={f.key} className={`px-3 py-3 ${highlight === f.key ? 'bg-accent/[0.06]' : ''}`}>
                        <span className={`flex items-center gap-2 ${lvl[r[f.key][1]]}`}><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot[r[f.key][1]]}`} />{r[f.key][0]}</span>
                      </td>
                    ))}
                    <td className="px-3 py-3 text-slate-300">{r.use}</td>
                  </tr>
                  {focus === r.algo && (
                    <tr className="bg-accent/5"><td colSpan={7} className="px-10 pb-4 pt-0 text-sm text-slate-400">{r.detail}</td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap gap-2"><Badge tone="good">Good</Badge><Badge tone="warning">Caveats</Badge><Badge tone="critical">Avoid for passwords</Badge></div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2"><Accordion /></div>
        <div className="space-y-4">
          <Card>
            <CardTitle icon={<Gauge size={16} />} title="Quick Checklist" subtitle="For developers storing passwords" />
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
              <li>Hash with <span className="text-accent">Argon2id</span> (or bcrypt cost ≥ 10).</li>
              <li>Let the library generate a unique salt per password.</li>
              <li>Allow long passwords and passphrases (≥ 64 chars).</li>
              <li>Screen new passwords against breached/common lists.</li>
              <li>Rate-limit and monitor login attempts.</li>
              <li>Offer phishing-resistant MFA or passkeys.</li>
              <li>Re-hash with stronger parameters on next login as hardware improves.</li>
            </ol>
          </Card>
          <Card>
            <CardTitle icon={<ShieldCheck size={16} />} title="For everyday users" />
            <ul className="space-y-2 text-sm text-slate-300">
              <li>• Use a password manager.</li>
              <li>• One unique passphrase per account.</li>
              <li>• Turn on MFA for email, banking and social accounts.</li>
              <li>• Never share or reuse passwords.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
