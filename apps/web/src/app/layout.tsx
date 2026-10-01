import type { Metadata } from 'next';
import './globals.css';
import { AppVersion } from '../components/AppVersion';
import { AppLoadingScreen } from '../components/AppLoadingScreen';

export const metadata: Metadata = {
  title: 'سیستم رصد اتوبوس',
  description: 'پلتفرم رصد و مدیریت سفرهای اتوبوس',
  metadataBase: new URL('http://localhost:3001'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
      </head>
      <body className="flex min-h-screen flex-col overflow-x-hidden bg-gray-50 antialiased dark:bg-gray-900">
        <AppLoadingScreen />
        <div className="flex min-h-screen flex-1 flex-col">{children}</div>
        <AppVersion />
      </body>
    </html>
  );
}
