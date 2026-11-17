import { Menu } from 'lucide-react';
import { Brand } from '../common/Brand';

/** Top bar shown on small screens, where the sidebar becomes a drawer. */
export function AppHeader({ onOpenNavigation }: { onOpenNavigation: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
      <button
        type="button"
        onClick={onOpenNavigation}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      <Brand />
    </header>
  );
}
