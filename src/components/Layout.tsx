import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, Menu, ShieldCheck, XCircle } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useApp } from '../context/AppContext';
import { NAV, Sidebar } from './Sidebar';

export function Layout({ children }: { children: ReactNode }) {
  const { page, toasts } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = NAV.find((n) => n.id === page);

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/[0.06] bg-ink-950/70 px-4 py-3 backdrop-blur-xl md:px-8">
          <button className="rounded-lg border border-white/10 p-2 text-slate-300 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="hidden text-slate-500 sm:inline">Lab</span>
            <span className="hidden text-slate-600 sm:inline">/</span>
            <span className="truncate font-medium text-slate-200">{current?.label}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 sm:flex">
              <span className="h-1.5 w-1.5 animate-pulseglow rounded-full bg-emerald-400" /> Local processing only
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent"><ShieldCheck size={13} /> Educational</span>
          </div>
        </header>
        <main className="bg-grid flex-1 px-4 py-6 md:px-8 md:py-8">
          <AnimatePresence mode="wait">
            <motion.div key={page} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="mx-auto max-w-7xl">
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
              className="glass pointer-events-auto flex items-center gap-2 px-4 py-3 text-sm text-slate-200">
              {t.tone === 'success' ? <CheckCircle2 size={16} className="text-emerald-400" /> : t.tone === 'error' ? <XCircle size={16} className="text-rose-400" /> : <Info size={16} className="text-accent" />}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
