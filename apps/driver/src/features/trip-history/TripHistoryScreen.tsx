import { useEffect, useState } from 'react';
import { apiBase } from '../../config';
import { getDriverAuthHeaders } from '../../lib/auth';

interface HistoryTrip {
  id: string;
  status: string;
  origin?: string;
  destination?: string;
  route?: { origin: string; destination: string };
  bus?: { displayName: string; plateNumber: string };
  departureDate?: string | null;
  departureTime?: string | null;
  completedAt?: string | null;
}

export function TripHistoryScreen() {
  const [trips, setTrips] = useState<HistoryTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadHistory = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const response = await fetch(`${apiBase}/trips/my-history`, {
        headers: getDriverAuthHeaders(),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          Array.isArray(body?.message)
            ? body.message.join('، ')
            : 'دریافت تاریخچه سفرها انجام نشد.'
        );
      }
      setTrips((await response.json()) as HistoryTrip[]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'دریافت تاریخچه سفرها انجام نشد.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-100">تاریخچه سفرها</h2>
        <button
          type="button"
          onClick={() => void loadHistory(true)}
          disabled={refreshing}
          className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {refreshing ? 'در حال بروزرسانی...' : 'بروزرسانی'}
        </button>
      </div>
      {error && <p className="rounded-lg bg-red-900/40 p-3 text-sm text-red-200">{error}</p>}
      {loading ? (
        <div className="rounded-xl bg-slate-800 p-8 text-center text-slate-300">در حال دریافت...</div>
      ) : trips.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-8 text-center text-slate-300">
          هنوز سفری در تاریخچه ثبت نشده است.
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map(trip => (
            <article key={trip.id} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="break-words font-bold text-slate-100">
                    {trip.route?.origin || trip.origin || 'مبدا نامشخص'} ←{' '}
                    {trip.route?.destination || trip.destination || 'مقصد نامشخص'}
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    {trip.bus?.displayName || 'اتوبوس نامشخص'} · {trip.bus?.plateNumber || 'پلاک نامشخص'}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${
                    trip.status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {trip.status === 'COMPLETED' ? 'تکمیل شده' : 'لغو شده'}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-400 sm:grid-cols-2">
                <p>تاریخ حرکت: {trip.departureDate || 'ثبت نشده'}</p>
                <p>ساعت حرکت: {trip.departureTime || 'ثبت نشده'}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default TripHistoryScreen;
