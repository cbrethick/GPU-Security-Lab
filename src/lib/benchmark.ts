/**
 * Benchmark engine abstraction.
 *
 * The `SimulatedEngine` really executes a safe workload (math or SHA-256 over
 * random sample data) on this device's CPU to calibrate a per-task cost, then
 * applies a transparent analytical MODEL of CPU-core vs GPU-lane parallelism.
 * Results are an EDUCATIONAL SIMULATION, not a GPU benchmark.
 *
 * A future `WebGPUEngine` can implement the same interface to dispatch the
 * workload as a real compute shader — see `webgpuEngine` below.
 */

export type Workload = 'float-math' | 'integer-mix' | 'sha256-random';
export type Intensity = 'light' | 'medium' | 'heavy';

export interface BenchmarkConfig {
  tasks: number;
  cpuWorkers: number;
  gpuWorkers: number;
  workload: Workload;
  intensity: Intensity;
}

export interface ModelParams {
  /** How much slower one GPU lane is than one CPU core on this scalar workload. */
  laneSlowdown: number;
  /** Fixed kernel launch + host↔device transfer overhead (ms). */
  launchOverheadMs: number;
  /** Per-task transfer cost (ms). */
  transferPerTaskMs: number;
}

export interface BenchmarkResult {
  engine: string;
  config: BenchmarkConfig;
  measuredTaskMs: number; // real, measured on this device
  calibrationSamples: number;
  cpuTimeMs: number; // modeled
  gpuTimeMs: number; // modeled
  cpuThroughput: number; // tasks/s
  gpuThroughput: number; // tasks/s
  speedup: number;
  model: ModelParams;
  checksum: number; // proves the workload actually ran
}

export interface BenchmarkEngine {
  id: 'simulated' | 'webgpu';
  label: string;
  isAvailable(): Promise<boolean>;
  run(config: BenchmarkConfig): Promise<BenchmarkResult>;
}

export const WORKLOAD_LABELS: Record<Workload, string> = {
  'float-math': 'Floating-point math (sin/sqrt mix)',
  'integer-mix': 'Integer bit-mixing (xorshift)',
  'sha256-random': 'SHA-256 of random sample data',
};

const OPS: Record<Intensity, number> = { light: 2_000, medium: 10_000, heavy: 40_000 };

export const DEFAULT_MODEL: ModelParams = { laneSlowdown: 12, launchOverheadMs: 2.5, transferPerTaskMs: 0.0004 };

function floatTask(seed: number, ops: number): number {
  let x = seed * 0.000123 + 0.5;
  for (let i = 0; i < ops; i++) x = Math.sin(x) * Math.sqrt(i + 1.5) + 0.25;
  return x;
}

function intTask(seed: number, ops: number): number {
  let x = (seed * 2654435761) | 0 || 1;
  for (let i = 0; i < ops; i++) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; }
  return x >>> 0;
}

async function shaTask(ops: number): Promise<number> {
  const rounds = Math.max(1, Math.round(ops / 2000));
  const data = new Uint8Array(64);
  let acc = 0;
  for (let r = 0; r < rounds; r++) {
    crypto.getRandomValues(data);
    const d = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
    acc = (acc + d[0]) | 0;
  }
  return acc;
}

const yieldToUI = () => new Promise<void>((r) => setTimeout(r, 0));

/** Run the real workload for ~budgetMs and return the measured average per-task time. */
export async function calibrate(workload: Workload, intensity: Intensity, budgetMs = 160) {
  const ops = OPS[intensity];
  let samples = 0;
  let checksum = 0;
  let computeMs = 0; // only time spent executing tasks — UI yields are excluded
  while (computeMs < budgetMs || samples < 3) {
    const sliceStart = performance.now();
    while (performance.now() - sliceStart < 16) {
      const seed = (Math.random() * 1e6) | 0;
      if (workload === 'float-math') checksum += floatTask(seed, ops);
      else if (workload === 'integer-mix') checksum = (checksum + intTask(seed, ops)) | 0;
      else checksum = (checksum + (await shaTask(ops))) | 0;
      samples++;
      if (samples > 50_000) break;
    }
    computeMs += performance.now() - sliceStart;
    await yieldToUI();
    if (samples > 50_000) break;
  }
  return { taskMs: computeMs / samples, samples, checksum: Number.isFinite(checksum) ? checksum : 0 };
}

export function model(config: BenchmarkConfig, taskMs: number, params: ModelParams = DEFAULT_MODEL) {
  const cpuBatches = Math.ceil(config.tasks / config.cpuWorkers);
  const gpuBatches = Math.ceil(config.tasks / config.gpuWorkers);
  const cpuTimeMs = cpuBatches * taskMs;
  const gpuTimeMs = params.launchOverheadMs + config.tasks * params.transferPerTaskMs + gpuBatches * taskMs * params.laneSlowdown;
  return { cpuTimeMs, gpuTimeMs, speedup: cpuTimeMs / gpuTimeMs };
}

export const simulatedEngine: BenchmarkEngine = {
  id: 'simulated',
  label: 'Educational Simulation (CPU-calibrated model)',
  isAvailable: async () => true,
  async run(config) {
    const cal = await calibrate(config.workload, config.intensity);
    const m = model(config, cal.taskMs);
    return {
      engine: this.label,
      config,
      measuredTaskMs: cal.taskMs,
      calibrationSamples: cal.samples,
      cpuTimeMs: m.cpuTimeMs,
      gpuTimeMs: m.gpuTimeMs,
      cpuThroughput: config.tasks / (m.cpuTimeMs / 1000),
      gpuThroughput: config.tasks / (m.gpuTimeMs / 1000),
      speedup: m.speedup,
      model: DEFAULT_MODEL,
      checksum: cal.checksum,
    };
  },
};

/**
 * Placeholder for a future real WebGPU compute benchmark.
 * Detection is real; execution is intentionally not implemented yet.
 */
export const webgpuEngine: BenchmarkEngine = {
  id: 'webgpu',
  label: 'WebGPU Compute (future module)',
  async isAvailable() {
    try {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown | null> } }).gpu;
      if (!gpu) return false;
      return (await gpu.requestAdapter()) !== null;
    } catch {
      return false;
    }
  },
  async run() {
    throw new Error('The WebGPU benchmark module is not implemented in this version.');
  },
};
