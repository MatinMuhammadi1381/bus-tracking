import { HomeLiveTrips } from './HomeLiveTrips';

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-between">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-400 font-black text-slate-950">
              BT
            </div>
            <div>
              <p className="font-bold">باس‌تِرَک</p>
              <p className="text-xs text-slate-400">سامانه هوشمند حمل‌ونقل</p>
            </div>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            نسخه عملیاتی
          </span>
        </header>
        <section className="grid items-center gap-10 py-16 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-cyan-400/10 px-3 py-1 text-sm text-cyan-300">
              رصد زنده، مدیریت ساده
            </p>
            <h1 className="max-w-2xl text-4xl font-black leading-[1.25] sm:text-6xl">
              سفرهای اتوبوس را با اطمینان مدیریت کنید.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              از ثبت سفر و مدیریت راننده تا نمایش موقعیت زنده برای مسافر، همه‌چیز در یک پنل یکپارچه.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/admin/login"
                className="rounded-xl bg-cyan-400 px-6 py-3 text-center font-bold text-slate-950 transition hover:bg-cyan-300"
              >
                ورود به پنل مدیریت
              </a>
            </div>
          </div>
          <div className="glass-panel rounded-3xl p-5 text-slate-900">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">وضعیت شبکه</p>
                <p className="mt-1 text-xl font-black">عملیاتی</p>
              </div>
              <span className="h-3 w-3 rounded-full bg-emerald-500 ring-8 ring-emerald-500/10" />
            </div>
            <HomeLiveTrips />
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-slate-50 p-3">
                <b className="block text-xl">۲۴</b>
                <span className="text-xs text-slate-500">سفر امروز</span>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <b className="block text-xl">۹۸٪</b>
                <span className="text-xs text-slate-500">سلامت سیستم</span>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <b className="block text-xl">زنده</b>
                <span className="text-xs text-slate-500">رصد لحظه‌ای</span>
              </div>
            </div>
          </div>
        </section>
        <footer className="flex flex-col gap-2 border-t border-white/10 pt-5 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>سامانه رصد اتوبوس</span>
          <span>امن، سریع و فارسی‌محور</span>
        </footer>
      </div>
    </main>
  );
}
