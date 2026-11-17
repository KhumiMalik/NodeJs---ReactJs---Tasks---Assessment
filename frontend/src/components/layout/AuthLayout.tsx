import { CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Brand } from '../common/Brand';

const highlights = [
  'Organise every task in one place',
  'Search and filter in an instant',
  'Track your progress and recent activity',
];

interface AuthLayoutProps {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-[44%] overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-12 lg:flex lg:flex-col lg:justify-between">
        <Brand inverted />
        <div>
          <h2 className="text-3xl font-bold leading-tight text-white">Get more done, with less stress.</h2>
          <ul className="mt-8 space-y-4">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-3 text-indigo-100">
                <CheckCircle2 className="h-5 w-5 text-indigo-300" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-indigo-200">Task Management System - full-stack assessment</p>
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
      </aside>

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
