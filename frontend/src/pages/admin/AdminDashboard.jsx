import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  MapPin,
  DollarSign,
  Users,
  Store,
  BarChart3,
  ChevronRight,
  Truck,
  CalendarDays,
  X,
  Check,
  Send,
  Copy,
  Zap,
  ShieldCheck,
  Download,
  PieChart,
  AlertCircle,
  Navigation,
} from 'lucide-react';

import { api } from '../../api/client';
import { analyticsApi, zoneApi, pricingApi } from '../../api/adminApi';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/ui';
import {DispatcherDashboard} from '../dispatcher/DispatcherDashboard'
// ============================================
// HELPERS
// ============================================

const formatNumber = (value) => Number(value || 0).toLocaleString();

const formatPercentage = (value) => `${Number(value || 0).toFixed(1)}%`;

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

const getPayload = (response) => {
  let data = response?.data ?? response;

  if (data?.data !== undefined) {
    data = data.data;
  }

  return data;
};

const getArray = (response, keys = []) => {
  const data = getPayload(response);

  if (Array.isArray(data)) {
    return data;
  }

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  return [];
};

const getDailyCount = (item) =>
  Number(item.totalDeliveries ?? item.count ?? item.total ?? 0);

const STATUS_COLORS = {
  DELIVERED: '#16A34A',
  SUCCESSFUL: '#16A34A',
  COMPLETED: '#16A34A',
  IN_TRANSIT: '#2563EB',
  PENDING: '#F59E0B',
  ASSIGNED: '#6366F1',
  PROCESSING: '#1D4ED8',
  FAILED: '#DC2626',
  CANCELLED: '#94A3B8',
};

const getStatusColor = (status) => {
  const key = String(status || '')
    .toUpperCase()
    .replace(/\s+/g, '_');

  return STATUS_COLORS[key] || '#64748B';
};

// ============================================
// MAIN ADMIN DASHBOARD
// ============================================

export const AdminDashboard = () => {
  const defaultDates = useMemo(() => getDefaultDates(), []);

  // General dashboard states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [parcelFilter, setParcelFilter] = useState('ALL');
  const [copiedTracking, setCopiedTracking] = useState('');

  // Analytics states
  const [overview, setOverview] = useState({});
  const [dailyDeliveries, setDailyDeliveries] = useState([]);
  const [deliveryStatuses, setDeliveryStatuses] = useState([]);

  const [fromDate, setFromDate] = useState(defaultDates.from);
  const [toDate, setToDate] = useState(defaultDates.to);
  const [tableSearch, setTableSearch] = useState('');
  const [analyticsError, setAnalyticsError] = useState('');

  // Other dashboard data
  const [zones, setZones] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);
  const [recentParcels, setRecentParcels] = useState([]);
  const [couriers, setCouriers] = useState([]);

  // Assignment modal states
  const [assigningParcel, setAssigningParcel] = useState(null);
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState('');
  const [assignError, setAssignError] = useState('');

  // Current date
  const formattedToday = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    []
  );

  // ============================================
  // FETCH DASHBOARD + ANALYTICS DATA
  // ============================================

  const fetchDashboardData = useCallback(
    async (isRefresh = false) => {
      if (fromDate > toDate) {
        setAnalyticsError('Start date cannot be after end date.');
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setAnalyticsError('');

      try {
        const results = await Promise.allSettled([
          analyticsApi.getOverview(),
          analyticsApi.getDailyDeliveries(fromDate, toDate),
          analyticsApi.getDeliveryStatus(),
          zoneApi.getAll(),
          pricingApi.getAll(),
          api.get('/parcels', { params: { limit: 10 } }),
          api.get('/couriers'),
        ]);

        if (results[0].status === 'fulfilled') {
          setOverview(getPayload(results[0].value) || {});
        } else {
          setOverview({});
          setAnalyticsError('Unable to load delivery overview.');
        }

        if (results[1].status === 'fulfilled') {
          setDailyDeliveries(
            getArray(results[1].value, [
              'items',
              'deliveries',
              'dailyDeliveries',
            ])
          );
        } else {
          setDailyDeliveries([]);
          setAnalyticsError(
            (previous) =>
              previous || 'Unable to load daily delivery analytics.'
          );
        }

        if (results[2].status === 'fulfilled') {
          setDeliveryStatuses(
            getArray(results[2].value, [
              'items',
              'statuses',
              'deliveryStatuses',
            ])
          );
        } else {
          setDeliveryStatuses([]);
        }

        if (results[3].status === 'fulfilled') {
          setZones(getArray(results[3].value, ['content', 'zones', 'items']));
        } else {
          setZones([]);
        }

        if (results[4].status === 'fulfilled') {
          setPricingRules(
            getArray(results[4].value, ['content', 'items', 'pricingRules'])
          );
        } else {
          setPricingRules([]);
        }

        if (results[5].status === 'fulfilled') {
          setRecentParcels(
            getArray(results[5].value, ['parcels', 'content', 'items'])
          );
        } else {
          setRecentParcels([]);
        }

        if (results[6].status === 'fulfilled') {
          setCouriers(
            getArray(results[6].value, ['couriers', 'content', 'items'])
          );
        } else {
          setCouriers([]);
        }
      } catch (error) {
        console.error('Dashboard loading error:', error);
        setAnalyticsError(
          error?.response?.data?.message ||
            error?.message ||
            'Unable to load dashboard data.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fromDate, toDate]
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ============================================
  // ANALYTICS VALUES
  // ============================================

  const totalParcels = Number(
    overview?.totalDeliveries ?? overview?.total ?? recentParcels.length ?? 0
  );

  const deliveredParcels = Number(
    overview?.successfulDeliveries ??
      overview?.successful ??
      overview?.completed ??
      0
  );

  const failedParcels = Number(
    overview?.failedDeliveries ?? overview?.failed ?? 0
  );

  const pendingParcels = Number(
    overview?.pendingDeliveries ??
      overview?.pending ??
      Math.max(0, totalParcels - deliveredParcels - failedParcels)
  );

  const successRate =
    overview?.successRate !== undefined
      ? Number(overview.successRate)
      : totalParcels > 0
      ? (deliveredParcels / totalParcels) * 100
      : 0;

  const failureRate =
    overview?.failureRate !== undefined
      ? Number(overview.failureRate)
      : totalParcels > 0
      ? (failedParcels / totalParcels) * 100
      : 0;

  const maxDailyCount = Math.max(1, ...dailyDeliveries.map(getDailyCount));

  const totalDailyVolume = dailyDeliveries.reduce(
    (sum, item) => sum + getDailyCount(item),
    0
  );

  const averageDailyVolume =
    dailyDeliveries.length > 0
      ? (totalDailyVolume / dailyDeliveries.length).toFixed(1)
      : '0.0';

  const unassignedCount = useMemo(
    () =>
      recentParcels.filter(
        (p) => !p.courierId && p.status !== 'DELIVERED'
      ).length,
    [recentParcels]
  );

  // ============================================
  // EXPORT ANALYTICS CSV
  // ============================================

  const exportCSV = () => {
    const rows = [
      ['Date', 'Deliveries'],
      ...dailyDeliveries.map((item) => [
        item.date || item.day || '',
        getDailyCount(item),
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `delivery-analytics-${fromDate}-to-${toDate}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  // ============================================
  // DAILY TABLE SEARCH
  // ============================================

  const filteredDailyRecords = useMemo(() => {
    if (!tableSearch.trim()) {
      return dailyDeliveries;
    }

    const search = tableSearch.toLowerCase();

    return dailyDeliveries.filter((item) =>
      String(item.date || item.day || '')
        .toLowerCase()
        .includes(search)
    );
  }, [dailyDeliveries, tableSearch]);

  // ============================================
  // COPY TRACKING NUMBER
  // ============================================

  const handleCopyTracking = async (trackingNumber) => {
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setCopiedTracking(trackingNumber);

      setTimeout(() => setCopiedTracking(''), 2500);
    } catch (error) {
      console.error('Unable to copy tracking number:', error);
    }
  };

  // ============================================
  // COURIER ASSIGNMENT
  // ============================================

  const handleAssignSubmit = async (event) => {
    event.preventDefault();

    if (!assigningParcel || !selectedCourierId) {
      return;
    }

    setSubmittingAssign(true);
    setAssignError('');

    try {
      const response = await api.patch(
        `/parcels/${assigningParcel.id}/assign`,
        {
          courierId: selectedCourierId,
        }
      );

      if (response.data?.success || response.status === 200) {
        setAssignSuccess(
          `Assigned parcel ${assigningParcel.trackingNumber} successfully!`
        );

        setTimeout(() => setAssignSuccess(''), 4000);

        setAssigningParcel(null);
        setSelectedCourierId('');

        await fetchDashboardData(true);
      }
    } catch (error) {
      setAssignError(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to assign courier.'
      );
    } finally {
      setSubmittingAssign(false);
    }
  };

  // ============================================
  // FILTER PARCELS
  // ============================================

  const filteredParcels = useMemo(() => {
    let list = recentParcels;

    if (parcelFilter === 'IN_TRANSIT') {
      list = list.filter(
        (parcel) =>
          parcel.status === 'IN_TRANSIT' || parcel.status === 'ASSIGNED'
      );
    } else if (parcelFilter === 'DELIVERED') {
      list = list.filter(
        (parcel) =>
          parcel.status === 'DELIVERED' || parcel.status === 'COMPLETED'
      );
    } else if (parcelFilter === 'UNASSIGNED') {
      list = list.filter(
        (parcel) => !parcel.courierId && parcel.status !== 'DELIVERED'
      );
    }

    if (!searchQuery.trim()) {
      return list;
    }

    const search = searchQuery.toLowerCase();

    return list.filter(
      (parcel) =>
        parcel.trackingNumber?.toLowerCase().includes(search) ||
        parcel.recipientName?.toLowerCase().includes(search) ||
        parcel.dropoffCity?.toLowerCase().includes(search) ||
        parcel.pickupCity?.toLowerCase().includes(search) ||
        parcel.status?.toLowerCase().includes(search)
    );
  }, [recentParcels, searchQuery, parcelFilter]);

  // ============================================
  // DASHBOARD UI
  // ============================================

  return (
    <section className="space-y-6 pb-12">
      {/* ========================================
          1. UNIQUE EXECUTIVE HERO HEADER
      ======================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-900 p-7 text-white shadow-lg sm:p-9">
        {/* Decorative Ambient Glows */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-sky-400/15 blur-2xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.6) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 space-y-2.5">
          <h1 className="sr-only">Administration</h1>

          <div className="inline-flex items-center gap-2.5 rounded-full border border-blue-400/30 bg-blue-900/50 px-3.5 py-1.5 backdrop-blur-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>

            <span className="text-[11px] font-bold uppercase tracking-widest text-sky-200">
              SwiftDrop Command Center • {formattedToday}
            </span>
          </div>

          <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Welcome back,{' '}
            <span className="bg-gradient-to-r from-sky-300 via-blue-200 to-indigo-200 bg-clip-text text-transparent">
              Administrator
            </span>
          </h2>

          <p className="max-w-2xl text-xs leading-relaxed text-blue-100/80 sm:text-sm">
            Island-wide courier routing, live dispatch operations, coverage
            zones, and revenue tariffs.
          </p>
        </div>
      </div>

      {/* ASSIGNMENT SUCCESS MESSAGE */}
      {assignSuccess && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{assignSuccess}</span>
          </div>

          <button type="button" onClick={() => setAssignSuccess('')}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ========================================
          2. UNIFIED STATUS KPI SQUARES
      ======================================== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardKpi
          title="Total Parcels"
          value={totalParcels}
          loading={loading}
          icon={Package}
          subtitle="All-time recorded volume"
        />

        <DashboardKpi
          title="Delivered Parcels"
          value={deliveredParcels}
          loading={loading}
          icon={CheckCircle2}
          subtitle={`${formatPercentage(successRate)} success rate`}
        />

        <DashboardKpi
          title="Pending Deliveries"
          value={pendingParcels}
          loading={loading}
          icon={Clock}
          subtitle="In transit and assigned"
        />

        <DashboardKpi
          title="Failed Deliveries"
          value={failedParcels}
          loading={loading}
          icon={AlertTriangle}
          subtitle={`${formatPercentage(failureRate)} failure rate`}
        />
      </div>

      {/* ========================================
          3. SUCCESS AND FAILURE RATES
      ======================================== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PerformanceRate
          title="Fulfillment Success Rate"
          value={successRate}
          count={deliveredParcels}
          total={totalParcels}
          color="green"
          icon={TrendingUp}
        />

        <PerformanceRate
          title="Delivery Failure Rate"
          value={failureRate}
          count={failedParcels}
          total={totalParcels}
          color="red"
          icon={TrendingDown}
        />
      </div>

      {/* ========================================
          4. PLATFORM SERVICES (LARGE ACTION CARDS)
      ======================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Platform Services
            </h3>
            <p className="text-xs text-slate-500">
              Direct access to operational & administrative modules
            </p>
          </div>

          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            All Services Operational
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <QuickAction
            to="/dispatcher/dashboard"
            title="Dispatch Center"
            description={
              unassignedCount > 0
                ? `${unassignedCount} awaiting assignment`
                : 'Live fleet routing'
            }
            icon={Navigation}
            color="emerald"
          />

          <QuickAction
            to="/admin/zones"
            title="Zone Management"
            description={
              zones.length > 0
                ? `${zones.length} coverage zones`
                : 'Delivery boundaries'
            }
            icon={MapPin}
            color="blue"
          />

          <QuickAction
            to="/admin/pricing"
            title="Pricing Rules"
            description={
              pricingRules.length > 0
                ? `${pricingRules.length} tariff rules`
                : 'Configure tariffs'
            }
            icon={DollarSign}
            color="indigo"
          />

          <QuickAction
            to="/admin/users"
            title="User Management"
            description="Staff & courier accounts"
            icon={Users}
            color="slate"
          />

          <QuickAction
            to="/admin/merchants"
            title="Merchants"
            description="Business applications"
            icon={Store}
            color="amber"
          />
        </div>
      </div>

      {/* ========================================
          5. DATE FILTER & EXPORT BAR
      ======================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-950">
            <CalendarDays size={16} className="text-blue-600" />
            Reporting Date Range
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-500">From:</span>

              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-700 focus:bg-white"
              />
            </label>

            <label className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-500">To:</span>

              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(event) => setToDate(event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-700 focus:bg-white"
              />
            </label>

            <button
              type="button"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing || fromDate > toDate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw
                size={13}
                className={refreshing ? 'animate-spin' : ''}
              />
              {refreshing ? 'Applying...' : 'Apply Range'}
            </button>

            <button
              type="button"
              onClick={exportCSV}
              disabled={!dailyDeliveries.length}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* ANALYTICS ERROR */}
      {analyticsError && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={17} />
            <span>{analyticsError}</span>
          </div>

          <button
            type="button"
            onClick={() => fetchDashboardData(true)}
            className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 font-semibold text-rose-700 hover:bg-rose-50"
          >
            Retry
          </button>
        </div>
      )}

      {/* ========================================
          6. DELIVERY STATUS DONUT + PERFORMANCE BAR CHART
      ======================================== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-blue-900 p-2 text-white shadow-sm">
                <PieChart size={20} />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Delivery Status
                </h3>
                <p className="text-xs text-slate-500">
                  Hover a segment to inspect details
                </p>
              </div>
            </div>
          </div>

          <StatusDonutChart
            statuses={deliveryStatuses}
            total={totalParcels}
            loading={loading}
          />
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Delivery Performance Comparison
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Day-over-day parcel throughput volume
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs">
              <span className="text-slate-400">Total: </span>
              <strong className="text-slate-900">
                {formatNumber(totalDailyVolume)}
              </strong>

              <span className="mx-2 text-slate-300">|</span>

              <span className="text-slate-400">Daily avg: </span>
              <strong className="text-blue-700">{averageDailyVolume}</strong>
            </div>
          </div>

          <WeeklyBarChart data={dailyDeliveries} loading={loading} />
        </div>
      </div>

      {/* ========================================
          7. OPERATIONAL INSIGHTS
      ======================================== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InsightCard
          title="Daily Average Velocity"
          value={`${averageDailyVolume} packages / day`}
          icon={Zap}
          color="blue"
        />

        <InsightCard
          title="Fleet Operations Health"
          value={
            successRate >= 90
              ? 'Optimal Performance'
              : successRate >= 75
              ? 'Stable Fulfillment'
              : 'Action Required'
          }
          icon={ShieldCheck}
          color="green"
        />

        <InsightCard
          title="Active Reporting Scope"
          value={`${fromDate} → ${toDate}`}
          icon={Truck}
          color="indigo"
        />
      </div>

      {/* ========================================
          8. DAILY DELIVERY SUMMARY TABLE
      ======================================== */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Daily Delivery Summary
              <span className="ml-2 font-medium text-slate-400">
                ({filteredDailyRecords.length})
              </span>
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Delivery volume for each recorded date
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={tableSearch}
              onChange={(event) => setTableSearch(event.target.value)}
              placeholder="Filter by date..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-xs outline-none focus:border-blue-700 focus:bg-white"
            />

            {tableSearch && (
              <button
                type="button"
                onClick={() => setTableSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {filteredDailyRecords.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No daily delivery records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Deliveries</th>
                  <th className="px-6 py-3.5">Activity Share</th>
                  <th className="px-6 py-3.5 text-right">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredDailyRecords.map((item, index) => {
                  const count = getDailyCount(item);
                  const percentage =
                    maxDailyCount > 0 ? (count / maxDailyCount) * 100 : 0;

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
                              className="h-full rounded-full bg-blue-700"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>

                          <span className="w-9 text-right text-[11px] font-semibold text-slate-500">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
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

      {/* ========================================
          9. RECENT PARCEL ACTIVITIES
      ======================================== */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Recent Parcel Activities
              </h3>

              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                {filteredParcels.length} Items
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Recent parcels, routing status, and courier assignments
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input inside Recent Parcels */}
            <div className="relative min-w-[200px]">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search tracking or city..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {[
              { id: 'ALL', label: 'All Orders' },
              { id: 'IN_TRANSIT', label: 'In Transit' },
              { id: 'DELIVERED', label: 'Delivered' },
              { id: 'UNASSIGNED', label: 'Unassigned' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setParcelFilter(tab.id)}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  parcelFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredParcels.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Package size={24} />
            </div>

            <h4 className="text-sm font-bold text-slate-800">
              No Parcel Activities Found
            </h4>

            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
              {searchQuery
                ? `No parcels match "${searchQuery}".`
                : 'No parcel activities match this filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Tracking Number</th>
                  <th className="px-6 py-3.5">Route</th>
                  <th className="px-6 py-3.5">Recipient</th>
                  <th className="px-6 py-3.5">Weight</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredParcels.map((parcel) => (
                  <tr
                    key={parcel.id || parcel.trackingNumber}
                    className="transition hover:bg-slate-50/60"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{parcel.trackingNumber || '—'}</span>

                        {parcel.trackingNumber && (
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyTracking(parcel.trackingNumber)
                            }
                            title="Copy Tracking Number"
                            className="text-slate-400 transition hover:text-blue-600"
                          >
                            {copiedTracking === parcel.trackingNumber ? (
                              <Check size={13} className="text-emerald-600" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span>{parcel.pickupCity || 'Colombo'}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-slate-900">
                          {parcel.dropoffCity || 'Kandy'}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-700">
                      <div className="font-semibold text-slate-900">
                        {parcel.recipientName || 'Recipient'}
                      </div>

                      <div className="text-[11px] text-slate-400">
                        {parcel.recipientPhone || '—'}
                      </div>
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-600">
                      {parcel.weightKg ? `${parcel.weightKg} kg` : '—'}
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={parcel.status || 'PENDING'} />
                    </td>

                    <td className="px-6 py-4 text-right">
                      {!parcel.courierId && parcel.status !== 'DELIVERED' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setAssigningParcel(parcel);
                            setAssignError('');
                            setSelectedCourierId(couriers[0]?.id || '');
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
                        >
                          <Send size={13} />
                          Assign
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400">
                          {parcel.courier?.user?.name
                            ? `Courier: ${parcel.courier.user.name}`
                            : 'Completed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================
          10. COURIER ASSIGNMENT MODAL
      ======================================== */}
      {assigningParcel && (
        <Modal
          open={Boolean(assigningParcel)}
          onClose={() => setAssigningParcel(null)}
          title={`Assign Courier to ${assigningParcel.trackingNumber}`}
        >
          <div className="space-y-4 pt-1">
            <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Destination:</span>
                <strong className="text-slate-900">
                  {assigningParcel.dropoffCity}
                </strong>
              </div>

              <div className="flex justify-between">
                <span>Weight:</span>
                <strong className="text-slate-900">
                  {assigningParcel.weightKg || '1.0'} kg
                </strong>
              </div>

              <div className="flex justify-between">
                <span>Recipient:</span>
                <strong className="text-slate-900">
                  {assigningParcel.recipientName}
                </strong>
              </div>
            </div>

            {assignError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {assignError}
              </div>
            )}

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-slate-700">
                  Select Available Courier
                </label>

                {couriers.length === 0 ? (
                  <p className="py-2 text-xs text-slate-500">
                    No couriers registered yet. Add couriers under User
                    Management.
                  </p>
                ) : (
                  <select
                    required
                    value={selectedCourierId}
                    onChange={(event) =>
                      setSelectedCourierId(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">-- Choose Courier --</option>

                    {couriers.map((courier) => (
                      <option key={courier.id} value={courier.id}>
                        {courier.user?.name || courier.id} (
                        {courier.vehicleType || 'Motorcycle'}) —{' '}
                        {courier.activeDeliveries || 0} active orders
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setAssigningParcel(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingAssign || !selectedCourierId}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {submittingAssign ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </section>
  );
};

// ============================================
// UNIFIED DASHBOARD KPI CARD
// ============================================

function DashboardKpi({ title, value, loading, icon: Icon, subtitle }) {
  return (
    <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-sky-50 to-blue-100/80 p-5 text-slate-900 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-blue-900/80">
            {title}
          </p>

          <p className="mt-2 text-3xl font-black tracking-tight text-blue-950">
            {loading ? '—' : formatNumber(value)}
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
          <Icon size={24} />
        </div>
      </div>

      <div className="mt-4 border-t border-blue-200/80 pt-3 text-xs font-bold text-blue-800">
        {subtitle}
      </div>
    </div>
  );
}

// ============================================
// PERFORMANCE RATE CARD
// ============================================

function PerformanceRate({ title, value, count, total, color, icon: Icon }) {
  const isGreen = color === 'green';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`rounded-lg p-1.5 ${
              isGreen
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-rose-50 text-rose-600'
            }`}
          >
            <Icon size={16} />
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {title}
          </h3>
        </div>

        <span
          className={`text-base font-extrabold ${
            isGreen ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {formatPercentage(value)}
        </span>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            isGreen ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
          style={{
            width: `${Math.min(100, Math.max(0, Number(value) || 0))}%`,
          }}
        />
      </div>

      <p className="mt-2.5 text-xs text-slate-500">
        {formatNumber(count)} of {formatNumber(total)} deliveries
      </p>
    </div>
  );
}

// ============================================
// QUICK ACTION CARD (EXPANDED)
// ============================================

function QuickAction({ to, title, description, icon: Icon, color }) {
  const colorClasses = {
    emerald: 'bg-emerald-600',
    blue: 'bg-blue-600',
    indigo: 'bg-indigo-600',
    slate: 'bg-slate-800',
    amber: 'bg-amber-600',
  };

  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/60 hover:shadow"
    >
      <div className="flex items-center gap-3.5">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm transition group-hover:scale-105 ${colorClasses[color]}`}
        >
          <Icon size={22} />
        </div>

        <div className="min-w-0">
          <h4 className="truncate text-sm font-extrabold text-slate-900 transition group-hover:text-blue-700">
            {title}
          </h4>

          <p className="mt-0.5 truncate text-xs text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <ChevronRight
        size={18}
        className="shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600"
      />
    </Link>
  );
}

// ============================================
// OPERATIONAL INSIGHT CARD
// ============================================

function InsightCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-800',
    green: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${colorClasses[color]}`}
      >
        <Icon size={22} />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500">{title}</p>

        <p className="mt-0.5 break-words text-base font-extrabold text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

// ============================================
// DELIVERY STATUS DONUT CHART (ENHANCED & INTERACTIVE)
// ============================================

function StatusDonutChart({ statuses = [], total = 0, loading = false }) {
  const [hoveredStatus, setHoveredStatus] = useState(null);

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <RefreshCw size={28} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!statuses.length) {
    return (
      <div className="flex h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-6 text-center">
        <Package size={36} className="mb-2 text-slate-300" />

        <p className="text-sm font-semibold text-slate-600">
          No status data available
        </p>
      </div>
    );
  }

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const gapSize = 3;

  let accumulated = 0;

  const validStatuses = statuses
    .map((item) => {
      const count = Number(item.count ?? item.total ?? 0);

      const percentage =
        item.percentage !== undefined
          ? Number(item.percentage)
          : total > 0
          ? (count / total) * 100
          : 0;

      const color = getStatusColor(item.status);
      const offset = accumulated;

      accumulated += (percentage / 100) * circumference;

      return {
        ...item,
        count,
        percentage,
        color,
        offset,
      };
    })
    .filter((item) => item.percentage > 0 || item.count > 0);

  const activeItem = validStatuses.find(
    (item) => item.status === hoveredStatus
  );

  return (
    <div className="flex flex-col items-center gap-6 pt-2">
      {/* Large Interactive Radial Ring */}
      <div className="relative flex h-56 w-56 items-center justify-center">
        <div className="absolute inset-1 rounded-full border border-dashed border-blue-200" />

        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth="16"
          />

          {validStatuses.map((item, index) => {
            const rawLength = (item.percentage / 100) * circumference;
            const segmentLength =
              validStatuses.length > 1
                ? Math.max(0, rawLength - gapSize)
                : rawLength;
            const isDimmed =
              hoveredStatus && hoveredStatus !== item.status;

            return (
              <circle
                key={`${item.status}-${index}`}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={hoveredStatus === item.status ? '19' : '16'}
                strokeLinecap="round"
                strokeDasharray={`${segmentLength} ${
                  circumference - segmentLength
                }`}
                strokeDashoffset={-item.offset}
                onMouseEnter={() => setHoveredStatus(item.status)}
                onMouseLeave={() => setHoveredStatus(null)}
                className="cursor-pointer transition-all duration-300"
                style={{
                  opacity: isDimmed ? 0.35 : 1,
                }}
              />
            );
          })}
        </svg>

        {/* Center Glass Hub */}
        <div className="pointer-events-none absolute inset-9 flex flex-col items-center justify-center rounded-full border border-blue-100 bg-gradient-to-b from-white to-blue-50/60 text-center shadow-inner">
          <span
            className="text-3xl font-black tracking-tight transition-colors"
            style={{ color: activeItem ? activeItem.color : '#0F172A' }}
          >
            {activeItem
              ? formatNumber(activeItem.count)
              : formatNumber(total)}
          </span>

          <span className="mt-1 max-w-[92px] truncate text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {activeItem
              ? String(activeItem.status).replace(/_/g, ' ')
              : 'Total Parcels'}
          </span>

          {activeItem && (
            <span className="mt-0.5 text-[11px] font-extrabold text-slate-700">
              {formatPercentage(activeItem.percentage)}
            </span>
          )}
        </div>
      </div>

      {/* Interactive Status Breakdown Cards */}
      <div className="w-full space-y-2.5 border-t border-slate-100 pt-4">
        {validStatuses.map((item, index) => {
          const isHovered = hoveredStatus === item.status;

          return (
            <div
              key={`${item.status}-${index}`}
              onMouseEnter={() => setHoveredStatus(item.status)}
              onMouseLeave={() => setHoveredStatus(null)}
              className={`cursor-pointer rounded-xl border p-3 transition-all ${
                isHovered
                  ? 'border-blue-300 bg-blue-50/60 shadow-sm'
                  : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full ring-4 ring-white"
                    style={{ backgroundColor: item.color }}
                  />

                  <span className="font-bold tracking-wide text-slate-800">
                    {String(item.status || 'Unknown').replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-slate-900">
                    {formatNumber(item.count)}
                  </span>

                  <span
                    className="rounded-md px-2 py-0.5 text-[11px] font-bold text-white"
                    style={{ backgroundColor: item.color }}
                  >
                    {formatPercentage(item.percentage)}
                  </span>
                </div>
              </div>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(4, item.percentage))}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// WEEKLY DELIVERY BAR CHART
// ============================================

function WeeklyBarChart({ data = [], loading = false }) {
  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <RefreshCw size={24} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex h-80 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center">
        <BarChart3 size={32} className="mb-2 text-slate-300" />

        <p className="text-xs font-semibold text-slate-600">
          No performance data available
        </p>
      </div>
    );
  }

  const counts = data.map(getDailyCount);
  const maxValue = Math.max(5, ...counts);

  return (
    <div className="flex h-80 items-end justify-between gap-3 px-2 pt-6">
      {data.map((item, index) => {
        const count = getDailyCount(item);
        const heightPercentage = Math.max(6, (count / maxValue) * 100);

        const dayLabel = item.date
          ? new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, {
              weekday: 'short',
            })
          : `Day ${index + 1}`;

        return (
          <div
            key={item.date || index}
            className="group flex h-full flex-1 flex-col items-center justify-end"
          >
            <span className="mb-1.5 text-xs font-bold text-blue-700">
              {count}
            </span>

            <div className="flex h-60 w-full max-w-[56px] items-end overflow-hidden rounded-xl bg-slate-100">
              <div
                className="w-full rounded-xl bg-blue-600 shadow-sm transition-all duration-500 group-hover:bg-blue-700"
                style={{ height: `${heightPercentage}%` }}
              />
            </div>

            <span className="mt-2.5 text-xs font-semibold text-slate-600">
              {dayLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default AdminDashboard;