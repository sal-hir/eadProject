import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock3,
  Package,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  AlertCircle,
  BarChart3,
  Truck,
  PieChart,
  ShieldCheck,
  Zap,
  Download,
  Search,
  X,
} from 'lucide-react';
import { analyticsApi } from '../../api/adminApi';

// ============================================
// CONSTANTS & HELPERS
// ============================================

const formatNumber = (value) => Number(value || 0).toLocaleString();
const formatPercentage = (value) => `${Number(value || 0).toFixed(1)}%`;

const getPayload = (response) => {
  let data = response?.data ?? response;
  if (data?.data !== undefined) {
    data = data.data;
  }
  return data;
};

const getArray = (response, keys = []) => {
  const data = getPayload(response);
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }
  return [];
};

const getDailyCount = (item) =>
  Number(item.count ?? item.total ?? item.totalDeliveries ?? 0);

const getDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultDates = () => {
  const today = new Date();
  const from = new Date();
  from.setDate(today.getDate() - 6);
  return {
    from: getDateString(from),
    to: getDateString(today),
  };
};

const STATUS_COLORS = {
  DELIVERED: '#16A34A',
  SUCCESSFUL: '#16A34A',
  COMPLETED: '#16A34A',
  FAILED: '#DC2626',
  CANCELLED: '#94A3B8',
  PENDING: '#F59E0B',
  PROCESSING: '#1D4ED8',
  ASSIGNED: '#4F46E5',
  IN_TRANSIT: '#0284C7',
};

const getStatusColor = (status) => {
  const key = String(status || '').toUpperCase().replace(/\s+/g, '_');
  return STATUS_COLORS[key] || '#64748B';
};

// ============================================
// REUSABLE UI COMPONENTS
// ============================================

function StatCard({ title, value, subtitle, badge, icon: Icon }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50 via-sky-50/90 to-blue-100/60 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md hover:shadow-blue-900/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-wider text-blue-900/70">
            {title}
          </p>
          <p className="mt-2.5 text-2xl font-extrabold tracking-tight text-blue-950 tabular-nums sm:text-3xl">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/90 text-blue-700 shadow-sm ring-1 ring-blue-200/80 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
          <Icon size={22} />
        </div>
      </div>

      {(subtitle || badge) && (
        <div className="mt-4 flex items-center justify-between border-t border-blue-200/60 pt-3 text-xs">
          <span className="font-medium text-blue-900/65">{subtitle}</span>
          {badge}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export const AdminAnalytics = () => {
  const defaultDates = useMemo(() => getDefaultDates(), []);

  const [overview, setOverview] = useState({});
  const [dailyDeliveries, setDailyDeliveries] = useState([]);
  const [deliveryStatuses, setDeliveryStatuses] = useState([]);

  const [fromDate, setFromDate] = useState(defaultDates.from);
  const [toDate, setToDate] = useState(defaultDates.to);
  const [tableSearch, setTableSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadAnalytics = useCallback(
    async (isRefresh = false) => {
      if (fromDate > toDate) {
        setError('Start date cannot be after end date.');
        return;
      }

      try {
        setError('');
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const [overviewResponse, dailyResponse, statusResponse] = await Promise.all([
          analyticsApi.getOverview(),
          analyticsApi.getDailyDeliveries(fromDate, toDate),
          analyticsApi.getDeliveryStatus(),
        ]);

        setOverview(getPayload(overviewResponse) || {});
        setDailyDeliveries(getArray(dailyResponse, ['items', 'deliveries', 'dailyDeliveries']));
        setDeliveryStatuses(getArray(statusResponse, ['items', 'statuses', 'deliveryStatuses']));
      } catch (err) {
        console.error('Analytics error:', err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Unable to load analytics. Please check your network connection.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fromDate, toDate]
  );

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const total = Number(overview.total ?? overview.totalDeliveries ?? 0);
  const successful = Number(
    overview.successful ?? overview.completed ?? overview.successfulDeliveries ?? 0
  );
  const failed = Number(overview.failed ?? overview.failedDeliveries ?? 0);
  const pending = Number(
    overview.pending ?? overview.pendingDeliveries ?? Math.max(0, total - successful - failed)
  );

  const successRate =
    overview.successRate !== undefined
      ? Number(overview.successRate)
      : total > 0
      ? (successful / total) * 100
      : 0;

  const failureRate =
    overview.failureRate !== undefined
      ? Number(overview.failureRate)
      : total > 0
      ? (failed / total) * 100
      : 0;

  const maxDailyCount = Math.max(1, ...dailyDeliveries.map(getDailyCount));
  const totalDailyVolume = dailyDeliveries.reduce((sum, item) => sum + getDailyCount(item), 0);
  const averageDailyVolume =
    dailyDeliveries.length > 0 ? (totalDailyVolume / dailyDeliveries.length).toFixed(1) : '0.0';

  const exportCSV = () => {
    const rows = [
      ['Date', 'Deliveries'],
      ...dailyDeliveries.map((item) => [item.date || item.day || '', getDailyCount(item)]),
    ];

    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `delivery-analytics-${fromDate}-to-${toDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const filteredDailyRecords = useMemo(() => {
    if (!tableSearch.trim()) return dailyDeliveries;
    return dailyDeliveries.filter((d) =>
      (d.date || d.day || '').toLowerCase().includes(tableSearch.toLowerCase())
    );
  }, [dailyDeliveries, tableSearch]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
        <RefreshCw size={32} className="mb-3 animate-spin text-blue-900" />
        <h3 className="text-base font-bold text-blue-950">Loading Delivery Analytics</h3>
        <p className="mt-1 text-xs text-slate-500">Preparing performance and dispatch metrics...</p>
      </div>
    );
  }

  return (
    <section className="space-y-6 pb-12">
      {/* HEADER — DARK BLUE ICON & TITLE + EXPORT CSV */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-900 text-white shadow-md shadow-blue-900/20">
            <BarChart3 size={24} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-blue-950 sm:text-3xl">
            Delivery Analytics
          </h1>
        </div>

        <button
          type="button"
          onClick={exportCSV}
          disabled={!dailyDeliveries.length}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-all duration-200 hover:bg-blue-800 hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
        >
          <Download size={17} strokeWidth={2.25} />
          Export CSV
        </button>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadAnalytics(true)}
            className="rounded-lg border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
          >
            Retry
          </button>
        </div>
      )}

      {/* DATE RANGE FILTER BAR */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-950">
            <CalendarDays size={16} className="text-blue-800" />
            <span>Reporting Date Range</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-500">From:</span>
              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-500">To:</span>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <button
              type="button"
              onClick={() => loadAnalytics(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Applying...' : 'Apply Range'}
            </button>
          </div>
        </div>
      </div>

      {/* LIGHT-BLUE KPI CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Deliveries"
          value={formatNumber(total)}
          subtitle="Recorded in history"
          icon={Package}
        />

        <StatCard
          title="Successful"
          value={formatNumber(successful)}
          subtitle="Success ratio"
          icon={CheckCircle2}
          badge={
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/80 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
              <TrendingUp size={11} />
              {formatPercentage(successRate)}
            </span>
          }
        />

        <StatCard
          title="Failed"
          value={formatNumber(failed)}
          subtitle="Failure ratio"
          icon={XCircle}
          badge={
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100/80 px-2 py-0.5 text-[11px] font-bold text-rose-800">
              <TrendingDown size={11} />
              {formatPercentage(failureRate)}
            </span>
          }
        />

        <StatCard
          title="Pending"
          value={formatNumber(pending)}
          subtitle="Assigned or in transit"
          icon={Clock3}
        />
      </div>

      {/* PERFORMANCE RATIO BARS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600">
                <TrendingUp size={16} />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Fulfillment Success Rate
              </h3>
            </div>
            <span className="text-base font-extrabold text-emerald-600 tabular-nums">
              {formatPercentage(successRate)}
            </span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, successRate))}%` }}
            />
          </div>
          <p className="mt-2.5 text-xs text-slate-500">
            {formatNumber(successful)} of {formatNumber(total)} deliveries fulfilled safely
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-rose-50 p-1.5 text-rose-600">
                <TrendingDown size={16} />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Delivery Failure Rate
              </h3>
            </div>
            <span className="text-base font-extrabold text-rose-600 tabular-nums">
              {formatPercentage(failureRate)}
            </span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-rose-500 transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, failureRate))}%` }}
            />
          </div>
          <p className="mt-2.5 text-xs text-slate-500">
            {formatNumber(failed)} of {formatNumber(total)} issues requiring exception handling
          </p>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Daily Trend Chart */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-50 p-1.5 text-blue-800">
                  <Activity size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Daily Deliveries Trend
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Parcel volume dispatched across the selected date range
              </p>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2 text-xs font-semibold">
              <div>
                <span className="font-normal text-slate-400">Total: </span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {formatNumber(totalDailyVolume)}
                </span>
              </div>
              <div className="h-3.5 w-px bg-slate-200" />
              <div>
                <span className="font-normal text-slate-400">Daily Avg: </span>
                <span className="font-bold text-blue-800 tabular-nums">{averageDailyVolume}</span>
              </div>
            </div>
          </div>

          {dailyDeliveries.length === 0 ? (
            <div className="flex h-60 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center">
              <BarChart3 size={32} className="mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No daily data found</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Try adjusting the reporting date range above.
              </p>
            </div>
          ) : (
            <div className="flex h-64 items-end justify-between gap-2 pt-6">
              {dailyDeliveries.map((item, idx) => {
                const count = getDailyCount(item);
                const heightPct = Math.max(5, (count / maxDailyCount) * 100);
                const dateLabel = item.date
                  ? new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })
                  : item.day || `D${idx + 1}`;

                return (
                  <div
                    key={idx}
                    className="group flex h-full flex-1 flex-col items-center justify-end"
                  >
                    <span className="mb-1 text-[10px] font-bold text-blue-900 opacity-0 transition-opacity group-hover:opacity-100">
                      {formatNumber(count)}
                    </span>
                    <div className="flex h-44 w-full max-w-[44px] items-end overflow-hidden rounded-xl bg-slate-100">
                      <div
                        className="w-full rounded-xl bg-blue-900 shadow-sm transition-all duration-300 group-hover:bg-blue-700"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="mt-2 max-w-[54px] truncate text-[11px] font-semibold text-slate-500">
                      {dateLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status Distribution Donut */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <div className="rounded-lg bg-blue-50 p-1.5 text-blue-800">
                <PieChart size={18} />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Status Distribution
              </h3>
            </div>
            <p className="mb-4 text-xs text-slate-500">
              Breakdown by delivery lifecycle state
            </p>

            {deliveryStatuses.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center">
                <Package size={32} className="mb-2 text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">No status metrics</p>
              </div>
            ) : (
              <AnalyticsStatusDonut statuses={deliveryStatuses} total={total} />
            )}
          </div>
        </div>
      </div>

      {/* OPERATIONAL INSIGHTS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
            <Zap size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Daily Average Velocity</p>
            <p className="mt-0.5 text-base font-extrabold text-slate-900">
              {averageDailyVolume} packages / day
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Fleet Operations Health</p>
            <p className="mt-0.5 text-base font-extrabold text-emerald-600">
              {successRate >= 90
                ? 'Optimal Performance'
                : successRate >= 75
                ? 'Stable Fulfillment'
                : 'Action Required'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Truck size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Active Analytics Scope</p>
            <p className="mt-0.5 text-sm font-extrabold text-slate-900">
              {fromDate} → {toDate}
            </p>
          </div>
        </div>
      </div>

      {/* DAILY DELIVERY SUMMARY TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Daily Delivery Summary{' '}
              <span className="ml-1.5 font-medium text-slate-400">
                ({filteredDailyRecords.length})
              </span>
            </h2>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Filter by date..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
            {tableSearch && (
              <button
                type="button"
                onClick={() => setTableSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {filteredDailyRecords.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No delivery records found matching your date search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Deliveries Count</th>
                  <th className="px-6 py-3.5">Activity Share</th>
                  <th className="px-6 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDailyRecords.map((item, index) => {
                  const count = getDailyCount(item);
                  const pct = (count / maxDailyCount) * 100;
                  return (
                    <tr
                      key={item.date || index}
                      className="transition-colors hover:bg-blue-50/40"
                    >
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">
                        {item.date || item.day || '—'}
                      </td>
                      <td className="px-6 py-4 font-mono text-sm font-bold text-blue-800">
                        {formatNumber(count)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex max-w-xs items-center gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-blue-900"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-9 text-right text-[11px] font-semibold text-slate-500 tabular-nums">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/80">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Recorded
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

// ========================================
// STATUS DONUT FOR ANALYTICS
// ========================================
function AnalyticsStatusDonut({ statuses = [], total = 0 }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;

  const validStatuses = statuses
    .map((s) => {
      const count = Number(s.count ?? s.total ?? 0);
      const pct =
        s.percentage !== undefined
          ? Number(s.percentage)
          : total > 0
          ? (count / total) * 100
          : 0;
      const color = getStatusColor(s.status);
      const offset = accumulated;
      accumulated += (pct / 100) * circumference;
      return {
        ...s,
        count,
        pct,
        color,
        offset,
      };
    })
    .filter((s) => s.pct > 0 || s.count > 0);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth="14"
          />
          {validStatuses.map((item, idx) => {
            const length = (item.pct / 100) * circumference;
            return (
              <circle
                key={idx}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="14"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-item.offset}
                strokeLinecap="butt"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-extrabold leading-none text-slate-900">
            {formatNumber(total)}
          </span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Deliveries
          </span>
        </div>
      </div>

      <div className="w-full space-y-2 border-t border-slate-100 pt-2">
        {validStatuses.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium text-slate-700">
                {String(item.status || 'Unknown').replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-center gap-2 font-semibold">
              <span className="text-slate-900">{formatNumber(item.count)}</span>
              <span className="text-[11px] text-slate-400">
                ({formatPercentage(item.pct)})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminAnalytics;