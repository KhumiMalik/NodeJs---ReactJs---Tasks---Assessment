import { CloudSun, LayoutDashboard, LogOut, Trash2, X } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router';
import { useCurrentUser, useLogout } from '../../hooks/useAuth';
import { useTaskStatistics } from '../../hooks/useTasks';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../utils/cn';
import { Brand } from '../common/Brand';

interface SidebarProps {
  onNavigate?: () => void;
  onClose?: () => void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function Sidebar({ onNavigate, onClose }: SidebarProps) {
  const { data: user } = useCurrentUser();
  const { data: stats } = useTaskStatistics();
  const logout = useLogout();
  const navigate = useNavigate();
  const toast = useToast();

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: stats?.pending },
    { to: '/trash', label: 'Trash', icon: Trash2, badge: stats?.trashed },
    { to: '/weather', label: 'Weather', icon: CloudSun, badge: undefined },
  ];

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => toast.success('You have been signed out.'),
      onSettled: () => navigate('/login', { replace: true }),
    });
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 items-center justify-between px-5">
        <Brand />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <nav aria-label="Main" className="flex-1 space-y-1 px-3 py-4">
        {links.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="flex-1">{label}</span>
            {badge !== undefined && badge > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 group-hover:bg-white">
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700"
              aria-hidden="true"
            >
              {initials(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={logout.isPending}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
