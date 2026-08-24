import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Rendered in place of the subtree when it has thrown. */
  fallback?: ReactNode;
  /** Escape hatch for reporting to a logging service in a real deployment. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render-time errors in the subtree and shows a fallback instead of
 * unmounting the whole application.
 *
 * This exists because the canvas is the realistic place for one. It hands
 * coordinates to fabric, a third-party imperative library drawing to a context
 * the browser may refuse to give us — and React 16+ unmounts the entire tree
 * on an uncaught render error, so without a boundary a single bad finding
 * takes the table down with it.
 *
 * It has to be a class: `getDerivedStateFromError` and `componentDidCatch`
 * have no hook equivalents.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      this.props.fallback ?? (
        <div className="ErrorBoundary" role="alert">
          <h2>Something went wrong.</h2>
          <p>This section could not be displayed. Try reloading the page.</p>
        </div>
      )
    );
  }
}

export default ErrorBoundary;
