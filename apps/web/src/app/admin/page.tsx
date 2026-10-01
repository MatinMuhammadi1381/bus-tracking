'use client';

import { useEffect, useState } from 'react';
import { getAdminAuthHeaders } from '../../lib/auth';
import { apiBase } from '../../lib/apiBase';
import { AdminStats } from './AdminStats';
import { AdminTripsTable } from './AdminTripsTable';
import { AdminDriversTable } from './AdminDriversTable';
import { AdminBusesTable } from './AdminBusesTable';
import { AdminRoutesTable } from './AdminRoutesTable';
import { AdminPassengersTable } from './AdminPassengersTable';
import { TrackingHealthPanel } from './TrackingHealthPanel';
import { AdminRouteCreateForm } from './AdminRouteCreateForm';

type Tab = 'overview' | 'trips' | 'drivers' | 'buses' | 'routes' | 'passengers' | 'health';

const tabs: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'نمای کلی' },
  { id: 'trips', label: 'سفرها' },
  { id: 'drivers', label: 'رانندگان' },
  { id: 'buses', label: 'اتوبوس‌ها' },
  { id: 'routes', label: 'مسیرها' },
  { id: 'passengers', label: 'مسافران' },
  { id: 'health', label: 'سلامت رصد' },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [routesVersion, setRoutesVersion] = useState(0);
  const [stats, setStats] = useState({
    trips: 0,
    drivers: 0,
    buses: 0,
    routes: 0,
    passengers: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    if (window.location.hash === '#routes') setActiveTab('routes');
  }, []);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem('adminToken') || '';

    async function loadStats() {
      setStatsLoading(true);
      setStatsError(null);
      try {
        const headers = getAdminAuthHeaders();
        const resources = await Promise.all(
          ['trips', 'drivers', 'buses', 'routes', 'passengers'].map(async endpoint => {
            const response = await fetch(`${apiBase}/${endpoint}?page=1&limit=1`, { headers });
            if (response.status === 401) {
              localStorage.removeItem('adminToken');
              window.location.replace('/admin/login');
              throw new Error('نشست مدیریت منقضی شده است؛ لطفاً دوباره وارد شوید.');
            }
            if (!response.ok)
              throw new Error(`دریافت آمار ${endpoint} ناموفق بود (${response.status})`);
            const body = await response.json();
            return Number(
              body.total ?? body.meta?.total ?? (Array.isArray(body) ? body.length : 0)
            );
          })
        );
        if (active) {
          setStats({
            trips: resources[0],
            drivers: resources[1],
            buses: resources[2],
            routes: resources[3],
            passengers: resources[4],
          });
        }
      } catch (requestError) {
        if (active) {
          setStatsError(
            requestError instanceof Error ? requestError.message : 'دریافت آمار انجام نشد.'
          );
        }
      } finally {
        if (active) setStatsLoading(false);
      }
    }

    void loadStats();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#dff7f8,transparent_35%),#f4f8fb]">
      <header className="mx-4 mt-6 rounded-2xl border border-white/80 bg-white/85 shadow-lg shadow-slate-900/5 backdrop-blur sm:mx-6 lg:mx-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold text-sky-600">BUS TRACKING</p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">مرکز مدیریت و پشتیبانی</h1>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            پنل عملیاتی
          </span>
        </div>
      </header>
      <main className="page-shell space-y-6">
        <div className="overflow-x-auto rounded-2xl border border-white/80 bg-white/85 p-2 shadow-lg shadow-slate-900/5 backdrop-blur">
          <nav className="flex min-w-max gap-1" aria-label="بخش‌های پنل">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${activeTab === tab.id ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20' : 'text-slate-600 hover:bg-cyan-50 hover:text-cyan-700'}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        {activeTab === 'overview' && (
          <>
            {statsError && (
              <p className="rounded-xl border border-red-400/30 bg-red-950/40 p-3 text-sm text-red-200">
                {statsError}
              </p>
            )}
            <AdminStats data={stats} loading={statsLoading} />
          </>
        )}
        {activeTab === 'trips' && <AdminTripsTable />}
        {activeTab === 'drivers' && <AdminDriversTable />}
        {activeTab === 'buses' && <AdminBusesTable />}
        {activeTab === 'routes' && (
          <>
            <AdminRouteCreateForm onCreated={() => setRoutesVersion(value => value + 1)} />
            <AdminRoutesTable key={routesVersion} />
          </>
        )}
        {activeTab === 'passengers' && <AdminPassengersTable />}
        {activeTab === 'health' && <TrackingHealthPanel />}
      </main>
    </div>
  );
}
