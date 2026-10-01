import { AdminResourceTable } from './AdminResourceTable';

export function TrackingHealthPanel() {
  return (
    <AdminResourceTable
      title="سلامت رصد و دستگاه‌ها"
      endpoint="device-health/latest/all"
      searchPlaceholder="جستجو بر اساس نام یا شماره راننده"
      columns={[
        ['driverName', 'راننده'],
        ['driverPhone', 'شماره تماس'],
        ['gpsStatus', 'GPS'],
        ['connectivityStatus', 'اتصال'],
        ['trackingStatus', 'رصد'],
        ['batteryLevel', 'باتری'],
        ['observedAt', 'آخرین مشاهده'],
      ]}
    />
  );
}
