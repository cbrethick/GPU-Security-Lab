/** Categorical palette validated for the dark surface (fixed order — never cycled). */
export const SERIES = {
  cpu: '#8b5cf6',
  gpu: '#0891b2',
  c3: '#ec4899',
  c4: '#d97706',
  c5: '#059669',
} as const;
/** Brighter strokes for lines/text-adjacent marks on the dark surface. */
export const LINE = { cpu: '#a78bfa', gpu: '#22d3ee' } as const;
export const GRID = 'rgba(148,163,184,0.10)';
export const AXIS = '#64748b';
