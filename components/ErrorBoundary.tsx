import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-arc-black flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-arc-panel border border-arc-border p-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-arc-black border border-red-500 rounded-full flex items-center justify-center">
                <AlertCircle className="text-red-500 w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white font-mono tracking-tighter">
                  SYSTEM FAILURE
                </h1>
                <p className="text-arc-muted text-sm font-mono">
                  ADAM Core encountered a critical error
                </p>
              </div>
            </div>

            {/* Error Details */}
            <div className="bg-arc-black border border-arc-border p-4 mb-6 font-mono text-sm">
              <div className="text-red-400 mb-2">
                ERROR: {this.state.error?.name || 'Unknown Error'}
              </div>
              <div className="text-arc-muted">
                {this.state.error?.message || 'No error message available'}
              </div>
            </div>

            {/* Stack Trace (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mb-6">
                <summary className="cursor-pointer text-arc-accent hover:text-blue-400 font-mono text-sm mb-2">
                  View Stack Trace
                </summary>
                <pre className="bg-arc-black border border-arc-border p-4 text-xs text-arc-muted overflow-x-auto">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-arc-accent text-white px-6 py-3 font-bold tracking-widest hover:bg-blue-600 transition-all uppercase text-xs flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Restart System
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 border border-arc-border text-white px-6 py-3 font-mono text-xs hover:border-arc-accent transition-colors uppercase"
              >
                Full Reload
              </button>
            </div>

            {/* Help Text */}
            <div className="mt-6 pt-6 border-t border-arc-border">
              <p className="text-arc-muted text-xs leading-relaxed">
                If this error persists, please check the browser console for more details
                or contact support with the error information above.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

