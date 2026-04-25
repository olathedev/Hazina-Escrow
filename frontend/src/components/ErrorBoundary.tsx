import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  /** Optional label shown in the fallback heading for scoped boundaries. */
  label?: string;
  /** Called after the user clicks "Try again" on a scoped boundary. */
  onReset?: () => void;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error", error, info);
  }

  private handleReload = () => {
    if (this.props.onReset) {
      this.setState({ error: null });
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="glass-card max-w-lg w-full p-8 text-center">
            <h2 className="font-display text-2xl font-semibold text-foreground mb-3">
              {this.props.label
                ? `Something went wrong in ${this.props.label}`
                : "Something went wrong"}
            </h2>
            <p className="font-body text-sm text-foreground-muted mb-6 break-words">
              {this.state.error.message || "Unexpected application error"}
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="btn-gold px-6 py-2.5 text-sm"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
