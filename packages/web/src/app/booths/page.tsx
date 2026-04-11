'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import BoothTable from '@/components/BoothTable';
import AssignmentModal from '@/components/AssignmentModal';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface BoothFormData {
  name: string;
  partNumber: string;
  zone: string;
  village: string;
  address: string;
  totalRegisteredVoters: string;
  lat: string;
  lng: string;
  facilities: string[];
}

const FACILITIES_OPTIONS = [
  'Ramp Access',
  'Drinking Water',
  'Toilet',
  'Electricity',
  'Shade/Shelter',
  'Parking',
];

const emptyForm: BoothFormData = {
  name: '',
  partNumber: '',
  zone: '',
  village: '',
  address: '',
  totalRegisteredVoters: '',
  lat: '',
  lng: '',
  facilities: [],
};

export default function BoothsPage() {
  const [booths, setBooths] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);

  // Assignment Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedBoothId, setSelectedBoothId] = useState('');
  const [selectedBoothName, setSelectedBoothName] = useState('');
  const [selectedBoothPartNumber, setSelectedBoothPartNumber] = useState<number | undefined>();
  const [selectedBoothZone, setSelectedBoothZone] = useState('');

  // Add/Edit Booth Modal
  const [boothModalOpen, setBoothModalOpen] = useState(false);
  const [editingBooth, setEditingBooth] = useState<any>(null);
  const [boothForm, setBoothForm] = useState<BoothFormData>(emptyForm);
  const [savingBooth, setSavingBooth] = useState(false);

  const fetchBooths = useCallback(async (page = 1) => {
    try {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (selectedZone) params.zone = selectedZone;
      if (statusFilter) params.status = statusFilter;

      const response = await api.get('/booths', { params });
      const data = response.data.data;
      setBooths(data.booths || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 0 });

      const allZones = (data.booths || []).map((b: any) => b.zone).filter(Boolean);
      setZones((prev) => {
        const combined = new Set([...prev, ...allZones]);
        return [...combined].sort();
      });
    } catch (err: any) {
      toast.error('Failed to load booths');
    }
  }, [search, selectedZone, statusFilter]);

  const fetchAssignments = useCallback(async () => {
    try {
      const response = await api.get('/booth-assignments', { params: { limit: 500, isActive: true } });
      setAssignments(response.data.data.assignments || []);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchBooths(), fetchAssignments()]);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBooths(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedZone, statusFilter, fetchBooths]);

  useEffect(() => {
    const fetchAllZones = async () => {
      try {
        const response = await api.get('/booths', { params: { limit: 500 } });
        const allBooths = response.data.data.booths || [];
        const uniqueZones = [...new Set(allBooths.map((b: any) => b.zone).filter(Boolean))] as string[];
        setZones(uniqueZones.sort());
      } catch {
        // Ignore
      }
    };
    fetchAllZones();
  }, []);

  // Computed stats
  const stats = useMemo(() => {
    const total = pagination.total;
    const assignedBoothIds = new Set(
      assignments
        .filter((a: any) => a.isActive)
        .map((a: any) => (typeof a.boothId === 'object' ? a.boothId?._id : a.boothId))
    );
    const assigned = booths.filter((b) => assignedBoothIds.has(b._id)).length;
    const unassigned = booths.length - assigned;
    const avgVoters = booths.length > 0
      ? Math.round(booths.reduce((sum, b) => sum + (b.totalRegisteredVoters || 0), 0) / booths.length)
      : 0;
    return { total, assigned, unassigned, avgVoters };
  }, [booths, assignments, pagination.total]);

  const handleAssign = (boothId: string) => {
    const booth = booths.find((b) => b._id === boothId);
    setSelectedBoothId(boothId);
    setSelectedBoothName(booth?.name || '');
    setSelectedBoothPartNumber(booth?.partNumber);
    setSelectedBoothZone(booth?.zone || '');
    setAssignModalOpen(true);
  };

  const handleEdit = (boothId: string) => {
    const booth = booths.find((b) => b._id === boothId);
    if (booth) {
      setEditingBooth(booth);
      setBoothForm({
        name: booth.name || '',
        partNumber: String(booth.partNumber || ''),
        zone: booth.zone || '',
        village: booth.village || '',
        address: booth.address || '',
        totalRegisteredVoters: String(booth.totalRegisteredVoters || ''),
        lat: String(booth.lat || booth.location?.coordinates?.[1] || ''),
        lng: String(booth.lng || booth.location?.coordinates?.[0] || ''),
        facilities: booth.facilities || [],
      });
      setBoothModalOpen(true);
    }
  };

  const handleAddBooth = () => {
    setEditingBooth(null);
    setBoothForm(emptyForm);
    setBoothModalOpen(true);
  };

  const handleBoothSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBooth(true);
    try {
      const payload = {
        name: boothForm.name,
        partNumber: Number(boothForm.partNumber),
        zone: boothForm.zone,
        village: boothForm.village,
        address: boothForm.address,
        totalRegisteredVoters: Number(boothForm.totalRegisteredVoters),
        lat: boothForm.lat ? Number(boothForm.lat) : undefined,
        lng: boothForm.lng ? Number(boothForm.lng) : undefined,
        facilities: boothForm.facilities,
      };

      if (editingBooth) {
        await api.put(`/booths/${editingBooth._id}`, payload);
        toast.success('Booth updated successfully');
      } else {
        await api.post('/booths', payload);
        toast.success('Booth created successfully');
      }
      setBoothModalOpen(false);
      fetchBooths(pagination.page);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to save booth';
      toast.error(message);
    } finally {
      setSavingBooth(false);
    }
  };

  const handleAssignmentSuccess = () => {
    fetchAssignments();
    fetchBooths(pagination.page);
  };

  const toggleFacility = (facility: string) => {
    setBoothForm((prev) => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter((f) => f !== facility)
        : [...prev.facilities, facility],
    }));
  };

  // Page numbers for pagination
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, pagination.page - Math.floor(maxVisible / 2));
    const end = Math.min(pagination.pages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [pagination.page, pagination.pages]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Booth Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage all {pagination.total > 0 ? `${pagination.total}+` : ''} polling booths across constituencies
          </p>
        </div>
        <button
          onClick={handleAddBooth}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Booth
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Booths */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008V7.5Z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Booths</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Assigned */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned</p>
              <p className="text-2xl font-bold text-slate-900">{stats.assigned}</p>
            </div>
          </div>
        </div>

        {/* Unassigned */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Unassigned</p>
              <p className="text-2xl font-bold text-rose-600">{stats.unassigned}</p>
            </div>
          </div>
        </div>

        {/* Average Voters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Avg Voters</p>
              <p className="text-2xl font-bold text-slate-900">{avgVotersDisplay(stats.avgVoters)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search booths by name or part number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
            />
          </div>

          {/* Zone Dropdown */}
          <div className="relative">
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors cursor-pointer min-w-[160px]"
            >
              <option value="">All Zones</option>
              {zones.map((zone) => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors cursor-pointer min-w-[160px]"
            >
              <option value="">All Status</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Booth Table */}
      {loading ? (
        <BoothTable booths={[]} assignments={[]} onAssign={handleAssign} onEdit={handleEdit} loading={true} />
      ) : (
        <BoothTable booths={booths} assignments={assignments} onAssign={handleAssign} onEdit={handleEdit} loading={false} />
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing <span className="font-medium text-slate-700">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
            <span className="font-medium text-slate-700">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
            <span className="font-medium text-slate-700">{pagination.total}</span> booths
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchBooths(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            {pageNumbers.map((num) => (
              <button
                key={num}
                onClick={() => fetchBooths(num)}
                className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                  num === pagination.page
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => fetchBooths(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      <AssignmentModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        boothId={selectedBoothId}
        boothName={selectedBoothName}
        boothPartNumber={selectedBoothPartNumber}
        boothZone={selectedBoothZone}
        onSuccess={handleAssignmentSuccess}
      />

      {/* Add/Edit Booth Modal */}
      {boothModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setBoothModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {editingBooth ? 'Edit Booth' : 'Add New Booth'}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {editingBooth ? 'Update booth details below' : 'Fill in the details to register a new booth'}
                </p>
              </div>
              <button
                onClick={() => setBoothModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleBoothSubmit} className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Booth Name</label>
                <input
                  type="text"
                  required
                  value={boothForm.name}
                  onChange={(e) => setBoothForm({ ...boothForm, name: e.target.value })}
                  placeholder="e.g., Government Primary School"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
                />
              </div>

              {/* Part Number + Zone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Part Number</label>
                  <input
                    type="number"
                    required
                    value={boothForm.partNumber}
                    onChange={(e) => setBoothForm({ ...boothForm, partNumber: e.target.value })}
                    placeholder="e.g., 142"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Zone</label>
                  <input
                    type="text"
                    required
                    value={boothForm.zone}
                    onChange={(e) => setBoothForm({ ...boothForm, zone: e.target.value })}
                    placeholder="e.g., Zone A"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
                  />
                </div>
              </div>

              {/* Village */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Village</label>
                <input
                  type="text"
                  value={boothForm.village}
                  onChange={(e) => setBoothForm({ ...boothForm, village: e.target.value })}
                  placeholder="e.g., Rampur"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
                <textarea
                  value={boothForm.address}
                  onChange={(e) => setBoothForm({ ...boothForm, address: e.target.value })}
                  placeholder="Full address of the polling booth"
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none"
                />
              </div>

              {/* Total Registered Voters */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Total Registered Voters</label>
                <input
                  type="number"
                  required
                  value={boothForm.totalRegisteredVoters}
                  onChange={(e) => setBoothForm({ ...boothForm, totalRegisteredVoters: e.target.value })}
                  placeholder="e.g., 1250"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
                />
              </div>

              {/* Lat/Lng */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Latitude</label>
                  <input
                    type="text"
                    value={boothForm.lat}
                    onChange={(e) => setBoothForm({ ...boothForm, lat: e.target.value })}
                    placeholder="e.g., 26.8467"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Longitude</label>
                  <input
                    type="text"
                    value={boothForm.lng}
                    onChange={(e) => setBoothForm({ ...boothForm, lng: e.target.value })}
                    placeholder="e.g., 80.9462"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Facilities */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Facilities</label>
                <div className="grid grid-cols-2 gap-2">
                  {FACILITIES_OPTIONS.map((facility) => (
                    <label
                      key={facility}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border cursor-pointer transition-all ${
                        boothForm.facilities.includes(facility)
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={boothForm.facilities.includes(facility)}
                        onChange={() => toggleFacility(facility)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                        boothForm.facilities.includes(facility)
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'border-slate-300 bg-white'
                      }`}>
                        {boothForm.facilities.includes(facility) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium">{facility}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBoothModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBooth}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingBooth ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </span>
                  ) : editingBooth ? 'Update Booth' : 'Create Booth'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function avgVotersDisplay(avg: number): string {
  if (avg >= 1000) return `${(avg / 1000).toFixed(1)}k`;
  return avg.toLocaleString();
}
