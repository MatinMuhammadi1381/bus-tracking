'use client';

import { useEffect, useState } from 'react';
import { getAdminAuthHeaders, getAdminAuthHeadersWithJson } from '../../lib/auth';
import { apiBase } from '../../lib/apiBase';

type Passenger = {
  id: string;
  passengerCode: string;
  firstName: string;
  lastName: string;
  phone: string;
  gender: 'UNKNOWN' | 'MALE' | 'FEMALE';
  seatNumber?: number | null;
};

type Trip = {
  id: string;
  route?: { origin?: string; destination?: string };
  bus?: { seatCount?: number };
  status: string;
};

type SeatPosition = {
  seatNumber: number;
  row: number;
  column: 1 | 3 | 4;
};

function createSeatLayout(rows: number[][]): SeatPosition[] {
  return rows.flatMap((seatRow, rowIndex) =>
    seatRow.map((seatNumber, seatIndex) => ({
      seatNumber,
      row: rowIndex + 1,
      column: (seatRow.length === 1 ? 1 : [1, 3, 4][seatIndex]) as 1 | 3 | 4,
    }))
  );
}

const seatLayouts: Record<25 | 26, SeatPosition[]> = {
  25: createSeatLayout([
    [3, 2, 1],
    [6, 5, 4],
    [9, 8, 7],
    [12, 11, 10],
    [13],
    [16, 15, 14],
    [19, 18, 17],
    [22, 21, 20],
    [25, 24, 23],
  ]),
  26: createSeatLayout([
    [3, 2, 1],
    [6, 5, 4],
    [9, 8, 7],
    [12, 11, 10],
    [13],
    [14],
    [17, 16, 15],
    [20, 19, 18],
    [23, 22, 21],
    [26, 25, 24],
  ]),
};

type PassengerForm = {
  passengerCode: string;
  firstName: string;
  lastName: string;
  phone: string;
  gender: 'UNKNOWN' | 'MALE' | 'FEMALE';
};

const emptyForm: PassengerForm = {
  passengerCode: '',
  firstName: '',
  lastName: '',
  phone: '',
  gender: 'UNKNOWN',
};

export function AdminPassengersTable() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [passengers, setPassengers] = useState<Record<string, Passenger[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [forms, setForms] = useState<Record<string, PassengerForm>>({});
  const [editing, setEditing] = useState<Record<string, Passenger | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}`,
  });

  async function loadTrips() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/trips?page=1&limit=100`, { headers: authHeaders() });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'دریافت سفرها انجام نشد.');
      const nextTrips: Trip[] = Array.isArray(body) ? body : body.data || [];
      setTrips(nextTrips);
      const results = await Promise.all(
        nextTrips.map(async trip => {
          const passengerResponse = await fetch(`${apiBase}/passengers/trip/${trip.id}`, {
            headers: authHeaders(),
          });
          const passengerBody = await passengerResponse.json().catch(() => []);
          if (!passengerResponse.ok)
            throw new Error(passengerBody?.message || 'دریافت مسافران انجام نشد.');
          return [trip.id, passengerBody as Passenger[]] as const;
        })
      );
      setPassengers(Object.fromEntries(results));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'خطا در دریافت اطلاعات');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTrips();
  }, []);

  function formFor(tripId: string) {
    return forms[tripId] || emptyForm;
  }

  async function savePassenger(trip: Trip) {
    const form = formFor(trip.id);
    if (!form.firstName || !form.lastName || !form.phone || form.gender === 'UNKNOWN') return;
    setSaving(trip.id);
    setError(null);
    try {
      const current = editing[trip.id];
      const url = current
        ? `${apiBase}/passengers/trip/${trip.id}/${current.id}`
        : `${apiBase}/passengers/trip/${trip.id}`;
      const response = await fetch(url, {
        method: current ? 'PUT' : 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'ذخیره مسافر انجام نشد.');
      setPassengers(current => ({
        ...current,
        [trip.id]: current[trip.id]
          ? current[trip.id].map(item => (item.id === body.id ? body : item))
          : [...(current[trip.id] || []), body],
      }));
      setForms(current => ({ ...current, [trip.id]: emptyForm }));
      setEditing(current => ({ ...current, [trip.id]: null }));
      if (!current) setExpanded(value => ({ ...value, [trip.id]: false }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ذخیره مسافر انجام نشد.');
    } finally {
      setSaving(null);
    }
  }

  async function removePassenger(tripId: string, passenger: Passenger) {
    if (!window.confirm(`مسافر ${passenger.firstName} ${passenger.lastName} از این سفر حذف شود؟`))
      return;
    const response = await fetch(`${apiBase}/passengers/trip/${tripId}/${passenger.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.message || 'حذف مسافر انجام نشد.');
      return;
    }

    setPassengers(current => ({
      ...current,
      [tripId]: (current[tripId] || []).filter(item => item.id !== passenger.id),
    }));
  }

  async function assignSeat(trip: Trip, passengerId: string, seatNumber: number) {
    const passenger = (passengers[trip.id] || []).find(item => item.id === passengerId);
    if (!passenger) return;
    if (passenger.gender === 'UNKNOWN') {
      setError('ابتدا جنسیت مسافر را ثبت کنید.');
      return;
    }
    const response = await fetch(`${apiBase}/passengers/trip/${trip.id}/${passengerId}/seat`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatNumber }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.message || 'تخصیص صندلی انجام نشد.');
      return;
    }
    setPassengers(current => ({
      ...current,
      [trip.id]: (current[trip.id] || []).map(item =>
        item.id === passengerId ? { ...item, seatNumber } : item
      ),
    }));
  }

  async function clearSeat(trip: Trip, passengerId: string) {
    const response = await fetch(`${apiBase}/passengers/trip/${trip.id}/${passengerId}/seat`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.message || 'حذف تخصیص صندلی انجام نشد.');
      return;
    }
    setPassengers(current => ({
      ...current,
      [trip.id]: (current[trip.id] || []).map(item =>
        item.id === passengerId ? { ...item, seatNumber: null } : item
      ),
    }));
  }

  return (
    <section className="space-y-5 rounded-2xl border border-white/80 bg-white/85 p-4 shadow-lg sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">مسافران به تفکیک سفر</h2>
          <p className="mt-1 text-sm text-slate-500">هر سفر فهرست مسافران مستقل خودش را دارد.</p>
        </div>
        <button onClick={() => void loadTrips()} className="rounded-xl border px-3 py-2 text-sm">
          بروزرسانی
        </button>
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="py-10 text-center text-slate-500">در حال دریافت سفرها...</p>
      ) : trips.length === 0 ? (
        <p className="py-10 text-center text-slate-500">سفری برای ثبت مسافر وجود ندارد.</p>
      ) : (
        <div className="space-y-3">
          {trips.map((trip, index) => {
            const open = Boolean(expanded[trip.id]);
            const current = editing[trip.id];
            return (
              <div key={trip.id} className="rounded-2xl border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => setExpanded(value => ({ ...value, [trip.id]: !open }))}
                  className="flex w-full items-center justify-between p-4 text-right"
                >
                  <span>
                    <strong>سفر {index + 1}</strong>
                    <span className="mr-2 text-xs text-slate-400">#{trip.id.slice(0, 8)}</span>
                    <span className="mr-3 text-sm text-slate-500">
                      {trip.route?.origin || 'مبدا نامشخص'} ←{' '}
                      {trip.route?.destination || 'مقصد نامشخص'}
                    </span>
                  </span>
                  <span className="text-sm text-cyan-700">
                    {(passengers[trip.id] || []).length.toLocaleString('fa-IR')} مسافر{' '}
                    {open ? '▲' : '▼'}
                  </span>
                </button>
                {open && (
                  <div className="border-t border-slate-100 p-4">
                    <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      {(['passengerCode', 'firstName', 'lastName', 'phone'] as const).map(field => (
                        <input
                          key={field}
                          value={formFor(trip.id)[field]}
                          onChange={event =>
                            setForms(value => ({
                              ...value,
                              [trip.id]: { ...formFor(trip.id), [field]: event.target.value },
                            }))
                          }
                          placeholder={
                            field === 'passengerCode'
                              ? 'شناسه مسافر (اختیاری)'
                              : field === 'firstName'
                                ? 'نام'
                                : field === 'lastName'
                                  ? 'نام خانوادگی'
                                  : 'شماره تماس'
                          }
                          className="rounded-xl border border-slate-200 px-3 py-2"
                        />
                      ))}
                      <select
                        value={formFor(trip.id).gender}
                        onChange={event =>
                          setForms(value => ({
                            ...value,
                            [trip.id]: {
                              ...formFor(trip.id),
                              gender: event.target.value as typeof emptyForm.gender,
                            },
                          }))
                        }
                        className="rounded-xl border border-slate-200 px-3 py-2"
                      >
                        <option value="UNKNOWN">جنسیت را انتخاب کنید</option>
                        <option value="MALE">🔵 مرد</option>
                        <option value="FEMALE">🩷 زن</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => void savePassenger(trip)}
                      disabled={saving === trip.id}
                      className="mb-4 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {saving === trip.id
                        ? 'در حال ذخیره...'
                        : current
                          ? 'ذخیره ویرایش'
                          : 'اضافه کردن مسافر'}
                    </button>
                    <div className="space-y-2">
                      {(passengers[trip.id] || []).map(passenger => (
                        <div
                          key={passenger.id}
                          className="flex items-center justify-between rounded-xl bg-slate-50 p-3"
                        >
                          <span>
                            <strong
                              className={
                                passenger.gender === 'MALE'
                                  ? 'text-blue-700'
                                  : passenger.gender === 'FEMALE'
                                    ? 'text-pink-700'
                                    : 'text-slate-700'
                              }
                            >
                              {passenger.gender === 'MALE'
                                ? '🔵'
                                : passenger.gender === 'FEMALE'
                                  ? '🩷'
                                  : '⚪'}{' '}
                              {passenger.firstName} {passenger.lastName}
                            </strong>
                            <span className="mr-2 text-xs text-slate-500">
                              شناسه: {passenger.passengerCode}{' '}
                              {passenger.seatNumber ? `| صندلی ${passenger.seatNumber}` : ''}
                            </span>
                          </span>
                          <span className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(value => ({ ...value, [trip.id]: passenger }));
                                setForms(value => ({
                                  ...value,
                                  [trip.id]: {
                                    firstName: passenger.firstName,
                                    lastName: passenger.lastName,
                                    phone: passenger.phone,
                                    passengerCode: passenger.passengerCode,
                                    gender: passenger.gender,
                                  },
                                }));
                              }}
                              className="rounded-lg bg-cyan-700 px-3 py-1 text-xs font-bold text-white"
                            >
                              ویرایش
                            </button>
                            <button
                              type="button"
                              onClick={() => void removePassenger(trip.id, passenger)}
                              className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white"
                            >
                              حذف
                            </button>
                          </span>
                        </div>
                      ))}
                      {(passengers[trip.id] || []).length === 0 && (
                        <p className="text-sm text-slate-500">
                          هنوز مسافری برای این سفر ثبت نشده است.
                        </p>
                      )}
                    </div>
                    <SeatManagement
                      trip={trip}
                      passengers={passengers[trip.id] || []}
                      onAssign={assignSeat}
                      onClear={clearSeat}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SeatManagement({
  trip,
  passengers,
  onAssign,
  onClear,
}: {
  trip: Trip;
  passengers: Passenger[];
  onAssign: (trip: Trip, passengerId: string, seatNumber: number) => Promise<void>;
  onClear: (trip: Trip, passengerId: string) => Promise<void>;
}) {
  const [passengerId, setPassengerId] = useState('');
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [genderMode, setGenderMode] = useState<'MALE' | 'FEMALE'>('MALE');
  const seatCount = trip.bus?.seatCount === 26 ? 26 : 25;
  const seatLayout = seatLayouts[seatCount];
  const occupied = new Map(
    passengers
      .filter(passenger => passenger.seatNumber)
      .map(passenger => [passenger.seatNumber, passenger])
  );
  const selectedPassenger = passengers.find(passenger => passenger.id === passengerId);

  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <strong className="ml-2 text-slate-800">صندلی‌ها ({seatCount} صندلی)</strong>
        <button
          type="button"
          onClick={() => setGenderMode('MALE')}
          className={`rounded-xl px-3 py-2 text-sm font-bold ${genderMode === 'MALE' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'}`}
        >
          🔵 مرد
        </button>
        <button
          type="button"
          onClick={() => setGenderMode('FEMALE')}
          className={`rounded-xl px-3 py-2 text-sm font-bold ${genderMode === 'FEMALE' ? 'bg-pink-600 text-white' : 'bg-pink-100 text-pink-800'}`}
        >
          🩷 زن
        </button>
        <select
          value={passengerId}
          onChange={event => setPassengerId(event.target.value)}
          className="min-w-56 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">مسافر را برای صندلی انتخاب کنید</option>
          {passengers.map(passenger => (
            <option key={passenger.id} value={passenger.id}>
              {passenger.passengerCode} - {passenger.firstName} {passenger.lastName}
            </option>
          ))}
        </select>
      </div>
      <div
        dir="ltr"
        className="mx-auto grid max-w-md grid-cols-4 gap-x-3 gap-y-2 rounded-2xl border-2 border-slate-300 bg-white p-4 sm:gap-x-5 sm:p-5"
      >
        <div className="col-span-4 mb-1 flex items-center justify-between border-b border-dashed border-slate-300 pb-3 text-xs font-bold text-slate-500">
          <span dir="rtl">صندلی راننده</span>
          <span dir="rtl">درب ورودی ←</span>
        </div>
        {seatLayout.map(({ seatNumber, row, column }) => {
          const assigned = occupied.get(seatNumber);
          const matchesMode = selectedPassenger?.gender === genderMode;
          return (
            <button
              key={seatNumber}
              type="button"
              style={{ gridColumn: column, gridRow: row + 1 }}
              disabled={
                !passengerId ||
                (!!assigned && assigned.id !== passengerId) ||
                (!!selectedPassenger && !matchesMode)
              }
              onClick={() => setSelectedSeat(seatNumber)}
              title={assigned ? `${assigned.firstName} ${assigned.lastName}` : 'صندلی خالی'}
              className={`min-h-14 rounded-xl border-2 px-2 py-3 text-sm font-black ${selectedSeat === seatNumber ? 'border-cyan-600 bg-cyan-100 text-cyan-900 ring-2 ring-cyan-300' : assigned?.gender === 'MALE' ? 'border-blue-500 bg-blue-100 text-blue-900' : assigned?.gender === 'FEMALE' ? 'border-pink-500 bg-pink-100 text-pink-900' : 'border-slate-300 bg-white text-slate-700'} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <span className="block text-lg">{seatNumber}</span>
              <span className="block truncate text-[10px] font-medium">
                {assigned ? assigned.passengerCode : 'خالی'}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={
          !passengerId ||
          selectedSeat === null ||
          (!!selectedPassenger && selectedPassenger.gender !== genderMode)
        }
        onClick={() => {
          if (selectedSeat !== null) void onAssign(trip, passengerId, selectedSeat);
        }}
        className="mt-4 w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        ثبت
      </button>
    </section>
  );
}
