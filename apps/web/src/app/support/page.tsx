'use client';

import Link from 'next/link';

const actions = [
  ['سفرها', 'مشاهده وضعیت سفرها و پیگیری موارد نیازمند اقدام', '/support/trips'],
  ['رانندگان', 'بررسی وضعیت راننده، نمایش رمز عبور و تغییر رمز', '/support/drivers'],
  ['سلامت رصد', 'بررسی GPS، اتصال و آخرین heartbeat دستگاه‌ها', '/admin'],
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#dff7f8,transparent_35%),#f4f8fb]">
      <main className="page-shell space-y-8">
        <header className="rounded-2xl border border-white/80 bg-slate-900/90 p-5 shadow-xl shadow-black/20 backdrop-blur">
          <p className="text-sm font-semibold text-sky-600">SUPPORT DESK</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">مرکز پشتیبانی عملیات</h1>
          <p className="mt-2 text-slate-600">
            از اینجا وضعیت سرویس را بررسی و درخواست‌های عملیاتی را پیگیری کنید.
          </p>
        </header>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {['سفرهای در جریان', 'هشدارهای فعال', 'دستگاه‌های آفلاین', 'درخواست‌های باز'].map(
            label => (
              <article
                key={label}
                className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-lg shadow-slate-900/5"
              >
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-3 text-3xl font-bold text-slate-900">۰</p>
                <p className="mt-2 text-xs text-slate-400">
                  داده زنده پس از اتصال API نمایش داده می‌شود
                </p>
              </article>
            )
          )}
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          {actions.map(([title, description, href]) => (
            <Link
              key={title}
              href={href}
              className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-lg shadow-slate-900/5 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-xl"
            >
              <h2 className="font-bold text-slate-900">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              <span className="mt-4 inline-block text-sm font-medium text-sky-700">
                ورود به بخش ←
              </span>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
