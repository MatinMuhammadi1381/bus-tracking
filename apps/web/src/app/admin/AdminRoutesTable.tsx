import { AdminResourceTable } from './AdminResourceTable';

export function AdminRoutesTable() {
  return (
    <AdminResourceTable
      title="مدیریت مسیرها"
      endpoint="routes"
      searchPlaceholder="جستجو بر اساس مبدا یا مقصد"
      allowDelete
      columns={[
        ['origin', 'مبدا'],
        ['destination', 'مقصد'],
        ['totalDistanceKm', 'مسافت (km)'],
        ['estimatedDurationMinutes', 'مدت (دقیقه)'],
      ]}
    />
  );
}
