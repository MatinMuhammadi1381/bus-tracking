import { useCallback, useEffect, useState } from 'react';
import { getDriverAuthHeaders } from '../../lib/auth';
import { CurrentTripScreen } from '../current-trip/CurrentTripScreen';

interface AssignedTrip {
  id: string;
  status: string;
  route?: { origin: string; destination: string };
  bus?: { displayName: string; plateNumber: string };
  expectedPassengerCount: number;
  departureDate?: string | null;
  departureTime?: string | null;
  confirmations?: Array<{ driverId: string }>;
}

import { apiBase } from '../../config';

function getDriverIdFromToken() {
  try {
    const token = localStorage.getItem('driverToken');
    return token ? JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub : null;
  } catch {
    return null;
  }
}

export function NewTripsScreen({
  onSelectTrip,
  onCountChange,
}: {
  onSelectTrip: (tripId: string) => void;
  onCountChange: (count: number) => void;
}) {
  const [trips, setTrips] = useState<AssignedTrip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTrips = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${apiBase}/trips/my-assigned`, {
        headers: getDriverAuthHeaders(),
      });
      if (response.status === 401) {
        localStorage.removeItem('driverToken');
        throw new Error('نشست راننده منقضی شده است؛ دوباره وارد شوید.');
      }
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || `خطا در دریافت سفرها (${response.status})`);
      }
      const nextTrips = (await response.json()) as AssignedTrip[];
      const driverId = getDriverIdFromToken();
      const unconfirmedTrips = nextTrips.filter(
        trip => !trip.confirmations?.some(confirmation => confirmation.driverId === driverId)
      );
      setTrips(unconfirmedTrips);
      onCountChange(unconfirmedTrips.length);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'دریافت سفرها انجام نشد.');
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  if (selectedTripId) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setSelectedTripId(undefined)}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-bold text-white"
        >
          بازگشت به سفرهای جدید
        </button>
        <CurrentTripScreen
          tripId={selectedTripId}
          allowUnconfirmed
          onConfirmed={() => {
            onSelectTrip(selectedTripId);
            setSelectedTripId(undefined);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">سفرهای جدید</h2>
          <p className="mt-1 text-sm text-slate-400">سفرهای اختصاص داده‌شده به شما</p>
        </div>
        <button
          type="button"
          onClick={() => void loadTrips()}
          className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-bold text-white hover:bg-cyan-700"
        >
          بروزرسانی
        </button>
      </div>
      {error && <p className="rounded-lg bg-red-900/40 p-3 text-sm text-red-200">{error}</p>}
      {loading ? (
        <p className="rounded-xl bg-slate-800 p-6 text-center text-slate-300">در حال دریافت...</p>
      ) : trips.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-8 text-center text-slate-300">
          در حال حاضر سفر جدیدی برای شما ثبت نشده است.
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map(trip => (
            <article
              key={trip.id}
              className="overflow-hidden rounded-xl border border-cyan-700/40 bg-slate-800 p-4 sm:p-5"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-base font-bold leading-7 text-slate-100">
                      <span>{trip.route?.origin || 'مبدا نامشخص'}</span>
                      <span className="mx-2 whitespace-nowrap text-cyan-300" aria-hidden="true">
                        ←
                      </span>
                      <span>{trip.route?.destination || 'مقصد نامشخص'}</span>
                    </h3>
                    <p className="mt-2 break-words text-sm leading-6 text-slate-300">
                      {trip.bus?.displayName || 'اتوبوس نامشخص'} ·{' '}
                      {trip.bus?.plateNumber || 'پلاک نامشخص'}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      ظرفیت پیش‌بینی‌شده: {trip.expectedPassengerCount} نفر
                    </p>
                  </div>
                  <span className="w-fit shrink-0 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-300">
                      {trip.status === 'ASSIGNED'
                        ? 'اختصاص داده شده'
                        : trip.status === 'PENDING_DRIVER_CONFIRMATION'
                          ? 'در انتظار تایید راننده'
                          : trip.status}
                    </span>
                </div>
                <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-700/70 bg-slate-900/30 p-3 text-xs text-slate-300 sm:grid-cols-2">
                  <p className="min-w-0 break-words">
                    <span className="text-slate-500">تاریخ حرکت:</span>{' '}
                    {trip.departureDate || 'ثبت نشده'}
                  </p>
                  <p className="min-w-0 break-words">
                    <span className="text-slate-500">ساعت حرکت:</span>{' '}
                    {trip.departureTime || 'ثبت نشده'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTripId(trip.id)}
                className="mt-4 w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-700"
              >
                مشاهده و تایید سفر
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
