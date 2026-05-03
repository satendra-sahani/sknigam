'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import ImportVotersModal from '@/components/ImportVotersModal';
import { SkeletonTable } from '@/components/Skeleton';

interface BoothSummary {
  _id: string;
  name: string;
  partNumber: number;
  assemblyConstituency: string;
}

interface VoterRow {
  _id: string;
  voterSerialNumber: number;
  epicNumber: string;
  fullName: string;
  fatherOrHusbandName?: string;
  gender: 'M' | 'F' | 'T';
  age?: number;
  mobileNumber?: string;
  caste?: string;
  religion?: string;
  verificationStatus: boolean;
  boothId?: BoothSummary | string;
  partNumber: number;
  assemblyConstituency: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const PAGE_SIZE = 25;

export default function VotersPage() {
  const { user } = useAuth();
  const params = useSearchParams();
  const boothIdFromUrl = params.get('boothId') || '';
  const [voters, setVoters] = useState<VoterRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [constituency, setConstituency] = useState(params.get('assemblyConstituency') || '');
  const [gender, setGender] = useState('');
  const [verified, setVerified] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);

  const canManage = user?.role === 'super_admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(PAGE_SIZE),
      };
      if (search) params.search = search;
      if (constituency) params.assemblyConstituency = constituency;
      if (boothIdFromUrl) params.boothId = boothIdFromUrl;
      if (gender) params.gender = gender;
      if (verified !== 'all') params.verificationStatus = verified;
      const res = await api.get('/voters', { params });
      setVoters(res.data.data.voters);
      setPagination(res.data.data.pagination);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load voters');
    } finally {
      setLoading(false);
    }
  }, [page, search, constituency, boothIdFromUrl, gender, verified]);

  useEffect(() => {
    load();
  }, [load]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Voters</h1>
          <p className="text-sm text-slate-500">
            {pagination.total.toLocaleString('en-IN')} voters
            {constituency ? ` in ${constituency}` : ''}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setImportOpen(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition"
          >
            Bulk Import
          </button>
        )}
      </div>

      <form onSubmit={submitSearch} className="bg-white rounded-xl border border-slate-200/60 p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name / EPIC / mobile"
          className="md:col-span-2 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
        />
        <input
          value={constituency}
          onChange={(e) => setConstituency(e.target.value)}
          placeholder="Assembly Constituency"
          className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
        />
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
        >
          <option value="">All Genders</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
          <option value="T">Transgender</option>
        </select>
        <select
          value={verified}
          onChange={(e) => setVerified(e.target.value as any)}
          className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
        >
          <option value="all">All Status</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
        <div className="md:col-span-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setConstituency('');
              setGender('');
              setVerified('all');
              setPage(1);
            }}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
          >
            Reset
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition"
          >
            Apply
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">EPIC</th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Father / Husband</th>
                <th className="px-4 py-3 text-center font-medium">Age / Sex</th>
                <th className="px-4 py-3 text-left font-medium">Booth</th>
                <th className="px-4 py-3 text-left font-medium">Caste</th>
                <th className="px-4 py-3 text-left font-medium">Mobile</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <SkeletonTable
                  rows={8}
                  columns={['110px', { w: '160px', lines: 2 }, '140px', '60px', { w: '140px', lines: 2 }, '80px', '110px', '70px', { w: '60px', alignRight: true }]}
                />
              )}
              {!loading && voters.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No voters match your filters.
                  </td>
                </tr>
              )}
              {!loading &&
                voters.map((v) => {
                  const booth = typeof v.boothId === 'object' ? v.boothId : null;
                  return (
                    <tr key={v._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{v.epicNumber}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {v.fullName}
                        <div className="text-xs text-slate-400">#{v.voterSerialNumber}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{v.fatherOrHusbandName || '—'}</td>
                      <td className="px-4 py-3 text-center text-slate-600">
                        {v.age ?? '—'} / {v.gender}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {booth ? (
                          <>
                            <span className="text-slate-900">{booth.name}</span>
                            <div className="text-xs text-slate-400">
                              Part {v.partNumber} · {v.assemblyConstituency}
                            </div>
                          </>
                        ) : (
                          <span>Part {v.partNumber}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{v.caste || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{v.mobileNumber || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {v.verificationStatus ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/voters/${v._id}`} className="text-red-600 hover:text-red-700 text-sm font-medium">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-50"
              >
                Prev
              </button>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {importOpen && (
        <ImportVotersModal
          onClose={() => setImportOpen(false)}
          onImported={() => {
            setImportOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}
