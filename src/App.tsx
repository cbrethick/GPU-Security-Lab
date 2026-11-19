import { MotionConfig } from 'framer-motion';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { AppProvider, useApp } from './context/AppContext';
import AttackSimulation from './pages/AttackSimulation';
import ExperimentHistory from './pages/ExperimentHistory';
import GpuSimulation from './pages/GpuSimulation';
import HashLab from './pages/HashLab';
import Overview from './pages/Overview';
import PasswordAnalyzer from './pages/PasswordAnalyzer';
import Reports from './pages/Reports';
import SecurityInsights from './pages/SecurityInsights';
import SettingsPage from './pages/Settings';

function Router() {
  const { page, settings } = useApp();
  const pages = {
    overview: <Overview />,
    analyzer: <PasswordAnalyzer />,
    hash: <HashLab />,
    gpu: <GpuSimulation />,
    attack: <AttackSimulation />,
    insights: <SecurityInsights />,
    history: <ExperimentHistory />,
    reports: <Reports />,
    settings: <SettingsPage />,
  } as const;
  return (
    <MotionConfig reducedMotion={settings.animations ? 'user' : 'always'}>
      <Layout>
        <ErrorBoundary key={page}>{pages[page]}</ErrorBoundary>
      </Layout>
    </MotionConfig>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
