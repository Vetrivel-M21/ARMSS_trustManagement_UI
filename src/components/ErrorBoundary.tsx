import React from 'react';
import { AlertOctagon } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white border border-rose-200 rounded-xl shadow-sm p-6 text-center space-y-3">
            <AlertOctagon className="w-10 h-10 text-rose-500 mx-auto" />
            <h1 className="text-lg font-bold text-slate-900">Something went wrong</h1>
            <p className="text-sm text-slate-600">
              An unexpected error occurred while rendering this page. No financial data was modified by this error.
            </p>
            <p className="text-xs text-slate-400 font-mono break-all">{this.state.error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
