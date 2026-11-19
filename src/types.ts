export type PageId =
  | 'overview'
  | 'analyzer'
  | 'hash'
  | 'gpu'
  | 'attack'
  | 'insights'
  | 'history'
  | 'reports'
  | 'settings';

export type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512';

export type ExperimentStatus = 'completed' | 'aborted' | 'sample';

/** Only safe, non-sensitive metadata. Never contains a password or hash input. */
export interface Experiment {
  id: string;
  name: string;
  date: string; // ISO
  algorithm: string;
  inputSize: number; // number of simulated tasks / items
  cpuTimeMs: number;
  gpuTimeMs: number;
  ratio: number;
  status: ExperimentStatus;
  module: 'GPU Simulation' | 'Hash Lab' | 'Attack Simulation' | 'Sample';
}

export type AccentTheme = 'cyan' | 'violet' | 'emerald';
export type SurfaceTheme = 'midnight' | 'charcoal';

export interface Settings {
  accent: AccentTheme;
  surface: SurfaceTheme;
  animations: boolean;
  simulationSpeed: number; // 0.5 | 1 | 2 | 4
}

export type StrengthCategory = 'VERY WEAK' | 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY STRONG';
