import { useState } from 'react';

interface OccupiedSeat {
  seatNumber: number;
  gender?: 'UNKNOWN' | 'MALE' | 'FEMALE';
}

interface PassengerConfirmationScreenProps {
  expectedCount: number;
  seatCount: number;
  occupiedSeats: OccupiedSeat[];
  onConfirm: (count: number) => Promise<void>;
  onBeforeContinue: () => Promise<boolean>;
}

const seatRows25 = [
  [3, 2, 1],
  [6, 5, 4],
  [9, 8, 7],
  [12, 11, 10],
  [13],
  [16, 15, 14],
  [19, 18, 17],
  [22, 21, 20],
  [25, 24, 23],
];
const seatRows26 = [
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
];

export function PassengerConfirmationScreen({
  expectedCount,
  seatCount,
  occupiedSeats,
  onConfirm,
  onBeforeContinue,
}: PassengerConfirmationScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const rows = seatCount === 26 ? seatRows26 : seatRows25;
  const occupied = new Map(
    occupiedSeats.map(seat => [
      seat.seatNumber,
      (seat.gender || 'UNKNOWN').toUpperCase() as 'UNKNOWN' | 'MALE' | 'FEMALE',
    ])
  );
  const registeredCount = occupiedSeats.length;

  const handleConfirm = async () => {
    setError('');
    setLoading(true);
    try {
      if (!(await onBeforeContinue())) return;
      await onConfirm(registeredCount);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ثبت تأیید');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">تأیید مسافران و صندلی‌ها</h2>
        <div className="mb-5 grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">تعداد ثبت‌شده</p>
            <p className="text-3xl font-bold text-gray-900">{registeredCount} نفر</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">ظرفیت پیش‌بینی‌شده</p>
            <p className="text-3xl font-bold text-gray-900">{expectedCount} نفر</p>
          </div>
        </div>
        <div
          dir="ltr"
          className="mx-auto grid max-w-md grid-cols-4 gap-2 rounded-2xl border-2 border-slate-700 bg-[#111f33] p-4"
        >
          {rows.flatMap((row, rowIndex) =>
            row.map((seatNumber, seatIndex) => {
              const gender = occupied.get(seatNumber);
              const column = row.length === 1 ? 1 : [1, 3, 4][seatIndex];
              return (
                <div
                  key={seatNumber}
                  data-seat-gender={gender || 'EMPTY'}
                  style={{
                    gridColumn: column,
                    gridRow: rowIndex + 1,
                    backgroundColor:
                      gender === 'MALE'
                        ? '#2563eb'
                        : gender === 'FEMALE'
                          ? '#db2777'
                          : gender === 'UNKNOWN'
                            ? '#475569'
                            : '#1e293b',
                    borderColor:
                      gender === 'MALE' ? '#93c5fd' : gender === 'FEMALE' ? '#f9a8d4' : '#64748b',
                    color: '#ffffff',
                  }}
                  className={`flex min-h-12 flex-col items-center justify-center rounded-lg border-2 text-sm font-bold ${
                    gender === 'MALE'
                      ? 'border-blue-300'
                      : gender === 'FEMALE'
                        ? 'border-pink-300'
                        : gender === 'UNKNOWN'
                          ? 'border-slate-500'
                          : 'border-slate-500'
                  }`}
                >
                  <span>{seatNumber}</span>
                  <span className="text-[10px]">{gender ? 'پر' : 'خالی'}</span>
                </div>
              );
            })
          )}
        </div>
        <div className="mt-3 flex justify-center gap-3 text-xs text-slate-600">
          <span>🔵 مرد</span>
          <span>🩷 زن</span>
          <span>⚪ خالی</span>
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={loading || success}
          className="mt-5 w-full rounded-lg bg-primary-600 px-4 py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'در حال ثبت...' : success ? '✅ تأیید ثبت شد' : 'تأیید'}
        </button>
      </div>
    </div>
  );
}
