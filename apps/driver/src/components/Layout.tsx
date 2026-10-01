import { ReactNode } from 'react';
import { appVersion } from '../config';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-gray-100">
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <footer className="px-4 pb-3 pt-1 text-center text-[10px] font-medium text-slate-500">
        نسخه {appVersion}
      </footer>
    </div>
  );
}
