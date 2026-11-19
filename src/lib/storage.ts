import type { Experiment, Settings } from '../types';

const HISTORY_KEY = 'gpulab.experiments.v1';
const SETTINGS_KEY = 'gpulab.settings.v1';

export const DEFAULT_SETTINGS: Settings = { accent: 'cyan', surface: 'midnight', animations: true, simulationSpeed: 1 };

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function safeSet(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable — keep in memory */ }
}

/** Defensive whitelist: only known metadata fields are ever persisted. */
function sanitize(e: Experiment): Experiment {
  const { id, name, date, algorithm, inputSize, cpuTimeMs, gpuTimeMs, ratio, status, module } = e;
  return { id, name: String(name).slice(0, 80), date, algorithm, inputSize, cpuTimeMs, gpuTimeMs, ratio, status, module };
}

export const loadHistory = (): Experiment[] | null => {
  const v = safeGet<Experiment[] | null>(HISTORY_KEY, null);
  return Array.isArray(v) ? v.map(sanitize) : null;
};
export const saveHistory = (list: Experiment[]) => safeSet(HISTORY_KEY, list.map(sanitize));
export const loadSettings = (): Settings => ({ ...DEFAULT_SETTINGS, ...safeGet<Partial<Settings>>(SETTINGS_KEY, {}) });
export const saveSettings = (s: Settings) => safeSet(SETTINGS_KEY, s);
export function clearAll() {
  try { localStorage.removeItem(HISTORY_KEY); localStorage.removeItem(SETTINGS_KEY); } catch { /* ignore */ }
}

const day = 86_400_000;
export function sampleExperiments(): Experiment[] {
  const now = Date.now();
  const mk = (i: number, name: string, algorithm: string, inputSize: number, cpu: number, gpu: number): Experiment => ({
    id: `sample-${i}`, name, date: new Date(now - (i + 1) * day * 0.7).toISOString(), algorithm, inputSize,
    cpuTimeMs: cpu, gpuTimeMs: gpu, ratio: cpu / gpu, status: 'sample', module: 'Sample',
  });
  return [
    mk(0, 'Baseline throughput (sample)', 'SHA-256 of random sample data', 50_000, 4120, 268),
    mk(1, 'Float math — heavy (sample)', 'Floating-point math (sin/sqrt mix)', 20_000, 9800, 702),
    mk(2, 'Small batch overhead (sample)', 'Integer bit-mixing (xorshift)', 500, 12, 9.8),
    mk(3, 'Integer mix — medium (sample)', 'Integer bit-mixing (xorshift)', 100_000, 7350, 511),
  ];
}
