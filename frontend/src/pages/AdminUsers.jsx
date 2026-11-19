import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  Shield,
  Truck,
  Store,
  User,
  Search,
  Plus,
  RefreshCw,
  Copy,
  Check,
  History,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  X,
  Power,
  Activity,
} from 'lucide-react';
import { api, authError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Pagination, Modal } from '../components/ui';
import { StatusBadge } from '../components/StatusBadge';

// ============================================
// CONSTANTS & HELPERS
// ============================================

const roles = ['MERCHANT', 'COURIER', 'DISPATCHER'];

const initialForm = {
  name: '',
  email: '',
  phone: '',
  role: 'COURIER',
  active: true,
};

const ROLE_BADGE_STYLES = {
  ADMIN: 'bg-purple-50 text-purple-800 ring-1 ring-purple-200/80',
  DISPATCHER: 'bg-blue-50 text-blue-800 ring-1 ring-blue-200/80',
  COURIER: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80',
  MERCHANT: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/80',
  CUSTOMER: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-500/10';

// ============================================
// REUSABLE UI COMPONENTS
// ============================================

function StatCard({ title, value, icon: Icon, loading }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50 via-sky-50/90 to-blue-100/60 p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md hover:shadow-blue-900/5">
      <div className="flex items-center justify-between gap-2.5">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-wide text-blue-900/70">
            {title}
          </p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-blue-950 tabular-nums">
            {loading ? '—' : value}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/90 text-blue-700 shadow-sm ring-1 ring-blue-200/80 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}
function ActionButton({ icon: Icon, title, onClick, color = 'blue', disabled = false }) {
  const styles = {
    blue: 'text-blue-700 hover:bg-blue-50 ring-blue-100',
    indigo: 'text-indigo-600 hover:bg-indigo-50 ring-indigo-100',
    green: 'text-emerald-600 hover:bg-emerald-50 ring-emerald-100',
    amber: 'text-amber-600 hover:bg-amber-50 ring-amber-100',
    slate: 'text-slate-600 hover:bg-slate-100 ring-slate-200',
  };

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150 hover:ring-1 disabled:opacity-40 ${styles[color]}`}
    >
      <Icon size={16} />
    </button>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export const AdminUsers = () => {
  const { user: actor } = useAuth();

  const [result, setResult] = useState({ users: [], page: 0, pages: 0, total: 0 });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [selectedRoles, setSelectedRoles] = useState({});
  const [activation, setActivation] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [audit, setAudit] = useState(null);
  const [auditUser, setAuditUser] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (page = 0, term = '') => {
    try {
      const response = await api.get('/auth/admin/users', { params: { page, search: term } });
      setResult(response.data?.data || { users: [], page: 0, pages: 0, total: 0 });
    } catch (e) {
      setError(authError(e, 'Could not load users.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch((e) => setError(authError(e, 'Could not load users.')));
  }, [load]);

  const run = async (task) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (e) {
      setError(authError(e, 'Account operation failed.'));
    } finally {
      setBusy(false);
    }
  };

  const post = async (id, operation, body = {}) => {
    const response = await api.post(`/auth/admin/users/${id}/${operation}`, body);
    if (operation === 'activation') {
      setActivation(response.data.data);
      setSuccess('Single-use activation link generated.');
    } else if (operation === 'role') {
      setSuccess('User role updated.');
    } else if (operation === 'status') {
      setSuccess(`User account ${body.active ? 'activated' : 'deactivated'}.`);
    }
    await load(result.page, search);
  };

  // KPI Calculations
  const usersList = result.users || [];
  const totalUsers = result.total || usersList.length;

  const roleCounts = useMemo(() => {
    const counts = {
      CUSTOMERS: 0,
      MERCHANTS: 0,
      COURIERS: 0,
      DISPATCHERS: 0,
      ADMINS: 0,
    };
    for (const u of usersList) {
      if (u.role === 'CUSTOMER') counts.CUSTOMERS++;
      else if (u.role === 'MERCHANT') counts.MERCHANTS++;
      else if (u.role === 'COURIER') counts.COURIERS++;
      else if (u.role === 'DISPATCHER') counts.DISPATCHERS++;
      else if (u.role === 'ADMIN') counts.ADMINS++;
    }
    return counts;
  }, [usersList]);

  // Filtered users for table
  const displayedUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && u.active === true) ||
        (statusFilter === 'INACTIVE' && u.active === false);

      return matchesRole && matchesStatus;
    });
  }, [usersList, roleFilter, statusFilter]);

  const hasActiveFilters = search || roleFilter !== 'ALL' || statusFilter !== 'ALL';

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    run(async () => {
      const response = await api.post('/auth/admin/users', form);
      setActivation(response.data.data);
      setSuccess(`Created identity for ${form.name}.`);
      setForm(initialForm);
      setShowCreateModal(false);
      await load(0, search);
    });
  };

  return (
    <section className="space-y-6 pb-12">
      {/* HEADER — DARK BLUE ICON & TITLE + CREATE BUTTON */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-900 text-white shadow-md shadow-blue-900/20">
            <Users size={24} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-blue-950 sm:text-3xl">
            User Management
          </h1>
        </div>

        <button
          type="button"
          onClick={() => {
            setForm(initialForm);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-all duration-200 hover:bg-blue-800 hover:shadow-lg active:scale-[0.98]"
        >
          <Plus size={18} strokeWidth={2.5} />
          Create Identity
        </button>
      </div>

      {/* ALERTS */}
      {success && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccess('')}
            className="rounded-lg p-1 hover:bg-emerald-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

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
            onClick={() => setError('')}
            className="rounded-lg p-1 hover:bg-rose-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ACTIVATION BANNER */}
      {activation && (
        <div
          role="status"
          className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/90 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900 text-white">
                <KeyRound size={16} />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950">
                Single-Use Activation Link Generated
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setActivation(null)}
              className="rounded-lg p-1 text-slate-500 hover:bg-blue-100 hover:text-blue-900"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-xs leading-relaxed text-blue-900/80">
            Share this single-use activation link privately with the user. It expires in 30 minutes and lets them set their own password on first visit.
          </p>

          <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white p-3">
            <a
              href={activation.activationUrl}
              className="flex-1 break-all font-mono text-xs text-blue-800 underline"
            >
              {activation.activationUrl}
            </a>
            <button
              type="button"
              onClick={() => copyToClipboard(activation.activationUrl)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-800"
            >
              {copiedLink ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>

          {!activation.user?.active && (
            <p className="text-xs font-medium text-amber-800">
              Note: This identity is currently inactive. Activate it before the user completes verification.
            </p>
          )}
        </div>
      )}

      {/* LIGHT-BLUE KPI CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Total Users" value={totalUsers} icon={Users} loading={loading} />
        <StatCard title="Customers" value={roleCounts.CUSTOMERS} icon={User} loading={loading} />
        <StatCard title="Merchants" value={roleCounts.MERCHANTS} icon={Store} loading={loading} />
        <StatCard title="Couriers" value={roleCounts.COURIERS} icon={Truck} loading={loading} />
        <StatCard title="Dispatchers" value={roleCounts.DISPATCHERS} icon={UserCheck} loading={loading} />
        <StatCard title="Admins" value={roleCounts.ADMINS} icon={Shield} loading={loading} />
      </div>

      {/* SEARCH & FILTERS */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <form
            className="flex w-full gap-2 lg:max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => load(0, search));
            }}
          >
            <div className="relative flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                maxLength={120}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    run(() => load(0, ''));
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter by role"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-700 focus:bg-white"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Administrators</option>
              <option value="DISPATCHER">Dispatchers</option>
              <option value="COURIER">Couriers</option>
              <option value="MERCHANT">Merchants</option>
              <option value="CUSTOMER">Customers</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-700 focus:bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setRoleFilter('ALL');
                  setStatusFilter('ALL');
                  run(() => load(0, ''));
                }}
                className="rounded-xl px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-900">
            User Directory{' '}
            <span className="ml-1.5 font-medium text-slate-400">
              ({displayedUsers.length})
            </span>
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">
            <Activity size={14} />
            {totalUsers} Total Accounts
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <RefreshCw size={26} className="animate-spin text-blue-800" />
            <p className="mt-3 text-sm font-medium text-slate-500">Loading user accounts...</p>
          </div>
        ) : displayedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
              <Users size={26} />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">No Users Found</h3>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              {hasActiveFilters
                ? 'Try adjusting your search or filter criteria.'
                : 'Provision your first staff or merchant identity to get started.'}
            </p>
            {!hasActiveFilters && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
              >
                <Plus size={16} />
                Create Identity
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {displayedUsers.map((user) => {
                  const protectedUser = user.role === 'ADMIN' || user.id === actor?.id;
                  const initials = (user.name || 'u').slice(0, 2).toLowerCase();
                  const pendingRole = selectedRoles[user.id];
                  const hasRoleChange = pendingRole && pendingRole !== user.role;

                  return (
                    <tr key={user.id} className="transition-colors hover:bg-blue-50/40">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[10px] font-bold tracking-wide text-blue-800 ring-1 ring-blue-100">
                            {initials}
                          </div>
                          <div>
                            <span className="block text-sm font-bold text-slate-900">
                              {user.name}
                            </span>
                            {user.phone && (
                              <span className="block text-xs text-slate-400">
                                {user.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs text-slate-600">
                        {user.email}
                      </td>

                      <td className="px-6 py-4">
                        {protectedUser ? (
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              ROLE_BADGE_STYLES[user.role] ||
                              'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
                            }`}
                          >
                            {user.role}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <select
                              aria-label={`Role for ${user.email}`}
                              value={pendingRole || user.role}
                              onChange={(e) =>
                                setSelectedRoles({
                                  ...selectedRoles,
                                  [user.id]: e.target.value,
                                })
                              }
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white"
                            >
                              {user.role === 'CUSTOMER' && <option value="CUSTOMER">CUSTOMER</option>}
                              {roles.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>

                            {hasRoleChange && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  run(() =>
                                    post(user.id, 'role', {
                                      role: selectedRoles[user.id],
                                    })
                                  )
                                }
                                className="rounded-lg bg-blue-900 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
                              >
                                Save
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={user.active ? 'ACTIVE' : 'INACTIVE'} />
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {!protectedUser && (
                            <>
                              <ActionButton
                                icon={Power}
                                title={user.active ? 'Deactivate Account' : 'Activate Account'}
                                color={user.active ? 'amber' : 'green'}
                                disabled={busy}
                                onClick={() =>
                                  run(() =>
                                    post(user.id, 'status', { active: !user.active })
                                  )
                                }
                              />
                              <ActionButton
                                icon={KeyRound}
                                title="Generate Activation Link"
                                color="blue"
                                disabled={busy}
                                onClick={() => run(() => post(user.id, 'activation'))}
                              />
                            </>
                          )}
                          <ActionButton
                            icon={History}
                            title="View Audit Trail"
                            color="indigo"
                            disabled={busy}
                            onClick={() =>
                              run(async () => {
                                const res = await api.get(`/auth/admin/users/${user.id}/audit`);
                                setAuditUser(user);
                                setAudit(res.data.data || []);
                              })
                            }
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

        <div className="border-t border-slate-100 p-4">
          <Pagination
            page={result.page || 0}
            pages={result.pages || 1}
            disabled={busy}
            onPageChange={(page) => run(() => load(page, search))}
          />
        </div>
      </div>

      {/* CREATE IDENTITY MODAL */}
      {showCreateModal && (
        <Modal
          open={showCreateModal}
          onClose={() => !busy && setShowCreateModal(false)}
          title="Create Staff or Merchant Identity"
          className="max-w-xl"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <p className="text-xs text-slate-500">
              Provision a new user account. An encrypted single-use activation link will be generated for password setup.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Kasun Perera"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  maxLength={254}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="kasun@swiftdrop.lk"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Phone Number
                </label>
                <input
                  type="text"
                  maxLength={30}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+94 77 123 4567"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Assigned Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className={inputClass}
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-sm font-semibold text-slate-800">
                Activate this identity immediately
              </span>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-900 accent-blue-900"
              />
            </label>

            <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
              >
                {busy ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {busy ? 'Creating...' : 'Create Identity'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* AUDIT TRAIL MODAL */}
      {audit && (
        <Modal
          open={Boolean(audit)}
          onClose={() => {
            setAudit(null);
            setAuditUser(null);
          }}
          title={`Audit Trail${auditUser ? `: ${auditUser.name}` : ''}`}
          className="max-w-2xl"
        >
          <div className="space-y-3 pt-2">
            <p className="text-xs text-slate-500">
              Latest 100 recorded authentication and role changes for this account.
            </p>

            {audit.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
                No recorded identity changes for this account.
              </div>
            ) : (
              <div className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
                {audit.map((event) => (
                  <div
                    key={event.id}
                    className="space-y-1 rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{new Date(event.createdAt).toLocaleString()}</span>
                      <span>Actor: {event.actorId || 'Local bootstrap'}</span>
                    </div>
                    <div className="font-bold text-blue-950">{event.action}</div>
                    <p className="break-words text-slate-600">{event.detail}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setAudit(null);
                  setAuditUser(null);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
};

export default AdminUsers;