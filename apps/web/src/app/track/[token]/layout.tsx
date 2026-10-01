export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_top_right,#dff7f8,transparent_35%),#f4f8fb]">
      <header className="border-b border-white/80 bg-white shadow-sm backdrop-blur">
        <div className="page-shell py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-600 font-black text-white">
                BT
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-900">رصد سفر</h1>
                <p className="text-xs text-slate-500">موقعیت لحظه‌ای اتوبوس</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              زنده
            </span>
          </div>
        </div>
      </header>
      <main className="page-shell">{children}</main>
    </div>
  );
}
