import { useState, useEffect } from 'react';
import { getDriverAuthHeaders, getDriverAuthHeadersWithJson } from '../../lib/auth';
import { PassengerConfirmationScreen } from '../passenger-confirmation';
import { DriverHandoverScreen } from '../driver-handover';
import { useGPSTracking } from '../tracking/useGPSTracking';
import { TripStatus } from '@bus-tracking/shared-types';
import { apiBase } from '../../config';

interface TripData {
  id: string;
  status: TripStatus;
  origin: string;
  destination: string;
  bus: { displayName: string; plateNumber: string; busCode?: string | null; seatCount?: number };
  passengers?: Array<{
    seatNumber?: number | null;
    gender?: 'UNKNOWN' | 'MALE' | 'FEMALE';
    passenger?: { gender?: 'UNKNOWN' | 'MALE' | 'FEMALE' } | null;
  }>;
  expectedPassengerCount: number;
  departureDate?: string | null;
  departureTime?: string | null;
  confirmedPassengerCount: number;
  activeDriverId: string | null;
  activeDriver?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl?: string | null;
  } | null;
  nextDriver?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    profilePhotoUrl?: string | null;
  } | null;
  confirmations?: Array<{ driverId: string; confirmedPassengerCount: number }>;
  driverAssignments?: Array<{ driverId: string }>;
}

function getDriverIdFromToken(): string | null {
  try {
    const token = localStorage.getItem('driverToken');
    if (!token) return null;
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).sub || null;
  } catch {
    return null;
  }
}

export function CurrentTripScreen({
  tripId,
  onConfirmed,
  allowUnconfirmed = false,
}: {
  tripId?: string;
  onConfirmed?: () => void;
  allowUnconfirmed?: boolean;
}) {
  const [trip, setTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showHandover, setShowHandover] = useState(false);
  const [confirmationSubmitted, setConfirmationSubmitted] = useState(false);

  const {
    isTracking,
    syncError,
    queueSize,
    lastLocation,
    syncStatus,
    startTracking,
    stopTracking,
    flushQueue,
  } = useGPSTracking({
    tripId: trip?.id || '',
    apiEndpoint: apiBase,
    authToken: localStorage.getItem('driverToken') || '',
  });

  const fetchTrip = async () => {
    try {
      const endpoint = tripId ? `/trips/${tripId}` : '/trips/my-active';
      const response = await fetch(`${apiBase}${endpoint}`, {
        headers: getDriverAuthHeaders(),
      });
      if (response.status === 401) {
        localStorage.removeItem('driverToken');
        throw new Error('نشست راننده منقضی شده است؛ دوباره وارد شوید.');
      }
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(
          errorBody?.message || `خطا در بارگذاری اطلاعات سفر (${response.status})`
        );
      }
      const data = await response.json();
      const currentDriverId = getDriverIdFromToken();
      const driverConfirmed = Boolean(
        currentDriverId &&
          data.confirmations?.some((item: any) => item.driverId === currentDriverId)
      );
      if (
        !allowUnconfirmed &&
        (data.status === 'ASSIGNED' || data.status === 'PENDING_DRIVER_CONFIRMATION') &&
        !driverConfirmed
      ) {
        setTrip(null);
        setConfirmationSubmitted(false);
        return;
      }
      setTrip({
        ...data,
        origin: data.route?.origin || data.origin || 'مبدا نامشخص',
        destination: data.route?.destination || data.destination || 'مقصد نامشخص',
      });
      setConfirmationSubmitted(
        driverConfirmed
      );
      return;
      // TODO: Replace with actual API call
      // const response = await fetch(`http://localhost:3000/api/v1/trips/my-active`, {
      //   headers: getDriverAuthHeaders()
      // });
      // const data = await response.json();
      // setTrip(data.trip);

      // Mock data for now
      setTrip({
        id: 'trip-1',
        status: 'PENDING_DRIVER_CONFIRMATION',
        origin: 'تهران',
        destination: 'مشهد',
        bus: { displayName: 'اتوبوس اسکانیا', plateNumber: '۱۲۳۴۵۶۷۸', busCode: 'BUS-001' },
        expectedPassengerCount: 32,
        confirmedPassengerCount: 0,
        activeDriverId: null,
        nextDriver: {
          id: 'driver-2',
          firstName: 'علی',
          lastName: 'احمدی',
          phone: '+989123456789',
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری اطلاعات سفر');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrip();
  }, [allowUnconfirmed, tripId]);

  useEffect(() => {
    if (!tripId || trip?.status !== 'PENDING_DRIVER_CONFIRMATION') return;
    const timer = window.setInterval(() => void fetchTrip(), 5000);
    return () => window.clearInterval(timer);
  }, [tripId, trip?.status]);

  const handleConfirmPassengers = async (count: number) => {
    setError('');
    try {
      // TODO: Call API
      // await fetch(`http://localhost:3000/api/v1/trips/${trip.id}/confirm`, {
      //   method: 'PUT',
      //   headers: getDriverAuthHeadersWithJson(),
      //   body: JSON.stringify({ confirmedPassengerCount: count })
      // });

      if (!trip) return;
      const response = await fetch(`${apiBase}/trips/${trip.id}/confirm`, {
        method: 'PUT',
        headers: getDriverAuthHeadersWithJson(),
        body: JSON.stringify({ confirmedPassengerCount: count }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'ثبت تعداد مسافران انجام نشد.');
      if (!body?.status) throw new Error('پاسخ نامعتبر از سرور دریافت شد.');
      setTrip(prev => (prev ? { ...prev, ...body } : null));
      const currentDriverId = getDriverIdFromToken();
      setConfirmationSubmitted(
        Boolean(
          currentDriverId &&
          body.confirmations?.some((item: any) => item.driverId === currentDriverId)
        )
      );
      onConfirmed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در تایید مسافران');
      throw err;
    }
  };

  /* const handleDiscrepancyReported = async (count: number) => {
    setError('');
    try {
      // TODO: Call API with discrepancy
      // await fetch(`http://localhost:3000/api/v1/trips/${trip.id}/confirm`, {
      //   method: 'PUT',
      //   headers: getDriverAuthHeadersWithJson(),
      //   body: JSON.stringify({ confirmedPassengerCount: count, discrepancy: true })
      // });

      await handleConfirmPassengers(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ثبت اختلاف');
      throw err;
    }
  }; */

  const handleStartTrip = async () => {
    if (!trip) return;
    setError('');
    setLoading(true);
    try {
      const started = await startTracking();
      if (!started) {
        setError('خطا در شروع رصد موقعیت');
        return;
      }

      // TODO: Call API
      // await fetch(`http://localhost:3000/api/v1/trips/${trip.id}/start`, {
      //   method: 'PUT',
      //   headers: getDriverAuthHeaders()
      // });

      const response = await fetch(`${apiBase}/trips/${trip.id}/start`, {
        method: 'PUT',
        headers: getDriverAuthHeaders(),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'شروع سفر انجام نشد.');
      setTrip(prev => (prev ? { ...prev, ...body } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در شروع سفر');
    } finally {
      setLoading(false);
    }
  };

  const handleEndTrip = async () => {
    if (!trip) return;
    setError('');
    setLoading(true);
    try {
      await stopTracking();

      // TODO: Call API
      // await fetch(`http://localhost:3000/api/v1/trips/${trip.id}/end`, {
      //   method: 'PUT',
      //   headers: getDriverAuthHeaders()
      // });

      const response = await fetch(`${apiBase}/trips/${trip.id}/end`, {
        method: 'PUT',
        headers: getDriverAuthHeaders(),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'پایان سفر انجام نشد.');
      setTrip(prev => (prev ? { ...prev, ...body } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در پایان سفر');
    } finally {
      setLoading(false);
    }
  };

  const handleHandover = async () => {
    if (!trip?.nextDriver) return;
    setError('');
    try {
      // TODO: Call API
      // await fetch(`http://localhost:3000/api/v1/trips/${trip.id}/handover`, {
      //   method: 'PUT',
      //   headers: getDriverAuthHeadersWithJson(),
      //   body: JSON.stringify({ nextDriverId: trip.nextDriver.id })
      // });

      await new Promise(resolve => setTimeout(resolve, 1000));
      setTrip(prev =>
        prev
          ? {
              ...prev,
              activeDriverId: trip.nextDriver!.id,
              activeDriver: trip.nextDriver,
              nextDriver: null,
            }
          : null
      );
      setShowHandover(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در تحویل راننده');
    }
  };

  const handleShowHandover = () => {
    if (trip?.nextDriver) {
      setShowHandover(true);
    }
  };

  const handleBeforePassengerConfirmation = async () => {
    setError('');
    return true;
  };

  const getStatusInfo = (status: TripStatus) => {
    switch (status) {
      case 'DRAFT':
        return { label: 'پیش‌نویس', color: 'bg-gray-100 text-gray-800' };
      case 'ASSIGNED':
        return { label: 'اختصاص داده شده', color: 'bg-gray-100 text-gray-800' };
      case 'PENDING_DRIVER_CONFIRMATION':
        return { label: 'در انتظار تایید راننده', color: 'bg-yellow-100 text-yellow-800' };
      case 'READY':
        return { label: 'آماده برای شروع', color: 'bg-blue-100 text-blue-800' };
      case 'IN_PROGRESS':
        return { label: 'در جریان', color: 'bg-green-100 text-green-800' };
      case 'COMPLETED':
        return { label: 'تکمیل شده', color: 'bg-gray-100 text-gray-800' };
      case 'CANCELLED':
        return { label: 'لغو شده', color: 'bg-red-100 text-red-800' };
      default:
        return { label: 'نامشخص', color: 'bg-gray-100 text-gray-800' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">سفر جاری وجود ندارد</h3>
        <p className="text-gray-500">هیچ سفر فعالی برای شما وجود ندارد</p>
      </div>
    );
  }

  const { label: statusLabel, color: statusColor } = getStatusInfo(trip.status);

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
            ×
          </button>
        </div>
      )}

      {syncError && trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED' && (
        <p className="rounded-xl border border-red-400/60 bg-red-950/40 p-4 text-sm text-red-200">
          ⚠️ {syncError}
        </p>
      )}

      {trip.activeDriver && (
        <section className="flex items-center gap-3 rounded-2xl border border-cyan-400/30 bg-slate-800/80 p-4 shadow-lg shadow-black/20">
          {trip.activeDriver.profilePhotoUrl ? (
            <img
              src={`${apiBase.replace(/\/api\/v1$/, '')}${trip.activeDriver.profilePhotoUrl}`}
              alt=""
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-900/70 text-lg font-black text-cyan-100">
              {trip.activeDriver.firstName.slice(0, 1)}
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-cyan-300">راننده فعال</p>
            <p className="font-black text-slate-100">
              {trip.activeDriver.firstName} {trip.activeDriver.lastName}
            </p>
          </div>
        </section>
      )}

      {/* Trip Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">سفر جاری</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
            {statusLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">مبدا</p>
            <p className="font-medium text-gray-900">{trip.origin}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">مقصد</p>
            <p className="font-medium text-gray-900">{trip.destination}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">تاریخ حرکت</p>
            <p className="font-medium text-gray-900">{trip.departureDate || 'ثبت نشده'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">ساعت حرکت</p>
            <p className="font-medium text-gray-900">{trip.departureTime || 'ثبت نشده'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">اتوبوس</p>
            <p className="font-medium text-gray-900">{trip.bus.displayName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">پلاک</p>
            <p className="font-medium text-gray-900">{trip.bus.plateNumber}</p>
          </div>
          {trip.bus.busCode && (
            <div className="col-span-2">
              <p className="text-sm text-gray-500">کد اتوبوس</p>
              <p className="font-medium text-gray-900">{trip.bus.busCode}</p>
            </div>
          )}
        </div>

        {trip.status === 'IN_PROGRESS' && isTracking && (
          <div className="mt-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
            <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm text-primary-800">
              <span>📍</span>
              <span>رصد موقعیت فعال است - موقعیت شما به سرور ارسال می‌شود</span>
            </div>
            <div className="mt-2 flex space-x-2 rtl:space-x-reverse text-xs text-primary-700">
              <span>📍 دقت: {lastLocation?.accuracyMeters?.toFixed(1) || '?'} m</span>
              <span>⚡ سرعت: {lastLocation?.speedKmh?.toFixed(1) || '0'} km/h</span>
              <span>📦 صف: {queueSize}</span>
              <span>☁️ همگام‌سازی: {syncStatus}</span>
            </div>
          </div>
        )}
      </div>

      {/* Passenger Confirmation */}
      {(trip.status === 'ASSIGNED' ||
        (trip.status === 'PENDING_DRIVER_CONFIRMATION' && !confirmationSubmitted)) && (
        <PassengerConfirmationScreen
          expectedCount={trip.expectedPassengerCount}
          seatCount={trip.bus.seatCount || 25}
          occupiedSeats={(trip.passengers || [])
            .filter(passenger => passenger.seatNumber != null)
            .map(passenger => ({
              seatNumber: passenger.seatNumber as number,
              gender: passenger.passenger?.gender || passenger.gender || 'UNKNOWN',
            }))}
          onConfirm={handleConfirmPassengers}
          onBeforeContinue={handleBeforePassengerConfirmation}
        />
      )}

      {trip.status === 'PENDING_DRIVER_CONFIRMATION' && confirmationSubmitted && (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-950/30 p-6 text-center">
          <div className="mb-3 text-4xl">⏳</div>
          <h3 className="text-xl font-bold text-amber-100">تأیید شما ثبت شد</h3>
          <p className="mt-2 text-sm text-amber-200">
            تأیید راننده دیگر هنوز ثبت نشده است. پس از ثبت هر دو تأیید، صفحه شروع سفر فعال می‌شود.
          </p>
          <p className="mt-3 text-xs text-amber-300">
            وضعیت تأیید: {(trip.confirmations || []).length} از{' '}
            {(trip.driverAssignments || []).length} راننده
          </p>
        </div>
      )}

      {/* Ready to Start */}
      {trip.status === 'READY' && (
        <div className="rounded-2xl border-2 border-green-400/40 bg-green-950/30 p-6 shadow-xl">
          <div className="mb-5 text-center">
            <div className="mb-2 text-5xl">✅</div>
            <h3 className="text-2xl font-bold text-green-100">سفر تأیید شد</h3>
            <p className="mt-1 text-sm text-green-200">
              اطلاعات سفر را بررسی کنید و برای شروع آماده شوید.
            </p>
          </div>
          <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-900/50 p-4 text-sm">
            <div>
              <span className="text-slate-400">مسیر:</span> {trip.origin} ← {trip.destination}
            </div>
            <div>
              <span className="text-slate-400">اتوبوس:</span> {trip.bus.displayName}
            </div>
            <div>
              <span className="text-slate-400">پلاک:</span> {trip.bus.plateNumber}
            </div>
            <div>
              <span className="text-slate-400">مسافر:</span> {trip.confirmedPassengerCount} نفر
            </div>
          </div>
          <p className="text-gray-600 mb-4">
            تعداد مسافران تایید شده:{' '}
            <span className="font-medium">{trip.confirmedPassengerCount}</span> نفر
          </p>

          <div className="flex space-x-3 rtl:space-x-reverse">
            <button
              onClick={handleStartTrip}
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'در حال شروع...' : 'شروع سفر'}
            </button>
          </div>
        </div>
      )}

      {/* In Progress */}
      {trip.status === 'IN_PROGRESS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">سفر در جریان</h3>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-sm text-gray-500">سرعت</p>
                <p className="text-xl font-bold text-gray-900">
                  {lastLocation?.speedKmh?.toFixed(1) || '0'} km/h
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-sm text-gray-500">دقت GPS</p>
                <p className="text-xl font-bold text-gray-900">
                  {lastLocation?.accuracyMeters?.toFixed(1) || '?'} m
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-sm text-gray-500">آخرین ارسال</p>
                <p className="text-xl font-bold text-gray-900">
                  {lastLocation
                    ? new Date(lastLocation.capturedAt).toLocaleTimeString('fa-IR')
                    : '—'}
                </p>
              </div>
            </div>

            <div className="flex space-x-3 rtl:space-x-reverse">
              <button
                onClick={handleShowHandover}
                disabled={loading}
                className="flex-1 bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                {loading ? 'در حال تحویل...' : 'تحویل به راننده دوم'}
              </button>
              <button
                onClick={handleEndTrip}
                disabled={loading}
                className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                {loading ? 'در حال پایان...' : 'پایان سفر'}
              </button>
            </div>
          </div>

          {/* Sync Status */}
          {queueSize > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <span>
                  {syncStatus === 'syncing' ? '⏳' : syncStatus === 'success' ? '✅' : '☁️'}
                </span>
                <span>
                  {syncStatus === 'syncing' && 'در حال همگام‌سازی...'}
                  {syncStatus === 'success' && 'همگام‌سازی موفق'}
                  {syncStatus === 'error' && 'خطا در همگام‌سازی'}
                  {syncStatus === 'idle' && `${queueSize} موقعیت در صف ارسال`}
                </span>
              </div>
              {syncStatus === 'error' && (
                <button onClick={flushQueue} className="mt-2 text-sm text-blue-600 hover:underline">
                  تلاش مجدد
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Completed */}
      {trip.status === 'COMPLETED' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-2xl font-bold text-green-700 mb-2">سفر با موفقیت تکمیل شد</h3>
          <p className="text-gray-600">از شما سپاسگزاریم</p>
        </div>
      )}

      {/* Handover Modal */}
      {showHandover && trip.nextDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <DriverHandoverScreen
            currentDriverName="شما"
            nextDriver={trip.nextDriver}
            onConfirmHandover={handleHandover}
            onCancel={() => setShowHandover(false)}
          />
        </div>
      )}
    </div>
  );
}
