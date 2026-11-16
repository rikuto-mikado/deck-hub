import { HomePage } from '@/pages/HomePage';
import { PlayPage } from '@/pages/PlayPage';
import { ErrorBoundary } from './ErrorBoundary';
import { usePath } from './router';

export function App() {
  const path = usePath();
  return (
    <ErrorBoundary key={path}>
      <Routes path={path} />
    </ErrorBoundary>
  );
}

function Routes({ path }: { path: string }) {
  const [head, arg] = (path.split('?')[0] ?? '').split('/');

  if (head === 'play' && arg) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 short:py-1.5">
        <PlayPage gameId={arg} />
      </main>
    );
  }
  return (
    <main className="mx-auto w-full max-w-[1400px] overflow-x-clip px-4 sm:px-6">
      <HomePage />
    </main>
  );
}
