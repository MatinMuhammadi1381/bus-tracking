'use client';

import { usePathname } from 'next/navigation';

const appVersion = '1.3.78';

export function AppVersion() {
  const isAdminLogin = usePathname() === '/admin/login';

  return (
    <footer
      className={
        isAdminLogin
          ? 'fixed inset-x-0 bottom-2 z-50 px-4 text-center text-[10px] font-medium text-slate-500 md:bottom-3'
          : 'px-4 pb-3 pt-1 text-center text-[10px] font-medium text-slate-500'
      }
    >
      نسخه {appVersion}
    </footer>
  );
}
