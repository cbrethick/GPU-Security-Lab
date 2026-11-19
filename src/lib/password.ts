import type { StrengthCategory } from '../types';

/**
 * Local-only password strength analysis.
 * This module never transmits or persists its input.
 */

export const COMMON_WORDS = [
  'password', 'passw0rd', 'admin', 'welcome', 'qwerty', 'letmein', 'dragon', 'monkey', 'iloveyou',
  'sunshine', 'football', 'baseball', 'master', 'login', 'princess', 'shadow', 'superman', 'batman',
  'hello', 'secret', 'user', 'root', 'love', 'summer', 'winter', 'spring', 'autumn', 'college',
  'student', 'freedom', 'trustno1', 'whatever', 'computer', 'internet', 'cricket', 'india', 'chennai',
  'test', 'guest', 'default', 'changeme', 'abc', 'pass', 'access', 'flower', 'tiger', 'star',
];

const SEQUENCES = ['abcdefghijklmnopqrstuvwxyz', '0123456789', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1qaz2wsx'];

const LEET: Record<string, string> = { '@': 'a', '4': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '$': 's', '5': 's', '7': 't', '+': 't' };

export interface PatternFinding {
  type: 'repeat' | 'sequence' | 'keyboard' | 'dictionary' | 'year' | 'date' | 'leet' | 'single-class';
  label: string;
  detail: string;
  penaltyBits: number;
}

export interface PasswordAnalysis {
  length: number;
  upper: number;
  lower: number;
  digits: number;
  symbols: number;
  spaces: number;
  poolSize: number;
  rawEntropy: number;
  entropy: number;
  repeatedChars: number;
  patterns: PatternFinding[];
  category: StrengthCategory;
  score: number; // 0..100
  suggestions: string[];
}

export const STRENGTH_COLORS: Record<StrengthCategory, string> = {
  'VERY WEAK': '#f43f5e',
  WEAK: '#f97316',
  MODERATE: '#eab308',
  STRONG: '#22c55e',
  'VERY STRONG': '#22d3ee',
};

function categorize(bits: number): StrengthCategory {
  if (bits < 28) return 'VERY WEAK';
  if (bits < 40) return 'WEAK';
  if (bits < 60) return 'MODERATE';
  if (bits < 80) return 'STRONG';
  return 'VERY STRONG';
}

function findSequences(pw: string): PatternFinding[] {
  const lower = pw.toLowerCase();
  const out: PatternFinding[] = [];
  const seen = new Set<string>();
  for (const seq of SEQUENCES) {
    const rev = [...seq].reverse().join('');
    for (const s of [seq, rev]) {
      for (let len = Math.min(8, s.length); len >= 3; len--) {
        for (let i = 0; i + len <= s.length; i++) {
          const chunk = s.slice(i, i + len);
          if (lower.includes(chunk) && ![...seen].some((x) => x.includes(chunk))) {
            seen.add(chunk);
            const keyboard = !['abcdefghijklmnopqrstuvwxyz', '0123456789'].includes(seq);
            out.push({
              type: keyboard ? 'keyboard' : 'sequence',
              label: keyboard ? 'Keyboard pattern' : 'Predictable sequence',
              detail: `Contains "${chunk.length > 4 ? chunk.slice(0, 2) + '…' + chunk.slice(-2) : chunk}" (${len} chars)`,
              penaltyBits: len * 3,
            });
          }
        }
      }
    }
  }
  return out;
}

export function analyzePassword(pw: string): PasswordAnalysis {
  const length = [...pw].length;
  const upper = (pw.match(/[A-Z]/g) || []).length;
  const lower = (pw.match(/[a-z]/g) || []).length;
  const digits = (pw.match(/[0-9]/g) || []).length;
  const spaces = (pw.match(/ /g) || []).length;
  const symbols = length - upper - lower - digits - spaces;

  let poolSize = 0;
  if (lower) poolSize += 26;
  if (upper) poolSize += 26;
  if (digits) poolSize += 10;
  if (symbols) poolSize += 33;
  if (spaces) poolSize += 1;
  const rawEntropy = length && poolSize ? length * Math.log2(poolSize) : 0;

  const patterns: PatternFinding[] = [];

  // Repeated characters (runs of 3+)
  let repeatedChars = 0;
  const runs = pw.match(/(.)\1{2,}/g) || [];
  for (const r of runs) {
    repeatedChars += r.length;
    patterns.push({ type: 'repeat', label: 'Repeated characters', detail: `"${r[0]}" repeated ${r.length}×`, penaltyBits: (r.length - 1) * Math.log2(Math.max(poolSize, 2)) * 0.9 });
  }
  // Repeated chunk e.g. abcabc
  const chunk = pw.match(/(.{2,})\1+/);
  if (chunk && !runs.length) {
    patterns.push({ type: 'repeat', label: 'Repeated block', detail: `"${chunk[1]}" repeats`, penaltyBits: (chunk[0].length - chunk[1].length) * Math.log2(Math.max(poolSize, 2)) * 0.8 });
  }

  patterns.push(...findSequences(pw));

  // Dictionary words (including leetspeak substitutions)
  const lowerPw = pw.toLowerCase();
  const deLeet = [...lowerPw].map((c) => LEET[c] ?? c).join('');
  const words = COMMON_WORDS.filter((w) => w.length >= 3).sort((a, b) => b.length - a.length);
  const matched: string[] = [];
  for (const w of words) {
    if (matched.some((m) => m.includes(w))) continue;
    if (lowerPw.includes(w)) {
      matched.push(w);
      patterns.push({ type: 'dictionary', label: 'Common word', detail: `Contains a frequently used word (${w.length} letters)`, penaltyBits: w.length * Math.log2(Math.max(poolSize, 2)) - 10 });
    } else if (deLeet.includes(w)) {
      matched.push(w);
      patterns.push({ type: 'leet', label: 'Leetspeak substitution', detail: `A common word disguised with symbols (e.g. @→a, 0→o)`, penaltyBits: w.length * Math.log2(Math.max(poolSize, 2)) - 12 });
    }
  }

  // Years and dates
  const years = pw.match(/(19[5-9]\d|20[0-4]\d)/g) || [];
  if (years.length) patterns.push({ type: 'year', label: 'Year detected', detail: `Looks like a year (${years.length} found) — often a birth or graduation year`, penaltyBits: years.length * 8 });
  if (/\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/.test(pw) || /(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])\d{2,4}/.test(pw)) {
    patterns.push({ type: 'date', label: 'Date pattern', detail: 'Dates are among the first things a guessing model tries', penaltyBits: 10 });
  }

  const classes = [upper, lower, digits, symbols].filter(Boolean).length;
  if (length > 0 && classes === 1 && length < 16) {
    patterns.push({ type: 'single-class', label: 'Single character type', detail: 'Only one kind of character used', penaltyBits: 4 });
  }

  const penalty = patterns.reduce((s, p) => s + Math.max(0, p.penaltyBits), 0);
  const entropy = Math.max(0, Math.min(rawEntropy, rawEntropy - penalty, 1e4));
  const effective = Math.max(entropy, length ? Math.log2(Math.max(length, 2)) : 0);
  const category = length === 0 ? 'VERY WEAK' : categorize(effective);
  const score = Math.round(Math.min(100, (effective / 100) * 100));

  const suggestions: string[] = [];
  if (length < 12) suggestions.push('Increase password length — aim for at least 12–16 characters.');
  if (length < 20 && length > 0) suggestions.push('Prefer a long passphrase of 4+ random words (e.g. "orbit-velvet-cactus-lantern").');
  if (patterns.some((p) => p.type === 'sequence' || p.type === 'keyboard')) suggestions.push('Avoid predictable sequences such as "abc", "123" or keyboard walks like "qwerty".');
  if (patterns.some((p) => p.type === 'repeat')) suggestions.push('Avoid repeated characters and repeated patterns.');
  if (patterns.some((p) => p.type === 'dictionary' || p.type === 'leet')) suggestions.push('Avoid common words — symbol substitutions like "p@ssw0rd" are guessed early.');
  if (patterns.some((p) => p.type === 'year' || p.type === 'date')) suggestions.push('Avoid personal information such as names, birthdays, or years.');
  if (classes < 3 && length < 16) suggestions.push('Mix character types, or compensate with significantly more length.');
  suggestions.push('Use a unique password for every account — a password manager makes this practical.');
  suggestions.push('Enable multi-factor authentication wherever it is offered.');

  return { length, upper, lower, digits, symbols, spaces, poolSize, rawEntropy, entropy: effective, repeatedChars, patterns, category, score, suggestions };
}

/**
 * Illustrative offline guessing rates (hashes/second) for a single high-end GPU.
 * Order-of-magnitude figures based on publicly reported benchmarks; real numbers vary
 * widely by hardware, software, and parameters. Used only for educational estimates.
 */
export const ILLUSTRATIVE_RATES = [
  { algo: 'MD5', rate: 1e11, note: 'unsalted fast hash' },
  { algo: 'SHA-1', rate: 3e10, note: 'unsalted fast hash' },
  { algo: 'SHA-256', rate: 1e10, note: 'unsalted fast hash' },
  { algo: 'bcrypt (cost 12)', rate: 1.5e3, note: 'adaptive, salted' },
  { algo: 'Argon2id (19 MiB, t=2)', rate: 5e2, note: 'memory-hard, salted' },
];

/** Average-case time: half the effective search space divided by rate. */
export function estimateSeconds(entropyBits: number, rate: number): number {
  return Math.pow(2, Math.max(0, entropyBits - 1)) / rate;
}
