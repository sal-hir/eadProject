import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  Loader2,
  Map,
  LocateFixed,
  Ruler,
  Eye,
  Power,
  Activity,
  Navigation,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  MapContainer,
  TileLayer,
  Circle,
  CircleMarker,
  useMapEvents,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import { zoneApi } from "../../api/adminApi";

// ========================================
// CONSTANTS
// ========================================

const DEFAULT_LOCATION = {
  latitude: 6.9271,
  longitude: 79.8612,
};

const EMPTY_FORM = {
  zoneName: "",
  description: "",
  active: true,
  latitude: DEFAULT_LOCATION.latitude,
  longitude: DEFAULT_LOCATION.longitude,
  radiusKm: 10,
};

// ========================================
// HELPERS
// ========================================

const getErrorMessage = (error, fallback) => {
  if (error?.response?.status === 401) {
    return "Please sign in again. Authentication is required.";
  }

  if (error?.response?.status === 403) {
    return "You do not have permission to manage delivery zones.";
  }

  return error?.response?.data?.message || fallback;
};

const getZonesFromResponse = (response) => {
  const result = response?.data?.data ?? response?.data ?? [];

  if (Array.isArray(result)) return result;

  return result?.content || result?.zones || [];
};

const getZoneId = (zone) => zone?.id ?? zone?._id;

const formatDate = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleDateString();
};

// Approximate area of a circular coverage zone.
const calculateCoverageArea = (radius) => {
  const value = Number(radius);

  if (!Number.isFinite(value) || value <= 0) return 0;

  return Math.PI * value * value;
};

const formatArea = (radius) => {
  const area = calculateCoverageArea(radius);

  return `${area.toFixed(1)} km²`;
};

// ========================================
// MAP COMPONENTS
// ========================================

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

// Update map position when editing a different zone.
function MapPositionUpdater({ latitude, longitude }) {
  const map = useMap();

  useEffect(() => {
    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
    ) {
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
    setForm((previous) => ({
      ...previous,
      ...location,
    }));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5">

      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/75 p-4 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-orange-100/80 p-2.5 text-[#953002] shadow-sm">
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">
              Delivery Coverage Map
            </h3>

            <p className="text-xs text-slate-500">
              {readOnly
                ? "View the selected delivery coverage."
                : "Click the map to select the zone location."}
            </p>
          </div>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => handleLocationSelect(DEFAULT_LOCATION)}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98]"
          >
            <LocateFixed size={15} className="text-slate-500" />
            Reset Location
          </button>
        )}

      </div>

      <div className="relative z-0 h-[320px] w-full">

        {validLocation ? (
          <MapContainer
            center={[latitude, longitude]}
            zoom={11}
            scrollWheelZoom
            className="h-full w-full"
            style={{ height: "100%", width: "100%" }}
          >

            <MapPositionUpdater
              latitude={latitude}
              longitude={longitude}
            />

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {!readOnly && (
              <LocationSelector
                onLocationSelect={handleLocationSelect}
              />
            )}

            <Circle
              center={[latitude, longitude]}
              radius={
                Number.isFinite(radiusKm) && radiusKm > 0
                  ? radiusKm * 1000
                  : 10000
              }
              pathOptions={{
                color: "#953002",
                fillColor: "#953002",
                fillOpacity: 0.12,
                weight: 2,
              }}
            />

            <CircleMarker
              center={[latitude, longitude]}
              radius={9}
              pathOptions={{
                color: "#ffffff",
                weight: 3,
                fillColor: "#953002",
                fillOpacity: 1,
              }}
            />

          </MapContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-rose-500">
            Invalid map coordinates.
          </div>
        )}

      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-slate-100 bg-white p-4">

        <div className="rounded-xl bg-slate-50/50 p-3 border border-slate-100">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Latitude</p>
          <p className="mt-1 text-sm font-bold text-slate-800">
            {validLocation ? latitude.toFixed(6) : "—"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50/50 p-3 border border-slate-100">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Longitude</p>
          <p className="mt-1 text-sm font-bold text-slate-800">
            {validLocation ? longitude.toFixed(6) : "—"}
          </p>
        </div>

      </div>

    </div>
  );
}

// ========================================
// STAT CARD
// ========================================

function StatCard({ title, value, description, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-slate-300">

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </p>

          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            {value}
          </h2>

          <p className="mt-1.5 text-xs font-medium text-slate-500">
            {description}
          </p>
        </div>

        <div className={`rounded-2xl p-3.5 shadow-sm ${color}`}>
          <Icon size={22} />
        </div>
      </div>

    </div>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function ZoneManagement() {
  const [zones, setZones] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Paging states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [editingZone, setEditingZone] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });

  // ========================================
  // FETCH ZONES
  // ========================================

  const fetchZones = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await zoneApi.getAll();

      setZones(getZonesFromResponse(response));
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to load delivery zones.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  // ========================================
  // NOTIFICATIONS
  // ========================================

  const showSuccess = (message) => {
    setSuccess(message);
    setError("");
  };

  // ========================================
  // CREATE MODAL
  // ========================================

  const openCreateModal = () => {
    setEditingZone(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setModalOpen(true);
  };

  // ========================================
  // EDIT MODAL
  // ========================================

  const openEditModal = (zone) => {
    setEditingZone(zone);

    setForm({
      zoneName: zone.zoneName || "",
      description: zone.description || "",
      active: zone.active ?? true,
      latitude: Number(
        zone.latitude ?? DEFAULT_LOCATION.latitude
      ),
      longitude: Number(
        zone.longitude ?? DEFAULT_LOCATION.longitude
      ),
      radiusKm: Number(zone.radiusKm ?? 10),
    });

    setError("");
    setModalOpen(true);
  };

  // ========================================
  // VIEW DETAILS
  // ========================================

  const openDetails = (zone) => {
    setSelectedZone(zone);
    setDetailsOpen(true);
  };

  // ========================================
  // CLOSE MODALS
  // ========================================

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingZone(null);
    setForm({ ...EMPTY_FORM });
    setError("");
  };

  // ========================================
  // FORM HANDLING
  // ========================================

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ========================================
  // BUILD API PAYLOAD
  // ========================================

  const buildPayload = (values) => ({
    zoneName: String(values.zoneName || "").trim(),
    description: String(values.description || "").trim(),
    active: Boolean(values.active),
    latitude: Number(values.latitude),
    longitude: Number(values.longitude),
    radiusKm: Number(values.radiusKm),
  });

  // ========================================
  // CREATE / UPDATE ZONE
  // ========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const payload = buildPayload(form);

    if (!payload.zoneName) {
      setError("Please enter a zone name.");
      return;
    }

    if (
      !Number.isFinite(payload.latitude) ||
      payload.latitude < -90 ||
      payload.latitude > 90
    ) {
      setError("Please select a valid latitude.");
      return;
    }

    if (
      !Number.isFinite(payload.longitude) ||
      payload.longitude < -180 ||
      payload.longitude > 180
    ) {
      setError("Please select a valid longitude.");
      return;
    }

    if (
      !Number.isFinite(payload.radiusKm) ||
      payload.radiusKm <= 0 ||
      payload.radiusKm > 500
    ) {
      setError("Coverage radius must be between 0.1 and 500 km.");
      return;
    }

    try {
      setSaving(true);

      if (editingZone) {
        await zoneApi.update(getZoneId(editingZone), payload);
        showSuccess("Delivery zone updated successfully.");
      } else {
        await zoneApi.create(payload);
        showSuccess("Delivery zone created successfully.");
      }

      setModalOpen(false);
      setEditingZone(null);
      setForm({ ...EMPTY_FORM });

      await fetchZones();
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to save the delivery zone.")
      );
    } finally {
      setSaving(false);
    }
  };

  // ========================================
  // ACTIVATE / DEACTIVATE
  // ========================================

  const handleToggleStatus = async (zone) => {
    const zoneId = getZoneId(zone);
    const newStatus = !zone.active;

    const action = newStatus ? "activate" : "deactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${zone.zoneName}"?`
    );

    if (!confirmed) return;

    try {
      setUpdatingStatusId(zoneId);
      setError("");
      setSuccess("");

      const payload = buildPayload({
        ...zone,
        active: newStatus,
      });

      await zoneApi.update(zoneId, payload);

      showSuccess(
        `${zone.zoneName} ${newStatus ? "activated" : "deactivated"} successfully.`
      );

      await fetchZones();
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to update zone status.")
      );
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // ========================================
  // DELETE ZONE
  // ========================================

  const handleDelete = async (zone) => {
    const confirmed = window.confirm(
      `Permanently delete "${zone.zoneName}"? Only delete zones that are not being used by deliveries or pricing records.`
    );

    if (!confirmed) return;

    try {
      const zoneId = getZoneId(zone);

      setDeletingId(zoneId);
      setError("");
      setSuccess("");

      await zoneApi.delete(zoneId);

      showSuccess("Delivery zone deleted successfully.");

      await fetchZones();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to delete the delivery zone. It may be linked to existing records."
        )
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ========================================
  // FILTER & PAGING ZONES
  // ========================================

  const filteredZones = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return zones.filter((zone) => {
      const matchesSearch =
        !keyword ||
        zone.zoneName?.toLowerCase().includes(keyword) ||
        zone.description?.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && zone.active) ||
        (statusFilter === "INACTIVE" && !zone.active);

      return matchesSearch && matchesStatus;
    });
  }, [zones, search, statusFilter]);

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.ceil(filteredZones.length / pageSize) || 1;

  const paginatedZones = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredZones.slice(start, start + pageSize);
  }, [filteredZones, currentPage, pageSize]);

  // ========================================
  // STATISTICS
  // ========================================

  const activeCount = zones.filter(
    (zone) => Boolean(zone.active)
  ).length;

  const inactiveCount = zones.length - activeCount;

  const totalCoverage = zones
    .filter((zone) => zone.active)
    .reduce(
      (total, zone) =>
        total + calculateCoverageArea(zone.radiusKm),
      0
    );

  // ========================================
  // UI
  // ========================================

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 md:p-8">

      {/* PAGE HEADER */}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Administration</span>
            <span>/</span>
            <span className="text-slate-700">
              Zone Management
            </span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
            Zone Management
          </h1>

          <p className="mt-1.5 text-sm font-medium text-slate-500">
            Manage delivery locations, coverage areas and zone availability.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#953002] px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-orange-900/10 transition-all hover:bg-[#7b2701] hover:shadow hover:shadow-orange-900/20 active:scale-[0.98]"
        >
          <Plus size={18} />
          Add New Zone
        </button>

      </div>

      {/* ALERTS */}

      {success && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm font-medium text-emerald-800 shadow-sm backdrop-blur-sm">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{success}</span>

          <button
            onClick={() => setSuccess("")}
            className="ml-auto rounded-lg p-1 text-emerald-600 transition hover:bg-emerald-100"
            aria-label="Dismiss success message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && !modalOpen && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm font-medium text-rose-800 shadow-sm backdrop-blur-sm">
          <XCircle size={18} className="text-rose-600 shrink-0" />
          <span>{error}</span>

          <button
            onClick={() => setError("")}
            className="ml-auto rounded-lg p-1 text-rose-600 transition hover:bg-rose-100"
            aria-label="Dismiss error message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* STATISTICS */}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="Total Zones"
          value={zones.length}
          description="All registered delivery zones"
          icon={MapPin}
          color="bg-orange-50 text-[#953002]"
        />

        <StatCard
          title="Active Zones"
          value={activeCount}
          description="Available for delivery"
          icon={CheckCircle2}
          color="bg-emerald-50 text-emerald-600"
        />

        <StatCard
          title="Inactive Zones"
          value={inactiveCount}
          description="Currently unavailable"
          icon={XCircle}
          color="bg-slate-100 text-slate-500"
        />

        <StatCard
          title="Active Coverage"
          value={`${totalCoverage.toFixed(1)} km²`}
          description="Approximate combined area"
          icon={Layers}
          color="bg-sky-50 text-sky-600"
        />

      </div>

      {/* TABLE */}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/5">

        {/* TABLE HEADER */}

        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 xl:flex-row xl:items-center xl:justify-between">

          <div>
            <h2 className="text-base font-bold text-slate-900">
              Delivery Zones Directory
            </h2>

            <p className="mt-1 text-xs font-medium text-slate-500">
              View and manage your delivery service areas.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

            {/* SEARCH */}

            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                placeholder="Search zones..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:border-[#953002] focus:ring-2 focus:ring-orange-100 sm:w-60"
              />
            </div>

            {/* STATUS FILTER */}

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-100 focus:bg-white focus:border-[#953002]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>

            {/* REFRESH */}

            <button
              onClick={fetchZones}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={loading ? "animate-spin text-[#953002]" : "text-slate-500"}
              />
              Refresh
            </button>

          </div>

        </div>

        {/* TABLE CONTENT */}

        <div className="overflow-x-auto">

          <table className="w-full min-w-[1050px] text-left border-collapse">

            <thead className="bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Zone Name</th>
                <th className="px-6 py-3.5">Location</th>
                <th className="px-6 py-3.5">Radius</th>
                <th className="px-6 py-3.5">Coverage Area</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Created Date</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-sm">

              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-20 text-center">
                    <Loader2
                      size={32}
                      className="mx-auto animate-spin text-[#953002]"
                    />

                    <p className="mt-3 text-xs font-semibold text-slate-500">
                      Loading delivery zones...
                    </p>
                  </td>
                </tr>
              ) : paginatedZones.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-20 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                      <MapPin size={22} />
                    </div>

                    <p className="text-sm font-bold text-slate-800">
                      No delivery zones found
                    </p>

                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Try adjusting your search query or status filter.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedZones.map((zone) => {
                  const zoneId = getZoneId(zone);

                  return (
                    <tr
                      key={zoneId}
                      className="transition-colors hover:bg-slate-50/60"
                    >

                      {/* NAME */}

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-orange-50 p-2.5 text-[#953002] border border-orange-100/50 shadow-sm">
                            <MapPin size={17} />
                          </div>

                          <div>
                            <p className="font-semibold text-slate-900">
                              {zone.zoneName}
                            </p>

                            <p className="mt-0.5 max-w-[200px] truncate text-xs font-medium text-slate-400">
                              {zone.description || "No description"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* LOCATION */}

                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {zone.latitude != null &&
                        zone.longitude != null ? (
                          <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2.5 py-1 text-slate-700 border border-slate-200/60">
                            <Navigation
                              size={13}
                              className="text-slate-400"
                            />
                            {Number(zone.latitude).toFixed(4)},{" "}
                            {Number(zone.longitude).toFixed(4)}
                          </div>
                        ) : (
                          <span className="text-slate-400">Not selected</span>
                        )}
                      </td>

                      {/* RADIUS */}

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-[#953002] border border-orange-100">
                          <Ruler size={13} />
                          {zone.radiusKm ?? "—"} km
                        </span>
                      </td>

                      {/* AREA */}

                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-800">
                          {zone.radiusKm
                            ? formatArea(zone.radiusKm)
                            : "—"}
                        </p>

                        <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                          Circular estimate
                        </p>
                      </td>

                      {/* STATUS */}

                      <td className="px-6 py-4">
                        {zone.active ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100">
                            <CheckCircle2 size={13} />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                            <XCircle size={13} />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* DATE */}

                      <td className="px-6 py-4 text-xs font-medium text-slate-500">
                        {formatDate(zone.createdAt)}
                      </td>

                      {/* ACTIONS */}

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5">

                          <button
                            onClick={() => openDetails(zone)}
                            title="View details"
                            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            onClick={() => openEditModal(zone)}
                            title="Edit zone"
                            className="rounded-xl border border-slate-200 bg-white p-2 text-sky-600 shadow-sm transition-all hover:border-sky-200 hover:bg-sky-50"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(zone)}
                            disabled={updatingStatusId === zoneId}
                            title={zone.active ? "Deactivate zone" : "Activate zone"}
                            className={`rounded-xl border border-slate-200 bg-white p-2 shadow-sm transition-all disabled:opacity-50 ${
                              zone.active
                                ? "text-amber-600 hover:border-amber-200 hover:bg-amber-50"
                                : "text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50"
                            }`}
                          >
                            {updatingStatusId === zoneId ? (
                              <Loader2
                                size={15}
                                className="animate-spin"
                              />
                            ) : (
                              <Power size={15} />
                            )}
                          </button>

                          <button
                            onClick={() => handleDelete(zone)}
                            disabled={deletingId === zoneId}
                            title="Delete zone"
                            className="rounded-xl border border-slate-200 bg-white p-2 text-rose-600 shadow-sm transition-all hover:border-rose-200 hover:bg-rose-50 disabled:opacity-50"
                          >
                            {deletingId === zoneId ? (
                              <Loader2
                                size={15}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}

            </tbody>

          </table>

        </div>

        {/* TABLE FOOTER & PAGING CONTROLS */}

        <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/50 px-6 py-4 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-slate-800">{filteredZones.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> to <strong className="text-slate-800">{Math.min(currentPage * pageSize, filteredZones.length)}</strong> of <strong className="text-slate-800">{filteredZones.length}</strong> entries {filteredZones.length !== zones.length && `(filtered from ${zones.length} total)`}
            </span>

            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-slate-400">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-[#953002]"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-600 font-medium">
              Page <strong className="text-slate-900">{currentPage}</strong> of <strong className="text-slate-900">{totalPages}</strong>
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
                Previous
              </button>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================
          CREATE / EDIT MODAL
      ======================================== */}

      {modalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm animate-fade-in">

          <div className="my-auto w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-slate-50/50">

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingZone
                    ? "Edit Delivery Zone"
                    : "Create Delivery Zone"}
                </h2>

                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  Configure the delivery zone parameters and coverage area.
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>

            </div>

            {/* FORM */}

            <form onSubmit={handleSubmit}>

              <div className="max-h-[75vh] space-y-6 overflow-y-auto p-6">

                {error && (
                  <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
                    <XCircle size={17} className="text-rose-600 shrink-0" />
                    {error}
                  </div>
                )}

                {/* BASIC DETAILS */}

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Zone Name <span className="text-rose-500">*</span>
                    </label>

                    <input
                      name="zoneName"
                      type="text"
                      value={form.zoneName}
                      onChange={handleChange}
                      placeholder="Example: Colombo Zone"
                      required
                      maxLength={100}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-medium text-slate-800 outline-none transition-all focus:bg-white focus:border-[#953002] focus:ring-2 focus:ring-orange-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Zone Status
                    </label>

                    <select
                      name="active"
                      value={form.active ? "true" : "false"}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          active: event.target.value === "true",
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-semibold text-slate-800 outline-none transition focus:bg-white focus:border-[#953002]"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>

                </div>

                {/* DESCRIPTION */}

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Description
                  </label>

                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Describe the delivery zone..."
                    rows={3}
                    maxLength={500}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-medium text-slate-800 outline-none transition-all focus:bg-white focus:border-[#953002] focus:ring-2 focus:ring-orange-100"
                  />
                </div>

                {/* COVERAGE SETTINGS */}

                <div className="rounded-2xl border border-orange-100 bg-orange-50/30 p-5">

                  <div className="mb-4 flex items-center gap-2">
                    <div className="rounded-lg bg-orange-100 p-1.5 text-[#953002]">
                      <Ruler size={16} />
                    </div>

                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Coverage Settings
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-slate-700">
                        Coverage Radius (KM)
                      </label>

                      <input
                        type="number"
                        name="radiusKm"
                        value={form.radiusKm}
                        onChange={handleChange}
                        min="0.1"
                        max="500"
                        step="0.1"
                        required
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#953002]"
                      />

                      <input
                        type="range"
                        min="1"
                        max="100"
                        step="1"
                        value={Math.min(
                          100,
                          Math.max(1, Number(form.radiusKm) || 1)
                        )}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            radiusKm: event.target.value,
                          }))
                        }
                        className="w-full accent-[#953002] cursor-pointer pt-2"
                      />

                      <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                        <span>1 km</span>
                        <span>100 km</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-orange-100/80 bg-white p-4 shadow-sm flex flex-col justify-center">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Estimated Coverage Area
                      </p>

                      <h3 className="mt-1 text-2xl font-extrabold text-[#953002]">
                        {formatArea(form.radiusKm)}
                      </h3>

                      <p className="mt-1 text-[11px] font-medium text-slate-400">
                        Calculated using π × radius².
                      </p>
                    </div>

                  </div>

                  <p className="mt-4 text-[11px] font-medium leading-relaxed text-slate-500">
                    The radius slider is a quick control. You can also type
                    a custom radius between 0.1 and 500 km.
                  </p>

                </div>

                {/* MAP */}

                <ZoneLocationMap
                  form={form}
                  setForm={setForm}
                />

                {/* STATUS INFORMATION */}

                <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">

                  <div className="rounded-xl bg-orange-100 p-2 text-[#953002] shrink-0 mt-0.5">
                    <Activity size={17} />
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Zone availability guidelines
                    </p>

                    <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-500">
                      Active zones can be used for live delivery operations.
                      Inactive zones remain saved but should not be offered
                      for new orders.
                    </p>
                  </div>

                </div>

              </div>

              {/* FOOTER */}

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/75 px-6 py-4">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#953002] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#7b2701] disabled:opacity-60"
                >
                  {saving && (
                    <Loader2 size={15} className="animate-spin" />
                  )}

                  {saving
                    ? "Saving..."
                    : editingZone
                      ? "Update Zone"
                      : "Create Zone"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* ========================================
          VIEW DETAILS MODAL
      ======================================== */}

      {detailsOpen && selectedZone && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm animate-fade-in">

          <div className="my-auto w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10">

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-slate-50/50">

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Zone Details
                </h2>

                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  Complete information about this delivery zone.
                </p>
              </div>

              <button
                onClick={() => setDetailsOpen(false)}
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>

            </div>

            <div className="max-h-[75vh] space-y-5 overflow-y-auto p-6">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedZone.zoneName}
                  </h3>

                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {selectedZone.description || "No description available"}
                  </p>
                </div>

                {selectedZone.active ? (
                  <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-100">
                    <CheckCircle2 size={15} />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200">
                    <XCircle size={15} />
                    Inactive
                  </span>
                )}

              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Coverage Radius
                  </p>

                  <p className="mt-1.5 text-lg font-extrabold text-slate-900">
                    {selectedZone.radiusKm ?? "—"} km
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Estimated Area
                  </p>

                  <p className="mt-1.5 text-lg font-extrabold text-slate-900">
                    {selectedZone.radiusKm
                      ? formatArea(selectedZone.radiusKm)
                      : "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Created Date
                  </p>

                  <p className="mt-1.5 text-xs font-bold text-slate-900">
                    {formatDate(selectedZone.createdAt)}
                  </p>
                </div>

              </div>

              <ZoneLocationMap
                form={{
                  latitude: Number(
                    selectedZone.latitude ?? DEFAULT_LOCATION.latitude
                  ),
                  longitude: Number(
                    selectedZone.longitude ?? DEFAULT_LOCATION.longitude
                  ),
                  radiusKm: Number(selectedZone.radiusKm ?? 10),
                }}
                setForm={() => {}}
                readOnly
              />

            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/75 px-6 py-4">

              <button
                onClick={() => setDetailsOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
              >
                Close
              </button>

              <button
                onClick={() => {
                  setDetailsOpen(false);
                  openEditModal(selectedZone);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#953002] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#7b2701]"
              >
                <Pencil size={15} />
                Edit Zone
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}