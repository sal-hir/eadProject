import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

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
  ArrowUpRight,
  ChevronRight,
  X,
  Activity,
  Check,
  Send,
  Copy,
  Truck,
} from 'lucide-react';

import { api } from '../../api/client';
import { dispatchAnalyticsApi } from '../../api/dispatchApi';
import { zoneApi, pricingApi } from '../../api/adminApi';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/ui';

const unwrap = (response) =>
  response?.data?.data ?? response?.data ?? null;

const toList = (data, keys = []) => {
  if (Array.isArray(data)) return data;
  if (!data) return [];

  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key];
  }

  return [];
};

const getDailyCount = (item) =>
  Number(
    item.totalParcels ??
    item.totalDeliveries ??
    item.count ??
    item.total ??
    0
  );

export const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [parcelFilter, setParcelFilter] = useState('ALL');
  const [copiedTracking, setCopiedTracking] = useState('');

  // Dispatch analytics
  const [overview, setOverview] = useState(null);
  const [dailyDeliveries, setDailyDeliveries] = useState([]);
  const [deliveryStatuses, setDeliveryStatuses] = useState([]);
  const [recentParcels, setRecentParcels] = useState([]);
  const [pickupLocations, setPickupLocations] = useState([]);
  const [dropoffLocations, setDropoffLocations] = useState([]);
  const [feeAnalytics, setFeeAnalytics] = useState(null);

  // Admin Service
  const [zones, setZones] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);

  // Courier Service
  const [couriers, setCouriers] = useState([]);

  // Assignment modal
  const [assigningParcel, setAssigningParcel] = useState(null);
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState('');
  const [assignError, setAssignError] = useState('');

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

  // Load dashboard information
  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const requests = [
      // Dispatch Service
      dispatchAnalyticsApi.getOverview(),
      dispatchAnalyticsApi.getDaily(),
      dispatchAnalyticsApi.getStatus(),
      dispatchAnalyticsApi.getRecent(10),
      dispatchAnalyticsApi.getPickupLocations(),
      dispatchAnalyticsApi.getDropoffLocations(),
      dispatchAnalyticsApi.getFees(),

      // Admin Service
      zoneApi.getAll(),
      pricingApi.getAll(),

      // Existing Courier API
      api.get('/couriers'),
    ];

    try {
      const results = await Promise.allSettled(requests);

      const read = (index) =>
        results[index].status === 'fulfilled'
          ? unwrap(results[index].value)
          : null;

      // Dispatch overview
      setOverview(read(0));

      // Daily parcel statistics
      setDailyDeliveries(
        toList(read(1), [
          'items',
          'dailyParcels',
          'dailyDeliveries',
          'content',
        ])
      );

      // Parcel status statistics
      setDeliveryStatuses(
        toList(read(2), [
          'items',
          'statuses',
          'deliveryStatuses',
          'content',
        ])
      );

      // Recent parcels
      setRecentParcels(
        toList(read(3), [
          'parcels',
          'items',
          'content',
        ])
      );

      // Pickup locations
      setPickupLocations(
        toList(read(4), [
          'locations',
          'items',
          'content',
        ])
      );

      // Drop-off locations
      setDropoffLocations(
        toList(read(5), [
          'locations',
          'items',
          'content',
        ])
      );

      // Fee analytics
      setFeeAnalytics(read(6));

      // Zones
      setZones(
        toList(read(7), [
          'zones',
          'items',
          'content',
        ])
      );

      // Pricing
      setPricingRules(
        toList(read(8), [
          'pricingRules',
          'items',
          'content',
        ])
      );

      // Couriers
      setCouriers(
        toList(read(9), [
          'couriers',
          'items',
          'content',
        ])
      );

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(
            `Dashboard request ${index + 1} failed:`,
            result.reason
          );
        }
      });
    } catch (error) {
      console.error('Dashboard loading error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // KPI values from Dispatch Service
  const totalParcels = Number(overview?.totalParcels ?? 0);
  const deliveredParcels = Number(overview?.deliveredParcels ?? 0);
  const failedParcels = Number(overview?.failedParcels ?? 0);
  const pendingParcels = Number(overview?.pendingParcels ?? 0);

  const successRate =
    totalParcels > 0
      ? ((deliveredParcels / totalParcels) * 100).toFixed(1)
      : '0.0';

  const failureRate =
    totalParcels > 0
      ? ((failedParcels / totalParcels) * 100).toFixed(1)
      : '0.0';

  // Copy tracking number
  const handleCopyTracking = async (trackingNumber) => {
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setCopiedTracking(trackingNumber);

      setTimeout(() => {
        setCopiedTracking('');
      }, 2500);
    } catch (error) {
      console.error('Unable to copy tracking number:', error);
    }
  };

  // Assign courier
  const handleAssignSubmit = async (event) => {
    event.preventDefault();

    if (!assigningParcel || !selectedCourierId) return;

    setSubmittingAssign(true);
    setAssignError('');

    try {
      // IMPORTANT:
      // Verify this URL and parcel ID with your actual assignment controller.
      // Use the Parcel Service UUID (sourceParcelId), not Dispatch's internal ID.
      const parcelId =
        assigningParcel.sourceParcelId ||
        assigningParcel.parcelId;

      if (!parcelId) {
        throw new Error(
          'The source Parcel Service ID is missing from this parcel.'
        );
      }

      await api.patch(`/parcels/${parcelId}/assignment`, {
        courierId: selectedCourierId,
      });

      setAssignSuccess(
        `Courier assigned to ${assigningParcel.trackingNumber} successfully.`
      );

      setAssigningParcel(null);
      setSelectedCourierId('');

      setTimeout(() => setAssignSuccess(''), 4000);

      fetchDashboardData(true);
    } catch (error) {
      setAssignError(
        error.response?.data?.message ||
        error.message ||
        'Failed to assign courier.'
      );
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Filter recent parcels
  const filteredParcels = useMemo(() => {
    let list = recentParcels;

    if (parcelFilter === 'IN_TRANSIT') {
      list = list.filter(
        (parcel) =>
          parcel.status === 'IN_TRANSIT' ||
          parcel.status === 'ASSIGNED'
      );
    }

    if (parcelFilter === 'DELIVERED') {
      list = list.filter(
        (parcel) =>
          parcel.status === 'DELIVERED' ||
          parcel.status === 'COMPLETED'
      );
    }

    if (parcelFilter === 'UNASSIGNED') {
      list = list.filter(
        (parcel) =>
          !parcel.courierId &&
          parcel.status !== 'DELIVERED'
      );
    }

    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase();

    return list.filter((parcel) =>
      [
        parcel.trackingNumber,
        parcel.recipientName,
        parcel.dropoffCity,
        parcel.pickupCity,
        parcel.pickupAddress,
        parcel.dropoffAddress,
        parcel.status,
      ].some((value) =>
        String(value ?? '').toLowerCase().includes(query)
      )
    );
  }, [recentParcels, parcelFilter, searchQuery]);

  // Match assigned courier
  const getCourierName = (parcel) => {
    const courier = couriers.find(
      (item) =>
        String(item.id) === String(parcel.courierId)
    );

    return (
      parcel.courier?.user?.name ||
      courier?.user?.name ||
      courier?.name ||
      'Assigned'
    );
  };

  return (
    <section className="space-y-6 pb-12">

      {/* HEADER */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="sr-only">Administration</h1>

            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Logistics Telemetry Active · {formattedToday}
              </p>
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Welcome back,{' '}
              <span className="text-blue-600">Administrator</span>
            </h2>

            <p className="max-w-2xl text-sm text-slate-500">
              Monitor parcels, courier operations, delivery statistics,
              coverage zones and pricing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search parcels..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs focus:border-blue-600 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                size={14}
                className={refreshing ? 'animate-spin' : ''}
              />
              {refreshing ? 'Syncing...' : 'Sync Data'}
            </button>

            <Link
              to="/admin/zones"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
            >
              <MapPin size={14} />
              Zone Manager
            </Link>
          </div>
        </div>
      </div>

      {/* ASSIGNMENT SUCCESS */}
      {assignSuccess && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            {assignSuccess}
          </span>

          <button onClick={() => setAssignSuccess('')}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <KpiCard
          title="Total Parcels"
          value={totalParcels}
          loading={loading}
          icon={<Package size={24} />}
          color="blue"
          footer="All-time parcel volume"
        />

        <KpiCard
          title="Delivered Parcels"
          value={deliveredParcels}
          loading={loading}
          icon={<CheckCircle2 size={24} />}
          color="green"
          footer={`${successRate}% success rate`}
        />

        <KpiCard
          title="Pending Parcels"
          value={pendingParcels}
          loading={loading}
          icon={<Clock size={24} />}
          color="amber"
          footer="Not yet completed"
        />

        <KpiCard
          title="Failed Parcels"
          value={failedParcels}
          loading={loading}
          icon={<AlertTriangle size={24} />}
          color="rose"
          footer={`${failureRate}% failure rate`}
        />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">
                Daily Parcel Creation
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Parcel creation volume by date
              </p>
            </div>

            <Link
              to="/admin/analytics"
              className="flex items-center gap-1 text-xs font-bold text-blue-600"
            >
              Full Analytics <ArrowUpRight size={14} />
            </Link>
          </div>

          <DailyLineChart
            data={dailyDeliveries}
            loading={loading}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-bold text-slate-900">
            Parcel Status Distribution
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Breakdown by current status
          </p>

          <StatusDonutChart
            statuses={deliveryStatuses}
            total={totalParcels}
            loading={loading}
          />
        </div>
      </div>

      {/* WEEKLY CHART AND OPERATIONS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="font-bold text-slate-900">
            Weekly Parcel Performance
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Daily parcel creation comparison
          </p>

          <WeeklyBarChart
            data={dailyDeliveries}
            loading={loading}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-1 font-bold text-slate-900">
            Quick Actions
          </h3>

          <p className="mb-5 text-xs text-slate-500">
            Administrative modules
          </p>

          <div className="space-y-3">
            <Shortcut
              to="/admin/zones"
              title="Zone Management"
              description={`${zones.length} zones loaded`}
              icon={<MapPin size={20} />}
            />

            <Shortcut
              to="/admin/pricing"
              title="Pricing Management"
              description={`${pricingRules.length} pricing rules loaded`}
              icon={<DollarSign size={20} />}
            />

            <Shortcut
              to="/admin/users"
              title="User Management"
              description="Manage staff and permissions"
              icon={<Users size={20} />}
            />

            <Shortcut
              to="/admin/merchants"
              title="Merchant Management"
              description="Review merchant accounts"
              icon={<Store size={20} />}
            />
          </div>
        </div>
      </div>

      {/* OPERATIONAL ANALYTICS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        <LocationList
          title="Popular Pickup Locations"
          locations={pickupLocations}
          loading={loading}
        />

        <LocationList
          title="Popular Drop-off Locations"
          locations={dropoffLocations}
          loading={loading}
        />

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <DollarSign size={19} className="text-emerald-600" />
            <h3 className="font-bold text-slate-900">
              Delivery Fee Analytics
            </h3>
          </div>

          {loading ? (
            <LoadingText />
          ) : feeAnalytics ? (
            <div className="space-y-4">
              <Metric
                label="Total Fees"
                value={feeAnalytics.totalFees ?? feeAnalytics.totalRevenue}
                prefix="LKR "
              />

              <Metric
                label="Average Fee"
                value={feeAnalytics.averageFee}
                prefix="LKR "
              />

              <Metric
                label="Total Transactions"
                value={feeAnalytics.totalTransactions ?? feeAnalytics.totalParcels}
              />
            </div>
          ) : (
            <EmptyText text="No fee analytics available." />
          )}
        </div>
      </div>

      {/* RECENT PARCEL TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900">
                Recent Parcel Activities
              </h3>

              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                {filteredParcels.length} Items
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Recent parcels and courier assignments
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'IN_TRANSIT', label: 'In Transit' },
              { id: 'DELIVERED', label: 'Delivered' },
              { id: 'UNASSIGNED', label: 'Unassigned' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setParcelFilter(tab.id)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                  parcelFilter === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredParcels.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={30} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">
              No parcels found
            </p>
            <p className="mt-1 text-xs text-slate-400">
              No parcels match your current search or filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-4">Tracking Number</th>
                  <th className="px-5 py-4">Route</th>
                  <th className="px-5 py-4">Recipient</th>
                  <th className="px-5 py-4">Weight</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredParcels.map((parcel) => (
                  <tr
                    key={parcel.sourceParcelId || parcel.id || parcel.trackingNumber}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-5 py-4 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        {parcel.trackingNumber || '—'}

                        {parcel.trackingNumber && (
                          <button
                            type="button"
                            onClick={() => handleCopyTracking(parcel.trackingNumber)}
                            title="Copy tracking number"
                          >
                            {copiedTracking === parcel.trackingNumber ? (
                              <Check size={13} className="text-emerald-600" />
                            ) : (
                              <Copy size={13} className="text-slate-400" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      <div className="max-w-[220px]">
                        <p className="truncate">
                          {parcel.pickupCity || parcel.pickupAddress || '—'}
                        </p>
                        <p className="truncate text-slate-400">
                          → {parcel.dropoffCity || parcel.dropoffAddress || '—'}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">
                        {parcel.recipientName || '—'}
                      </p>
                      <p className="text-slate-400">
                        {parcel.recipientPhone || '—'}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {parcel.weightKg != null
                        ? `${parcel.weightKg} kg`
                        : '—'}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={parcel.status || 'PENDING'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ASSIGN COURIER MODAL */}
      {assigningParcel && (
        <Modal
          open={Boolean(assigningParcel)}
          onClose={() => setAssigningParcel(null)}
          title={`Assign Courier - ${assigningParcel.trackingNumber}`}
        >
          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
              <p>
                <strong>Pickup:</strong>{' '}
                {assigningParcel.pickupAddress || assigningParcel.pickupCity || '—'}
              </p>

              <p className="mt-2">
                <strong>Destination:</strong>{' '}
                {assigningParcel.dropoffAddress || assigningParcel.dropoffCity || '—'}
              </p>
            </div>

            {assignError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {assignError}
              </div>
            )}

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-700">
                  Select Courier
                </label>

                <select
                  required
                  value={selectedCourierId}
                  onChange={(event) =>
                    setSelectedCourierId(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 text-xs"
                >
                  <option value="">-- Choose Courier --</option>

                  {couriers.map((courier) => (
                    <option key={courier.id} value={courier.id}>
                      {courier.user?.name || courier.name || courier.id}
                      {' - '}
                      {courier.vehicleType || 'Vehicle not specified'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setAssigningParcel(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    submittingAssign ||
                    !selectedCourierId ||
                    couriers.length === 0
                  }
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
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

// KPI CARD
function KpiCard({ title, value, loading, icon, color, footer }) {
  const styles = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            {loading ? '—' : Number(value).toLocaleString()}
          </p>
        </div>

        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${styles[color]}`}>
          {icon}
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
        {footer}
      </div>
    </div>
  );
}

// QUICK ACTION
function Shortcut({ to, title, description, icon }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 hover:border-blue-200 hover:bg-blue-50"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
          {icon}
        </div>

        <div>
          <p className="text-xs font-bold text-slate-900">{title}</p>
          <p className="text-[11px] text-slate-500">{description}</p>
        </div>
      </div>

      <ChevronRight size={16} className="text-slate-400" />
    </Link>
  );
}

// DAILY LINE CHART
function DailyLineChart({ data = [], loading }) {
  if (loading) return <LoadingText />;

  if (!data.length) {
    return <EmptyText text="No daily parcel statistics available." />;
  }

  const max = Math.max(5, ...data.map(getDailyCount));
  const width = 640;
  const height = 210;
  const padding = 35;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const points = data.map((item, index) => {
    const x =
      data.length === 1
        ? width / 2
        : padding + (index * innerWidth) / (data.length - 1);

    const value = getDailyCount(item);
    const y = height - padding - (value / max) * innerHeight;

    return {
      x,
      y,
      value,
      date: item.date || item.day || `Day ${index + 1}`,
    };
  });

  const path = points
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    )
    .join(' ');

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 min-w-[500px] w-full"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((percentage) => {
          const y = height - padding - percentage * innerHeight;

          return (
            <line
              key={percentage}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#E2E8F0"
              strokeDasharray="4 4"
            />
          );
        })}

        <path
          d={path}
          fill="none"
          stroke="#2563EB"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill="white"
              stroke="#2563EB"
              strokeWidth="3"
            />

            <text
              x={point.x}
              y={point.y - 12}
              textAnchor="middle"
              fontSize="10"
              fill="#1E293B"
            >
              {point.value}
            </text>

            <text
              x={point.x}
              y={height - 5}
              textAnchor="middle"
              fontSize="10"
              fill="#64748B"
            >
              {point.date}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// STATUS DONUT CHART
const STATUS_COLORS = {
  DELIVERED: '#16A34A',
  COMPLETED: '#16A34A',
  FAILED: '#DC2626',
  PENDING: '#F59E0B',
  ASSIGNED: '#6366F1',
  IN_TRANSIT: '#2563EB',
  CANCELLED: '#94A3B8',
};

function StatusDonutChart({ statuses = [], total, loading }) {
  if (loading) return <LoadingText />;

  if (!statuses.length) {
    return <EmptyText text="No status statistics available." />;
  }

  const totalCount = statuses.reduce(
    (sum, item) =>
      sum + Number(item.count ?? item.total ?? 0),
    0
  );

  let offset = 0;
  const circumference = 2 * Math.PI * 43;

  const segments = statuses.map((item, index) => {
    const count = Number(item.count ?? item.total ?? 0);
    const percentage =
      totalCount > 0 ? (count / totalCount) * 100 : 0;

    const segment = {
      ...item,
      count,
      percentage,
      offset,
      color:
        STATUS_COLORS[
          String(item.status || '').toUpperCase()
        ] || '#3B82F6',
    };

    offset += (percentage / 100) * circumference;
    return segment;
  });

  return (
    <div className="flex flex-col items-center pt-5">
      <div className="relative h-40 w-40">
        <svg viewBox="0 0 120 120" className="-rotate-90">
          <circle
            cx="60"
            cy="60"
            r="43"
            fill="none"
            stroke="#F1F5F9"
            strokeWidth="14"
          />

          {segments.map((item, index) => {
            const length =
              (item.percentage / 100) * circumference;

            return (
              <circle
                key={index}
                cx="60"
                cy="60"
                r="43"
                fill="none"
                stroke={item.color}
                strokeWidth="14"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-item.offset}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold text-slate-900">
            {Number(total).toLocaleString()}
          </span>
          <span className="text-[10px] uppercase text-slate-400">
            Total
          </span>
        </div>
      </div>

      <div className="mt-5 w-full space-y-3">
        {segments.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />

              <span className="text-slate-600">
                {item.status || 'Unknown'}
              </span>
            </div>

            <strong className="text-slate-900">
              {item.count}
              {' '}
              <span className="font-normal text-slate-400">
                ({item.percentage.toFixed(1)}%)
              </span>
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// WEEKLY BAR CHART
function WeeklyBarChart({ data = [], loading }) {
  if (loading) return <LoadingText />;

  if (!data.length) {
    return <EmptyText text="No weekly parcel data available." />;
  }

  const max = Math.max(5, ...data.map(getDailyCount));

  return (
    <div className="flex h-56 items-end justify-between gap-3 px-2 pt-5">
      {data.map((item, index) => {
        const count = getDailyCount(item);
        const height = Math.max(5, (count / max) * 100);

        const label = item.date
          ? new Date(`${item.date}T00:00:00`).toLocaleDateString(
              undefined,
              { weekday: 'short' }
            )
          : `Day ${index + 1}`;

        return (
          <div
            key={index}
            className="group flex h-full flex-1 flex-col items-center justify-end"
          >
            <span className="mb-1 text-[10px] font-bold text-blue-600">
              {count}
            </span>

            <div className="flex h-40 w-full max-w-[48px] items-end overflow-hidden rounded-xl bg-slate-100">
              <div
                className="w-full rounded-xl bg-blue-600 transition-all"
                style={{ height: `${height}%` }}
              />
            </div>

            <span className="mt-2 text-[11px] font-semibold text-slate-500">
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// LOCATION LIST
function LocationList({ title, locations = [], loading }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <MapPin size={18} className="text-blue-600" />
        <h3 className="font-bold text-slate-900">{title}</h3>
      </div>

      {loading ? (
        <LoadingText />
      ) : locations.length === 0 ? (
        <EmptyText text="No location information available." />
      ) : (
        <div className="space-y-3">
          {locations.slice(0, 5).map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
            >
              <span className="text-xs text-slate-700">
                {item.location ||
                  item.address ||
                  item.city ||
                  item.name ||
                  'Unknown location'}
              </span>

              <strong className="text-xs text-slate-900">
                {item.count ?? item.total ?? 0}
              </strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// SMALL METRIC
function Metric({ label, value, prefix = '' }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
      <span className="text-xs text-slate-500">{label}</span>
      <strong className="text-sm text-slate-900">
        {value != null ? `${prefix}${Number(value).toLocaleString()}` : '—'}
      </strong>
    </div>
  );
}

function LoadingText() {
  return (
    <div className="flex min-h-32 items-center justify-center gap-2 text-xs text-slate-400">
      <RefreshCw size={16} className="animate-spin" />
      Loading data...
    </div>
  );
}

function EmptyText({ text }) {
  return (
    <div className="flex min-h-32 items-center justify-center text-center text-xs text-slate-400">
      {text}
    </div>
  );
}

export default AdminDashboard;
