import { Component, type ErrorInfo, type ReactNode } from 'react';
import { href } from './router';

interface State {
  error: Error | null;
}

/**
 * Last line of defence: if rendering throws (a bug, or a game chunk that failed to load),
 * show a calm message with a way out instead of a blank page.
 */
/** Give it a `key` per page so moving to another page starts with a clean slate. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Talonbox crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <ErrorScreen onRetry={() => window.location.reload()} />;
  }
}

export function ErrorScreen({
  title = 'Something went wrong',
  detail,
  onRetry,
}: {
  title?: string;
  detail?: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="grid min-h-[70dvh] place-items-center px-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-4">
        <span className="block size-3 rotate-45 bg-gold" aria-hidden />
        <h1 className="m-0 font-display text-4xl font-semibold text-heading">{title}</h1>
        <p className="m-0 text-sm leading-relaxed text-body">
          {detail ?? 'The table was knocked over. Reloading usually sets it right again.'}
        </p>
        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-11 items-center rounded-full bg-accent px-6 text-sm font-semibold text-on-accent transition hover:bg-accent-hover"
          >
            Try again
          </button>
          <a
            href={href('')}
            className="inline-flex min-h-11 items-center rounded-full px-6 text-sm font-semibold text-cream ring-1 ring-cream/20 ring-inset hover:bg-cream/8"
          >
            All games
          </a>
        </div>
      </div>
    </div>
  );
}
