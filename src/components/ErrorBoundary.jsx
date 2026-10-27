import { Component } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/controls.jsx';
import { Card } from './ui/feedback.jsx';
import { HomeIcon, RefreshCwIcon, AlertTriangleIcon } from './ui/icons.jsx';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-cream p-4">
          <Card className="max-w-md w-full text-center p-8">
            <div aria-hidden className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-red-100 text-red-600">
              <AlertTriangleIcon className="h-8 w-8" />
            </div>
            <h2 className="font-display text-2xl text-navy-900">Something went wrong</h2>
            <p className="mt-2 text-slate-600">
              We're sorry, but an unexpected error occurred. Please try refreshing the page.
            </p>
            {this.state.error && (
              <details open={Boolean(import.meta.env?.DEV)} className="mt-4 text-left p-3 rounded-xl bg-slate-100 text-xs text-slate-600">
                <summary className="font-semibold cursor-pointer">
                  Error details {import.meta.env?.DEV ? '(Development mode)' : ''}
                </summary>
                <div className="mt-2 font-mono text-red-700 font-semibold text-xs">
                  {this.state.error?.message || String(this.state.error)}
                </div>
                <pre className="mt-1 overflow-auto max-h-40 font-mono text-red-600 whitespace-pre-wrap text-[11px]">
                  {this.state.error?.stack || ''}
                </pre>
                {this.state.errorInfo?.componentStack && (
                  <pre className="mt-2 overflow-auto max-h-40 font-mono text-slate-600 whitespace-pre-wrap text-[11px]">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
            <div className="mt-6 flex gap-3 justify-center">
              <Button onClick={() => window.location.reload()} size="lg">
                <RefreshCwIcon className="h-4 w-4" /> Refresh Page
              </Button>
              <Link to="/">
                <Button variant="outline" size="lg">
                  <HomeIcon className="h-4 w-4" /> Go Home
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}