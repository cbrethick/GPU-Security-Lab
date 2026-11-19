import { AnimatePresence, motion } from 'framer-motion';
import { Activity, ChevronsLeft, ChevronsRight, Cpu, FileText, FlaskConical, Hash, History, KeyRound, LayoutDashboard, Lightbulb, Settings, ShieldCheck, Swords, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useApp } from '../context/AppContext';
import type { PageId } from '../types';

export const NAV: { id: PageId; label: string; icon: ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'analyzer', label: 'Password Analyzer', icon: <KeyRound size={18} /> },
  { id: 'hash', label: 'Hash Lab', icon: <Hash size={18} /> },
  { id: 'gpu', label: 'GPU Simulation', icon: <Cpu size={18} /> },
  { id: 'attack', label: 'Attack Simulation', icon: <Swords size={18} /> },
  { id: 'insights', label: 'Security Insights', icon: <Lightbulb size={18} /> },
  { id: 'history', label: 'Experiment History', icon: <History size={18} /> },
  { id: 'reports', label: 'Report Generator', icon: <FileText size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
];

function NavList({ collapsed, onPick }: { collapsed: boolean; onPick?: () => void }) {
  const { page, navigate } = useApp();
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV.map((n) => {
        const active = page === n.id;
        return (
          <button
            key={n.id}
            onClick={() => { navigate(n.id); onPick?.(); }}
            title={collapsed ? n.label : undefined}
            aria-current={active ? 'page' : undefined}
            className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              active ? 'bg-accent/10 text-accent' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
            } ${collapsed ? 'justify-center' : ''}`}
          >
            {active && <motion.span layoutId="nav-active" className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-accent shadow-[0_0_12px_rgb(var(--accent))]" />}
            <span className="shrink-0">{n.icon}</span>
            {!collapsed && <span className="truncate">{n.label}</span>}
          </button>
        );
      })}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-5 py-5 ${collapsed ? 'justify-center px-0' : ''}`}>
      <div className="relative rounded-xl border border-accent/40 bg-accent/10 p-2 text-accent">
        <ShieldCheck size={20} />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulseglow rounded-full bg-accent-2" />
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">GPU Security Lab</p>
          <p className="text-[11px] text-slate-500">Educational Deep Dive</p>
        </div>
      )}
    </div>
  );
}

function Footer({ collapsed }: { collapsed: boolean }) {
  if (collapsed) return <div className="flex justify-center py-4 text-emerald-400"><Activity size={16} /></div>;
  return (
    <div className="m-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
      <p className="flex items-center gap-1.5 font-medium text-emerald-300"><FlaskConical size={13} /> Safe Lab Mode</p>
      <p className="mt-1 text-slate-400">All processing runs locally. Synthetic data only. Nothing is sent to a server.</p>
    </div>
  );
}

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: {
  collapsed: boolean; setCollapsed: (v: boolean) => void; mobileOpen: boolean; setMobileOpen: (v: boolean) => void;
}) {
  return (
    <>
      <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/[0.06] bg-ink-900/70 backdrop-blur-xl transition-[width] duration-300 lg:flex ${collapsed ? 'w-[76px]' : 'w-64'}`}>
        <Brand collapsed={collapsed} />
        <NavList collapsed={collapsed} />
        <Footer collapsed={collapsed} />
        <button onClick={() => setCollapsed(!collapsed)} className="mx-3 mb-4 flex items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> Collapse</>}
        </button>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-ink-900 lg:hidden" initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', damping: 28, stiffness: 260 }}>
              <div className="flex items-center justify-between pr-3">
                <Brand collapsed={false} />
                <button className="rounded-lg p-2 text-slate-400 hover:bg-white/5" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button>
              </div>
              <NavList collapsed={false} onPick={() => setMobileOpen(false)} />
              <Footer collapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

