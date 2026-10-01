'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { getAdminAuthHeaders, getAdminAuthHeadersWithJson } from '../../../lib/auth';
import { apiBase } from '../../../lib/apiBase';

export default function SuperAdminPage() {
  const [form, setForm] = useState({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'ADMIN',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [admins, setAdmins] = useState<
    Array<{
      id: string;
      username: string;
      passwordPreview?: string | null;
      firstName: string;
      lastName: string;
      role: string;
      isActive: boolean;
    }>
  >([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [editingPasswordId, setEditingPasswordId] = useState<string | null>(null);
  const [passwordValues, setPasswordValues] = useState<Record<string, string>>({});

  const loadAdmins = useCallback(async () => {
    setLoadingAdmins(true);
    try {
      const response = await fetch(`${apiBase}/auth/admins`, {
        headers: getAdminAuthHeaders(),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'دریافت فهرست ادمین‌ها انجام نشد.');
      setAdmins(Array.isArray(body) ? body : body?.data || []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'دریافت فهرست ادمین‌ها انجام نشد.');
    } finally {
      setLoadingAdmins(false);
    }
  }, []);

  useEffect(() => {
    void loadAdmins();
  }, [loadAdmins]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');
    const response = await fetch(`${apiBase}/auth/admins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}`,
      },
      body: JSON.stringify(form),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.message || 'ساخت کاربر انجام نشد.');
      return;
    }
    setMessage(`کاربر ${body.username} با نقش ${body.role} ساخته شد.`);
    setForm({ username: '', password: '', firstName: '', lastName: '', role: 'ADMIN' });
    await loadAdmins();
  }

  async function resetPassword(id: string) {
    setError('');
    const password = passwordValues[id]?.trim() || '';
    if (!password) {
      setError('رمز جدید را وارد کنید.');
      return;
    }
    const response = await fetch(`${apiBase}/auth/admins/${id}/password`, {
      method: 'PUT',
      headers: getAdminAuthHeadersWithJson(),
      body: JSON.stringify({ password }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.message || 'تغییر رمز انجام نشد.');
      return;
    }
    setMessage(`رمز جدید ${body.username} ثبت شد.`);
    setEditingPasswordId(null);
    setPasswordValues(current => ({ ...current, [id]: '' }));
    await loadAdmins();
  }

  async function deleteAdmin(id: string, username: string) {
    if (!window.confirm(`آیا از حذف ادمین ${username} مطمئن هستید؟`)) return;
    setError('');
    const response = await fetch(`${apiBase}/auth/admins/${id}`, {
      method: 'DELETE',
      headers: getAdminAuthHeaders(),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.message || 'حذف ادمین انجام نشد.');
      return;
    }
    setMessage(`ادمین ${username} حذف شد.`);
    await loadAdmins();
  }

  return (
    <section className="max-w-5xl space-y-5" dir="rtl">
      <div className="rounded-2xl border border-white/80 bg-white/85 p-6 shadow-lg shadow-slate-900/5">
        <h2 className="text-2xl font-black text-slate-900">مدیریت سوپر ادمین</h2>
        <p className="mt-2 text-sm text-slate-600">
          فقط حساب SUPER_ADMIN می‌تواند کاربر ادمین یا پشتیبانی بسازد.
        </p>
        <form
          onSubmit={submit}
          className="mt-5 grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-5 sm:grid-cols-2"
        >
          {(['username', 'password', 'firstName', 'lastName'] as const).map(name => (
            <input
              key={name}
              required
              value={form[name]}
              type={name === 'password' ? 'password' : 'text'}
              placeholder={
                {
                  username: 'نام کاربری',
                  password: 'رمز عبور',
                  firstName: 'نام',
                  lastName: 'نام خانوادگی',
                }[name]
              }
              onChange={event => setForm({ ...form, [name]: event.target.value })}
              className="rounded-xl border border-slate-200 bg-white p-3 outline-none transition focus:border-cyan-500"
            />
          ))}
          <select
            value={form.role}
            onChange={event => setForm({ ...form, role: event.target.value })}
            className="rounded-xl border border-slate-200 bg-white p-3 outline-none transition focus:border-cyan-500"
          >
            <option value="ADMIN">ادمین</option>
            <option value="SUPPORT">پشتیبانی</option>
          </select>
          <button className="rounded-xl bg-cyan-600 p-3 font-bold text-white shadow-md shadow-cyan-600/20 transition hover:bg-cyan-700">
            ساخت کاربر
          </button>
          {message && <p className="text-emerald-700">{message}</p>}
          {error && <p className="text-red-600">{error}</p>}
        </form>
      </div>
      <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-lg shadow-slate-900/5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900">فهرست ادمین‌ها</h2>
            <p className="mt-1 text-sm text-slate-600">
              تعداد ادمین‌ها: {admins.length.toLocaleString('fa-IR')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAdmins()}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:border-cyan-300 hover:bg-cyan-50"
          >
            بروزرسانی
          </button>
        </div>
        {loadingAdmins ? (
          <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">در حال بارگذاری...</p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {admins.map(admin => (
              <article key={admin.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{admin.firstName} {admin.lastName}</h3>
                    <p className="mt-1 text-xs text-slate-500">{admin.role === 'SUPPORT' ? 'پشتیبانی' : admin.role === 'SUPER_ADMIN' ? 'سوپر ادمین' : 'ادمین'}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${admin.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                    {admin.isActive ? 'فعال' : 'غیرفعال'}
                  </span>
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500">نام کاربری</dt>
                    <dd className="max-w-[60%] break-all font-bold text-slate-800">{admin.username}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500">رمز عبور</dt>
                    <dd className="max-w-[60%] break-all font-mono font-bold text-cyan-700">{admin.passwordPreview || 'ثبت نشده'}</dd>
                  </div>
                </dl>
                {admin.role !== 'SUPER_ADMIN' && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPasswordId(current => current === admin.id ? null : admin.id);
                        setError('');
                      }}
                      className="flex-1 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600"
                    >
                      {editingPasswordId === admin.id ? 'بستن' : 'تغییر رمز'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteAdmin(admin.id, admin.username)}
                      className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700"
                    >
                      حذف
                    </button>
                  </div>
                )}
                {editingPasswordId === admin.id && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="password"
                      value={passwordValues[admin.id] || ''}
                      onChange={event =>
                        setPasswordValues(current => ({
                          ...current,
                          [admin.id]: event.target.value,
                        }))
                      }
                      placeholder="رمز جدید"
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-2 text-sm outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => void resetPassword(admin.id)}
                      className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-700"
                    >
                      ثبت
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
        {!loadingAdmins && admins.length === 0 && (
          <p className="mt-5 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">ادمینی ثبت نشده است.</p>
        )}
      </div>
    </section>
  );
}
