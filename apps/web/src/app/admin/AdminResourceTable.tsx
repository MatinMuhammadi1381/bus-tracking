"use client";

import { useCallback, useEffect, useState } from 'react';
import { getAdminAuthHeaders, getAdminAuthHeadersWithJson } from '../../lib/auth';
import { apiBase, apiOrigin } from '../../lib/apiBase';
import { JalaliDatePicker } from './JalaliDatePicker';
import { TimePicker } from './TimePicker';

type Row = Record<string, unknown>;
type Column = readonly [string, string];
type EditField = {
  name: string;
  label: string;
  type?: string;
};

interface AdminResourceTableProps {
  title: string;
  endpoint: string;
  searchPlaceholder: string;
  columns: Column[];
  statusOptions?: readonly (readonly [string, string])[];
  allowDelete?: boolean;
  editFields?: EditField[];
  showTripLink?: boolean;
  allowPhotoUpload?: boolean;
  compact?: boolean;
  passwordFieldName?: string;
}


function formatValue(key: string, value: unknown) {
  if (key === 'passwordPreview' || key === 'password') {
    if (value === null || value === undefined || value === '') return '';
    return String(value);
  }
  if (value === null || value === undefined || value === '') return '—';
  if (key.endsWith('At')) {
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(date);
  }
  if (key === 'batteryLevel') return `${String(value)}٪`;
  return String(value);
}

function getRowFieldValue(row: Row, fieldName: string, passwordFieldName?: string) {
  if (fieldName === passwordFieldName) {
    return '';
  }

  const value = row[fieldName];
  if (value !== undefined && value !== null) {
    return String(value);
  }
  return '';
}

function normalizeDepartureTime(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return trimmed;
  return `${match[1].padStart(2, '0')}:${match[2].padStart(2, '0')}`;
}

export function AdminResourceTable({
  title,
  endpoint,
  searchPlaceholder,
  columns,
  statusOptions = [],
  allowDelete = false,
  editFields = [],
  showTripLink = false,
  allowPhotoUpload = false,
  compact = false,
  passwordFieldName,
}: AdminResourceTableProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);
  const [photoUploadProgress, setPhotoUploadProgress] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: '10' });
    if (search.trim()) params.set('search', search.trim());
    if (status) params.set('status', status);

    try {
      const response = await fetch(`${apiBase}/${endpoint}?${params}`, {
        headers: getAdminAuthHeaders(),
      });

      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.replace('/admin/login');
        return;
      }

      if (!response.ok) throw new Error(`درخواست ناموفق بود (${response.status})`);

      const body = await response.json();
      const items = Array.isArray(body) ? body : body.data || body.items || [];
      setRows(items);
      setTotal(Number(body.total ?? body.meta?.total ?? items.length));
    } catch (requestError) {
      setRows([]);
      setError(requestError instanceof Error ? requestError.message : 'دریافت اطلاعات انجام نشد.');
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadPhoto(id: string, file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('فرمت عکس باید JPEG، PNG یا WebP باشد.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('حجم عکس نباید بیشتر از ۵ مگابایت باشد.');
      return;
    }
    setUploadingPhotoId(id);
    setPhotoUploadProgress(current => ({ ...current, [id]: 0 }));
    setError(null);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      await new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('POST', `${apiBase}/${endpoint}/${id}/profile-photo`);
        const authHeaders = getAdminAuthHeaders();
        if (authHeaders.Authorization) {
          request.setRequestHeader('Authorization', authHeaders.Authorization);
        }
        request.upload.addEventListener('progress', event => {
          if (event.lengthComputable) {
            setPhotoUploadProgress(current => ({
              ...current,
              [id]: Math.round((event.loaded / event.total) * 100),
            }));
          }
        });
        request.addEventListener('load', () => {
          if (request.status >= 200 && request.status < 300) resolve();
          else {
            let body: { message?: string | string[] } | null = null;
            try {
              body = JSON.parse(request.responseText || 'null');
            } catch {
              // Use the generic upload error below for a non-JSON response.
            }
            const message = Array.isArray(body?.message)
              ? body.message.join('، ')
              : body?.message;
            reject(new Error(message || 'بارگذاری عکس انجام نشد.'));
          }
        });
        request.addEventListener('error', () => reject(new Error('ارتباط با سرور برقرار نشد.')));
        request.send(formData);
      });
      setPhotoUploadProgress(current => ({ ...current, [id]: 100 }));
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'بارگذاری عکس انجام نشد.');
    } finally {
      setUploadingPhotoId(null);
      window.setTimeout(() => {
        setPhotoUploadProgress(current => {
          const next = { ...current };
          delete next[id];
          return next;
        });
      }, 700);
    }
  }

  function profilePhotoUrl(row: Row) {
    const photo = row.profilePhotoUrl;
    return typeof photo === 'string' && photo
      ? `${apiOrigin}${photo}`
      : null;
  }

  function DriverAvatar({ row, className = 'h-10 w-10' }: { row: Row; className?: string }) {
    const photoUrl = profilePhotoUrl(row);
    return photoUrl ? (
      <img src={photoUrl} alt="" className={`${className} shrink-0 rounded-full object-cover ring-2 ring-cyan-400/40`} />
    ) : (
      <span className={`${className} grid shrink-0 place-items-center rounded-full bg-cyan-100 text-cyan-700 ring-2 ring-cyan-200`} aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-3/5 w-3/5">
          <path fill="currentColor" d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
        </svg>
      </span>
    );
  }

  function startEditing(row: Row) {
    const nextValues: Record<string, string> = {};
    for (const field of editFields) {
      nextValues[field.name] = getRowFieldValue(row, field.name, passwordFieldName);
    }
    setEditingRow(row);
    setEditValues(nextValues);
    setError(null);
  }

  async function saveEdit() {
    if (!editingRow?.id) return;

    setSavingEdit(true);
    setError(null);

    try {
      const payload = Object.fromEntries(
        editFields
          .filter(field => !(passwordFieldName && field.name === passwordFieldName))
          .map(field => {
            const rawValue = editValues[field.name] ?? '';

            let value: string | number | null = rawValue;
            if (field.type === 'number' && rawValue !== '') value = Number(rawValue);
            if (field.type === 'time-24' && rawValue) value = normalizeDepartureTime(rawValue);
            if (rawValue === '') value = null;

            return [field.name, value];
          })
      );
      const passwordValue = passwordFieldName ? editValues[passwordFieldName]?.trim() ?? '' : '';

      if (Object.keys(payload).length > 0) {
        const response = await fetch(`${apiBase}/${endpoint}/${String(editingRow.id)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}`,
          },
          body: JSON.stringify(payload),
        });

        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(body?.message || `ویرایش انجام نشد (${response.status})`);
        }
      }

      if (passwordFieldName && passwordValue !== '') {
        const passwordResponse = await fetch(`${apiBase}/${endpoint}/${String(editingRow.id)}/password`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}`,
          },
          body: JSON.stringify({ password: passwordValue }),
        });

        const passwordBody = await passwordResponse.json().catch(() => null);
        if (!passwordResponse.ok) {
          throw new Error(passwordBody?.message || `تغییر رمز عبور انجام نشد (${passwordResponse.status})`);
        }
      }

      setEditingRow(null);
      await load();
} catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ویرایش انجام نشد.');
    } finally {
      setSavingEdit(false);
    }
  }

  function getResolvedValue(row: Row, key: string) {
    if (key === 'passwordPreview') return row.passwordPreview ?? row.password ?? '';
    if (key === 'password') return row.password ?? row.passwordPreview ?? '';
    return key.split('.').reduce<unknown>((current, part) => {
      if (current && typeof current === 'object' && part in current) {
        return (current as Record<string, unknown>)[part];
      }
      return undefined;
    }, row);
  }

  async function openTripLink(row: Row) {
    let token = '';
    if (
      row.trackingLink &&
      typeof row.trackingLink === 'object' &&
      'secureToken' in row.trackingLink
    ) {
      token = String(row.trackingLink.secureToken);
    }

    if (!token) {
      const response = await fetch(`${apiBase}/${endpoint}/${String(row.id)}/tracking-link`, {
        method: 'POST',
        headers: getAdminAuthHeaders(),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.secureToken) {
        setError(body?.message || 'ایجاد لینک پیگیری انجام نشد.');
        return;
      }
      token = String(body.secureToken);
    }

    const link = `${window.location.origin}/track/${token}`;
    void navigator.clipboard?.writeText(link);
    window.open(link, '_blank', 'noopener,noreferrer');
  }

  async function deleteRow(row: Row) {
    if (!row.id || !window.confirm(`آیا از حذف ${title} مطمئن هستید؟`)) return;

    try {
      const response = await fetch(`${apiBase}/${endpoint}/${String(row.id)}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders(),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || `حذف انجام نشد (${response.status})`);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'حذف انجام نشد.');
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / 10));

  return (
    <section className="space-y-4 rounded-2xl border border-white/80 bg-white/85 p-4 shadow-lg shadow-slate-900/5 backdrop-blur sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50"
        >
          بروزرسانی
        </button>
      </div>

      <form
        onSubmit={event => {
          event.preventDefault();
          setPage(1);
          void load();
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder={searchPlaceholder}
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
        />

        {statusOptions.length > 0 && (
          <select
            value={status}
            onChange={event => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="">همه وضعیت‌ها</option>
            {statusOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        )}

        <button
          type="submit"
          className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-cyan-600/20 transition hover:bg-cyan-700"
        >
          جستجو
        </button>
      </form>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">خطا: {error}</p>
      )}

      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
            در حال بارگذاری...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
            هیچ داده‌ای وجود ندارد.
          </div>
        ) : (
          rows.map((row, index) => (
            <article
              key={String(row.id ?? index)}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {allowPhotoUpload && <DriverAvatar row={row} />}
                  <div>
                  <p className="text-xs font-semibold text-slate-500">رکورد {index + 1}</p>
                  <h3 className="mt-1 font-bold text-slate-900">
                    {formatValue(columns[0]?.[0] || '', getResolvedValue(row, columns[0]?.[0] || ''))}
                  </h3>
                  </div>
                </div>
                <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-bold text-cyan-700">
                  {formatValue('status', row.status)}
                </span>
              </div>

              <dl className="grid grid-cols-1 gap-x-4 gap-y-3 px-4 py-4 sm:grid-cols-2">
                {columns.slice(1).map(([key, label]) => (
                  <div key={key} className="min-w-0">
                    <dt className="text-[11px] font-semibold text-slate-400">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-medium text-slate-700">
                      {formatValue(key, getResolvedValue(row, key)) || '—'}
                    </dd>
                  </div>
                ))}
              </dl>

              {(allowDelete || showTripLink || allowPhotoUpload || editFields.length > 0) && (
                <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3">
                  {allowPhotoUpload && (
                    <label className="cursor-pointer rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white">
                      {uploadingPhotoId === String(row.id) ? `${photoUploadProgress[String(row.id)] ?? 0}٪` : 'عکس'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={uploadingPhotoId === String(row.id)}
                        onChange={event => {
                          const file = event.target.files?.[0];
                          if (file && row.id) void uploadPhoto(String(row.id), file);
                          event.currentTarget.value = '';
                        }}
                      />
                      {uploadingPhotoId === String(row.id) && (
                        <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-violet-200">
                          <span
                            className="block h-full rounded-full bg-white transition-[width] duration-150"
                            style={{ width: `${photoUploadProgress[String(row.id)] ?? 0}%` }}
                          />
                        </span>
                      )}
                    </label>
                  )}
                  {showTripLink && (
                    <button
                      type="button"
                      onClick={() => void openTripLink(row)}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                    >
                      لینک سفر
                    </button>
                  )}
                  {editFields.length > 0 && (
                    <button
                      type="button"
                      onClick={() => startEditing(row)}
                      className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-bold text-white"
                    >
                      ویرایش
                    </button>
                  )}
                  {allowDelete && (
                    <button
                      type="button"
                      onClick={() => void deleteRow(row)}
                      className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white"
                    >
                      حذف
                    </button>
                  )}
                </div>
              )}
              {editingRow?.id === row.id && (
                <div className="border-t border-slate-100 bg-slate-900/95 p-4 text-slate-100">
                  <h3 className="mb-3 text-base font-bold text-white">ویرایش {title}</h3>
                  <div className="space-y-3">
                    {editFields.map(field => (
                      <label key={field.name} className="block space-y-1 text-sm text-slate-200">
                        <span className="block font-medium">{field.label}</span>
                        <input
                          type={field.type || 'text'}
                          value={editValues[field.name] ?? ''}
                          onChange={event =>
                            setEditValues(prev => ({ ...prev, [field.name]: event.target.value }))
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500"
                        />
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingRow(null)}
                      className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
                    >
                      انصراف
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveEdit()}
                      disabled={savingEdit}
                      className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-cyan-600/20 disabled:cursor-not-allowed disabled:bg-cyan-400"
                    >
                      {savingEdit ? 'در حال ذخیره...' : 'ثبت تغییرات'}
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 shadow-sm md:block">
        <table className={`w-full divide-y divide-slate-200 ${compact ? 'table-fixed text-xs' : 'text-sm'}`}>
          <thead className="bg-slate-50">
            <tr>
              {columns.map(([, label]) => (
                <th
                  key={label}
                  className={`${compact ? 'break-words px-2 py-2' : 'whitespace-nowrap px-4 py-3'} text-right font-semibold text-slate-600`}
                >
                  {label}
                </th>
              ))}
              {(allowDelete || editFields.length > 0 || showTripLink || allowPhotoUpload) && (
                <th
                  className={`${compact ? 'px-2 py-2' : 'whitespace-nowrap px-4 py-3'} text-right font-semibold text-slate-600`}
                >
                  عملیات
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (allowDelete || editFields.length > 0 || showTripLink || allowPhotoUpload ? 1 : 0)}
                  className={`${compact ? 'px-2 py-6' : 'px-4 py-10'} text-center text-slate-500`}
                >
                  در حال بارگذاری...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (allowDelete || editFields.length > 0 || showTripLink || allowPhotoUpload ? 1 : 0)}
                  className={`${compact ? 'px-2 py-6' : 'px-4 py-10'} text-center text-slate-500`}
                >
                  هیچ داده‌ای وجود ندارد.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={String(row.id ?? index)} className="hover:bg-slate-50">
                  {columns.map(([key]) => {
                    const resolvedValue =
                      key === 'passwordPreview'
                        ? row.passwordPreview ?? row.password ?? ''
                        : key === 'password'
                          ? row.password ?? row.passwordPreview ?? ''
                          : key.split('.').reduce<unknown>((current, part) => {
                              if (current && typeof current === 'object' && part in current) {
                                return (current as Record<string, unknown>)[part];
                              }
                              return undefined;
                            }, row);

                    return (
                      <td
                        key={key}
                        className={`${compact ? 'break-words px-2 py-2' : 'whitespace-nowrap px-4 py-3'} text-slate-700`}
                      >
                        {allowPhotoUpload && key === columns[0]?.[0] ? (
                          <span className="flex items-center gap-3">
                            <DriverAvatar row={row} className="h-9 w-9" />
                            <span>{formatValue(key, resolvedValue)}</span>
                          </span>
                        ) : formatValue(key, resolvedValue)}
                      </td>
                    );
                  })}

                  {(allowDelete || showTripLink || allowPhotoUpload || editFields.length > 0) && (
                    <td className={`${compact ? 'px-2 py-2' : 'whitespace-nowrap px-4 py-3'}`}>
                      <div className={`${compact ? 'flex-wrap gap-1' : 'gap-2'} flex`}>
                        {allowPhotoUpload && (
                          <label
                            className={`cursor-pointer rounded-lg bg-violet-600 ${compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'} font-bold text-white transition hover:bg-violet-700`}
                          >
                            {uploadingPhotoId === String(row.id) ? `${photoUploadProgress[String(row.id)] ?? 0}٪` : 'عکس'}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              disabled={uploadingPhotoId === String(row.id)}
                              onChange={event => {
                                const file = event.target.files?.[0];
                                if (file && row.id) void uploadPhoto(String(row.id), file);
                                event.currentTarget.value = '';
                              }}
                            />
                            {uploadingPhotoId === String(row.id) && (
                              <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-violet-200">
                                <span
                                  className="block h-full rounded-full bg-white transition-[width] duration-150"
                                  style={{ width: `${photoUploadProgress[String(row.id)] ?? 0}%` }}
                                />
                              </span>
                            )}
                          </label>
                        )}

                        {showTripLink && (
                          <button
                            type="button"
                            onClick={async () => {
                              let token = '';
                              if (
                                row.trackingLink &&
                                typeof row.trackingLink === 'object' &&
                                'secureToken' in row.trackingLink
                              ) {
                                token = String(row.trackingLink.secureToken);
                              }

                              if (!token) {
                                const response = await fetch(
                                  `${apiBase}/${endpoint}/${String(row.id)}/tracking-link`,
                                  {
                                    method: 'POST',
                                    headers: {
                                      Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}`,
                                    },
                                  }
                                );
                                const body = await response.json().catch(() => null);
                                if (!response.ok || !body?.secureToken) {
                                  setError(body?.message || 'ایجاد لینک پیگیری انجام نشد.');
                                  return;
                                }
                                token = String(body.secureToken);
                              }

                              const link = `${window.location.origin}/track/${token}`;
                              void navigator.clipboard?.writeText(link);
                              window.open(link, '_blank', 'noopener,noreferrer');
                            }}
                            className={`rounded-lg bg-emerald-600 ${compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'} font-bold text-white transition hover:bg-emerald-700`}
                          >
                            لینک سفر
                          </button>
                        )}

                        {editFields.length > 0 && (
                          <button
                            type="button"
                            onClick={() => startEditing(row)}
                            className={`rounded-lg bg-cyan-700 ${compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'} font-bold text-white transition hover:bg-cyan-800`}
                          >
                            ویرایش
                          </button>
                        )}

                        {allowDelete && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!row.id || !window.confirm(`آیا از حذف ${title} مطمئن هستید؟`)) return;

                              try {
                                const response = await fetch(`${apiBase}/${endpoint}/${String(row.id)}`, {
                                  method: 'DELETE',
                                  headers: {
                                    Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}`,
                                  },
                                });

                                const body = await response.json().catch(() => null);
                                if (!response.ok) {
                                  throw new Error(body?.message || `حذف انجام نشد (${response.status})`);
                                }
                                await load();
                              } catch (requestError) {
                                setError(
                                  requestError instanceof Error
                                    ? requestError.message
                                    : 'حذف انجام نشد.'
                                );
                              }
                            }}
                            className={`rounded-lg bg-rose-600 ${compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'} font-bold text-white transition hover:bg-rose-700`}
                          >
                            حذف
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingRow && (
        <div className="hidden rounded-2xl border border-slate-700 bg-slate-900/95 p-4 text-slate-100 shadow-lg shadow-slate-950/30 md:block">
          <h3 className="mb-3 text-lg font-bold text-white">ویرایش {title}</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {editFields.map(field => (
              <label key={field.name} className="space-y-1 text-sm text-slate-200">
                <span className="block font-medium text-slate-200">{field.label}</span>
                {field.type === 'date' ? (
                  <div className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100">
                    <JalaliDatePicker
                      value={editValues[field.name] ?? ''}
                      onChange={value => setEditValues(prev => ({ ...prev, [field.name]: value }))}
                    />
                  </div>
                ) : field.type === 'time-24' ? (
                  <div className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100">
                    <TimePicker
                      value={editValues[field.name] ?? ''}
                      onChange={value => setEditValues(prev => ({ ...prev, [field.name]: value }))}
                    />
                  </div>
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={editValues[field.name] ?? ''}
                    onChange={event =>
                      setEditValues(prev => ({ ...prev, [field.name]: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500"
                  />
                )}
              </label>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingRow(null)}
              className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={() => void saveEdit()}
              disabled={savingEdit}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-cyan-600/20 disabled:cursor-not-allowed disabled:bg-cyan-400"
            >
              {savingEdit ? 'در حال ذخیره...' : 'ثبت تغییرات'}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 text-sm text-slate-600">
        <span>{total.toLocaleString('fa-IR')} مورد</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage(current => Math.max(1, current - 1))}
            disabled={page === 1}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            قبل
          </button>
          <span>
            صفحه {page.toLocaleString('fa-IR')} از {pageCount.toLocaleString('fa-IR')}
          </span>
          <button
            type="button"
            onClick={() => setPage(current => Math.min(pageCount, current + 1))}
            disabled={page >= pageCount}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            بعد
          </button>
        </div>
      </div>
    </section>
  );
}