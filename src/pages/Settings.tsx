import { Gauge, Info, Palette, RotateCcw, Settings as SettingsIcon, Sparkles, Users } from 'lucide-react';
import { Card, CardTitle, ConfirmButton, PageHeader, Segmented, Toggle } from '../components/ui';
import { useApp } from '../context/AppContext';
import { APP_VERSION, PROJECT_TITLE, TEAM } from '../lib/project';
import type { AccentTheme, SurfaceTheme } from '../types';

const ACCENTS: { value: AccentTheme; label: string; swatch: string }[] = [
  { value: 'cyan', label: 'Neon Cyan', swatch: '#22d3ee' },
  { value: 'violet', label: 'Ultra Violet', swatch: '#a78bfa' },
  { value: 'emerald', label: 'Matrix Green', swatch: '#34d399' },
];

export default function SettingsPage() {
  const { settings, updateSettings, resetAll, notify, history } = useApp();

  return (
    <div>
      <PageHeader icon={<SettingsIcon size={26} />} title="Settings" subtitle="Personalize the lab and manage local data" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card glow>
          <CardTitle icon={<Palette size={16} />} title="Theme" subtitle="Accent color and background surface" />
          <p className="label">Accent</p>
          <div className="grid grid-cols-3 gap-2">
            {ACCENTS.map((a) => (
              <button key={a.value} onClick={() => updateSettings({ accent: a.value })}
                className={`rounded-xl border p-3 text-left transition ${settings.accent === a.value ? 'border-accent/60 bg-accent/10' : 'border-white/10 hover:border-white/20'}`}>
                <span className="mb-2 block h-6 w-6 rounded-full" style={{ background: a.swatch, boxShadow: `0 0 14px ${a.swatch}` }} />
                <span className="text-xs font-medium text-slate-200">{a.label}</span>
              </button>
            ))}
          </div>
          <p className="label mt-5">Surface</p>
          <Segmented<SurfaceTheme> value={settings.surface} onChange={(v) => updateSettings({ surface: v })} options={[{ value: 'midnight', label: 'Midnight black' }, { value: 'charcoal', label: 'Charcoal' }]} />
        </Card>

        <Card>
          <CardTitle icon={<Sparkles size={16} />} title="Motion & Simulation" />
          <div className="space-y-6">
            <Toggle checked={settings.animations} onChange={(v) => updateSettings({ animations: v })} label="Animations" description="Glowing borders, transitions and live visualizations" />
            <div>
              <p className="label flex items-center gap-1.5"><Gauge size={13} /> Simulation playback speed</p>
              <Segmented value={settings.simulationSpeed} onChange={(v) => updateSettings({ simulationSpeed: v })}
                options={[0.5, 1, 2, 4].map((v) => ({ value: v, label: `${v}x` }))} />
              <p className="mt-2 text-xs text-slate-500">Affects visual playback in the GPU Simulation and the dictionary demo. It never changes computed results.</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle icon={<RotateCcw size={16} />} title="Reset application data" subtitle="Clears local experiment history and settings, then restores sample experiments" />
          <p className="mb-4 text-sm text-slate-400">Currently storing <span className="mono text-slate-200">{history.length}</span> experiment record(s) in this browser's local storage. No passwords are ever stored.</p>
          <ConfirmButton onConfirm={() => { resetAll(); notify('Application data reset', 'success'); }} confirmText="Click again to reset everything"><RotateCcw size={16} /> Reset application data</ConfirmButton>
        </Card>

        <Card>
          <CardTitle icon={<Info size={16} />} title="About this project" />
          <p className="text-sm font-semibold text-white">{PROJECT_TITLE}</p>
          <p className="mt-2 text-sm text-slate-400">An interactive, defensive cybersecurity learning platform demonstrating password strength, cryptographic hashing, GPU parallel computing concepts, and why modern password storage relies on slow, salted, memory-hard algorithms.</p>
          <ul className="mt-3 space-y-1 text-xs text-slate-400">
            <li>• 100% client-side — no backend, no network calls with user data</li>
            <li>• Synthetic data and fictional targets only</li>
            <li>• GPU figures are clearly labeled educational simulations</li>
            <li>• Built with React, TypeScript, Vite, Tailwind CSS, Framer Motion, Recharts</li>
          </ul>
          <p className="mono mt-3 text-[11px] text-slate-500">Version {APP_VERSION}</p>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle icon={<Users size={16} />} title="Project Team" />
          <div className="grid gap-3 sm:grid-cols-3">
            {TEAM.map((t) => (
              <div key={t.name} className="flex items-center gap-3 rounded-xl border border-white/10 bg-ink-950/50 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-sm font-bold text-accent">{t.initials}</div>
                <div><p className="font-semibold text-white">{t.name}</p><p className="text-xs text-slate-400">{t.role}</p></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
