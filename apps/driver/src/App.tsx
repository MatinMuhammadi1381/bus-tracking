import { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { LoginScreen } from './features/auth/LoginScreen';
import { CurrentTripScreen } from './features/current-trip/CurrentTripScreen';
import { TripHistoryScreen } from './features/trip-history/TripHistoryScreen';
import { NewTripsScreen } from './features/new-trips/NewTripsScreen';
import { AppLoadingScreen } from './components/AppLoadingScreen';
import { apiBase } from './config';
import { getDriverAuthHeaders } from './lib/auth';

interface DriverProfile {
  firstName: string;
  lastName: string;
  phone?: string;
  profilePhotoUrl?: string | null;
}

function readDriverProfile(): DriverProfile | null {
  try {
    const profile = JSON.parse(localStorage.getItem('driverProfile') || 'null');
    return profile?.firstName && profile?.lastName ? profile : null;
  } catch {
    return null;
  }
}

function formatDriverPhone(phone?: string) {
  if (!phone) return 'ثبت نشده';
  const normalized = phone
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

function DriverAvatar({ profile }: { profile: DriverProfile | null }) {
  const photoUrl = profile?.profilePhotoUrl
    ? `${apiBase.replace(/\/api\/v1$/, '')}${profile.profilePhotoUrl}`
    : null;

  return photoUrl ? (
    <img src={photoUrl} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-cyan-400/40" />
  ) : (
    <div className="grid h-10 w-10 place-items-center rounded-full bg-cyan-900/80 ring-2 ring-cyan-400/40">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 text-cyan-200">
        <path fill="currentColor" d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
      </svg>
    </div>
  );
}

function DriverProfileCard({
  profile,
  onClick,
}: {
  profile: DriverProfile | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-cyan-400/20 bg-slate-800/90 px-4 py-3 text-right shadow-sm transition hover:bg-slate-800"
      aria-label="مشاهده پروفایل راننده"
    >
      <DriverAvatar profile={profile} />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400">پروفایل راننده</p>
        <p className="truncate font-bold text-slate-100">
          {profile ? `${profile.firstName} ${profile.lastName}` : 'راننده'}
        </p>
      </div>
      <div className="shrink-0 text-left">
        <p className="text-xs text-slate-400">شماره تماس</p>
        <p className="text-sm font-semibold text-cyan-200">{formatDriverPhone(profile?.phone)}</p>
      </div>
      <span className="text-lg text-slate-400" aria-hidden="true">‹</span>
    </button>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<
    'current-trip' | 'new-trips' | 'history' | 'profile'
  >(
    'current-trip'
  );
  const [selectedTripId, setSelectedTripId] = useState<string | undefined>();
  const [newTripsCount, setNewTripsCount] = useState(0);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(() => readDriverProfile());
  const [profileError, setProfileError] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('driverToken')?.trim();
    if (!token) {
      setAuthChecking(false);
      return;
    }

    let cancelled = false;
    const validateSession = async () => {
      try {
        const response = await fetch(`${apiBase}/drivers/me`, {
          headers: getDriverAuthHeaders(),
        });
        const profile = await response.json().catch(() => null);
        if (!response.ok || !profile?.firstName || !profile?.lastName) {
          throw new Error('نشست راننده معتبر نیست.');
        }
        if (!cancelled) {
          updateProfile(profile);
          setIsLoggedIn(true);
        }
      } catch {
        localStorage.removeItem('driverToken');
        localStorage.removeItem('driverProfile');
        if (!cancelled) {
          setDriverProfile(null);
          setIsLoggedIn(false);
        }
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    };

    void validateSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateProfile = (profile: DriverProfile) => {
    setDriverProfile(profile);
    localStorage.setItem('driverProfile', JSON.stringify(profile));
  };

  const logout = () => {
    localStorage.removeItem('driverToken');
    localStorage.removeItem('driverProfile');
    setDriverProfile(null);
    setIsLoggedIn(false);
    setCurrentScreen('current-trip');
    setProfileError('');
    setProfileMessage('');
  };

  const profileRequest = async (path: string, init?: RequestInit) => {
    const token = localStorage.getItem('driverToken') || '';
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.message || 'عملیات پروفایل انجام نشد.');
    return body as DriverProfile;
  };

  const changePassword = async () => {
    if (!currentPassword) {
      setProfileError('رمز قبلی را وارد کنید.');
      return;
    }
    if (newPassword.trim().length < 6) {
      setProfileError('رمز جدید باید حداقل ۶ کاراکتر باشد.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setProfileError('تکرار رمز جدید با رمز جدید یکسان نیست.');
      return;
    }
    setProfileSaving(true);
    setProfileError('');
    setProfileMessage('');
    try {
      await profileRequest('/drivers/me/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordFields(false);
      setProfileMessage('رمز عبور با موفقیت تغییر کرد.');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'تغییر رمز انجام نشد.');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <Layout>
      <AppLoadingScreen />
      {authChecking ? null : !isLoggedIn ? (
        <LoginScreen onLogin={profile => { updateProfile(profile); setIsLoggedIn(true); }} />
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-700 bg-slate-900/95 px-4 py-3 shadow-lg shadow-black/20 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="text-lg font-semibold text-slate-100"
                aria-label="رفرش صفحه اپلیکیشن راننده"
              >
                اپلیکیشن راننده
              </button>
            <nav className="flex shrink-0 items-center space-x-1 rtl:space-x-reverse sm:space-x-2">
              <button
                onClick={() => setCurrentScreen('new-trips')}
                className={`whitespace-nowrap rounded-lg px-2 py-1 text-xs font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-sm ${
                  currentScreen === 'new-trips'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="relative">
                  سفر جدید
                  {newTripsCount > 0 && (
                    <span className="absolute -right-3 -top-3 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                      {newTripsCount}
                    </span>
                  )}
                </span>
              </button>
              <button
                onClick={() => setCurrentScreen('current-trip')}
                className={`whitespace-nowrap rounded-lg px-2 py-1 text-xs font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-sm ${
                  currentScreen === 'current-trip'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                سفر جاری
              </button>
              <button
                onClick={() => setCurrentScreen('history')}
                className={`whitespace-nowrap rounded-lg px-2 py-1 text-xs font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-sm ${
                  currentScreen === 'history'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                تاریخچه
              </button>
            </nav>
            </div>
          </header>
          <DriverProfileCard
            profile={driverProfile}
            onClick={() => setCurrentScreen('profile')}
          />
          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
            {currentScreen === 'current-trip' ? (
              <CurrentTripScreen tripId={selectedTripId} />
            ) : currentScreen === 'new-trips' ? (
              <NewTripsScreen
                onCountChange={setNewTripsCount}
                onSelectTrip={tripId => {
                  setSelectedTripId(tripId);
                  setCurrentScreen('current-trip');
                }}
              />
            ) : currentScreen === 'history' ? (
              <TripHistoryScreen />
            ) : (
              <section className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-800 p-6 text-center">
                <div className="mb-5 flex items-center justify-between gap-3 text-right">
                  <h2 className="text-xl font-bold text-slate-100">پروفایل راننده</h2>
                  <button
                    type="button"
                    onClick={() => setCurrentScreen('current-trip')}
                    className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white"
                  >
                    بازگشت
                  </button>
                </div>
                <div className="flex justify-center">
                  <DriverAvatar profile={driverProfile} />
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-100">
                  {driverProfile
                    ? `${driverProfile.firstName} ${driverProfile.lastName}`
                    : 'پروفایل راننده'}
                </h3>
                <p className="mt-2 text-slate-300">{formatDriverPhone(driverProfile?.phone)}</p>
                <div className="mt-6 grid gap-3 text-right">
                  <div className="rounded-xl border border-slate-700 p-4">
                    <button
                      type="button"
                      disabled={profileSaving}
                      onClick={() => {
                        setShowPasswordFields(value => !value);
                        setProfileError('');
                        setProfileMessage('');
                      }}
                      className="w-full rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                    >
                      تغییر رمز عبور
                    </button>
                    {showPasswordFields && (
                      <div className="mt-3 grid gap-3">
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={event => setCurrentPassword(event.target.value)}
                          placeholder="رمز قبلی"
                          autoComplete="current-password"
                          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                        />
                        <input
                          type="password"
                          value={newPassword}
                          onChange={event => setNewPassword(event.target.value)}
                          placeholder="رمز جدید"
                          autoComplete="new-password"
                          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                        />
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={event => setConfirmPassword(event.target.value)}
                          placeholder="تکرار رمز جدید"
                          autoComplete="new-password"
                          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                        />
                        <button
                          type="button"
                          disabled={profileSaving}
                          onClick={() => void changePassword()}
                          className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                        >
                          ذخیره رمز جدید
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
                  >
                    خروج از حساب
                  </button>
                  {profileError && <p className="text-sm text-red-300">{profileError}</p>}
                  {profileMessage && <p className="text-sm text-green-300">{profileMessage}</p>}
                </div>
              </section>
            )}
          </main>
        </div>
      )}
    </Layout>
  );
}

export default App;
