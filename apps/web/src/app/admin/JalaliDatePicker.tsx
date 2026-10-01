'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export const jalaliMonths = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

const years = Array.from({ length: 11 }, (_, index) => 1400 + index);

function daysInMonth(month: number) {
  return month <= 6 ? 31 : month <= 11 ? 30 : 30;
}

function parseDate(value: string) {
  const [year, month, day] = value.split('/').map(Number);
  return {
    year: years.includes(year) ? year : 1405,
    month: month >= 1 && month <= 12 ? month : 6,
    day: day >= 1 && day <= 31 ? day : 1,
  };
}

export function JalaliDatePicker({
  value,
  onChange,
  ariaLabel = 'تاریخ حرکت',
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}) {
  const initial = parseDate(value);
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const selected = value ? parseDate(value) : null;
  const dayCount = daysInMonth(month);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      setMenuPosition({
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

  function shiftMonth(amount: number) {
    const nextIndex = (year - 1400) * 12 + month - 1 + amount;
    const boundedIndex = Math.max(0, Math.min(years.length * 12 - 1, nextIndex));
    setYear(1400 + Math.floor(boundedIndex / 12));
    setMonth((boundedIndex % 12) + 1);
  }

  function selectDay(day: number) {
    onChange(`${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`);
    setOpen(false);
  }

  return (
    <div className={`relative ${open ? 'z-[9999]' : 'z-0'}`} dir="rtl">
      <button
        type="button"
        aria-label={ariaLabel}
        ref={triggerRef}
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className="flex h-[42px] w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 text-right text-sm font-semibold text-slate-100 outline-none transition hover:border-cyan-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
      >
        <span>{value || 'انتخاب تاریخ'}</span>
        <span className="text-cyan-300" aria-hidden="true">
          ▣
        </span>
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed z-[2147483647] w-[min(19rem,calc(100vw-2rem))] rounded-xl border border-slate-700 bg-slate-900 p-3 text-slate-100 shadow-2xl shadow-slate-950/40"
            style={{ top: menuPosition.top, right: menuPosition.right }}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="rounded-lg px-2 py-1 text-lg text-cyan-300 hover:bg-slate-800"
                aria-label="ماه بعد"
              >
                ‹
              </button>
              <div className="flex flex-1 gap-1.5">
                <select
                  value={month}
                  onChange={event => setMonth(Number(event.target.value))}
                  className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100"
                  aria-label="ماه"
                >
                  {jalaliMonths.map((name, index) => (
                    <option key={name} value={index + 1}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={event => setYear(Number(event.target.value))}
                  className="w-20 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100"
                  aria-label="سال"
                >
                  {years.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="rounded-lg px-2 py-1 text-lg text-cyan-300 hover:bg-slate-800"
                aria-label="ماه قبل"
              >
                ›
              </button>
            </div>
            <div className="mb-1 grid grid-cols-7 text-center text-[10px] text-slate-400">
              {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(day => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: dayCount }, (_, index) => {
                const day = index + 1;
                const isSelected =
                  selected?.year === year && selected.month === month && selected.day === day;
                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => selectDay(day)}
                    className={`rounded-md py-1.5 text-xs transition ${
                      isSelected
                        ? 'bg-cyan-500 font-bold text-slate-950'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-cyan-200'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
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
                پاک کردن تاریخ
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
