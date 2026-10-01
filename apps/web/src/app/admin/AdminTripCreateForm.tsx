'use client';

import { FormEvent, useEffect, useState } from 'react';
import { getAdminAuthHeaders, getAdminAuthHeadersWithJson } from '../../lib/auth';
import { apiBase } from '../../lib/apiBase';
import { JalaliDatePicker } from './JalaliDatePicker';
import { TimePicker } from './TimePicker';

type Option = {
  id: string;
  label: string;
};

type ResourceResponse = {
  data?: Array<Record<string, unknown>>;
};

function getToken() {
  return localStorage.getItem('adminToken') || '';
}

async function loadOptions(endpoint: string, label: (item: Record<string, unknown>) => string) {
  const response = await fetch(`${apiBase}/${endpoint}?page=1&limit=100`, {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) throw new Error(`خطا در دریافت ${endpoint} (${response.status})`);
  const body = (await response.json()) as ResourceResponse | Array<Record<string, unknown>>;
  const items = Array.isArray(body) ? body : body.data || [];
  return items.filter(item => item.id).map(item => ({ id: String(item.id), label: label(item) }));
}

export function AdminTripCreateForm() {
  const [buses, setBuses] = useState<Option[]>([]);
  const [routes, setRoutes] = useState<Option[]>([]);
  const [drivers, setDrivers] = useState<Option[]>([]);
  const [busId, setBusId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [driverIds, setDriverIds] = useState<string[]>(['', '']);
  const [expectedPassengerCount, setExpectedPassengerCount] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    Promise.all([
      loadOptions(
        'buses',
        item => `${String(item.displayName || 'اتوبوس')} - ${String(item.plateNumber || '')}`
      ),
      loadOptions(
        'routes',
        item => `${String(item.origin || '')} ← ${String(item.destination || '')}`
      ),
      loadOptions(
        'drivers',
        item =>
          `${String(item.firstName || '')} ${String(item.lastName || '')} - ${String(item.phone || '')}`
      ),
    ])
      .then(([busOptions, routeOptions, driverOptions]) => {
        if (!active) return;
        setBuses(busOptions);
        setRoutes(routeOptions);
        setDrivers(driverOptions);
      })
      .catch(requestError => {
        if (active)
          setError(
            requestError instanceof Error ? requestError.message : 'دریافت اطلاعات انجام نشد.'
          );
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/trips`, {
        method: 'POST',
        headers: getAdminAuthHeadersWithJson(),
        body: JSON.stringify({
          busId,
          routeId,
          driverIds,
          expectedPassengerCount: expectedPassengerCount ? Number(expectedPassengerCount) : 0,
          departureDate: departureDate || undefined,
          departureTime: departureTime || undefined,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          Array.isArray(body?.message)
            ? body.message.join('، ')
            : body?.message || `خطا در ایجاد سفر (${response.status})`
        );
      }
      setMessage('سفر با موفقیت ایجاد شد.');
      setBusId('');
      setRouteId('');
      setDriverIds(['', '']);
      setExpectedPassengerCount('');
      setDepartureDate('');
      setDepartureTime('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ایجاد سفر انجام نشد.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-lg shadow-slate-900/5 backdrop-blur sm:p-6"
    >
      <h3 className="mb-5 text-lg font-black text-slate-900">ایجاد سفر جدید</h3>
      {loadingOptions ? (
        <p className="text-sm text-slate-600">در حال دریافت اتوبوس‌ها، مسیرها و رانندگان...</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          <Select label="اتوبوس" value={busId} options={buses} onChange={setBusId} />
          <Select label="مسیر" value={routeId} options={routes} onChange={setRouteId} />
          <Select
            label="راننده اول"
            value={driverIds[0]}
            options={drivers}
            onChange={value => setDriverIds([value, driverIds[1]])}
          />
          <Select
            label="راننده دوم"
            value={driverIds[1]}
            options={drivers}
            onChange={value => setDriverIds([driverIds[0], value])}
          />
          <label className="space-y-1 text-sm text-slate-700">
            <span>تعداد مسافر</span>
            <input
              type="number"
              min="0"
              value={expectedPassengerCount}
              onChange={event => setExpectedPassengerCount(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>تاریخ حرکت</span>
            <JalaliDatePicker value={departureDate} onChange={setDepartureDate} />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>ساعت حرکت</span>
            <TimePicker value={departureTime} onChange={setDepartureTime} />
          </label>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={
            saving ||
            loadingOptions ||
            !busId ||
            !routeId ||
            driverIds.some(id => !id) ||
            driverIds[0] === driverIds[1]
          }
          className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-cyan-600/20 transition hover:bg-cyan-700 disabled:opacity-50"
        >
          {saving ? 'در حال ثبت...' : 'ایجاد سفر'}
        </button>
        {message && <span className="text-sm text-emerald-700">{message}</span>}
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>
    </form>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1 text-sm text-slate-700">
      <span>{label}</span>
      <select
        required
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none transition focus:border-cyan-500 focus:bg-white"
      >
        <option value="">انتخاب کنید</option>
        {options.map(option => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
