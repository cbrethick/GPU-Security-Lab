import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[GPU Lab] Render error', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="glass mx-auto max-w-xl p-6 text-center">
          <p className="text-lg font-semibold text-rose-300">This module hit an unexpected error</p>
          <p className="mono mt-2 text-xs text-slate-400">{this.state.error.message}</p>
          <button className="btn-primary mt-4" onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
