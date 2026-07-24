import React, { ReactNode, ReactElement } from 'react';
import { AlertTriangle, RefreshCw, Send } from 'lucide-react';
import { useReportIssueContext } from '@/contexts/ReportIssueContext';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

// Error boundary doesn't support hooks, so we need to use a wrapper component
export class ErrorBoundaryImpl extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    console.error('Error caught by boundary:', error, errorInfo);

    // Generate error ID for tracking
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Send error to main process for logging
    try {
      const { ipcRenderer } = require('electron');
      ipcRenderer.send('error:boundary', {
        errorId,
        message: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      // ipcRenderer not available in this context
      console.error('Failed to send error to main process:', err);
    }

    this.setState({
      error,
      errorInfo,
      errorId,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  handleReportIssue = () => {
    // Dispatch a custom event to notify the app about the report request
    const event = new CustomEvent('report-issue', {
      detail: { errorId: this.state.errorId },
    });
    window.dispatchEvent(event);
  };

  render(): ReactElement {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-red-100 p-4 rounded-full">
                <AlertTriangle className="text-red-600" size={48} />
              </div>
            </div>

            {/* Error Message */}
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-4">
              Oops! Something went wrong
            </h1>

            <p className="text-gray-600 text-center mb-6">
              An unexpected error occurred in the application. Don't worry, we're here to help!
            </p>

            {/* Error Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-xs font-mono text-gray-600 mb-2">Error ID:</p>
              <p className="text-xs font-mono text-gray-900 break-all font-semibold mb-4">
                {this.state.errorId}
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <>
                  <p className="text-xs font-mono text-gray-600 mb-2">Error Message:</p>
                  <p className="text-xs font-mono text-red-600 mb-4 break-all">
                    {this.state.error.toString()}
                  </p>

                  <p className="text-xs font-mono text-gray-600 mb-2">Stack Trace:</p>
                  <pre className="text-xs text-gray-600 overflow-auto max-h-32 whitespace-pre-wrap break-words">
                    {this.state.error.stack}
                  </pre>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <RefreshCw size={18} />
                Try Again
              </button>

              <button
                onClick={this.handleReportIssue}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                <Send size={18} />
                Report Issue
              </button>
            </div>

            {/* Footer */}
            <p className="text-xs text-gray-500 text-center mt-6">
              If this issue persists, please contact support with the error ID above.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children as ReactElement;
  }
}

// Wrapper component to use hooks with the Error Boundary class component
export function ErrorBoundary({ children }: Props) {
  const reportIssue = useReportIssueContext();

  React.useEffect(() => {
    const handleReportIssueEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const errorId = customEvent.detail?.errorId;
      if (errorId) {
        reportIssue.openReport(errorId);
      }
    };

    window.addEventListener('report-issue', handleReportIssueEvent);
    return () => window.removeEventListener('report-issue', handleReportIssueEvent);
  }, [reportIssue]);

  return <ErrorBoundaryImpl>{children}</ErrorBoundaryImpl>;
}
