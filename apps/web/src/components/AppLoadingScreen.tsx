'use client';

import { useEffect, useState } from 'react';

export function AppLoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const delay = 280;
    const duration = 2400;
    const startedAt = Date.now() + delay;
    let finishTimer: number | undefined;
    let interval: number;

    const update = () => {
      const elapsed = Math.min(Math.max(Date.now() - startedAt, 0), duration);
      setProgress(Math.round((elapsed / duration) * 100));

      if (elapsed >= duration) {
        finishTimer = window.setTimeout(() => setFinished(true), 220);
        window.clearInterval(interval);
      }
    };

    interval = window.setInterval(update, 16);
    update();
    return () => {
      window.clearInterval(interval);
      if (finishTimer !== undefined) window.clearTimeout(finishTimer);
    };
  }, []);

  if (finished) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#08111f]">
      <div className="w-[min(76vw,340px)] text-center" dir="rtl">
        <div className="mb-5 text-sm font-bold tracking-wide text-slate-300">سیستم رصد اتوبوس</div>
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-700/80"
          dir="ltr"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label="درصد بارگذاری"
        >
          <div
            className="h-full w-full rounded-full bg-cyan-400"
            style={{
              transform: `scaleX(${progress / 100})`,
              transformOrigin: 'right center',
            }}
            aria-hidden="true"
          />
        </div>
        <div className="mt-3 text-xs font-semibold tabular-nums text-slate-400">{progress}%</div>
      </div>
    </div>
  );
}
