import { AdminResourceTable } from './AdminResourceTable';
import { AdminTripCreateForm } from './AdminTripCreateForm';

export function AdminTripsTable() {
  return (
    <div className="space-y-6">
      <AdminTripCreateForm />
      <AdminResourceTable
        title="مدیریت سفرها"
        endpoint="trips"
        searchPlaceholder="جستجو بر اساس مبدا، مقصد یا شناسه"
        statusOptions={[
          ['ASSIGNED', 'اختصاص داده‌شده'],
          ['PENDING_DRIVER_CONFIRMATION', 'در انتظار تأیید رانندگان'],
          ['IN_PROGRESS', 'در حال اجرا'],
          ['READY', 'آماده'],
          ['COMPLETED', 'تکمیل‌شده'],
          ['CANCELLED', 'لغوشده'],
        ]}
        columns={[
          ['id', 'شناسه'],
          ['route.origin', 'مبدا'],
          ['route.destination', 'مقصد'],
          ['departureDate', 'تاریخ حرکت'],
          ['departureTime', 'ساعت حرکت'],
          ['status', 'وضعیت'],
          ['driverConfirmationStatus', 'تایید رانندگان'],
          ['createdAt', 'تاریخ ایجاد'],
        ]}
        allowDelete
        showTripLink
        compact
      />
    </div>
  );
}
