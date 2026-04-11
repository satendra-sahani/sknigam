'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import StaffTable from '@/components/StaffTable';
import BulkImportModal from '@/components/BulkImportModal';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'zone_incharge', label: 'Zone Incharge' },
  { value: 'booth_supervisor', label: 'Booth Supervisor' },
  { value: 'data_entry_operator', label: 'Data Entry Operator' },
  { value: 'observer', label: 'Observer' },
];

const VERIFICATION_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'verified', label: 'Verified' },
  { value: 'unverified', label: 'Unverified' },
];

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <div className="w-10 h-10 rounded-xl bg-slate-200 animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 bg-slate-200 rounded-lg animate-pulse" />
        <div className="h-3 w-48 bg-slate-100 rounded-lg animate-pulse" />
      </div>
      <div className="h-4 w-20 bg-slate-200 rounded-lg animate-pulse" />
      <div className="h-6 w-24 bg-slate-200 rounded-lg animate-pulse" />
      <div className="h-4 w-16 bg-slate-200 rounded-lg animate-pulse" />
      <div className="h-4 w-16 bg-slate-200 rounded-lg animate-pulse" />
    </div>
  );
}

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [zones, setZones] = useState<string[]>([]);

  // Stats
  const [stats, setStats] = useState({ total: 0, verified: 0, active: 0, byRole: {} as Record<string, number> });

  // Modals
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<any | null>(null);

  // Add/Edit form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'booth_supervisor',
    zone: '',
    voterId: '',
    emergencyContact: '',
    trainingCompleted: false,
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchStaff = useCallback(async (page = 1) => {
    try {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (zoneFilter) params.zone = zoneFilter;
      if (verificationFilter) params.verified = verificationFilter;

      const response = await api.get('/staff', { params });
      const data = response.data.data;
      const staffList = data.staff || [];
      setStaff(staffList);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 0 });

      // Compute stats
      const total = data.pagination?.total || staffList.length;
      const verified = staffList.filter((s: any) => s.isVerified).length;
      const active = staffList.filter((s: any) => s.isActive).length;
      const byRole: Record<string, number> = {};
      staffList.forEach((s: any) => {
        byRole[s.role] = (byRole[s.role] || 0) + 1;
      });
      setStats({ total, verified, active, byRole });

      const allZones = staffList.map((s: any) => s.zone).filter(Boolean);
      setZones((prev) => {
        const combined = new Set([...prev, ...allZones]);
        return [...combined].sort();
      });
    } catch {
      toast.error('Failed to load staff');
    }
  }, [search, roleFilter, zoneFilter, verificationFilter]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchStaff();
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchStaff(1), 300);
    return () => clearTimeout(timer);
  }, [search, roleFilter, zoneFilter, verificationFilter, fetchStaff]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.post('/staff', formData);
      toast.success('Staff member added successfully');
      setAddModalOpen(false);
      resetForm();
      fetchStaff(pagination.page);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add staff');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStaff) return;
    setFormLoading(true);
    try {
      const { password, ...updateData } = formData;
      await api.put(`/staff/${editStaff._id}`, updateData);
      toast.success('Staff updated successfully');
      setEditStaff(null);
      resetForm();
      fetchStaff(pagination.page);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update staff');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this staff member?')) return;
    try {
      await api.delete(`/staff/${id}`);
      toast.success('Staff deactivated');
      fetchStaff(pagination.page);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to deactivate');
    }
  };

  const openEdit = (member: any) => {
    setEditStaff(member);
    setFormData({
      name: member.name || '',
      email: member.email || '',
      phone: member.phone || '',
      password: '',
      role: member.role || 'booth_supervisor',
      zone: member.zone || '',
      voterId: member.voterId || '',
      emergencyContact: member.emergencyContact || '',
      trainingCompleted: member.trainingCompleted || false,
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'booth_supervisor',
      zone: '',
      voterId: '',
      emergencyContact: '',
      trainingCompleted: false,
    });
  };

  const closeModal = () => {
    setAddModalOpen(false);
    setEditStaff(null);
    resetForm();
  };

  const staffModal = addModalOpen || editStaff;

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    const total = pagination.pages;
    const current = pagination.page;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i);
      }
      if (current < total - 2) pages.push('...');
      pages.push(total);
    }

    return pages.map((p, idx) =>
      typeof p === 'string' ? (
        <span key={`ellipsis-${idx}`} className="px-2 py-1.5 text-sm text-slate-400">...</span>
      ) : (
        <button
          key={p}
          onClick={() => fetchStaff(p)}
          className={`min-w-[36px] h-9 px-3 text-sm font-medium rounded-xl transition-all ${
            p === current
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {p}
        </button>
      )
    );
  };

  const roleColorMap: Record<string, string> = {
    super_admin: 'bg-violet-50 text-violet-700',
    zone_incharge: 'bg-indigo-50 text-indigo-700',
    booth_supervisor: 'bg-emerald-50 text-emerald-700',
    data_entry_operator: 'bg-sky-50 text-sky-700',
    observer: 'bg-slate-100 text-slate-700',
  };

  const topRoles = Object.entries(stats.byRole).sort((a, b) => b[1] - a[1]).slice(0, 3);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-4 w-64 bg-slate-100 rounded-lg animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-28 bg-slate-200 rounded-xl animate-pulse" />
            <div className="h-10 w-24 bg-slate-200 rounded-xl animate-pulse" />
          </div>
        </div>
        {/* Skeleton stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200/60 p-5">
              <div className="h-4 w-20 bg-slate-200 rounded animate-pulse mb-3" />
              <div className="h-8 w-12 bg-slate-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
        {/* Skeleton table */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage field staff and assignments</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setBulkImportOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Bulk Import
          </button>
          <button
            onClick={() => { resetForm(); setAddModalOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-indigo-600 rounded-xl hover:from-brand-700 hover:to-indigo-700 shadow-md shadow-brand-600/25 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Add Staff
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Staff</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Verified</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.verified}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active</p>
              <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">By Role</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {topRoles.map(([role, count]) => (
                  <span
                    key={role}
                    className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${roleColorMap[role] || 'bg-slate-100 text-slate-700'}`}
                  >
                    {count}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <select
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
        >
          <option value="">All Zones</option>
          {zones.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>
        <select
          value={verificationFilter}
          onChange={(e) => setVerificationFilter(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
        >
          {VERIFICATION_OPTIONS.map((v) => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Staff Table */}
      <StaffTable
        staff={staff}
        onEdit={openEdit}
        onDeactivate={handleDeactivate}
        loading={false}
      />

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing <span className="font-medium text-slate-700">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
            <span className="font-medium text-slate-700">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
            <span className="font-medium text-slate-700">{pagination.total}</span> results
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchStaff(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {renderPageNumbers()}
            <button
              onClick={() => fetchStaff(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Staff Modal */}
      {staffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={closeModal}
          />
          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 animate-in slide-in-from-bottom-4 duration-300 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {editStaff ? 'Edit Staff Member' : 'Add New Staff'}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {editStaff ? 'Update staff information and role' : 'Fill in the details to add a new team member'}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={editStaff ? handleEditSubmit : handleAddSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Avatar Upload Area */}
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-brand-600/20 cursor-pointer hover:shadow-xl transition-shadow">
                    {formData.name
                      ? formData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      : (
                        <svg className="w-8 h-8 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                  </div>
                </div>

                {/* Two Column Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                      placeholder="+91 98765 43210"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Zone</label>
                    <input
                      type="text"
                      value={formData.zone}
                      onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                      placeholder="Zone assignment"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Voter ID</label>
                    <input
                      type="text"
                      value={formData.voterId}
                      onChange={(e) => setFormData({ ...formData, voterId: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                      placeholder="Voter identification"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Emergency Contact</label>
                    <input
                      type="text"
                      value={formData.emergencyContact}
                      onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                      placeholder="Emergency phone number"
                    />
                  </div>
                  {!editStaff && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                        placeholder="Set a password"
                        required={!editStaff}
                      />
                    </div>
                  )}
                </div>

                {/* Training Completed */}
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.trainingCompleted}
                      onChange={(e) => setFormData({ ...formData, trainingCompleted: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 rounded-lg border-2 border-slate-300 peer-checked:border-brand-600 peer-checked:bg-brand-600 transition-all flex items-center justify-center">
                      <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Training completed</span>
                </label>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-indigo-600 rounded-xl hover:from-brand-700 hover:to-indigo-700 shadow-md shadow-brand-600/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2"
                >
                  {formLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </>
                  ) : editStaff ? 'Update Staff' : 'Add Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onSuccess={() => fetchStaff(1)}
      />
    </div>
  );
}
