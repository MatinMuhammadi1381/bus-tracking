'use client';

import { FormEvent, useEffect, useState } from 'react';
import { getAdminAuthHeaders, getAdminAuthHeadersWithJson } from '../../lib/auth';
import { apiBase } from '../../lib/apiBase';

type RouteLookup = {
  distanceKm: number;
  durationMinutes: number;
  geometry: { type: 'LineString'; coordinates: number[][] };
};

export function AdminRouteCreateForm({ onCreated }: { onCreated?: () => void }) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [routeLookup, setRouteLookup] = useState<RouteLookup | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);

  useEffect(() => {
    const cleanOrigin = origin.trim();
    const cleanDestination = destination.trim();
    setRouteLookup(null);
    setLookupMessage(null);
    if (cleanOrigin.length < 2 || cleanDestination.length < 2) {
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setLookupLoading(true);
      setLookupMessage(null);
      try {
        const [originPoint, destinationPoint] = await Promise.all([
          geocode(cleanOrigin),
          geocode(cleanDestination),
        ]);
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${originPoint.lon},${originPoint.lat};${destinationPoint.lon},${destinationPoint.lat}?overview=full&geometries=geojson`
        );
        if (!response.ok) throw new Error('سرویس محاسبه مسیر پاسخ نداد.');
        const body = (await response.json()) as {
          routes?: Array<{
            distance: number;
            duration: number;
            geometry: { type: 'LineString'; coordinates: number[][] };
          }>;
        };
        const route = body.routes?.[0];
        if (!route) throw new Error('مسیر بین این دو نقطه پیدا نشد.');
        if (active) {
          setRouteLookup({
            distanceKm: route.distance / 1000,
            durationMinutes: Math.max(1, Math.round(route.duration / 60)),
            geometry: route.geometry,
          });
          setLookupMessage('مسافت و زمان مسیر به‌صورت خودکار محاسبه شد.');
        }
      } catch (lookupError) {
        if (active) {
          setRouteLookup(null);
          setLookupMessage(
            lookupError instanceof Error ? lookupError.message : 'محاسبه مسیر انجام نشد.'
          );
        }
      } finally {
        if (active) setLookupLoading(false);
      }
    }, 700);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [origin, destination]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/routes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}`,
        },
        body: JSON.stringify({
          origin: origin.trim(),
          destination: destination.trim(),
          ...(routeLookup && {
            totalDistanceKm: routeLookup.distanceKm,
            estimatedDurationMinutes: routeLookup.durationMinutes,
            geometry: routeLookup.geometry,
          }),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          Array.isArray(body?.message)
            ? body.message.join('، ')
            : body?.message || `خطا در ثبت مسیر (${response.status})`
        );
      }

      setOrigin('');
      setDestination('');
      setMessage('مسیر با موفقیت ثبت شد و در فرم ایجاد سفر قابل انتخاب است.');
      onCreated?.();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ثبت مسیر انجام نشد.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-cyan-400/25 bg-slate-900/90 p-5 shadow-lg shadow-cyan-950/20 backdrop-blur sm:p-6"
    >
      <div className="mb-5">
        <p className="text-xs font-bold tracking-wide text-cyan-300">تعیین مسیر سفر</p>
        <h3 className="mt-1 text-lg font-black text-slate-100">مبدا و مقصد را مشخص کنید</h3>
        <p className="mt-1 text-sm text-slate-300">
          مسیر ثبت‌شده بعداً در بخش ایجاد سفر نمایش داده می‌شود.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-slate-200">
          <span>مبدا</span>
          <input
            required
            maxLength={255}
            value={origin}
            onChange={event => setOrigin(event.target.value)}
            placeholder="مثلاً تهران"
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
          />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-200">
          <span>مقصد</span>
          <input
            required
            maxLength={255}
            value={destination}
            onChange={event => setDestination(event.target.value)}
            placeholder="مثلاً مشهد"
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
          />
        </label>
      </div>

      <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm">
        {lookupLoading ? (
          <span className="text-cyan-300">در حال دریافت مسافت و زمان از سرویس نقشه...</span>
        ) : routeLookup ? (
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-slate-200">
            <span>
              مسافت:{' '}
              <strong className="text-cyan-300">{routeLookup.distanceKm.toFixed(1)} کیلومتر</strong>
            </span>
            <span>
              زمان تقریبی:{' '}
              <strong className="text-emerald-300">{routeLookup.durationMinutes} دقیقه</strong>
            </span>
          </div>
        ) : (
          <span className="text-slate-400">
            {lookupMessage || 'برای محاسبه خودکار، مبدا و مقصد را وارد کنید.'}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={
            saving || lookupLoading || !routeLookup || !origin.trim() || !destination.trim()
          }
          className="rounded-xl bg-cyan-700 px-5 py-2 text-sm font-bold text-white shadow-md shadow-cyan-700/20 transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'در حال ثبت...' : 'ثبت مسیر'}
        </button>
        {message && <span className="text-sm font-medium text-emerald-700">{message}</span>}
        {error && <span className="text-sm font-medium text-red-700">{error}</span>}
      </div>
    </form>
  );
}

async function geocode(query: string): Promise<{ lat: number; lon: number }> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=fa&q=${encodeURIComponent(query)}`
  );
  if (!response.ok) throw new Error('موقعیت مبدا یا مقصد پیدا نشد.');
  const results = (await response.json()) as Array<{ lat: string; lon: string }>;
  const point = results[0];
  if (!point) throw new Error(`موقعیت «${query}» پیدا نشد.`);
  return { lat: Number(point.lat), lon: Number(point.lon) };
}
