import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Experiment, PageId, Settings, StrengthCategory } from '../types';
import { clearAll, DEFAULT_SETTINGS, loadHistory, loadSettings, sampleExperiments, saveHistory, saveSettings } from '../lib/storage';
import { uid } from '../lib/format';

interface Toast { id: string; message: string; tone: 'info' | 'success' | 'error' }

interface AppState {
  page: PageId;
  navigate: (p: PageId) => void;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  history: Experiment[];
  addExperiment: (e: Omit<Experiment, 'id' | 'date'>) => void;
  deleteExperiment: (id: string) => void;
  clearHistory: () => void;
  resetAll: () => void;
  toasts: Toast[];
  notify: (message: string, tone?: Toast['tone']) => void;
  /** In-memory only: category + entropy of the last analysis. The password itself is never kept. */
  lastStrength: { category: StrengthCategory; entropy: number } | null;
  setLastStrength: (v: { category: StrengthCategory; entropy: number } | null) => void;
}

const Ctx = createContext<AppState | null>(null);

const PAGES: PageId[] = ['overview', 'analyzer', 'hash', 'gpu', 'attack', 'insights', 'history', 'reports', 'settings'];
const pageFromHash = (): PageId => {
  const h = window.location.hash.replace('#/', '').replace('#', '') as PageId;
  return PAGES.includes(h) ? h : 'overview';
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageId>(pageFromHash);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [history, setHistory] = useState<Experiment[]>(() => loadHistory() ?? sampleExperiments());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastStrength, setLastStrength] = useState<AppState['lastStrength']>(null);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((p: PageId) => {
    if (window.location.hash !== `#/${p}`) window.location.hash = `/${p}`;
    setPage(p);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.accent = settings.accent;
    root.dataset.surface = settings.surface;
    root.classList.toggle('no-anim', !settings.animations);
    saveSettings(settings);
  }, [settings]);

  useEffect(() => saveHistory(history), [history]);

  const notify = useCallback((message: string, tone: Toast['tone'] = 'info') => {
    const id = uid();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const value = useMemo<AppState>(() => ({
    page,
    navigate,
    settings,
    updateSettings: (patch) => setSettings((s) => ({ ...s, ...patch })),
    history,
    addExperiment: (e) => setHistory((h) => [{ ...e, id: uid(), date: new Date().toISOString() }, ...h].slice(0, 500)),
    deleteExperiment: (id) => setHistory((h) => h.filter((x) => x.id !== id)),
    clearHistory: () => setHistory([]),
    resetAll: () => {
      clearAll();
      setSettings(DEFAULT_SETTINGS);
      setHistory(sampleExperiments());
      setLastStrength(null);
    },
    toasts,
    notify,
    lastStrength,
    setLastStrength,
  }), [page, navigate, settings, history, toasts, notify, lastStrength]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used within AppProvider');
  return v;
}
