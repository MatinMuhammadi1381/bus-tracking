'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiBase } from '../../../lib/apiBase';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'نام کاربری یا رمز عبور نادرست است.');
      if (!['SUPER_ADMIN', 'ADMIN', 'SUPPORT'].includes(body.user?.role)) {
        throw new Error('این حساب دسترسی پنل را ندارد.');
      }
      localStorage.setItem('adminToken', body.accessToken);
      localStorage.setItem('adminUser', JSON.stringify(body.user));
      router.push(body.user.role === 'SUPER_ADMIN' ? '/admin/super-admin' : '/admin');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ورود انجام نشد.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      className="flex h-full min-h-0 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_right,#dff7f8,transparent_35%),#f4f8fb] p-3 sm:p-4"
      dir="rtl"
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded-3xl border border-white/80 bg-white/90 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur sm:space-y-5 sm:p-7"
      >
        <div className="mb-4 flex items-center gap-3 sm:mb-6">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-600 font-black text-white">
            BT
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">ورود پنل مدیریت</h1>
            <p className="text-xs text-slate-500">دسترسی امن به عملیات</p>
          </div>
        </div>
        <input
          required
          value={username}
          onChange={event => setUsername(event.target.value)}
          placeholder="نام کاربری"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-cyan-500 focus:bg-white"
        />
        <div className="relative">
          <input
            required
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={event => setPassword(event.target.value)}
            placeholder="رمز عبور"
            autoComplete="current-password"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 pl-12 outline-none transition focus:border-cyan-500 focus:bg-white"
          />
          <button
            type="button"
            onClick={() => setShowPassword(value => !value)}
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 p-1 text-slate-500 transition hover:text-slate-700"
            aria-label={showPassword ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
            title={showPassword ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                <path fill="currentColor" d="M3.27 2.22 2 3.49l3.06 3.06C3.3 7.72 1.82 9.49 1 12c1.73 5 6.2 8 11 8 1.75 0 3.39-.42 4.85-1.15L20.51 22 21.78 20.73 3.27 2.22ZM12 18c-3.73 0-6.93-2.12-8.65-6 .56-1.24 1.38-2.29 2.38-3.16L8.1 11.21A4 4 0 0 0 12 16c.73 0 1.4-.2 1.98-.54l1.46 1.46A8.8 8.8 0 0 1 12 18Zm0-12c3.73 0 6.93 2.12 8.65 6a9.5 9.5 0 0 1-1.75 2.65l-2.13-2.13A4 4 0 0 0 12 8c-.73 0-1.4.2-1.98.54L8.45 6.97A8.8 8.8 0 0 1 12 6Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                <path fill="currentColor" d="M12 5c-4.7 0-8.48 2.92-10 7 1.52 4.08 5.3 7 10 7s8.48-2.92 10-7c-1.52-4.08-5.3-7-10-7Zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-2.5A2.5 2.5 0 1 0 12 9a2.5 2.5 0 0 0 0 5.5Z" />
              </svg>
            )}
          </button>
        </div>
        <button
          disabled={saving}
          className="w-full rounded-xl bg-cyan-600 p-3 font-bold text-white shadow-lg shadow-cyan-600/20 transition hover:bg-cyan-700 disabled:opacity-50"
        >
          {saving ? 'در حال ورود...' : 'ورود'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </main>
  );
}
