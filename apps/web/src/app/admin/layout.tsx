'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    document.documentElement.style.overflow = isLoginPage ? 'hidden' : '';
    document.body.style.overflow = isLoginPage ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [isLoginPage]);

  return (
    <div
      className={`${isLoginPage ? 'fixed inset-0 z-10 flex h-[100dvh] flex-col overflow-hidden' : 'min-h-screen'} bg-[radial-gradient(circle_at_top_right,#dff7f8,transparent_35%),#f4f8fb]`}
    >
      <header className="shrink-0 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur">
        <div className="page-shell">
          <div className="flex min-w-0 items-center justify-between gap-3 py-3 sm:py-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-600 font-black text-white">
                BT
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-900">پنل مدیریت</h1>
                <p className="text-xs text-slate-500">کنترل عملیات و رصد سفرها</p>
              </div>
            </div>
            <a
              href="/admin/login"
              className="shrink-0 whitespace-nowrap rounded-lg bg-cyan-600 px-2.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-cyan-700 sm:px-3 sm:text-sm"
            >
              ورود / تعویض حساب
            </a>
          </div>
        </div>
      </header>
      <main
        className={`${isLoginPage ? 'min-h-0 flex-1 overflow-hidden' : ''} page-shell`}
      >
        {children}
      </main>
    </div>
  );
}
