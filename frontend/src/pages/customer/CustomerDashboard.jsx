
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { parcelApi } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import {
  PlusCircle,
  Package,
  ArrowRight,
  Search,
  RefreshCw,
  MapPin
} from 'lucide-react';

export const CustomerDashboard = () => {
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const fetchParcels = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await parcelApi.get('/parcels/mine');

      // ParcelController returns List<ParcelResponse>.
      setParcels(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to load parcels:', err);

      setError(
        err.response?.data?.message ||
        'Could not load your deliveries. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParcels();
  }, []);

  const filteredParcels = useMemo(() => {
    return parcels.filter((parcel) => {
      const query = search.trim().toLowerCase();

      const trackingNumber = (parcel.trackingNumber || '').toLowerCase();
      const pickupAddress = (parcel.pickupAddress || '').toLowerCase();
      const dropoffAddress = (parcel.dropoffAddress || '').toLowerCase();
      const status = (parcel.currentStatus || '').toUpperCase();

      const matchesSearch =
        !query ||
        trackingNumber.includes(query) ||
        pickupAddress.includes(query) ||
        dropoffAddress.includes(query);

      const matchesStatus =
        !filterStatus || status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [parcels, search, filterStatus]);

  const formatDate = (value) => {
    if (!value) return 'Date unavailable';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return 'Date unavailable';

    return date.toLocaleDateString('en-LK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatFee = (value) => {
    const fee = Number(value);

    if (!Number.isFinite(fee)) return 'Not available';

    return `LKR ${fee.toFixed(2)}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Deliveries
          </h1>

          <p className="text-slate-500 text-sm mt-1">
            Manage your outgoing parcel requests and track shipments.
          </p>
        </div>

        <Link
          to="/customer/new"
          className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm transition self-start sm:self-auto text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Delivery</span>
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">
                Total Deliveries
              </p>
              <p className="text-3xl font-extrabold text-slate-900 mt-2">
                {loading ? '—' : parcels.length}
              </p>
            </div>

            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Package className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">
                Matching Deliveries
              </p>
              <p className="text-3xl font-extrabold text-slate-900 mt-2">
                {loading ? '—' : filteredParcels.length}
              </p>
            </div>

            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <MapPin className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />

          <input
            type="text"
            placeholder="Search tracking number or address..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
            className="flex-1 sm:flex-none border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="CREATED">Created</option>
            <option value="PENDING_PICKUP">Pending Pickup</option>
            <option value="PICKED_UP">Picked Up</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <button
            type="button"
            onClick={fetchParcels}
            disabled={loading}
            title="Refresh list"
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-xl border border-slate-200 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <p className="text-sm text-rose-700">{error}</p>

          <button
            type="button"
            onClick={fetchParcels}
            className="mt-2 text-sm font-semibold text-rose-700 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Parcel list */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-r-transparent mb-2" />
          <p className="text-sm font-semibold text-slate-500">
            Loading your deliveries...
          </p>
        </div>
      ) : !error && filteredParcels.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />

          <h3 className="text-base font-bold text-slate-800">
            No deliveries found
          </h3>

          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
            {parcels.length === 0
              ? "You haven't booked any deliveries yet."
              : 'No deliveries match your current search or status filter.'}
          </p>

          {parcels.length === 0 && (
            <Link
              to="/customer/new"
              className="mt-4 inline-flex items-center space-x-1.5 text-xs font-bold text-blue-600 hover:underline"
            >
              <span>Create your first delivery</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      ) : !error ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredParcels.map((parcel) => (
            <div
              key={parcel.parcelId}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3 gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Tracking Number
                    </span>

                    <p className="font-mono font-bold text-slate-900 text-sm break-all">
                      {parcel.trackingNumber}
                    </p>

                    {/* Delivery Priority Badge */}
                    <span
                      className={`inline-flex mt-2 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        parcel.deliveryPriority === 'EXPRESS'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {parcel.deliveryPriority === 'EXPRESS' ? 'EXPRESS' : 'STANDARD'}
                    </span>
                  </div>

                  <StatusBadge status={parcel.currentStatus} />
                </div>

                <div className="space-y-3 py-3 border-y border-slate-100 text-xs text-slate-600">
                  <div>
                    <p className="text-slate-400 mb-1">Pickup address</p>
                    <p className="font-semibold text-slate-800 break-words">
                      {parcel.pickupAddress}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400 mb-1">Drop-off address</p>
                    <p className="font-semibold text-slate-800 break-words">
                      {parcel.dropoffAddress}
                    </p>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Weight</span>
                    <span className="font-semibold text-slate-800">
                      {parcel.weightKg} kg
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Estimated fee</span>
                    <span className="font-bold text-blue-600">
                      {formatFee(parcel.estimatedFee)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Booked on</span>
                    <span className="font-semibold text-slate-800">
                      {formatDate(parcel.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 flex items-center justify-between">
                <Link
                  to={`/parcels/${parcel.parcelId}`}
                  className="inline-flex items-center space-x-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  to={`/track/${encodeURIComponent(parcel.trackingNumber)}`}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-600 hover:text-blue-600"
                >
                  <span>Track Parcel</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default CustomerDashboard;
