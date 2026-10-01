'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const hours = Array.from({ length: 24 }, (_, value) => value);
const minutes = Array.from({ length: 60 }, (_, value) => value);

function parseTime(value: string) {
  const match = value.match(/^(?:([01]?\d|2[0-3])):([0-5]\d)$/);
  return {
    hour: match ? Number(match[1]) : 8,
    minute: match ? Number(match[2]) : 0,
  };
}

export function TimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = parseTime(value);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        right: Math.max(16, window.innerWidth - rect.right),
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  function selectTime(hour: number, minute: number, close = true) {
    onChange(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    if (close) setOpen(false);
  }

  return (
    <div dir="rtl">
      <button
        type="button"
        ref={triggerRef}
        aria-label="ساعت حرکت"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className="flex h-[42px] w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 text-right text-sm font-semibold text-slate-100 outline-none transition hover:border-cyan-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
      >
        <span>{value || 'انتخاب ساعت'}</span>
        <span className="text-cyan-300" aria-hidden="true">
          ◷
        </span>
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed z-[2147483647] w-[min(19rem,calc(100vw-2rem))] rounded-xl border border-slate-700 bg-slate-900 p-3 text-slate-100 shadow-2xl shadow-slate-950/40"
            style={{ top: position.top, right: position.right }}
          >
            <div className="mb-2 text-center text-xs font-bold text-cyan-300">انتخاب ساعت</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-center text-[10px] text-slate-400">ساعت</p>
                <div className="h-44 snap-y snap-mandatory overflow-y-auto rounded-lg border border-slate-700 bg-slate-950/60 p-1 [scrollbar-width:thin]">
                  {hours.map(hour => (
                    <button
                      type="button"
                      key={hour}
                      onClick={() => selectTime(hour, selected.minute, false)}
                      className={`block h-9 w-full snap-center rounded-md text-sm transition ${
                        selected.hour === hour
                          ? 'bg-cyan-500 font-bold text-slate-950'
                          : 'text-slate-200 hover:bg-slate-800 hover:text-cyan-200'
                      }`}
                    >
                      {String(hour).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-center text-[10px] text-slate-400">دقیقه</p>
                <div className="h-44 snap-y snap-mandatory overflow-y-auto rounded-lg border border-slate-700 bg-slate-950/60 p-1 [scrollbar-width:thin]">
                  {minutes.map(minute => (
                    <button
                      type="button"
                      key={minute}
                      onClick={() => selectTime(selected.hour, minute)}
                      className={`block h-9 w-full snap-center rounded-md text-sm transition ${
                        selected.minute === minute
                          ? 'bg-cyan-500 font-bold text-slate-950'
                          : 'text-slate-200 hover:bg-slate-800 hover:text-cyan-200'
                      }`}
                    >
                      {String(minute).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="mt-3 w-full rounded-lg border border-slate-700 py-1.5 text-xs text-slate-400 hover:border-red-400 hover:text-red-300"
              >
                پاک کردن ساعت
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
