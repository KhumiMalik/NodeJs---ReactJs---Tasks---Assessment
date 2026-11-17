import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { AppHeader } from './AppHeader';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const { pathname } = useLocation();
  // The mobile drawer remembers the page it was opened on, so navigating
  // anywhere else closes it without an extra effect.
  const [drawerOpenedOn, setDrawerOpenedOn] = useState<string | null>(null);
  const navigationOpen = drawerOpenedOn === pathname;
  const setNavigationOpen = (open: boolean) => setDrawerOpenedOn(open ? pathname : null);

  useEffect(() => {
    if (!navigationOpen) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setDrawerOpenedOn(null);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigationOpen]);

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {navigationOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setNavigationOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] shadow-xl">
            <Sidebar onNavigate={() => setNavigationOpen(false)} onClose={() => setNavigationOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <AppHeader onOpenNavigation={() => setNavigationOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
