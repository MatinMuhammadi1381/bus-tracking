import { useState } from 'react';

interface NextDriver {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface DriverHandoverScreenProps {
  currentDriverName: string;
  nextDriver: NextDriver;
  onConfirmHandover: () => Promise<void>;
  onCancel: () => void;
}

export function DriverHandoverScreen({
  currentDriverName,
  nextDriver,
  onConfirmHandover,
  onCancel,
}: DriverHandoverScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState(false);
  const [step, setStep] = useState<'confirm' | 'complete'>('confirm');

  const handleConfirm = async () => {
    setConfirmation(true);
    setError('');
    setLoading(true);

    try {
      await onConfirmHandover();
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در تحویل سفر');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    onCancel();
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🔄</div>
          <h2 className="text-2xl font-bold text-gray-900">تحویل سفر به راننده دیگر</h2>
          <p className="text-gray-500 mt-1">ایمن و امن</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-gray-500">راننده فعلی</p>
              <p className="font-medium text-gray-900">{currentDriverName}</p>
            </div>
            <div className="bg-primary-50 rounded-lg p-3">
              <p className="text-xs text-primary-700">راننده بعدی</p>
              <p className="font-medium text-primary-900">
                {nextDriver.firstName} {nextDriver.lastName}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">اطلاعات راننده بعدی:</h3>
          <div className="space-y-1 text-sm text-blue-700">
            <p>
              نام: {nextDriver.firstName} {nextDriver.lastName}
            </p>
            <p>تلفن: {nextDriver.phone}</p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">⚠️ نکات مهم:</h3>
          <ul className="space-y-1 text-sm text-yellow-700">
            <li>• اطمینان حاصل کنید که راننده بعدی حاضر و آماده است</li>
            <li>• کلید اتوبوس و مدارک را تحویل دهید</li>
            <li>• وضعیت مسافران و مسیر را تشریح کنید</li>
            <li>• پس از تحویل، رصد موقعیت به راننده جدید منتقل می‌شود</li>
          </ul>
        </div>

        {step === 'confirm' && (
          <>
            <div className="space-y-3">
              <label className="flex items-center space-x-2 rtl:space-x-reverse">
                <input
                  type="checkbox"
                  checked={confirmation}
                  onChange={e => setConfirmation(e.target.checked)}
                  className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  required
                />
                <span className="text-sm text-gray-700">
                  تایید می‌کنم که راننده بعدی حاضر شده و اطلاعات را تحویل داده‌ام
                </span>
              </label>
            </div>

            {error && <p className="text-red-600 text-sm text-center">{error}</p>}

            <div className="flex space-x-3 rtl:space-x-reverse pt-2">
              <button
                onClick={onCancel}
                disabled={loading}
                className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-400 disabled:opacity-50 transition-colors"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading || !confirmation}
                className="flex-1 bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'در حال تحویل...' : 'تایید و تحویل سفر'}
              </button>
            </div>
          </>
        )}

        {step === 'complete' && (
          <div className="text-center space-y-4">
            <div className="text-6xl">✅</div>
            <h3 className="text-2xl font-bold text-green-700">تحویل سفر با موفقیت انجام شد</h3>
            <p className="text-gray-600">
              سفر به راننده {nextDriver.firstName} {nextDriver.lastName} تحویل داده شد
            </p>
            <button
              onClick={handleComplete}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              بازگشت به صفحه اصلی
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
