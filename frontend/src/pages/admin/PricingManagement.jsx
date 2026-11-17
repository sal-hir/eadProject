import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  DollarSign,
  MapPin,
  Weight,
  CheckCircle2,
  XCircle,
  Copy,
  History,
  Download,
  TrendingUp,
  AlertCircle,
  Package,
  Filter,
  Wallet,
  Layers,
  Clock3,
  Ban,
  ShieldAlert,
} from "lucide-react";

import { pricingApi, zoneApi } from "../../api/adminApi";

const emptyForm = {
  zoneId: "",
  minWeight: "",
  maxWeight: "",
  deliveryFee: "",
  active: true,
};

const getResponseData = (response) => {
  let data = response?.data;

  if (data?.data !== undefined) {
    data = data.data;
  }

  return data;
};

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  "Something went wrong. Please try again.";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatDate = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-LK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/*
 * Check whether two weight ranges overlap.
 *
 * Example:
 * Existing: 0 - 5 kg
 * New:      3 - 8 kg
 * Result:   Overlap
 *
 * Existing: 0 - 5 kg
 * New:      5 - 10 kg
 * Result:   No overlap
 */
const rangesOverlap = (min1, max1, min2, max2) => {
  return min1 < max2 && min2 < max1;
};

export default function PricingManagement() {
  const [pricingRates, setPricingRates] = useState([]);
  const [zones, setZones] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [zoneFilter, setZoneFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("zone");

  const [showModal, setShowModal] = useState(false);
  const [editingRate, setEditingRate] = useState(null);

  const [formData, setFormData] = useState(emptyForm);

  const [confirmAction, setConfirmAction] = useState(null);

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);

  // --------------------------------------------------
  // FETCH DATA
  // --------------------------------------------------

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [pricingResponse, zoneResponse] = await Promise.all([
        pricingApi.getAll(),
        zoneApi.getAll(),
      ]);

      const pricingData = getResponseData(pricingResponse);
      const zoneData = getResponseData(zoneResponse);

      setPricingRates(
        Array.isArray(pricingData)
          ? pricingData
          : pricingData?.content || pricingData?.items || []
      );

      setZones(
        Array.isArray(zoneData)
          ? zoneData
          : zoneData?.content || zoneData?.items || []
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!success) return;

    const timer = setTimeout(() => {
      setSuccess("");
    }, 3500);

    return () => clearTimeout(timer);
  }, [success]);

  // --------------------------------------------------
  // SUMMARY
  // --------------------------------------------------

  const totalRates = pricingRates.length;

  const activeRates = pricingRates.filter(
    (rate) => rate.active === true
  ).length;

  const inactiveRates = pricingRates.filter(
    (rate) => rate.active === false
  ).length;

  const averageFee = totalRates
    ? pricingRates.reduce(
        (sum, rate) => sum + Number(rate.deliveryFee || 0),
        0
      ) / totalRates
    : 0;

  // --------------------------------------------------
  // FILTER AND SORT
  // --------------------------------------------------

  const filteredRates = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    const result = pricingRates.filter((rate) => {
      const matchesSearch =
        (rate.zoneName || "").toLowerCase().includes(search) ||
        String(rate.minWeight ?? "").includes(search) ||
        String(rate.maxWeight ?? "").includes(search) ||
        String(rate.deliveryFee ?? "").includes(search);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && rate.active === true) ||
        (statusFilter === "INACTIVE" && rate.active === false);

      const matchesZone =
        zoneFilter === "ALL" ||
        String(rate.zoneId) === String(zoneFilter);

      return matchesSearch && matchesStatus && matchesZone;
    });

    result.sort((a, b) => {
      if (sortBy === "zone") {
        return (a.zoneName || "").localeCompare(b.zoneName || "");
      }

      if (sortBy === "fee-low") {
        return Number(a.deliveryFee) - Number(b.deliveryFee);
      }

      if (sortBy === "fee-high") {
        return Number(b.deliveryFee) - Number(a.deliveryFee);
      }

      if (sortBy === "weight") {
        return Number(a.minWeight) - Number(b.minWeight);
      }

      return 0;
    });

    return result;
  }, [pricingRates, searchTerm, statusFilter, zoneFilter, sortBy]);

  // --------------------------------------------------
  // HISTORY
  // --------------------------------------------------

  const addHistory = (action, rate) => {
    setHistory((previous) => [
      {
        id: Date.now(),
        action,
        zoneName: rate.zoneName || "Unknown zone",
        date: new Date().toISOString(),
        fee: rate.deliveryFee,
      },
      ...previous,
    ]);
  };

  // --------------------------------------------------
  // MODAL HANDLERS
  // --------------------------------------------------

  const openCreateModal = () => {
    setEditingRate(null);

    setFormData({
      ...emptyForm,
      zoneId: zoneFilter !== "ALL" ? zoneFilter : "",
    });

    setError("");
    setShowModal(true);
  };

  const openEditModal = (rate) => {
    setEditingRate(rate);

    setFormData({
      zoneId: rate.zoneId || "",
      minWeight: rate.minWeight ?? "",
      maxWeight: rate.maxWeight ?? "",
      deliveryFee: rate.deliveryFee ?? "",
      active: rate.active ?? true,
    });

    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingRate(null);
    setFormData(emptyForm);
    setError("");
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // --------------------------------------------------
  // DUPLICATE / OVERLAPPING WEIGHT VALIDATION
  // --------------------------------------------------

  const validateWeightRange = () => {
    const selectedZoneId = String(formData.zoneId);

    const newMin = Number(formData.minWeight);
    const newMax = Number(formData.maxWeight);

    /*
     * Only compare pricing records belonging
     * to the selected delivery zone.
     *
     * Exclude the current record when editing.
     */
    const sameZoneRates = pricingRates.filter((rate) => {
      const sameZone =
        String(rate.zoneId) === selectedZoneId;

      const isCurrentRecord =
        editingRate &&
        String(rate.id) === String(editingRate.id);

      return sameZone && !isCurrentRecord;
    });

    for (const existingRate of sameZoneRates) {
      const existingMin = Number(existingRate.minWeight);
      const existingMax = Number(existingRate.maxWeight);

      // Check duplicate minimum weight.
      if (newMin === existingMin) {
        return {
          valid: false,
          message:
            `Minimum weight ${newMin} kg already exists in this delivery zone. ` +
            `Existing range: ${existingMin}–${existingMax} kg.`,
        };
      }

      // Check overlapping weight ranges.
      if (
        rangesOverlap(
          newMin,
          newMax,
          existingMin,
          existingMax
        )
      ) {
        return {
          valid: false,
          message:
            `This weight range overlaps with an existing pricing rate ` +
            `(${existingMin}–${existingMax} kg). Please choose a different weight range.`,
        };
      }
    }

    return {
      valid: true,
      message: "",
    };
  };

  // --------------------------------------------------
  // CREATE / UPDATE PRICING
  // --------------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const minWeight = Number(formData.minWeight);
    const maxWeight = Number(formData.maxWeight);
    const deliveryFee = Number(formData.deliveryFee);

    if (!formData.zoneId) {
      setError("Please select a delivery zone.");
      return;
    }

    if (
      formData.minWeight === "" ||
      formData.maxWeight === "" ||
      formData.deliveryFee === ""
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (
      !Number.isFinite(minWeight) ||
      !Number.isFinite(maxWeight) ||
      !Number.isFinite(deliveryFee) ||
      minWeight < 0 ||
      maxWeight <= minWeight ||
      deliveryFee < 0
    ) {
      setError(
        "Enter valid values. Maximum weight must be greater than minimum weight."
      );
      return;
    }

    // IMPORTANT:
    // Prevent duplicate minimum weights and overlapping ranges.
    const validation = validateWeightRange();

    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    const requestData = {
      zoneId: formData.zoneId,
      minWeight,
      maxWeight,
      deliveryFee,
    };

    if (editingRate) {
      requestData.active = formData.active;
    }

    try {
      setSaving(true);

      if (editingRate) {
        await pricingApi.update(editingRate.id, requestData);

        addHistory("Updated", {
          ...editingRate,
          deliveryFee,
        });

        setSuccess("Pricing rate updated successfully.");
      } else {
        await pricingApi.create(requestData);

        const zoneName = zones.find(
          (zone) =>
            String(zone.id) === String(formData.zoneId)
        )?.zoneName;

        addHistory("Created", {
          zoneName: zoneName || "Unknown zone",
          deliveryFee,
        });

        setSuccess("New pricing rate created successfully.");
      }

      setShowModal(false);
      setEditingRate(null);
      setFormData(emptyForm);

      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // DELETE
  // --------------------------------------------------

  const handleDelete = async (rate) => {
    try {
      setError("");

      await pricingApi.delete(rate.id);

      addHistory("Deleted", rate);

      setConfirmAction(null);
      setSuccess("Pricing rate deleted successfully.");

      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
      setConfirmAction(null);
    }
  };

  // --------------------------------------------------
  // ACTIVATE / DEACTIVATE
  // --------------------------------------------------

  const handleToggleStatus = async (rate) => {
    try {
      setError("");

      await pricingApi.update(rate.id, {
        zoneId: rate.zoneId,
        minWeight: Number(rate.minWeight),
        maxWeight: Number(rate.maxWeight),
        deliveryFee: Number(rate.deliveryFee),
        active: !rate.active,
      });

      addHistory(
        rate.active ? "Deactivated" : "Activated",
        rate
      );

      setConfirmAction(null);

      setSuccess(
        rate.active
          ? "Pricing rate deactivated."
          : "Pricing rate activated."
      );

      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
      setConfirmAction(null);
    }
  };

  // --------------------------------------------------
  // DUPLICATE
  // --------------------------------------------------

  const handleDuplicate = (rate) => {
    setEditingRate(null);

    setFormData({
      zoneId: rate.zoneId || "",
      minWeight: rate.minWeight,
      maxWeight: rate.maxWeight,
      deliveryFee: rate.deliveryFee,
      active: true,
    });

    setError("");
    setShowModal(true);
  };

  // --------------------------------------------------
  // CSV EXPORT
  // --------------------------------------------------

  const exportCSV = () => {
    const headers = [
      "Zone",
      "Minimum Weight (kg)",
      "Maximum Weight (kg)",
      "Delivery Fee (LKR)",
      "Status",
    ];

    const rows = filteredRates.map((rate) => [
      rate.zoneName || "",
      rate.minWeight,
      rate.maxWeight,
      rate.deliveryFee,
      rate.active ? "Active" : "Inactive",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "swiftdrop-pricing.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setZoneFilter("ALL");
    setStatusFilter("ALL");
    setSortBy("zone");
  };

  const selectedZoneName =
    zoneFilter === "ALL"
      ? "All delivery zones"
      : zones.find(
          (zone) => String(zone.id) === String(zoneFilter)
        )?.zoneName || "Selected zone";

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-[#F4F7FE] to-[#EBEFFE] px-3 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">

        {/* PAGE HEADER */}

        <header className="relative overflow-hidden rounded-3xl border border-blue-100/80 bg-white p-6 shadow-xl shadow-blue-900/[0.03] sm:p-8 lg:flex lg:items-center lg:justify-between">
          <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-gradient-to-br from-blue-500/10 to-indigo-500/5 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-blue-600">
              <span>Admin</span>
              <span>/</span>
              <span className="text-indigo-600">Pricing</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
                <Wallet size={26} />
              </div>

              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  Pricing management
                </h1>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  Manage delivery charges and weight-based rates for each zone.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 relative z-10 lg:mt-0">
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm transition-all duration-200 hover:bg-blue-50/50 hover:border-blue-200 hover:text-blue-600 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin text-blue-600" : ""}
              />
              Refresh
            </button>

            <button
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/35 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98]"
            >
              <Plus size={18} />
              Add pricing rate
            </button>
          </div>
        </header>

        {error && !showModal && (
          <Alert
            type="error"
            message={error}
            onClose={() => setError("")}
          />
        )}

        {success && (
          <Alert
            type="success"
            message={success}
            onClose={() => setSuccess("")}
          />
        )}

        {/* SUMMARY CARDS */}

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total pricing rates"
            value={totalRates}
            detail="All configured rates"
            icon={<Layers size={22} />}
            tone="blue"
          />

          <SummaryCard
            label="Active rates"
            value={activeRates}
            detail="Currently available"
            icon={<CheckCircle2 size={22} />}
            tone="green"
          />

          <SummaryCard
            label="Inactive rates"
            value={inactiveRates}
            detail="Currently disabled"
            icon={<Ban size={22} />}
            tone="slate"
          />

          <SummaryCard
            label="Average delivery fee"
            value={formatCurrency(averageFee)}
            detail="Across all pricing rates"
            icon={<TrendingUp size={22} />}
            tone="violet"
          />
        </section>

        {/* DELIVERY ZONES */}

        <section className="space-y-3.5">
          <div className="flex flex-wrap items-end justify-between gap-2 px-1">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Delivery zones
              </h2>

              <p className="mt-0.5 text-sm text-slate-500">
                Choose a zone to view its pricing rates.
              </p>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-100">
              {zones.length} zones available
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-blue-100 bg-white p-10 text-center text-sm font-medium text-slate-500 shadow-sm">
              <RefreshCw
                size={22}
                className="mx-auto mb-3 animate-spin text-blue-600"
              />
              Loading zones...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <ZoneCard
                title="All zones"
                count={totalRates}
                subtitle="View every pricing rate"
                selected={zoneFilter === "ALL"}
                onClick={() => setZoneFilter("ALL")}
                icon={<Layers size={19} />}
              />

              {zones.map((zone) => {
                const zoneRates = pricingRates.filter(
                  (rate) =>
                    String(rate.zoneId) === String(zone.id)
                );

                const activeCount = zoneRates.filter(
                  (rate) => rate.active === true
                ).length;

                return (
                  <ZoneCard
                    key={zone.id}
                    title={zone.zoneName}
                    count={zoneRates.length}
                    subtitle={`${activeCount} active rate${activeCount === 1 ? "" : "s"}`}
                    selected={
                      String(zoneFilter) === String(zone.id)
                    }
                    onClick={() =>
                      setZoneFilter(String(zone.id))
                    }
                    icon={<MapPin size={19} />}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* PRICING TABLE */}

        <section className="overflow-hidden rounded-3xl border border-blue-100/80 bg-white shadow-xl shadow-blue-900/[0.03]">
          <div className="border-b border-slate-100 p-5 sm:p-8">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
                    <Package size={20} />
                  </div>

                  <h2 className="text-xl font-black text-slate-900">
                    {selectedZoneName}
                  </h2>
                </div>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  Pricing configurations and delivery charges.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={() => setShowHistory(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all duration-200 hover:bg-blue-50/50 hover:border-blue-200 hover:text-blue-600"
                >
                  <History size={16} className="text-blue-600" />
                  History
                </button>

                <button
                  onClick={exportCSV}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all duration-200 hover:bg-blue-50/50 hover:border-blue-200 hover:text-blue-600"
                >
                  <Download size={16} className="text-blue-600" />
                  Export CSV
                </button>
              </div>
            </div>

            {/* FILTERS */}

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.6fr)_minmax(150px,1fr)_minmax(140px,1fr)_minmax(160px,1fr)_auto]">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500"
                />

                <input
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(e.target.value)
                  }
                  placeholder="Search zone, weight or fee..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-4 text-sm font-medium outline-none transition-all duration-200 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <select
                value={zoneFilter}
                onChange={(e) =>
                  setZoneFilter(e.target.value)
                }
                className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-3 text-sm font-medium text-slate-700 outline-none transition-all duration-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="ALL">All delivery zones</option>

                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.zoneName}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
                className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-3 text-sm font-medium text-slate-700 outline-none transition-all duration-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-3 text-sm font-medium text-slate-700 outline-none transition-all duration-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="zone">Sort: Zone name</option>
                <option value="fee-low">Fee: Low to high</option>
                <option value="fee-high">Fee: High to low</option>
                <option value="weight">Sort: Weight</option>
              </select>

              <button
                onClick={clearFilters}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition-all duration-200 hover:bg-blue-100"
              >
                <X size={16} />
                Clear
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-400">
              <span>
                Showing{" "}
                <strong className="text-slate-800">
                  {filteredRates.length}
                </strong>{" "}
                of{" "}
                <strong className="text-slate-800">
                  {totalRates}
                </strong>{" "}
                pricing rates
              </span>

              <span className="inline-flex items-center gap-1.5 text-blue-600">
                <Filter size={13} />
                Filters apply to all records
              </span>
            </div>
          </div>

          {/* TABLE CONTENT */}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <RefreshCw
                size={28}
                className="mb-3 animate-spin text-blue-600"
              />

              <p className="text-sm font-bold text-slate-800">
                Loading pricing rates
              </p>

              <p className="mt-1 text-xs">
                Please wait a moment.
              </p>
            </div>
          ) : filteredRates.length === 0 ? (
            <div className="px-5 py-20 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
                <Package size={28} />
              </div>

              <h3 className="text-base font-black text-slate-900">
                No pricing rates found
              </h3>

              <p className="mx-auto mt-1 max-w-sm text-sm font-medium text-slate-500">
                Try changing your filters or add a new pricing rate for this zone.
              </p>

              <button
                onClick={openCreateModal}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:from-blue-700 hover:to-indigo-700"
              >
                <Plus size={18} />
                Add pricing rate
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto bg-gradient-to-br from-slate-50/50 via-blue-50/20 to-indigo-50/20 p-3 sm:p-5">
              <table className="w-full min-w-[900px] border-separate border-spacing-y-2.5 text-left text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-[11px] font-black uppercase tracking-wider text-white shadow-md">
                    <th className="rounded-l-xl px-4 py-3.5">
                      Delivery zone
                    </th>

                    <th className="px-3.5 py-3.5">
                      Weight range
                    </th>

                    <th className="px-3.5 py-3.5">
                      Minimum weight
                    </th>

                    <th className="px-3.5 py-3.5">
                      Maximum weight
                    </th>

                    <th className="px-3.5 py-3.5">
                      Delivery fee
                    </th>

                    <th className="px-3.5 py-3.5">
                      Status
                    </th>

                    <th className="rounded-r-xl px-4 py-3.5 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRates.map((rate, index) => (
                    <tr
                      key={rate.id}
                      className="group transition-all duration-200 bg-white shadow-sm hover:shadow-md hover:bg-blue-50/40"
                    >
                      {/* DELIVERY ZONE */}
                      <td className="rounded-l-xl px-4 py-3.5 border-y border-l border-slate-100 group-hover:border-blue-100">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-sm transition-transform duration-200 group-hover:scale-105">
                            <MapPin size={17} />
                          </div>

                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">
                              {rate.zoneName || "Unknown zone"}
                            </p>

                            <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                              ID: {rate.zoneId || "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* WEIGHT RANGE */}
                      <td className="px-3.5 py-3.5 border-y border-slate-100 group-hover:border-blue-100 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-2.5 py-1.5 text-xs font-black text-blue-700 shadow-xs">
                          <Weight size={13} className="text-blue-500" />
                          {rate.minWeight}–{rate.maxWeight} kg
                        </span>
                      </td>

                      {/* MINIMUM WEIGHT */}
                      <td className="px-3.5 py-3.5 border-y border-slate-100 group-hover:border-blue-100 whitespace-nowrap">
                        <span className="font-bold text-slate-700">
                          {rate.minWeight} kg
                        </span>
                      </td>

                      {/* MAXIMUM WEIGHT */}
                      <td className="px-3.5 py-3.5 border-y border-slate-100 group-hover:border-blue-100 whitespace-nowrap">
                        <span className="font-bold text-slate-700">
                          {rate.maxWeight} kg
                        </span>
                      </td>

                      {/* DELIVERY FEE */}
                      <td className="px-3.5 py-3.5 border-y border-slate-100 group-hover:border-blue-100 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                            {formatCurrency(rate.deliveryFee)}
                          </p>

                          <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                            Per delivery
                          </p>
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="px-3.5 py-3.5 border-y border-slate-100 group-hover:border-blue-100 whitespace-nowrap">
                        <StatusBadge active={rate.active} />
                      </td>

                      {/* ACTIONS */}
                      <td className="rounded-r-xl px-4 py-3.5 border-y border-r border-slate-100 group-hover:border-blue-100 whitespace-nowrap">
                        <div className="flex justify-end gap-1">
                          <IconButton
                            title="Duplicate"
                            onClick={() =>
                              handleDuplicate(rate)
                            }
                          >
                            <Copy size={15} />
                          </IconButton>

                          <IconButton
                            title="Edit"
                            tone="blue"
                            onClick={() =>
                              openEditModal(rate)
                            }
                          >
                            <Pencil size={15} />
                          </IconButton>

                          <IconButton
                            title={
                              rate.active
                                ? "Deactivate"
                                : "Activate"
                            }
                            tone="amber"
                            onClick={() =>
                              setConfirmAction({
                                type: "toggle",
                                rate,
                              })
                            }
                          >
                            {rate.active ? (
                              <XCircle size={15} />
                            ) : (
                              <CheckCircle2 size={15} />
                            )}
                          </IconButton>

                          <IconButton
                            title="Delete"
                            tone="red"
                            onClick={() =>
                              setConfirmAction({
                                type: "delete",
                                rate,
                              })
                            }
                          >
                            <Trash2 size={15} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-6 py-4 text-xs font-semibold text-slate-500">
            <span>
              {filteredRates.length} pricing record
              {filteredRates.length === 1 ? "" : "s"} displayed
            </span>

            <span className="inline-flex items-center gap-2">
              <CircleStatus />
              Data synchronized securely
            </span>
          </div>
        </section>
      </div>

      {/* CREATE / EDIT MODAL */}

      {showModal && (
        <Modal onClose={closeModal} wide>
          <div className="border-b border-slate-100 px-6 py-5 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100/80 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-blue-800">
                  <DollarSign size={13} />
                  Pricing configuration
                </span>

                <h2 className="mt-3 text-xl font-black text-slate-900">
                  {editingRate
                    ? "Edit pricing rate"
                    : "Create pricing rate"}
                </h2>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  Set the delivery fee for a parcel weight range and zone.
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-6 sm:p-8">

            {error && (
              <Alert
                type="error"
                message={error}
                onClose={() => setError("")}
              />
            )}

            {/* VALIDATION INFORMATION */}

            <div className="flex gap-3.5 rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50 to-indigo-50/50 p-4.5 shadow-xs">
              <ShieldAlert
                size={20}
                className="mt-0.5 shrink-0 text-blue-600"
              />

              <div>
                <p className="text-sm font-bold text-blue-950">
                  Weight range restrictions
                </p>

                <p className="mt-1 text-xs font-medium leading-relaxed text-blue-900/80">
                  Each delivery zone must have unique minimum weights and non-overlapping weight ranges.
                  Different delivery zones can use the same weight ranges.
                </p>
              </div>
            </div>

            {/* ZONE */}

            <FormField label="Delivery zone" required>
              <select
                name="zoneId"
                value={formData.zoneId}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm font-medium outline-none transition-all duration-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="">Select delivery zone</option>

                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.zoneName}
                  </option>
                ))}
              </select>
            </FormField>

            {/* WEIGHT RANGE */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Minimum weight (kg)" required>
                <input
                  type="number"
                  name="minWeight"
                  min="0"
                  step="0.01"
                  value={formData.minWeight}
                  onChange={handleChange}
                  placeholder="Example: 0"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm font-medium outline-none transition-all duration-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </FormField>

              <FormField label="Maximum weight (kg)" required>
                <input
                  type="number"
                  name="maxWeight"
                  min="0"
                  step="0.01"
                  value={formData.maxWeight}
                  onChange={handleChange}
                  placeholder="Example: 5"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm font-medium outline-none transition-all duration-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </FormField>
            </div>

            {/* DELIVERY FEE */}

            <FormField label="Delivery fee (LKR)" required>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                  Rs.
                </span>

                <input
                  type="number"
                  name="deliveryFee"
                  min="0"
                  step="0.01"
                  value={formData.deliveryFee}
                  onChange={handleChange}
                  placeholder="Enter delivery fee"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 pl-14 pr-4 text-sm font-medium outline-none transition-all duration-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </FormField>

            {/* ACTIVE STATUS */}

            {editingRate && (
              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/30 p-4.5 transition-all duration-200 hover:bg-slate-50 hover:border-blue-200">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Pricing rate status
                  </p>

                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    Enable or disable this pricing rate.
                  </p>
                </div>

                <input
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleChange}
                  className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
            )}

            {/* FORM ACTIONS */}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    {editingRate ? "Update pricing rate" : "Create pricing rate"}
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CONFIRMATION MODAL */}

      {confirmAction && (
        <Modal onClose={() => setConfirmAction(null)}>
          <div className="p-6 sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-inner">
              <AlertCircle size={26} />
            </div>

            <h2 className="mt-4 text-center text-lg font-black text-slate-900">
              {confirmAction.type === "delete"
                ? "Delete pricing rate?"
                : confirmAction.rate.active
                  ? "Deactivate pricing rate?"
                  : "Activate pricing rate?"}
            </h2>

            <p className="mt-2 text-center text-sm font-medium leading-relaxed text-slate-500">
              {confirmAction.type === "delete"
                ? "This pricing rate will be permanently deleted. This action cannot be undone."
                : confirmAction.rate.active
                  ? "This pricing rate will no longer be used for new deliveries."
                  : "This pricing rate will become available for new deliveries."}
            </p>

            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-4.5">
              <div className="flex justify-between gap-3 text-sm">
                <span className="font-medium text-slate-500">Delivery zone</span>
                <span className="font-bold text-slate-900">
                  {confirmAction.rate.zoneName || "Unknown zone"}
                </span>
              </div>

              <div className="mt-3 flex justify-between gap-3 text-sm">
                <span className="font-medium text-slate-500">Weight range</span>
                <span className="font-bold text-slate-900">
                  {confirmAction.rate.minWeight}–{confirmAction.rate.maxWeight} kg
                </span>
              </div>

              <div className="mt-3 flex justify-between gap-3 text-sm">
                <span className="font-medium text-slate-500">Delivery fee</span>
                <span className="font-black text-blue-600">
                  {formatCurrency(confirmAction.rate.deliveryFee)}
                </span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={() =>
                  confirmAction.type === "delete"
                    ? handleDelete(confirmAction.rate)
                    : handleToggleStatus(confirmAction.rate)
                }
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-md transition-all duration-200 ${
                  confirmAction.type === "delete"
                    ? "bg-red-600 hover:bg-red-700 shadow-red-500/25"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25"
                }`}
              >
                {confirmAction.type === "delete"
                  ? "Delete"
                  : confirmAction.rate.active
                    ? "Deactivate"
                    : "Activate"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* HISTORY MODAL */}

      {showHistory && (
        <Modal onClose={() => setShowHistory(false)} wide>
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
            <div>
              <div className="flex items-center gap-2 text-blue-600">
                <History size={18} />
                <span className="text-xs font-black uppercase tracking-wider">
                  Pricing activity
                </span>
              </div>

              <h2 className="mt-2 text-xl font-black text-slate-900">
                Pricing history
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-500">
                Recent pricing changes made during this session.
              </p>
            </div>

            <button
              onClick={() => setShowHistory(false)}
              className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={20} />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-6 sm:p-8">
            {history.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
                  <Clock3 size={24} />
                </div>

                <h3 className="mt-3 text-base font-black text-slate-900">
                  No activity yet
                </h3>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  Pricing changes will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4.5 sm:flex-row sm:items-center shadow-xs"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-sm">
                        <History size={18} />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {item.action} pricing rate
                        </p>

                        <p className="mt-0.5 text-xs font-semibold text-slate-500">
                          {item.zoneName}
                        </p>

                        <p className="mt-1 text-[11px] font-semibold text-slate-400">
                          {formatDate(item.date)}
                        </p>
                      </div>
                    </div>

                    <p className="font-black text-blue-600 text-base">
                      {formatCurrency(item.fee)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-slate-100 px-6 py-4 bg-slate-50/50">
            <button
              onClick={() => setShowHistory(false)}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:from-blue-700 hover:to-indigo-700"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// --------------------------------------------------
// SUMMARY CARD
// --------------------------------------------------

function SummaryCard({
  label,
  value,
  detail,
  icon,
  tone = "blue",
}) {
  const tones = {
    blue: {
      icon: "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20",
      value: "text-slate-900",
    },
    green: {
      icon: "bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20",
      value: "text-emerald-700",
    },
    slate: {
      icon: "bg-gradient-to-tr from-slate-600 to-slate-700 text-white shadow-md shadow-slate-500/20",
      value: "text-slate-800",
    },
    violet: {
      icon: "bg-gradient-to-tr from-indigo-500 to-violet-600 text-white shadow-md shadow-violet-500/20",
      value: "text-violet-700",
    },
  };

  const selectedTone = tones[tone] || tones.blue;

  return (
    <div className="rounded-3xl border border-blue-100/80 bg-white p-6 shadow-xl shadow-blue-900/[0.03] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-blue-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">
            {label}
          </p>

          <p className={`mt-3 text-3xl font-black tracking-tight ${selectedTone.value}`}>
            {value}
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-400">
            {detail}
          </p>
        </div>

        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${selectedTone.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------
// DELIVERY ZONE CARD
// --------------------------------------------------

function ZoneCard({
  title,
  count,
  subtitle,
  selected,
  onClick,
  icon,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center justify-between gap-3.5 rounded-2xl border p-4.5 text-left transition-all duration-200 ${
        selected
          ? "border-blue-500 bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/20"
          : "border-blue-100/80 bg-white hover:border-blue-300 hover:bg-blue-50/40 shadow-sm"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${
            selected
              ? "bg-white/20 text-white backdrop-blur-xs"
              : "bg-blue-50 text-blue-600"
          }`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className={`truncate text-sm font-black ${selected ? "text-white" : "text-slate-900"}`}>
            {title}
          </p>

          <p className={`mt-0.5 truncate text-xs font-semibold ${selected ? "text-blue-100" : "text-slate-400"}`}>
            {subtitle}
          </p>
        </div>
      </div>

      <span
        className={`flex h-8 min-w-8 shrink-0 items-center justify-center rounded-xl px-2.5 text-xs font-black shadow-xs ${
          selected
            ? "bg-white text-blue-700"
            : "bg-blue-50 text-blue-700 border border-blue-100"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

// --------------------------------------------------
// STATUS BADGE
// --------------------------------------------------

function StatusBadge({ active }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 shadow-xs whitespace-nowrap">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500 shadow-xs whitespace-nowrap">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
      Inactive
    </span>
  );
}

// --------------------------------------------------
// ICON BUTTON
// --------------------------------------------------

function IconButton({
  children,
  title,
  onClick,
  tone = "slate",
}) {
  const tones = {
    slate:
      "bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700 border border-slate-200/60",
    blue:
      "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200/60 shadow-xs",
    amber:
      "bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white border border-amber-200/60 shadow-xs",
    red:
      "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200/60 shadow-xs",
  };

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 shrink-0 ${tones[tone] || tones.slate}`}
    >
      {children}
    </button>
  );
}

// --------------------------------------------------
// FORM FIELD
// --------------------------------------------------

function FormField({
  label,
  required = false,
  children,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      {children}
    </div>
  );
}

// --------------------------------------------------
// ALERT
// --------------------------------------------------

function Alert({
  type = "error",
  message,
  onClose,
}) {
  const isSuccess = type === "success";

  return (
    <div
      className={`flex items-start justify-between gap-3.5 rounded-2xl border p-4.5 shadow-sm ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-900"
      }`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {isSuccess ? (
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
        ) : (
          <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
        )}

        <p className="text-sm font-bold">
          {message}
        </p>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1.5 opacity-60 transition hover:bg-black/5 hover:opacity-100"
          aria-label="Close alert"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

// --------------------------------------------------
// SMALL STATUS ICON
// --------------------------------------------------

function CircleStatus() {
  return (
    <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500 animate-pulse" />
  );
}

// --------------------------------------------------
// MODAL
// --------------------------------------------------

function Modal({
  children,
  onClose,
  wide = false,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`my-auto w-full overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-2xl shadow-blue-950/20 ${
          wide ? "max-w-2xl" : "max-w-md"
        }`}
      >
        {children}
      </div>
    </div>
  );
}