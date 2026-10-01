'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PublicTripResponse, LocationPoint } from '@bus-tracking/api-contracts';
import { apiBase } from '../../../lib/apiBase';

const LeafletMap = dynamic(() => import('./TrackingMap'), { ssr: false });

const demoTripData = {
  tripId: 'demo-trip',
  status: 'IN_PROGRESS',
  origin: 'تهران',
  destination: 'مشهد',
  bus: {
    displayName: 'اتوبوس نمایشی',
    plateNumber: '۱۲۳۴۵۶۷۸',
    busCode: 'DEMO-001',
    seatCount: 25,
  },
  occupiedSeats: [],
  activeDriver: { firstName: 'راننده', lastName: 'نمایشی' },
  passengerCount: 24,
  expectedPassengerCount: 40,
  departureDate: null,
  departureTime: null,
  confirmedPassengerCount: 24,
  currentLocation: {
    latitude: 35.7219,
    longitude: 51.3347,
    speedKmh: 72,
    accuracyMeters: 8,
    capturedAt: new Date().toISOString(),
    status: 'LIVE' as const,
  },
  route: {
    geometry: {
      type: 'LineString',
      coordinates: [
        [51.3347, 35.7219],
        [52.4, 35.9],
        [54.2, 36.2],
        [56.1, 36.3],
        [58.4, 36.3],
        [59.6, 36.3],
      ],
    },
  },
  etaMinutes: 480,
  startedAt: new Date().toISOString(),
  completedAt: null,
};

type SeatPosition = { seatNumber: number; row: number; column: 1 | 3 | 4 };

function createSeatLayout(rows: number[][]): SeatPosition[] {
  return rows.flatMap((seatRow, rowIndex) =>
    seatRow.map((seatNumber, seatIndex) => ({
      seatNumber,
      row: rowIndex + 1,
      column: (seatRow.length === 1 ? 1 : [1, 3, 4][seatIndex]) as 1 | 3 | 4,
    }))
  );
}

const trackingSeatLayouts: Record<25 | 26, SeatPosition[]> = {
  25: createSeatLayout([
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    [10, 11, 12],
    [13],
    [14, 15, 16],
    [17, 18, 19],
    [20, 21, 22],
    [23, 24, 25],
  ]),
  26: createSeatLayout([
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    [10, 11, 12],
    [13],
    [14],
    [15, 16, 17],
    [18, 19, 20],
    [21, 22, 23],
    [24, 25, 26],
  ]),
};

function ReadOnlySeatMap({ tripData }: { tripData: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const seatCount = tripData.bus?.seatCount === 26 ? 26 : 25;
  const occupied = new Map(
    (tripData.occupiedSeats || []).map((seat: { seatNumber: number; gender: string }) => [
      seat.seatNumber,
      seat.gender,
    ])
  );

  return (
    <section
      className="mt-6 rounded-3xl border border-white/80 bg-white/90 p-5 shadow-xl shadow-slate-900/5"
      dir="rtl"
    >
      <button
        type="button"
        onClick={() => setIsOpen(value => !value)}
        className="flex w-full items-center justify-between text-right"
        aria-expanded={isOpen}
      >
        <span className="text-lg font-black text-slate-900">وضعیت صندلی‌های اتوبوس</span>
        <span className="text-xl text-slate-500">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="mt-4">
          <p className="mb-4 text-xs text-slate-500">
            این بخش فقط برای مشاهده است و امکان تغییر صندلی ندارد.
          </p>
          <div
            dir="ltr"
            className="mx-auto grid max-w-md grid-cols-4 gap-x-3 gap-y-2 rounded-2xl border-2 border-slate-300 bg-white p-4 sm:gap-x-5 sm:p-5"
          >
            {trackingSeatLayouts[seatCount].map(({ seatNumber, row, column }) => {
              const gender = occupied.get(seatNumber);
              return (
                <div
                  key={seatNumber}
                  style={{ gridColumn: column, gridRow: row }}
                  aria-label={`صندلی ${seatNumber} ${gender ? 'پر' : 'خالی'}`}
                  className={`flex min-h-14 flex-col items-center justify-center rounded-xl border-2 px-2 py-2 text-sm font-black ${
                    gender === 'MALE'
                      ? 'border-blue-500 bg-blue-100 text-blue-900'
                      : gender === 'FEMALE'
                        ? 'border-pink-500 bg-pink-100 text-pink-900'
                        : gender === 'UNKNOWN'
                          ? 'border-slate-500 bg-slate-200 text-slate-800'
                          : 'border-slate-300 bg-white text-slate-500'
                  }`}
                >
                  <span className="text-lg">{seatNumber}</span>
                  <span className="text-[10px]">{gender ? 'پر' : 'خالی'}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs text-slate-600">
            <span>🔵 پر - مرد</span>
            <span>🩷 پر - زن</span>
            <span>⚪ خالی</span>
          </div>
        </div>
      )}
    </section>
  );
}

interface TrackPageProps {
  params: Promise<{ token: string }>;
}

function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  return <TrackPageClient />;
}

function TrackPageClient() {
  const router = useRouter();
  const [token, setToken] = useState<string>('');
  const [tripData, setTripData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [passengerId, setPassengerId] = useState('');
  const [driverInfo, setDriverInfo] = useState<{
    firstName: string;
    lastName: string;
    phone: string;
    profilePhotoUrl: string | null;
  } | null>(null);
  const [verifyingPassenger, setVerifyingPassenger] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  useEffect(() => {
    if (tripData?.status !== 'COMPLETED') return;

    const html = document.documentElement;
    const body = document.body;
    const previous = {
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
      htmlOverscrollBehavior: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
    };

    html.style.overflow = 'hidden';
    html.style.height = '100%';
    html.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    body.style.height = '100%';
    body.style.overscrollBehavior = 'none';

    return () => {
      html.style.overflow = previous.htmlOverflow;
      html.style.height = previous.htmlHeight;
      html.style.overscrollBehavior = previous.htmlOverscrollBehavior;
      body.style.overflow = previous.bodyOverflow;
      body.style.height = previous.bodyHeight;
      body.style.overscrollBehavior = previous.bodyOverscrollBehavior;
    };
  }, [tripData?.status]);

  // Extract token from URL
  useEffect(() => {
    const pathSegments = window.location.pathname.split('/');
    const tokenFromUrl = pathSegments[pathSegments.length - 1];
    if (tokenFromUrl && tokenFromUrl !== 'track') {
      setToken(tokenFromUrl);
    }
  }, []);

  // Fetch initial trip data
  useEffect(() => {
    if (!token) return;

    const fetchTripData = async () => {
      try {
        if (token === 'demo') {
          setTripData(demoTripData);
          return;
        }

        const res = await fetch(`${apiBase}/public-tracking/trip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(
            Array.isArray(err?.message)
              ? err.message.join('، ')
              : err?.message || `خطا در دریافت اطلاعات سفر (${res.status})`
          );
        }

        const data = await res.json();
        setTripData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trip data');
      } finally {
        setLoading(false);
      }
    };

    fetchTripData();
  }, [token]);

  const verifyPassenger = async () => {
    setVerificationError(null);
    setVerifyingPassenger(true);
    try {
      const response = await fetch(`${apiBase}/public-tracking/trip/verify-passenger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, passengerId: passengerId.trim() }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error('شناسه مسافر معتبر نیست.');
      setDriverInfo(body.driver);
    } catch {
      setDriverInfo(null);
      setVerificationError('شناسه مسافر معتبر نیست.');
    } finally {
      setVerifyingPassenger(false);
    }
  };

  // Setup Socket.IO connection for real-time updates
  useEffect(() => {
    if (!tripData?.tripId || token === 'demo') return;

    const io = require('socket.io-client');
    const socketInstance = require('socket.io-client').io(
      `${apiBase.replace(/\/api\/v1\/?$/, '')}/tracking`,
      {
        auth: { token: token },
        transports: ['websocket', 'polling'],
      }
    );

    socketInstance.on('connect', () => {
      socketInstance.emit('joinTrip', { tripId: tripData.tripId });
    });

    socketInstance.on('locationUpdate', (location: any) => {
      setTripData((prev: any) => (prev ? { ...prev, currentLocation: location } : null));
    });

    socketInstance.on('tripStatusChange', (data: any) => {
      setTripData((prev: any) =>
        prev ? { ...prev, status: data.status, activeDriver: data.activeDriver } : null
      );
    });

    socketInstance.on('driverHandover', (data: any) => {
      setTripData((prev: any) => (prev ? { ...prev, activeDriver: data.nextDriver } : null));
      setDriverInfo(null);
    });

    socketInstance.on('connect_error', (err: any) => {
      console.error('Socket connection error:', err);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token, tripData?.tripId]);

  const getLocationStatus = (location: any): 'LIVE' | 'PREDICTED' | 'LAST_KNOWN' | 'STALE' => {
    if (!location) return 'STALE';
    const now = new Date();
    const ageMinutes =
      (new Date().getTime() - new Date(location.capturedAt).getTime()) / (1000 * 60);

    if (ageMinutes <= 1) return 'LIVE';
    if (ageMinutes <= 5) return 'LAST_KNOWN';
    if (ageMinutes <= 30) return 'PREDICTED';
    return 'STALE';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LIVE':
        return 'bg-green-100 text-green-800';
      case 'PREDICTED':
        return 'bg-blue-100 text-blue-800';
      case 'LAST_KNOWN':
        return 'bg-yellow-100 text-yellow-800';
      case 'STALE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTripStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'bg-green-100 text-green-800';
      case 'READY':
        return 'bg-blue-100 text-blue-800';
      case 'PENDING_DRIVER_CONFIRMATION':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_right,#dff7f8,transparent_35%),#f4f8fb]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_right,#dff7f8,transparent_35%),#f4f8fb]">
        <div className="mx-4 max-w-md rounded-3xl border border-white/80 bg-white/90 p-8 text-center shadow-2xl">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="mb-2 text-xl font-black text-slate-900">دریافت سفر انجام نشد</h2>
          <p className="mb-6 text-slate-600">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="rounded-xl bg-cyan-600 px-6 py-3 font-bold text-white transition hover:bg-cyan-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!tripData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_right,#dff7f8,transparent_35%),#f4f8fb]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent"></div>
      </div>
    );
  }

  const locationStatus = tripData.currentLocation
    ? getLocationStatus(tripData.currentLocation)
    : 'STALE';
  const locationStatusColor = getStatusColor(locationStatus);
  const tripStatusColor = getTripStatusColor(tripData.status);

  if (tripData.status === 'COMPLETED') {
    return (
      <div className="fixed inset-0 flex h-[100dvh] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_right,#dff7f8,transparent_35%),#f4f8fb] p-4">
        <div className="w-full max-w-xl rounded-3xl border border-green-200 bg-green-50 p-8 text-center shadow-xl">
          <div className="mb-3 text-6xl">✅</div>
          <h3 className="mb-2 text-2xl font-bold text-green-800">
            سفر با موفقیت تکمیل شد
          </h3>
          <p className="text-green-700">از شما سپاسگزاریم</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#dff7f8,transparent_35%),#f4f8fb]">
      {/* Header */}
      <header className="mx-4 mt-4 rounded-2xl border border-white/80 bg-white shadow-lg shadow-slate-900/5 backdrop-blur sm:mx-6 lg:mx-8">
        <div className="page-shell py-3">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <h1 className="text-xl font-black text-slate-900">رصد سفر</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${tripStatusColor}`}>
                {(tripData.status === 'IN_PROGRESS' && 'در جریان') ||
                  (tripData.status === 'READY' && 'آماده') ||
                  (tripData.status === 'COMPLETED' && 'تکمیل شده') ||
                  (tripData.status === 'CANCELLED' && 'لغو شده') ||
                  'نامشخص'}
              </span>
            </div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${locationStatusColor}`}>
                {locationStatus}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="page-shell">
        {error && (
          <div
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <div className="h-[420px] overflow-hidden rounded-3xl border border-white/80 bg-white shadow-xl shadow-slate-900/5">
              <LeafletMap tripData={tripData} locationStatus={locationStatus} token={token} />
            </div>
            <ReadOnlySeatMap tripData={tripData} />
          </div>

          {/* Info Panel */}
          <div className="space-y-4">
            {/* Trip Info Card */}
            <div className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl shadow-slate-900/5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
                <span>اطلاعات سفر</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${tripStatusColor}`}>
                  {(tripData.status === 'IN_PROGRESS' && 'در جریان') ||
                    (tripData.status === 'READY' && 'آماده') ||
                    (tripData.status === 'COMPLETED' && 'تکمیل شده') ||
                    (tripData.status === 'CANCELLED' && 'لغو شده') ||
                    'نامشخص'}
                </span>
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">تاریخ حرکت</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {tripData.departureDate || 'ثبت نشده'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">ساعت حرکت</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {tripData.departureTime || 'ثبت نشده'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">مبدا</p>
                  <p className="font-medium text-gray-900 dark:text-white">{tripData.origin}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">مقصد</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {tripData.destination}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">اتوبوس</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {tripData.bus?.displayName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">پلاک</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {tripData.bus?.plateNumber}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">راننده فعال</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {tripData.activeDriver?.firstName} {tripData.activeDriver?.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">کد اتوبوس</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {tripData.bus?.busCode || '—'}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">تعداد مسافران</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {tripData.confirmedPassengerCount} / {tripData.expectedPassengerCount} نفر
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-600 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (tripData.confirmedPassengerCount / tripData.expectedPassengerCount) * 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <section
              className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl shadow-slate-900/5"
              dir="rtl"
            >
              <h2 className="text-lg font-black text-slate-900">اطلاعات راننده</h2>
              <p className="mt-1 text-sm text-slate-500">
                برای مشاهده اطلاعات راننده، شناسه مسافر همین سفر را وارد کنید.
              </p>
              {!driverInfo ? (
                <form
                  className="mt-4 space-y-3"
                  onSubmit={event => {
                    event.preventDefault();
                    void verifyPassenger();
                  }}
                >
                  <label className="block text-sm font-semibold text-slate-700">
                    شناسه مسافر
                    <input
                      value={passengerId}
                      onChange={event => setPassengerId(event.target.value)}
                      required
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-cyan-500"
                      placeholder="شناسه مسافر"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={verifyingPassenger}
                    className="w-full rounded-xl bg-cyan-600 px-4 py-2.5 font-bold text-white transition hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {verifyingPassenger ? 'در حال بررسی...' : 'مشاهده اطلاعات راننده'}
                  </button>
                  {verificationError && (
                    <p className="text-sm font-semibold text-red-600" role="alert">
                      {verificationError}
                    </p>
                  )}
                </form>
              ) : (
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/50 p-3 shadow-sm backdrop-blur">
                  {driverInfo.profilePhotoUrl ? (
                    <img
                      src={`${apiBase.replace(/\/api\/v1$/, '')}${driverInfo.profilePhotoUrl}`}
                      alt=""
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-200 text-xl font-black text-cyan-800">
                      {driverInfo.firstName.slice(0, 1)}
                    </div>
                  )}
                  <div>
                    <p className="font-black text-slate-900">
                      {driverInfo.firstName} {driverInfo.lastName}
                    </p>
                    <a
                      className="text-sm font-semibold text-cyan-700"
                      href={`tel:${driverInfo.phone}`}
                    >
                      {driverInfo.phone}
                    </a>
                  </div>
                </div>
              )}
            </section>

            {/* Real-time Location Card */}
            <div className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl shadow-slate-900/5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
                <span>موقعیت لحظه‌ای</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${locationStatusColor}`}
                >
                  {locationStatus}
                </span>
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">سرعت</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {tripData.currentLocation?.speedKmh?.toFixed(1) || '0'} km/h
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">دقت GPS</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {tripData.currentLocation?.accuracyMeters?.toFixed(1) || '?'} m
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">آخرین به‌روزرسانی</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {tripData.currentLocation?.capturedAt
                      ? new Date(tripData.currentLocation.capturedAt).toLocaleTimeString('fa-IR')
                      : '—'}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">زمان پیش‌بینی شده</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {tripData.etaMinutes
                      ? `${Math.floor(tripData.etaMinutes / 60)}:${String(tripData.etaMinutes % 60).padStart(2, '0')}`
                      : '—'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/20 bg-slate-900/40 p-3">
                <div
                  className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                  aria-label="راهنمای وضعیت موقعیت"
                >
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.8)]" />
                    <span>
                      <b className="font-bold">LIVE</b> · موقعیت لحظه‌ای
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,.8)]" />
                    <span>
                      <b className="font-bold">PREDICTED</b> · پیش‌بینی شده
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-xs text-sky-100">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,.8)]" />
                    <span>
                      <b className="font-bold">LAST KNOWN</b> · آخرین موقعیت
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,.8)]" />
                    <span>
                      <b className="font-bold">STALE</b> · موقعیت منقضی
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trip Status Card */}
            {tripData.status === 'COMPLETED' && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
                <div className="text-6xl mb-3">✅</div>
                <h3 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">
                  سفر با موفقیت تکمیل شد
                </h3>
                <p className="text-gray-700 dark:text-gray-300">از شما سپاسگزاریم</p>
              </div>
            )}

            {tripData.status === 'CANCELLED' && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
                <div className="text-6xl mb-3">❌</div>
                <h3 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-2">
                  سفر لغو شده است
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  این سفر توسط پشتیبانی لغو شده است
                </p>
              </div>
            )}

            {/* Share Link */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                اشتراک‌گذاری لینک رصد
              </h4>
              <div className="flex space-x-2 rtl:space-x-reverse">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/track/${token}`}
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
                />
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(`${window.location.origin}/track/${token}`)
                  }
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  کپی
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default TrackPageClient;
