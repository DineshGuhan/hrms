import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Catches render errors and shows a fallback with a retry action. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Errors are reported to the backend audit/logging in a later story.
  }

  private retry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div role="alert" className="error-boundary">
          <h2>Something went wrong</h2>
          <button type="button" onClick={this.retry}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
