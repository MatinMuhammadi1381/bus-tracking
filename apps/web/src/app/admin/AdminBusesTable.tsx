import { AdminResourceTable } from './AdminResourceTable';
import { AdminCreateForm } from './AdminCreateForm';

export function AdminBusesTable() {
  return (
    <div className="space-y-6">
      <AdminCreateForm
        title="ثبت اتوبوس جدید"
        endpoint="buses"
        fields={[
          { name: 'displayName', label: 'نام نمایشی' },
          { name: 'plateNumber', label: 'شماره پلاک' },
          { name: 'busCode', label: 'کد اتوبوس', required: false },
          { name: 'model', label: 'مدل', required: false },
          { name: 'manufactureYear', label: 'سال ساخت', type: 'number', required: false },
          { name: 'color', label: 'رنگ', required: false },
          { name: 'fleetNumber', label: 'شماره ناوگان', required: false },
          { name: 'seatCount', label: 'تعداد صندلی', type: 'number' },
        ]}
      />
      <AdminResourceTable
        title="مدیریت اتوبوس‌ها"
        endpoint="buses"
        searchPlaceholder="جستجو بر اساس پلاک یا کد اتوبوس"
        statusOptions={[
          ['ACTIVE', 'فعال'],
          ['MAINTENANCE', 'در تعمیر'],
          ['RETIRED', 'خارج از سرویس'],
        ]}
        columns={[
          ['displayName', 'نام'],
          ['plateNumber', 'پلاک'],
          ['busCode', 'کد اتوبوس'],
          ['status', 'وضعیت'],
        ]}
        allowDelete
        editFields={[
          { name: 'displayName', label: 'نام نمایشی' },
          { name: 'plateNumber', label: 'شماره پلاک' },
          { name: 'busCode', label: 'کد اتوبوس' },
          { name: 'model', label: 'مدل' },
          { name: 'manufactureYear', label: 'سال ساخت', type: 'number' },
          { name: 'color', label: 'رنگ' },
          { name: 'fleetNumber', label: 'شماره ناوگان' },
          { name: 'seatCount', label: 'تعداد صندلی', type: 'number' },
        ]}
      />
    </div>
  );
}
