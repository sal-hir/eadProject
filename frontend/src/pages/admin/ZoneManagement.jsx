import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  MapPin,
  X,
  Search,
  CheckCircle2,
  XCircle,
  Map,
  LocateFixed,
  Eye,
  Power,
  Layers,
  AlertCircle,
  Activity,
  CalendarDays,
  Ruler,
} from 'lucide-react';
import {
  MapContainer,
  TileLayer,
  Circle,
  CircleMarker,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { zoneApi } from '../../api/adminApi';
import { Modal, ConfirmDialog } from '../../components/ui';

// ============================================
// CONSTANTS & HELPERS
// ============================================

const DEFAULT_LOCATION = { latitude: 6.9271, longitude: 79.8612 };

const EMPTY_FORM = {
  zoneName: '',
  description: '',
  active: true,
  latitude: DEFAULT_LOCATION.latitude,
  longitude: DEFAULT_LOCATION.longitude,
  radiusKm: 10,
};

const getZoneId = (zone) => zone?.id ?? zone?._id;

const getErrorMessage = (error, fallback) => {
  if (error?.response?.status === 401) return 'Session expired. Please sign in again.';
  if (error?.response?.status === 403) return 'Access denied.';
  return error?.response?.data?.message || fallback;
};

const getZonesFromResponse = (response) => {
  const result = response?.data?.data ?? response?.data ?? [];
  return Array.isArray(result) ? result : result?.content || result?.zones || [];
};

const formatDate = (date) => {
  if (!date) return '—';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? '—'
    : parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatArea = (radius) => {
  const val = Number(radius);
  const area = Number.isFinite(val) && val > 0 ? Math.PI * val * val : 0;
  return `${area.toFixed(1)} km²`;
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-500/10';

// ============================================
// REUSABLE UI COMPONENTS
// ============================================

function StatCard({ title, value, icon: Icon, loading }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50 via-sky-50/90 to-blue-100/60 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md hover:shadow-blue-900/5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-900/70">
            {title}
          </p>
          <p className="mt-2.5 text-2xl font-extrabold tracking-tight text-blue-950 tabular-nums sm:text-3xl">
            {loading ? '—' : value}
          </p>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/90 text-blue-700 shadow-sm ring-1 ring-blue-200/80 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
          <Icon size={23} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        active
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80'
          : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function ActionButton({ icon: Icon, title, onClick, color = 'slate' }) {
  const styles = {
    blue: 'text-blue-600 hover:bg-blue-50 ring-blue-100',
    indigo: 'text-indigo-600 hover:bg-indigo-50 ring-indigo-100',
    green: 'text-emerald-600 hover:bg-emerald-50 ring-emerald-100',
    amber: 'text-amber-600 hover:bg-amber-50 ring-amber-100',
    red: 'text-rose-600 hover:bg-rose-50 ring-rose-100',
  };

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150 hover:ring-1 ${styles[color]}`}
    >
      <Icon size={16} />
    </button>
  );
}

function FormField({ label, required, error, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-600">
          <AlertCircle size={13} />
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================
// MAP HELPERS
// ============================================

function LocationSelector({ onLocationSelect }) {
  useMapEvents({
    click(event) {
      onLocationSelect({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });
  return null;
}

function MapPositionUpdater({ latitude, longitude }) {
  const map = useMap();
  useEffect(() => {
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      map.setView([latitude, longitude], map.getZoom());
    }
  }, [latitude, longitude, map]);
  return null;
}

function ZoneLocationMap({ form, setForm, readOnly = false }) {
  const latitude = Number(form.latitude);
  const longitude = Number(form.longitude);
  const radiusKm = Number(form.radiusKm);

  const validLocation =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  const handleLocationSelect = (location) => {
    if (!readOnly) setForm((prev) => ({ ...prev, ...location }));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <MapPin size={15} className="text-red-600" />
          <span>{readOnly ? 'Coverage Boundary' : 'Click map to set center'}</span>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => handleLocationSelect(DEFAULT_LOCATION)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
          >
            <LocateFixed size={13} />
            Colombo
          </button>
        )}
      </div>

      <div className="relative z-0 h-[250px] w-full">
        {validLocation ? (
          <MapContainer
            center={[latitude, longitude]}
            zoom={11}
            scrollWheelZoom={!readOnly}
            className="h-full w-full"
            style={{ height: '100%', width: '100%' }}
          >
            <MapPositionUpdater latitude={latitude} longitude={longitude} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {!readOnly && <LocationSelector onLocationSelect={handleLocationSelect} />}
            <CircleMarker
              center={[latitude, longitude]}
              radius={8}
              pathOptions={{ color: '#991B1B', fillColor: '#DC2626', fillOpacity: 1, weight: 2.5 }}
            />
            {Number.isFinite(radiusKm) && radiusKm > 0 && (
              <Circle
                center={[latitude, longitude]}
                radius={radiusKm * 1000}
                pathOptions={{
                  color: '#1D4ED8',
                  fillColor: '#3B82F6',
                  fillOpacity: 0.14,
                  weight: 2,
                  dashArray: '5, 6',
                }}
              />
            )}
          </MapContainer>
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-xs text-slate-400">
            Enter valid coordinates to preview map.
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs">
        <div>
          <span className="block text-[10px] font-semibold uppercase text-slate-400">Lat</span>
          <span className="font-bold text-slate-800">{validLocation ? latitude.toFixed(4) : '—'}</span>
        </div>
        <div>
          <span className="block text-[10px] font-semibold uppercase text-slate-400">Lng</span>
          <span className="font-bold text-slate-800">{validLocation ? longitude.toFixed(4) : '—'}</span>
        </div>
        <div>
          <span className="block text-[10px] font-semibold uppercase text-slate-400">Radius</span>
          <span className="font-bold text-slate-800">{Number.isFinite(radiusKm) ? `${radiusKm} km` : '—'}</span>
        </div>
        <div>
          <span className="block text-[10px] font-semibold uppercase text-slate-400">Area</span>
          <span className="font-bold text-blue-800">{formatArea(radiusKm)}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ZoneManagement() {
  const [zones, setZones] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [viewingZone, setViewingZone] = useState(null);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});

  const fetchZones = useCallback(async (isSilent = false) => {
    try {
      setError('');
      if (!isSilent) setLoading(true);
      const response = await zoneApi.getAll();
      setZones(getZonesFromResponse(response));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load delivery zones.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const totalZones = zones.length;
  const activeZones = zones.filter((z) => z.active === true).length;
  const inactiveZones = totalZones - activeZones;

  const filteredZones = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    return zones.filter((zone) => {
      const matchesSearch =
        !query ||
        String(zone.zoneName || '').toLowerCase().includes(query) ||
        String(zone.description || '').toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && zone.active === true) ||
        (statusFilter === 'INACTIVE' && zone.active === false);

      return matchesSearch && matchesStatus;
    });
  }, [zones, searchTerm, statusFilter]);

  const hasActiveFilters = searchTerm || statusFilter !== 'ALL';

  const validateForm = () => {
    const errors = {};
    const zoneName = String(formData.zoneName || '');

    if (!zoneName.trim()) errors.zoneName = 'Zone name is required.';
    else if (zoneName.trim().length > 100) errors.zoneName = 'Max 100 characters.';

    if (formData.description && formData.description.length > 500) {
      errors.description = 'Max 500 characters.';
    }

    const latitude = Number(formData.latitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      errors.latitude = 'Must be between -90 and 90.';
    }

    const longitude = Number(formData.longitude);
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      errors.longitude = 'Must be between -180 and 180.';
    }

    const radius = Number(formData.radiusKm);
    if (!Number.isFinite(radius) || radius < 0.1 || radius > 500) {
      errors.radiusKm = 'Must be between 0.1 and 500 km.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenAdd = () => {
    setEditingZone(null);
    setFormData({ ...EMPTY_FORM });
    setFormErrors({});
    setShowModal(true);
  };

  const handleOpenEdit = (zone) => {
    setEditingZone(zone);
    setFormData({
      zoneName: zone.zoneName || '',
      description: zone.description || '',
      active: zone.active ?? true,
      latitude: Number(zone.latitude ?? DEFAULT_LOCATION.latitude),
      longitude: Number(zone.longitude ?? DEFAULT_LOCATION.longitude),
      radiusKm: Number(zone.radiusKm ?? 10),
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleSaveSubmit = async (e) => {
    e.preventDefault();
    if (saving || !validateForm()) return;

    setSaving(true);
    setError('');
    try {
      const payload = {
        zoneName: formData.zoneName.trim(),
        description: formData.description.trim() || undefined,
        active: formData.active,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        radiusKm: Number(formData.radiusKm),
      };

      if (editingZone) {
        await zoneApi.update(getZoneId(editingZone), payload);
        setSuccess(`Zone "${payload.zoneName}" updated.`);
      } else {
        await zoneApi.create(payload);
        setSuccess(`Zone "${payload.zoneName}" created.`);
      }

      setShowModal(false);
      await fetchZones(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save zone.'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmToggle = async () => {
    if (!confirmToggle || saving) return;
    setSaving(true);
    setError('');
    try {
      await zoneApi.update(getZoneId(confirmToggle), {
        ...confirmToggle,
        active: !confirmToggle.active,
      });
      setSuccess(`Zone ${!confirmToggle.active ? 'activated' : 'deactivated'}.`);
      setConfirmToggle(null);
      await fetchZones(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update status.'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete || saving) return;
    setSaving(true);
    setError('');
    try {
      await zoneApi.delete(getZoneId(confirmDelete));
      setSuccess(`Zone "${confirmDelete.zoneName}" deleted.`);
      setConfirmDelete(null);
      await fetchZones(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete zone.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6 pb-12">
      {/* HEADER — ONLY DARK BLUE TITLE & CREATE ZONE BUTTON */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-900 text-white shadow-md shadow-blue-900/20">
          <MapPin size={24} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-blue-950 sm:text-3xl">
            Zone Management
          </h1>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-all duration-200 hover:bg-blue-800 hover:shadow-lg active:scale-[0.98]"
        >
          <Plus size={18} strokeWidth={2.5} />
          Create Zone
        </button>
      </div>

      {/* ALERTS */}
      {success && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button type="button" onClick={() => setSuccess('')} className="rounded-lg p-1 hover:bg-emerald-100">
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError('')} className="rounded-lg p-1 hover:bg-rose-100">
            <X size={16} />
          </button>
        </div>
      )}

      {/* LIGHT-BLUE KPI CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Total Zones" value={totalZones} icon={Layers} loading={loading} />
        <StatCard title="Active Zones" value={activeZones} icon={CheckCircle2} loading={loading} />
        <StatCard title="Inactive Zones" value={inactiveZones} icon={XCircle} loading={loading} />
      </div>

      {/* FILTERS */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search zone name or description..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-700 focus:bg-white"
            >
              <option value="ALL">All Zones ({totalZones})</option>
              <option value="ACTIVE">Active ({activeZones})</option>
              <option value="INACTIVE">Inactive ({inactiveZones})</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                }}
                className="rounded-xl px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-900">
            Zone Directory <span className="ml-1.5 font-medium text-slate-400">({filteredZones.length})</span>
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">
            <Activity size={14} />
            {activeZones} Active
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <RefreshCw size={26} className="animate-spin text-blue-800" />
            <p className="mt-3 text-sm font-medium text-slate-500">Loading delivery zones...</p>
          </div>
        ) : filteredZones.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
              <MapPin size={26} />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">No Zones Found</h3>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              {hasActiveFilters ? 'Try adjusting your search or filter criteria.' : 'Create your first delivery zone to get started.'}
            </p>
            {!hasActiveFilters && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
              >
                <Plus size={16} />
                Create Zone
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3.5">Zone Name</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5">Coverage</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Created</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredZones.map((zone) => {
                  const id = getZoneId(zone);
                  const isActive = zone.active === true;

                  return (
                    <tr key={id} className="transition-colors hover:bg-blue-50/40">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <MapPin size={17} />
                          </div>
                          <span className="text-sm font-bold text-slate-900">{zone.zoneName}</span>
                        </div>
                      </td>

                      <td className="max-w-xs px-6 py-4">
                        <p className="truncate text-sm text-slate-600">
                          {zone.description || '—'}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 tabular-nums">
                          <Ruler size={13} className="text-slate-500" />
                          <span>{zone.radiusKm ?? '—'} km</span>
                          <span className="text-slate-400">({formatArea(zone.radiusKm)})</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge active={isActive} />
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                          <CalendarDays size={14} className="text-slate-400" />
                          {formatDate(zone.createdAt)}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <ActionButton
                            icon={Eye}
                            title="View Details"
                            color="blue"
                            onClick={() => setViewingZone(zone)}
                          />
                          <ActionButton
                            icon={Pencil}
                            title="Edit Zone"
                            color="indigo"
                            onClick={() => handleOpenEdit(zone)}
                          />
                          <ActionButton
                            icon={Power}
                            title={isActive ? 'Deactivate' : 'Activate'}
                            color={isActive ? 'amber' : 'green'}
                            onClick={() => setConfirmToggle(zone)}
                          />
                          <ActionButton
                            icon={Trash2}
                            title="Delete Zone"
                            color="red"
                            onClick={() => setConfirmDelete(zone)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <Modal
          open={showModal}
          onClose={() => !saving && setShowModal(false)}
          title={editingZone ? `Edit Zone: ${editingZone.zoneName}` : 'Create Delivery Zone'}
          className="max-w-3xl"
        >
          <form onSubmit={handleSaveSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Zone Name" required error={formErrors.zoneName}>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={formData.zoneName}
                  onChange={(e) => setFormData({ ...formData, zoneName: e.target.value })}
                  placeholder="e.g. Colombo Metro"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Coverage Radius (km)" required error={formErrors.radiusKm}>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="500"
                  required
                  value={formData.radiusKm}
                  onChange={(e) => setFormData({ ...formData, radiusKm: e.target.value })}
                  placeholder="10"
                  className={inputClass}
                />
              </FormField>
            </div>

            <FormField label="Description" error={formErrors.description}>
              <textarea
                rows={2}
                maxLength={500}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Covered districts or operational notes..."
                className={`${inputClass} resize-none`}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Center Latitude" required error={formErrors.latitude}>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="6.9271"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Center Longitude" required error={formErrors.longitude}>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="79.8612"
                  className={inputClass}
                />
              </FormField>
            </div>

            <ZoneLocationMap form={formData} setForm={setFormData} />

            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-sm font-semibold text-slate-800">Active Zone</span>
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-900 accent-blue-900"
              />
            </label>

            <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
              >
                {saving ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {saving ? 'Saving...' : editingZone ? 'Save Changes' : 'Create Zone'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* VIEW MODAL */}
      {viewingZone && (
        <Modal
          open={Boolean(viewingZone)}
          onClose={() => setViewingZone(null)}
          title={viewingZone.zoneName}
          className="max-w-2xl"
        >
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-400">Status</p>
                <div className="mt-1.5">
                  <StatusBadge active={viewingZone.active === true} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-400">Radius</p>
                <p className="mt-1.5 text-sm font-bold text-slate-900">
                  {viewingZone.radiusKm ?? 0} km ({formatArea(viewingZone.radiusKm)})
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-400">Created</p>
                <p className="mt-1.5 text-sm font-semibold text-slate-800">
                  {formatDate(viewingZone.createdAt)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-400">Updated</p>
                <p className="mt-1.5 text-sm font-semibold text-slate-800">
                  {formatDate(viewingZone.updatedAt)}
                </p>
              </div>
            </div>

            {viewingZone.description && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-700">
                {viewingZone.description}
              </div>
            )}

            <ZoneLocationMap
              form={{
                latitude: viewingZone.latitude ?? DEFAULT_LOCATION.latitude,
                longitude: viewingZone.longitude ?? DEFAULT_LOCATION.longitude,
                radiusKm: viewingZone.radiusKm ?? 10,
              }}
              readOnly
            />

            <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setViewingZone(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const selected = viewingZone;
                  setViewingZone(null);
                  handleOpenEdit(selected);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
              >
                <Pencil size={15} />
                Edit Zone
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* TOGGLE DIALOG */}
      {confirmToggle && (
        <ConfirmDialog
          open={Boolean(confirmToggle)}
          onClose={() => !saving && setConfirmToggle(null)}
          onConfirm={handleConfirmToggle}
          title={confirmToggle.active ? 'Deactivate Zone' : 'Activate Zone'}
          confirmLabel={confirmToggle.active ? 'Deactivate' : 'Activate'}
          busy={saving}
          danger={confirmToggle.active}
        >
          <p className="text-sm text-slate-700">
            {confirmToggle.active ? 'Deactivate' : 'Activate'}{' '}
            <strong>{confirmToggle.zoneName}</strong>?
          </p>
        </ConfirmDialog>
      )}

      {/* DELETE DIALOG */}
      {confirmDelete && (
        <ConfirmDialog
          open={Boolean(confirmDelete)}
          onClose={() => !saving && setConfirmDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Zone"
          confirmLabel="Delete"
          busy={saving}
          danger
        >
          <p className="text-sm text-slate-700">
            Permanently delete <strong>{confirmDelete.zoneName}</strong>? Any dependent pricing rules may be affected.
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}