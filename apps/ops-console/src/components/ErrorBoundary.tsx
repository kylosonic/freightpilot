import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="border border-[#e7c2be] bg-white p-8 text-center">
          <div className="mx-auto mb-4 inline-grid h-12 w-12 place-items-center bg-[#fcf0ef]">
            <svg className="h-6 w-6 text-[#a3342f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="mb-2 text-base font-semibold text-[#20372f]">Something went wrong</h2>
          <p className="mb-6 text-xs text-[#63766f]">
            {this.state.error?.message || 'An unexpected error occurred in this workspace surface.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="inline-flex min-h-9 items-center border border-[#cfd9d5] bg-white px-4 text-xs font-semibold text-[#40534c] transition hover:bg-[#eef3f0]"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

