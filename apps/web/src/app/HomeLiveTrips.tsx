'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAdminAuthHeaders } from '../lib/auth';
import { apiBase } from '../lib/apiBase';

type LiveTrip = {
  id: string;
  status: string;
  route?: { origin?: string; destination?: string };
  bus?: { displayName?: string; plateNumber?: string };
  trackingLink?: { secureToken?: string } | null;
};

const statusLabels: Record<string, string> = {
  ASSIGNED: 'اختصاص داده شده',
  PENDING_DRIVER_CONFIRMATION: 'در انتظار تأیید رانندگان',
  READY: 'آماده حرکت',
  IN_PROGRESS: 'در حال حرکت',
  COMPLETED: 'تکمیل شده',
  CANCELLED: 'لغو شده',
};

export function HomeLiveTrips() {
  const [trips, setTrips] = useState<LiveTrip[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadTrips() {
      try {
        const token = localStorage.getItem('adminToken') || '';
        if (!token) {
          if (active) setError('برای نمایش سفرهای واقعی ابتدا وارد پنل مدیریت شوید.');
          return;
        }
        const response = await fetch(`${apiBase}/trips?page=1&limit=50`, {
          headers: getAdminAuthHeaders(),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.message || 'دریافت سفرهای واقعی انجام نشد.');
        if (active) {
          setTrips(Array.isArray(body) ? body : body.data || []);
          setIndex(0);
        }
      } catch (requestError) {
        if (active)
          setError(
            requestError instanceof Error ? requestError.message : 'دریافت سفرها انجام نشد.'
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadTrips();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (trips.length < 2) return;
    const timer = window.setInterval(() => setIndex(value => (value + 1) % trips.length), 5000);
    return () => window.clearInterval(timer);
  }, [trips.length]);

  const trip = useMemo(() => trips[index], [trips, index]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-slate-900/70 p-8 text-center text-slate-300">
        در حال دریافت سفرهای واقعی...
      </div>
    );
  }
  if (!trip) {
    return (
      <div className="rounded-2xl bg-slate-900/70 p-8 text-center text-slate-300">
        {error || 'در حال حاضر سفر واقعی ثبت نشده است.'}
      </div>
    );
  }

  const trackingUrl = trip.trackingLink?.secureToken
    ? `/track/${trip.trackingLink.secureToken}`
    : `/admin/trips`;

  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-slate-900/80 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">سفر واقعی</p>
          <p className="mt-2 text-2xl font-black text-white">
            {trip.route?.origin || 'مبدا نامشخص'} ← {trip.route?.destination || 'مقصد نامشخص'}
          </p>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
          {statusLabels[trip.status] || trip.status}
        </span>
      </div>
      <div className="mt-5 flex items-center justify-between text-sm text-slate-300">
        <span>{trip.bus?.displayName || 'اتوبوس نامشخص'}</span>
        <span>{trip.bus?.plateNumber || 'پلاک نامشخص'}</span>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <a
          href={trackingUrl}
          className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950"
        >
          مشاهده رصد سفر
        </a>
        {trips.length > 1 && (
          <div className="flex items-center gap-2" aria-label="انتخاب سفر">
            <button
              type="button"
              onClick={() => setIndex(value => (value - 1 + trips.length) % trips.length)}
              className="rounded-lg border border-slate-600 px-3 py-1 text-white"
            >
              قبلی
            </button>
            <span className="text-xs text-slate-400">
              {index + 1} از {trips.length}
            </span>
            <button
              type="button"
              onClick={() => setIndex(value => (value + 1) % trips.length)}
              className="rounded-lg border border-slate-600 px-3 py-1 text-white"
            >
              بعدی
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
