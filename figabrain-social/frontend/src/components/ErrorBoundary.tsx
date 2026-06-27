import { Component, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 text-center">
          <div className="glass-panel rounded-2xl p-8 max-w-sm">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
            <p className="text-white/50 text-sm mb-4">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="bg-brain-accent/20 hover:bg-brain-accent/30 text-sm px-4 py-2 rounded-full"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
