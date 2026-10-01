'use client';

import { FormEvent, useState } from 'react';
import { getAdminAuthHeaders, getAdminAuthHeadersWithJson } from '../../lib/auth';
import { apiBase } from '../../lib/apiBase';

type Field = {
  name: string;
  label: string;
  type?: 'text' | 'tel' | 'password' | 'number' | 'file';
  required?: boolean;
  placeholder?: string;
};

export function AdminCreateForm({
  title,
  endpoint,
  fields,
  onCreated,
}: {
  title: string;
  endpoint: string;
  fields: Field[];
  onCreated?: (created: Record<string, unknown>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    const body = Object.fromEntries(
      Object.entries(values)
        .filter(([key]) => fields.find(field => field.name === key)?.type !== 'file')
        .map(([key, value]) => [
          key,
          fields.find(field => field.name === key)?.type === 'number' && value !== ''
            ? Number(value)
            : value,
        ])
    );

    try {
      const response = await fetch(`${apiBase}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}`,
        },
        body: JSON.stringify(body),
      });
      const responseBody = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          Array.isArray(responseBody?.message)
            ? responseBody.message.join('، ')
            : responseBody?.message || `خطا در ثبت اطلاعات (${response.status})`
        );
      }
      setValues({});
      const photoField = fields.find(field => field.type === 'file');
      if (photoField && files[photoField.name] && responseBody?.id) {
        const formData = new FormData();
        formData.append('photo', files[photoField.name]);
        const photoResponse = await fetch(
          `${apiBase}/${endpoint}/${String(responseBody.id)}/profile-photo`,
          {
            method: 'POST',
            headers: getAdminAuthHeaders(),
            body: formData,
          }
        );
        if (!photoResponse.ok) {
          throw new Error('اطلاعات ثبت شد اما بارگذاری عکس انجام نشد.');
        }
      }
      setFiles({});
      setMessage('اطلاعات با موفقیت ثبت شد.');
      onCreated?.(responseBody);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ثبت اطلاعات انجام نشد.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-lg shadow-slate-900/5 backdrop-blur sm:p-6"
    >
      <h3 className="mb-5 text-lg font-black text-slate-900">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map(field => (
          <label key={field.name} className="space-y-1 text-sm text-slate-700">
            <span>{field.label}</span>
            <input
              required={field.required !== false}
              type={field.type || 'text'}
              value={field.type === 'file' ? undefined : values[field.name] || ''}
              placeholder={field.placeholder}
              onChange={event =>
                field.type === 'file'
                  ? event.target.files?.[0] &&
                    setFiles(current => ({ ...current, [field.name]: event.target.files![0] }))
                  : setValues(current => ({ ...current, [field.name]: event.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none transition focus:border-cyan-500 focus:bg-white"
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-cyan-600/20 transition hover:bg-cyan-700 disabled:opacity-50"
        >
          {saving ? 'در حال ثبت...' : 'ثبت اطلاعات'}
        </button>
        {message && <span className="text-sm text-emerald-700">{message}</span>}
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>
    </form>
  );
}
