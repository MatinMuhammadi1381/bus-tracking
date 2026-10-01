interface AdminStatsData {
  trips: number;
  drivers: number;
  buses: number;
  routes: number;
  passengers: number;
}

interface AdminStatsProps {
  data: AdminStatsData;
  loading?: boolean;
}

const cards = [
  ['سفرهای ثبت‌شده', 'trips', 'bg-sky-100 text-sky-800'],
  ['رانندگان ثبت‌شده', 'drivers', 'bg-emerald-100 text-emerald-800'],
  ['اتوبوس‌های ثبت‌شده', 'buses', 'bg-violet-100 text-violet-800'],
  ['مسیرهای ثبت‌شده', 'routes', 'bg-amber-100 text-amber-800'],
  ['مسافران ثبت‌شده', 'passengers', 'bg-cyan-100 text-cyan-800'],
] as const;

export function AdminStats({ data, loading = false }: AdminStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, key, color]) => (
        <article
          key={key}
          className={`rounded-2xl border border-white/80 p-5 shadow-lg shadow-slate-900/5 transition hover:-translate-y-0.5 ${color}`}
        >
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-3 text-3xl font-bold">
            {loading ? '…' : data[key].toLocaleString('fa-IR')}
          </p>
          <p className="mt-2 text-xs opacity-70">آخرین بروزرسانی: همین لحظه</p>
        </article>
      ))}
    </div>
  );
}
