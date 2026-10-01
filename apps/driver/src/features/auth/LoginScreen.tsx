import { useState } from 'react';
import { apiBase } from '../../config';
import { getDriverAuthHeaders } from '../../lib/auth';

interface LoginScreenProps {
  onLogin: (profile: { firstName: string; lastName: string; phone: string; profilePhotoUrl?: string | null }) => void;
}

function normalizePhone(value: string) {
  const normalized = value
    .trim()
    .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[\s()-]/g, '');
  if (normalized.startsWith('+98')) return `0${normalized.slice(3)}`;
  if (normalized.startsWith('98')) return `0${normalized.slice(2)}`;
  return normalized.startsWith('9') && normalized.length === 10
    ? `0${normalized}`
    : normalized;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(phone), password }),
      });
      const body = await response.json().catch(() => null);
      if (response.status === 401) {
        throw new Error('شماره تلفن یا رمز عبور نادرست است.');
      }
      if (!response.ok || !body?.accessToken) {
        throw new Error(body?.message || 'ورود ناموفق بود');
      }
      localStorage.setItem('driverToken', body.accessToken);
      const profileResponse = await fetch(`${apiBase}/drivers/me`, {
        headers: getDriverAuthHeaders(),
      });
      const profile = await profileResponse.json().catch(() => null);
      if (!profileResponse.ok || !profile?.firstName || !profile?.lastName) {
        localStorage.removeItem('driverToken');
        throw new Error('دریافت پروفایل راننده انجام نشد.');
      }
      localStorage.setItem('driverProfile', JSON.stringify(profile));
      onLogin(profile);
    } catch (requestError) {
      setError(
        requestError instanceof TypeError
          ? 'ارتباط با سرور برقرار نشد. روشن بودن API و اتصال شبکه را بررسی کنید.'
          : requestError instanceof Error
            ? requestError.message
            : 'ورود ناموفق بود.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">ورود به اپلیکیشن راننده</h2>
          <p className="text-gray-500 mt-2">شماره تلفن و رمز عبور خود را وارد کنید</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              شماره تلفن
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              رمز عبور
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="رمز عبور"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(value => !value)}
                className="!absolute !left-3 !top-1/2 !m-0 !-translate-y-1/2 !p-1 text-gray-500 hover:text-gray-700"
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'در حال ورود...' : 'ورود'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>دستگاه توسط پشتیبانی تهیه شده است</p>
        </div>
      </div>
    </div>
  );
}
