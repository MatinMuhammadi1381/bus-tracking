import { AdminResourceTable } from './AdminResourceTable';
import { AdminCreateForm } from './AdminCreateForm';

export function AdminDriversTable() {
  return (
    <div className="space-y-6">
      <AdminCreateForm
        title="ثبت راننده جدید"
        endpoint="drivers"
        fields={[
          { name: 'firstName', label: 'نام' },
          { name: 'lastName', label: 'نام خانوادگی' },
          { name: 'phone', label: 'شماره تماس', type: 'tel', placeholder: '+989123456789' },
          { name: 'password', label: 'رمز عبور', type: 'password' },
          { name: 'photo', label: 'عکس پروفایل', type: 'file', required: false },
        ]}
      />
      <AdminResourceTable
        title="مدیریت رانندگان"
        endpoint="drivers"
        searchPlaceholder="جستجو بر اساس نام یا شماره تماس"
        statusOptions={[
          ['ACTIVE', 'فعال'],
          ['INACTIVE', 'غیرفعال'],
          ['SUSPENDED', 'معلق'],
        ]}
        columns={[
          ['firstName', 'نام'],
          ['lastName', 'نام خانوادگی'],
          ['phone', 'شماره تماس'],
          ['passwordPreview', 'رمز عبور'],
          ['status', 'وضعیت'],
        ]}
        allowDelete
        allowPhotoUpload
        passwordFieldName="password"
        editFields={[
          { name: 'firstName', label: 'نام' },
          { name: 'lastName', label: 'نام خانوادگی' },
          { name: 'phone', label: 'شماره تماس', type: 'tel' },
          { name: 'password', label: 'رمز عبور جدید', type: 'password' },
        ]}
      />
    </div>
  );
}
