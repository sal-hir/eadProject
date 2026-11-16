import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Plus,
  Search,
  Pencil,
  Trash2,
  Power,
  Package,
  DollarSign,
  Weight,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Calculator,
  ChevronRight,
  Layers,
  Activity,
  FileSpreadsheet,
  Download,
  Calendar,
} from 'lucide-react';
import { pricingApi, zoneApi } from '../../api/adminApi';
import { Modal, ConfirmDialog } from '../../components/ui';

// ============================================
// CONSTANTS & HELPERS
// ============================================

const unwrapResponse = (response) => {
  let data = response?.data ?? response;
  if (data?.data !== undefined) data = data.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.zones)) return data.zones;
  if (Array.isArray(data?.pricingRules)) return data.pricingRules;
  return [];
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getErrorMessage = (error) => {
  if (error?.response?.status === 401) {
    return 'Your session has expired. Please log in again.';
  }
  if (error?.response?.status === 403) {
    return 'You do not have permission to perform this action.';
  }
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'Something went wrong. Please try again.'
  );
};

const rangesOverlap = (aMin, aMax, bMin, bMax) =>
  Number(aMin) < Number(bMax) && Number(bMin) < Number(aMax);

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-500/10';

// ============================================
// REUSABLE UI COMPONENTS
// ============================================

function StatCard({ title, value, icon: Icon, loading = false }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50 via-sky-50/90 to-blue-100/60 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md hover:shadow-blue-900/5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-wider text-blue-900/70">
            {title}
          </p>
          <p className="mt-2.5 text-2xl font-extrabold tracking-tight text-blue-950 tabular-nums sm:text-3xl">
            {loading ? '—' : value}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/90 text-blue-700 shadow-sm ring-1 ring-blue-200/80 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ active, activeLabel = 'Active', inactiveLabel = 'Inactive' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        active
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80'
          : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

function ActionButton({ icon: Icon, title, onClick, color = 'blue' }) {
  const styles = {
    blue: 'text-blue-700 hover:bg-blue-50 ring-blue-100',
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

// ============================================
// MAIN COMPONENT
// ============================================

export default function PricingManagement() {
  const [zones, setZones] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedZone, setSelectedZone] = useState(null);
  const [showFullReport, setShowFullReport] = useState(false);

  // Zone List Filters
  const [zoneSearch, setZoneSearch] = useState('');
  const [zoneStatusFilter, setZoneStatusFilter] = useState('ALL');

  // Full Report Filters
  const [reportSearch, setReportSearch] = useState('');
  const [reportZoneFilter, setReportZoneFilter] = useState('ALL');
  const [reportStatusFilter, setReportStatusFilter] = useState('ALL');

  // Zone Pricing Rule Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('weight');

  // Modals & Confirm Dialogs
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);

  const [alert, setAlert] = useState({ type: '', message: '' });

  const [formData, setFormData] = useState({
    minWeight: '',
    maxWeight: '',
    deliveryFee: '',
    active: true,
  });

  // ------------------------------------------------
  // LOAD DATA
  // ------------------------------------------------

  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [zoneResponse, pricingResponse] = await Promise.all([
        zoneApi.getAll(),
        pricingApi.getAll(),
      ]);

      setZones(unwrapResponse(zoneResponse));
      setPricingRules(unwrapResponse(pricingResponse));
    } catch (error) {
      console.error('Error loading pricing data:', error);
      setAlert({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showAlert = (type, message) => {
    setAlert({ type, message });
  };

  // ------------------------------------------------
  // COMBINED ZONE & PRICING REPORT DATA
  // ------------------------------------------------

  const zoneMap = useMemo(() => {
    const map = new Map();
    zones.forEach((z) => map.set(String(z.id), z));
    return map;
  }, [zones]);

  const combinedReportRows = useMemo(() => {
    const rows = [];

    zones.forEach((zone) => {
      const zoneActive = zone.active !== false && zone.isActive !== false;
      const rulesForZone = pricingRules.filter(
        (rule) => String(rule.zoneId) === String(zone.id)
      );

      const zoneCreatedAt = zone.createdAt || zone.createdDate || null;
      const zoneUpdatedAt = zone.updatedAt || zone.modifiedDate || zone.lastModifiedDate || null;
      const zoneActivatedAt =
        zone.activatedAt || zone.activatedDate || (zoneActive ? zoneCreatedAt : null);
      const zoneInactivatedAt =
        zone.inactivatedAt || zone.deactivatedAt || zone.inactivatedDate || (!zoneActive ? zoneUpdatedAt : null);

      if (rulesForZone.length === 0) {
        rows.push({
          rowKey: `zone-${zone.id}-empty`,
          zoneId: zone.id,
          zoneName: zone.zoneName || 'Unnamed Zone',
          zoneDescription: zone.description || '—',
          zoneActive,
          zoneCreatedAt,
          zoneActivatedAt,
          zoneInactivatedAt,
          zoneUpdatedAt,
          hasRule: false,
          ruleId: null,
          minWeight: null,
          maxWeight: null,
          deliveryFee: null,
          ruleActive: null,
          ruleCreatedAt: null,
          ruleUpdatedAt: null,
          ruleActivatedAt: null,
          ruleInactivatedAt: null,
        });
      } else {
        rulesForZone
          .sort((a, b) => Number(a.minWeight) - Number(b.minWeight))
          .forEach((rule) => {
            const ruleActive = rule.active !== false;
            const ruleCreatedAt = rule.createdAt || rule.createdDate || null;
            const ruleUpdatedAt =
              rule.updatedAt || rule.modifiedDate || rule.lastModifiedDate || null;
            const ruleActivatedAt =
              rule.activatedAt || rule.activatedDate || (ruleActive ? ruleCreatedAt : null);
            const ruleInactivatedAt =
              rule.inactivatedAt ||
              rule.deactivatedAt ||
              rule.inactivatedDate ||
              (!ruleActive ? ruleUpdatedAt : null);

            rows.push({
              rowKey: `zone-${zone.id}-rule-${rule.id}`,
              zoneId: zone.id,
              zoneName: zone.zoneName || 'Unnamed Zone',
              zoneDescription: zone.description || '—',
              zoneActive,
              zoneCreatedAt,
              zoneActivatedAt,
              zoneInactivatedAt,
              zoneUpdatedAt,
              hasRule: true,
              ruleId: rule.id,
              minWeight: rule.minWeight,
              maxWeight: rule.maxWeight,
              deliveryFee: rule.deliveryFee,
              ruleActive,
              ruleCreatedAt,
              ruleUpdatedAt,
              ruleActivatedAt,
              ruleInactivatedAt,
            });
          });
      }
    });

    // Include any orphaned pricing rules if their zone wasn't in zones list
    pricingRules.forEach((rule) => {
      if (!zoneMap.has(String(rule.zoneId))) {
        const ruleActive = rule.active !== false;
        const ruleCreatedAt = rule.createdAt || rule.createdDate || null;
        const ruleUpdatedAt = rule.updatedAt || rule.modifiedDate || null;
        rows.push({
          rowKey: `orphan-rule-${rule.id}`,
          zoneId: rule.zoneId,
          zoneName: rule.zoneName || `Zone #${rule.zoneId}`,
          zoneDescription: '—',
          zoneActive: true,
          zoneCreatedAt: null,
          zoneActivatedAt: null,
          zoneInactivatedAt: null,
          zoneUpdatedAt: null,
          hasRule: true,
          ruleId: rule.id,
          minWeight: rule.minWeight,
          maxWeight: rule.maxWeight,
          deliveryFee: rule.deliveryFee,
          ruleActive,
          ruleCreatedAt,
          ruleUpdatedAt,
          ruleActivatedAt: rule.activatedAt || (ruleActive ? ruleCreatedAt : null),
          ruleInactivatedAt: rule.inactivatedAt || (!ruleActive ? ruleUpdatedAt : null),
        });
      }
    });

    return rows;
  }, [zones, pricingRules, zoneMap]);

  const filteredReportRows = useMemo(() => {
    const query = reportSearch.toLowerCase().trim();
    return combinedReportRows.filter((row) => {
      const matchesZone =
        reportZoneFilter === 'ALL' || String(row.zoneId) === String(reportZoneFilter);

      const matchesStatus =
        reportStatusFilter === 'ALL' ||
        (reportStatusFilter === 'ZONE_ACTIVE' && row.zoneActive) ||
        (reportStatusFilter === 'ZONE_INACTIVE' && !row.zoneActive) ||
        (reportStatusFilter === 'RULE_ACTIVE' && row.hasRule && row.ruleActive) ||
        (reportStatusFilter === 'RULE_INACTIVE' && row.hasRule && !row.ruleActive) ||
        (reportStatusFilter === 'NO_RULES' && !row.hasRule);

      const matchesSearch =
        !query ||
        row.zoneName.toLowerCase().includes(query) ||
        row.zoneDescription.toLowerCase().includes(query) ||
        (row.hasRule &&
          `${row.minWeight} ${row.maxWeight} ${row.deliveryFee}`
            .toLowerCase()
            .includes(query));

      return matchesZone && matchesStatus && matchesSearch;
    });
  }, [combinedReportRows, reportSearch, reportZoneFilter, reportStatusFilter]);

  const exportFullReportCSV = () => {
    const headers = [
      'Zone ID',
      'Zone Name',
      'Zone Description',
      'Zone Status',
      'Zone Created Date',
      'Zone Activated Date',
      'Zone Inactivated Date',
      'Zone Last Updated',
      'Rule ID',
      'Min Weight (kg)',
      'Max Weight (kg)',
      'Delivery Fee (LKR)',
      'Rule Status',
      'Rule Created Date',
      'Rule Activated Date',
      'Rule Inactivated Date',
      'Rule Changed / Updated Date',
    ];

    const csvRows = [
      headers,
      ...filteredReportRows.map((r) => [
        r.zoneId ?? '',
        r.zoneName,
        r.zoneDescription,
        r.zoneActive ? 'Active' : 'Inactive',
        formatDateTime(r.zoneCreatedAt),
        formatDateTime(r.zoneActivatedAt),
        formatDateTime(r.zoneInactivatedAt),
        formatDateTime(r.zoneUpdatedAt),
        r.hasRule ? r.ruleId : 'No Rule',
        r.hasRule ? r.minWeight : '',
        r.hasRule ? r.maxWeight : '',
        r.hasRule ? r.deliveryFee : '',
        r.hasRule ? (r.ruleActive ? 'Active' : 'Inactive') : 'N/A',
        r.hasRule ? formatDateTime(r.ruleCreatedAt) : '—',
        r.hasRule ? formatDateTime(r.ruleActivatedAt) : '—',
        r.hasRule ? formatDateTime(r.ruleInactivatedAt) : '—',
        r.hasRule ? formatDateTime(r.ruleUpdatedAt) : '—',
      ]),
    ];

    const csvContent = csvRows
      .map((row) =>
        row.map((val) => `"${String(val ?? '').replaceAll('"', '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zones-and-pricing-full-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // ------------------------------------------------
  // ZONE FILTERING & STATS
  // ------------------------------------------------

  const filteredZones = useMemo(() => {
    const query = zoneSearch.toLowerCase().trim();
    return zones.filter((zone) => {
      const zoneActive = zone.active !== false && zone.isActive !== false;
      const matchesSearch =
        !query ||
        String(zone.zoneName || '').toLowerCase().includes(query) ||
        String(zone.description || '').toLowerCase().includes(query);

      const matchesStatus =
        zoneStatusFilter === 'ALL' ||
        (zoneStatusFilter === 'ACTIVE' && zoneActive) ||
        (zoneStatusFilter === 'INACTIVE' && !zoneActive);

      return matchesSearch && matchesStatus;
    });
  }, [zones, zoneSearch, zoneStatusFilter]);

  const hasZoneFilters = zoneSearch.trim() !== '' || zoneStatusFilter !== 'ALL';

  const getZoneRuleCount = useCallback(
    (zoneId) =>
      pricingRules.filter((rule) => String(rule.zoneId) === String(zoneId)).length,
    [pricingRules]
  );

  const getActiveRuleCount = useCallback(
    (zoneId) =>
      pricingRules.filter(
        (rule) => String(rule.zoneId) === String(zoneId) && rule.active !== false
      ).length,
    [pricingRules]
  );

  // ------------------------------------------------
  // SELECTED ZONE PRICING
  // ------------------------------------------------

  const zonePricing = useMemo(() => {
    if (!selectedZone) return [];
    return pricingRules.filter(
      (rule) => String(rule.zoneId) === String(selectedZone.id)
    );
  }, [pricingRules, selectedZone]);

  const filteredPricing = useMemo(() => {
    let result = [...zonePricing];

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter((rule) =>
        `${rule.minWeight} ${rule.maxWeight} ${rule.deliveryFee}`
          .toLowerCase()
          .includes(search)
      );
    }

    if (sortOrder === 'weight') {
      result.sort((a, b) => Number(a.minWeight) - Number(b.minWeight));
    } else if (sortOrder === 'fee-low') {
      result.sort((a, b) => Number(a.deliveryFee) - Number(b.deliveryFee));
    } else if (sortOrder === 'fee-high') {
      result.sort((a, b) => Number(b.deliveryFee) - Number(a.deliveryFee));
    }

    return result;
  }, [zonePricing, searchTerm, sortOrder]);

  const totalRules = zonePricing.length;
  const activeRules = zonePricing.filter((rule) => rule.active !== false).length;
  const averageFee = zonePricing.length
    ? zonePricing.reduce((sum, rule) => sum + Number(rule.deliveryFee || 0), 0) /
      zonePricing.length
    : 0;

  // ------------------------------------------------
  // HANDLERS
  // ------------------------------------------------

  const handleAdd = () => {
    setEditingRule(null);
    setFormData({
      minWeight: '',
      maxWeight: '',
      deliveryFee: '',
      active: true,
    });
    setShowModal(true);
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      minWeight: rule.minWeight ?? '',
      maxWeight: rule.maxWeight ?? '',
      deliveryFee: rule.deliveryFee ?? '',
      active: rule.active !== false,
    });
    setShowModal(true);
  };

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validateForm = () => {
    const min = Number(formData.minWeight);
    const max = Number(formData.maxWeight);
    const fee = Number(formData.deliveryFee);

    if (
      formData.minWeight === '' ||
      formData.maxWeight === '' ||
      formData.deliveryFee === ''
    ) {
      return 'Please fill in all required fields.';
    }

    if (!Number.isFinite(min) || min < 0) {
      return 'Minimum weight must be zero or greater.';
    }

    if (!Number.isFinite(max) || max <= min) {
      return 'Maximum weight must be greater than minimum weight.';
    }

    if (!Number.isFinite(fee) || fee <= 0) {
      return 'Delivery fee must be greater than zero.';
    }

    const hasOverlap = zonePricing.some((rule) => {
      if (editingRule && String(rule.id) === String(editingRule.id)) {
        return false;
      }
      return rangesOverlap(min, max, rule.minWeight, rule.maxWeight);
    });

    if (hasOverlap) {
      return 'This weight range overlaps with an existing pricing rule.';
    }

    return null;
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      showAlert('error', validationError);
      return;
    }

    try {
      setSaving(true);
      const requestData = {
        zoneId: selectedZone.id,
        minWeight: Number(formData.minWeight),
        maxWeight: Number(formData.maxWeight),
        deliveryFee: Number(formData.deliveryFee),
      };

      if (editingRule) {
        await pricingApi.update(editingRule.id, {
          ...requestData,
          active: formData.active,
        });
        showAlert('success', 'Pricing rule updated successfully.');
      } else {
        await pricingApi.create(requestData);
        showAlert('success', 'Pricing rule created successfully.');
      }

      setShowModal(false);
      setEditingRule(null);
      await loadData(true);
    } catch (error) {
      console.error('Error saving pricing rule:', error);
      showAlert('error', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete || saving) return;
    try {
      setSaving(true);
      await pricingApi.delete(confirmDelete.id);
      showAlert('success', 'Pricing rule deleted successfully.');
      setConfirmDelete(null);
      await loadData(true);
    } catch (error) {
      console.error('Error deleting pricing rule:', error);
      showAlert('error', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmToggle = async () => {
    if (!confirmToggle || saving) return;
    const newStatus = confirmToggle.active === false;
    try {
      setSaving(true);
      await pricingApi.update(confirmToggle.id, {
        zoneId: confirmToggle.zoneId,
        minWeight: Number(confirmToggle.minWeight),
        maxWeight: Number(confirmToggle.maxWeight),
        deliveryFee: Number(confirmToggle.deliveryFee),
        active: newStatus,
      });
      showAlert(
        'success',
        `Pricing rule ${newStatus ? 'activated' : 'deactivated'} successfully.`
      );
      setConfirmToggle(null);
      await loadData(true);
    } catch (error) {
      console.error('Error updating pricing status:', error);
      showAlert('error', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    setSelectedZone(null);
    setShowFullReport(false);
    setSearchTerm('');
    setAlert({ type: '', message: '' });
  };

  // ------------------------------------------------
  // LOADING SCREEN
  // ------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
        <RefreshCw size={32} className="mb-3 animate-spin text-blue-900" />
        <h3 className="text-base font-bold text-blue-950">Loading Pricing Management</h3>
        <p className="mt-1 text-xs text-slate-500">Fetching delivery zones and fee tiers...</p>
      </div>
    );
  }

  // ------------------------------------------------
  // MAIN UI
  // ------------------------------------------------

  return (
    <section className="space-y-6 pb-12">
      {/* HEADER — DARK BLUE ICON & TITLE */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="space-y-2">
          {(selectedZone || showFullReport) && (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800 transition hover:text-blue-950"
            >
              <ArrowLeft size={15} />
              Back to Delivery Zones
            </button>
          )}

          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-900 text-white shadow-md shadow-blue-900/20">
              {showFullReport ? <FileSpreadsheet size={24} /> : <DollarSign size={24} />}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-blue-950 sm:text-3xl">
              {showFullReport
                ? 'Zones & Pricing Full Report'
                : selectedZone
                ? `${selectedZone.zoneName} Pricing`
                : 'Pricing Management'}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!selectedZone && !showFullReport && (
            <button
              type="button"
              onClick={() => {
                setShowFullReport(true);
                setAlert({ type: '', message: '' });
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-all duration-200 hover:bg-blue-800 hover:shadow-lg active:scale-[0.98]"
            >
              <FileSpreadsheet size={18} />
              Total Zone & Pricing Report
            </button>
          )}

          {showFullReport && (
            <button
              type="button"
              onClick={exportFullReportCSV}
              disabled={filteredReportRows.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-all duration-200 hover:bg-blue-800 hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
            >
              <Download size={18} />
              Export Full Report (CSV)
            </button>
          )}

          {selectedZone && (
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-all duration-200 hover:bg-blue-800 hover:shadow-lg active:scale-[0.98]"
            >
              <Plus size={18} strokeWidth={2.5} />
              Add Pricing Rule
            </button>
          )}
        </div>
      </div>

      {/* ALERTS */}
      {alert.message && (
        <div
          role="alert"
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium ${
            alert.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === 'success' ? (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle size={18} className="shrink-0 text-rose-600" />
            )}
            <span>{alert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlert({ type: '', message: '' })}
            className="rounded-lg p-1 hover:bg-black/5"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ==========================================
          VIEW 1: TOTAL ZONE & PRICING FULL REPORT
      ========================================== */}
      {showFullReport && (
        <>
          {/* LIGHT-BLUE KPI SUMMARY CARDS */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Zones" value={zones.length} icon={Layers} />
            <StatCard
              title="Active Zones"
              value={zones.filter((z) => z.active !== false && z.isActive !== false).length}
              icon={MapPin}
            />
            <StatCard title="Total Pricing Rules" value={pricingRules.length} icon={Package} />
            <StatCard
              title="Active Pricing Rules"
              value={pricingRules.filter((r) => r.active !== false).length}
              icon={CheckCircle2}
            />
          </div>

          {/* REPORT FILTERS */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  placeholder="Search zone name, weight range, or delivery fee..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
                {reportSearch && (
                  <button
                    type="button"
                    onClick={() => setReportSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={reportZoneFilter}
                  onChange={(e) => setReportZoneFilter(e.target.value)}
                  aria-label="Filter report by zone"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-700 focus:bg-white"
                >
                  <option value="ALL">All Zones ({zones.length})</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.zoneName}
                    </option>
                  ))}
                </select>

                <select
                  value={reportStatusFilter}
                  onChange={(e) => setReportStatusFilter(e.target.value)}
                  aria-label="Filter report by status"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-700 focus:bg-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ZONE_ACTIVE">Active Zones</option>
                  <option value="ZONE_INACTIVE">Inactive Zones</option>
                  <option value="RULE_ACTIVE">Active Pricing Rules</option>
                  <option value="RULE_INACTIVE">Inactive Pricing Rules</option>
                  <option value="NO_RULES">Zones Without Pricing Rules</option>
                </select>

                {(reportSearch ||
                  reportZoneFilter !== 'ALL' ||
                  reportStatusFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setReportSearch('');
                      setReportZoneFilter('ALL');
                      setReportStatusFilter('ALL');
                    }}
                    className="rounded-xl px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* FULL MASTER REPORT TABLE */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-sm font-bold text-slate-900">
                Complete Zone & Pricing Audit Report{' '}
                <span className="ml-1.5 font-medium text-slate-400">
                  ({filteredReportRows.length} records)
                </span>
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">
                <Calendar size={14} />
                All Lifecycle Dates Included
              </span>
            </div>

            {filteredReportRows.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500">
                No zone or pricing records match your filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1380px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3.5">Delivery Zone</th>
                      <th className="px-4 py-3.5">Zone Status</th>
                      <th className="px-4 py-3.5">Zone Lifecycle Dates</th>
                      <th className="px-4 py-3.5">Weight Range</th>
                      <th className="px-4 py-3.5">Delivery Fee</th>
                      <th className="px-4 py-3.5">Rule Status</th>
                      <th className="px-4 py-3.5">Rule Created Date</th>
                      <th className="px-4 py-3.5">Rule Activated / Inactivated</th>
                      <th className="px-4 py-3.5">Rule Changed Date</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredReportRows.map((row) => (
                      <tr
                        key={row.rowKey}
                        className="align-top transition-colors hover:bg-blue-50/40"
                      >
                        {/* Zone Name & Description */}
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-900 text-white">
                              <MapPin size={14} />
                            </div>
                            <div>
                              <span className="block text-sm font-bold text-blue-950">
                                {row.zoneName}
                              </span>
                              <span className="mt-0.5 block max-w-[200px] text-[11px] text-slate-500">
                                {row.zoneDescription}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Zone Status */}
                        <td className="px-4 py-4">
                          <StatusBadge
                            active={row.zoneActive}
                            activeLabel="Active"
                            inactiveLabel="Inactive"
                          />
                        </td>

                        {/* Zone Lifecycle Dates */}
                        <td className="px-4 py-4 space-y-1 text-[11px]">
                          <div>
                            <span className="font-semibold text-slate-500">Created: </span>
                            <span className="font-medium text-slate-800">
                              {formatDateTime(row.zoneCreatedAt)}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-emerald-700">Activated: </span>
                            <span className="font-medium text-slate-800">
                              {formatDateTime(row.zoneActivatedAt)}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-rose-700">Inactivated: </span>
                            <span className="font-medium text-slate-800">
                              {formatDateTime(row.zoneInactivatedAt)}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-blue-800">Updated: </span>
                            <span className="font-medium text-slate-800">
                              {formatDateTime(row.zoneUpdatedAt)}
                            </span>
                          </div>
                        </td>

                        {/* Weight Range */}
                        <td className="px-4 py-4">
                          {row.hasRule ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-950">
                              <Weight size={13} className="text-blue-700" />
                              {row.minWeight} – {row.maxWeight} kg
                            </span>
                          ) : (
                            <span className="italic text-slate-400">No pricing rules</span>
                          )}
                        </td>

                        {/* Delivery Fee */}
                        <td className="px-4 py-4 font-mono text-sm font-extrabold text-blue-900">
                          {row.hasRule ? formatCurrency(row.deliveryFee) : '—'}
                        </td>

                        {/* Rule Status */}
                        <td className="px-4 py-4">
                          {row.hasRule ? (
                            <StatusBadge active={row.ruleActive} />
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Rule Created Date */}
                        <td className="px-4 py-4 font-medium text-slate-700">
                          {row.hasRule ? formatDateTime(row.ruleCreatedAt) : '—'}
                        </td>

                        {/* Rule Activated / Inactivated Date */}
                        <td className="px-4 py-4 space-y-1 text-[11px]">
                          {row.hasRule ? (
                            <>
                              <div>
                                <span className="font-semibold text-emerald-700">Active: </span>
                                <span className="font-medium text-slate-800">
                                  {formatDateTime(row.ruleActivatedAt)}
                                </span>
                              </div>
                              <div>
                                <span className="font-semibold text-rose-700">Inactive: </span>
                                <span className="font-medium text-slate-800">
                                  {formatDateTime(row.ruleInactivatedAt)}
                                </span>
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Rule Changed Date */}
                        <td className="px-4 py-4 font-medium text-slate-700">
                          {row.hasRule ? formatDateTime(row.ruleUpdatedAt) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ==========================================
          VIEW 2: ZONE SELECTION PAGE
      ========================================== */}
      {!selectedZone && !showFullReport && (
        <>
          {/* LIGHT-BLUE KPI CARDS */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard title="Total Zones" value={zones.length} icon={Layers} />
            <StatCard title="Total Pricing Rules" value={pricingRules.length} icon={Package} />
            <StatCard
              title="Active Pricing Rules"
              value={pricingRules.filter((rule) => rule.active !== false).length}
              icon={CheckCircle2}
            />
          </div>

          {/* SEARCH & FILTER BAR FOR ZONES */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={zoneSearch}
                  onChange={(e) => setZoneSearch(e.target.value)}
                  placeholder="Search delivery zone by name or description..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
                {zoneSearch && (
                  <button
                    type="button"
                    onClick={() => setZoneSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <select
                  value={zoneStatusFilter}
                  onChange={(e) => setZoneStatusFilter(e.target.value)}
                  aria-label="Filter zones by status"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-700 focus:bg-white"
                >
                  <option value="ALL">All Zones ({zones.length})</option>
                  <option value="ACTIVE">
                    Active Zones (
                    {zones.filter((z) => z.active !== false && z.isActive !== false).length})
                  </option>
                  <option value="INACTIVE">
                    Inactive Zones (
                    {zones.filter((z) => z.active === false || z.isActive === false).length})
                  </option>
                </select>

                {hasZoneFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setZoneSearch('');
                      setZoneStatusFilter('ALL');
                    }}
                    className="rounded-xl px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ALL DELIVERY ZONES GRID */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-extrabold text-blue-950">
                Delivery Zones{' '}
                <span className="ml-1 font-medium text-slate-400">
                  ({filteredZones.length} of {zones.length})
                </span>
              </h2>
              <span className="text-xs font-medium text-slate-500">
                Select a zone to configure weight-tiered pricing
              </span>
            </div>

            {zones.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-14 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
                  <MapPin size={26} />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">
                  No Delivery Zones Found
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Create delivery zones first before managing their pricing rules.
                </p>
              </div>
            ) : filteredZones.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-14 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
                  <Search size={24} />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">
                  No Matching Zones
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  No delivery zones matched "{zoneSearch}".
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setZoneSearch('');
                    setZoneStatusFilter('ALL');
                  }}
                  className="mt-4 rounded-xl bg-blue-900 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  Show All Zones
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredZones.map((zone) => {
                  const ruleCount = getZoneRuleCount(zone.id);
                  const activeCount = getActiveRuleCount(zone.id);
                  const zoneActive = zone.active !== false && zone.isActive !== false;

                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => {
                        setSelectedZone(zone);
                        setSearchTerm('');
                        setAlert({ type: '', message: '' });
                      }}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-blue-200/90 bg-gradient-to-b from-blue-50/70 via-white to-white p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-800 hover:shadow-lg hover:shadow-blue-950/10"
                    >
                      <span className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-950 via-blue-800 to-blue-600 transition-opacity duration-200 group-hover:opacity-100" />

                      <div>
                        <div className="mb-4 flex items-center justify-between pt-1">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-900 text-white shadow-sm shadow-blue-900/20 ring-2 ring-blue-100 transition-transform duration-200 group-hover:scale-105 group-hover:bg-blue-950">
                            <MapPin size={20} />
                          </div>

                          <StatusBadge
                            active={zoneActive}
                            activeLabel="Active Zone"
                            inactiveLabel="Inactive"
                          />
                        </div>

                        <h3 className="text-lg font-extrabold text-blue-950 transition-colors group-hover:text-blue-800">
                          {zone.zoneName || 'Unnamed Zone'}
                        </h3>

                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {zone.description || 'Configure weight-based delivery fees for this zone.'}
                        </p>
                      </div>

                      <div className="mt-5">
                        <div className="grid grid-cols-2 gap-3 border-t border-blue-100/80 pt-4">
                          <div className="rounded-xl border border-blue-100/80 bg-blue-50/60 px-3 py-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-900/60">
                              Total Rules
                            </p>
                            <p className="mt-0.5 text-xl font-extrabold text-blue-950 tabular-nums">
                              {ruleCount}
                            </p>
                          </div>

                          <div className="rounded-xl border border-blue-200/80 bg-blue-900 px-3 py-2.5 text-white shadow-sm shadow-blue-900/10">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                              Active Rules
                            </p>
                            <p className="mt-0.5 text-xl font-extrabold text-white tabular-nums">
                              {activeCount}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between rounded-xl bg-blue-50/80 px-3.5 py-2 text-xs font-bold text-blue-900 transition-colors group-hover:bg-blue-900 group-hover:text-white">
                          <span>Manage Pricing Rules</span>
                          <ChevronRight
                            size={16}
                            className="transition-transform duration-200 group-hover:translate-x-1"
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ==========================================
          VIEW 3: SELECTED ZONE PRICING PAGE
      ========================================== */}
      {selectedZone && (
        <>
          {/* LIGHT-BLUE KPI CARDS FOR SELECTED ZONE */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard title="Total Rules" value={totalRules} icon={Package} />
            <StatCard title="Active Rules" value={activeRules} icon={CheckCircle2} />
            <StatCard
              title="Average Delivery Fee"
              value={formatCurrency(averageFee)}
              icon={DollarSign}
            />
          </div>

          {/* SEARCH AND SORT */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search by weight or delivery fee..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
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

              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                aria-label="Sort pricing rules"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-700 focus:bg-white"
              >
                <option value="weight">Sort by Weight (Low → High)</option>
                <option value="fee-low">Fee: Low to High</option>
                <option value="fee-high">Fee: High to Low</option>
              </select>
            </div>
          </div>

          {/* PRICING TABLE */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-sm font-bold text-slate-900">
                Weight Tier Rules{' '}
                <span className="ml-1.5 font-medium text-slate-400">
                  ({filteredPricing.length})
                </span>
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">
                <Activity size={14} />
                {activeRules} Active
              </span>
            </div>

            {filteredPricing.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
                  <Calculator size={26} />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">
                  No Pricing Rules Found
                </h3>
                <p className="mt-1 max-w-xs text-sm text-slate-500">
                  {zonePricing.length === 0
                    ? 'Add your first weight-tiered pricing rule for this zone.'
                    : 'Try adjusting your search query.'}
                </p>
                {zonePricing.length === 0 && (
                  <button
                    type="button"
                    onClick={handleAdd}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                  >
                    <Plus size={16} />
                    Add Pricing Rule
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-6 py-3.5">Tier</th>
                      <th className="px-6 py-3.5">Weight Range</th>
                      <th className="px-6 py-3.5">Delivery Fee</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredPricing.map((rule, index) => {
                      const isActive = rule.active !== false;
                      return (
                        <tr
                          key={rule.id}
                          className="transition-colors hover:bg-blue-50/40"
                        >
                          <td className="px-6 py-4 text-xs font-bold text-slate-400">
                            #{index + 1}
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2.5 text-sm font-bold text-slate-900">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                                <Weight size={15} />
                              </div>
                              <span>
                                {rule.minWeight} – {rule.maxWeight} kg
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-4 font-mono text-sm font-extrabold text-blue-900">
                            {formatCurrency(rule.deliveryFee)}
                          </td>

                          <td className="px-6 py-4">
                            <StatusBadge active={isActive} />
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <ActionButton
                                icon={Pencil}
                                title="Edit Pricing Rule"
                                color="indigo"
                                onClick={() => handleEdit(rule)}
                              />
                              <ActionButton
                                icon={Power}
                                title={isActive ? 'Deactivate Rule' : 'Activate Rule'}
                                color={isActive ? 'amber' : 'green'}
                                onClick={() => setConfirmToggle(rule)}
                              />
                              <ActionButton
                                icon={Trash2}
                                title="Delete Pricing Rule"
                                color="red"
                                onClick={() => setConfirmDelete(rule)}
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
        </>
      )}

      {/* ==========================================
          ADD / EDIT PRICING MODAL
      ========================================== */}
      {showModal && selectedZone && (
        <Modal
          open={showModal}
          onClose={() => !saving && setShowModal(false)}
          title={
            editingRule
              ? `Edit Pricing Rule (${selectedZone.zoneName})`
              : `Add Pricing Rule (${selectedZone.zoneName})`
          }
          className="max-w-lg"
        >
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Delivery Zone
              </label>
              <input
                type="text"
                value={selectedZone.zoneName}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm font-semibold text-slate-600"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Minimum Weight (kg) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  name="minWeight"
                  min="0"
                  step="0.01"
                  value={formData.minWeight}
                  onChange={handleInputChange}
                  placeholder="0"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Maximum Weight (kg) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  name="maxWeight"
                  min="0"
                  step="0.01"
                  value={formData.maxWeight}
                  onChange={handleInputChange}
                  placeholder="2"
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Delivery Fee (LKR) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                name="deliveryFee"
                min="0.01"
                step="0.01"
                value={formData.deliveryFee}
                onChange={handleInputChange}
                placeholder="350"
                required
                className={inputClass}
              />
            </div>

            {editingRule && (
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm font-semibold text-slate-800">
                  Active pricing rule
                </span>
                <input
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-slate-300 text-blue-900 accent-blue-900"
                />
              </label>
            )}

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
                {saving ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {saving ? 'Saving...' : editingRule ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* TOGGLE CONFIRM DIALOG */}
      {confirmToggle && (
        <ConfirmDialog
          open={Boolean(confirmToggle)}
          onClose={() => !saving && setConfirmToggle(null)}
          onConfirm={handleConfirmToggle}
          title={confirmToggle.active === false ? 'Activate Pricing Rule' : 'Deactivate Pricing Rule'}
          confirmLabel={confirmToggle.active === false ? 'Activate' : 'Deactivate'}
          busy={saving}
          danger={confirmToggle.active !== false}
        >
          <p className="text-sm text-slate-700">
            {confirmToggle.active === false ? 'Activate' : 'Deactivate'} the{' '}
            <strong>
              {confirmToggle.minWeight}–{confirmToggle.maxWeight} kg
            </strong>{' '}
            pricing rule?
          </p>
        </ConfirmDialog>
      )}

      {/* DELETE CONFIRM DIALOG */}
      {confirmDelete && (
        <ConfirmDialog
          open={Boolean(confirmDelete)}
          onClose={() => !saving && setConfirmDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Pricing Rule"
          confirmLabel="Delete"
          busy={saving}
          danger
        >
          <p className="text-sm text-slate-700">
            Permanently delete the{' '}
            <strong>
              {confirmDelete.minWeight}–{confirmDelete.maxWeight} kg
            </strong>{' '}
            pricing rule ({formatCurrency(confirmDelete.deliveryFee)})?
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}