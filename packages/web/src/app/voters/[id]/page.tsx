'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface VoterDetail {
  _id: string;
  voterSerialNumber: number;
  epicNumber: string;
  fullName: string;
  fatherOrHusbandName?: string;
  gender: 'M' | 'F' | 'T';
  age?: number;
  dateOfBirth?: string;
  address: string;
  partNumber: number;
  assemblyConstituency: string;
  caste?: string;
  subCaste?: string;
  religion?: string;
  bloodGroup?: string;
  educationLevel?: string;
  profession?: string;
  annualIncome?: string;
  houseType?: string;
  rationCardType?: string;
  mobileNumber?: string;
  whatsappNumber?: string;
  email?: string;
  verificationStatus: boolean;
  visitDate?: string;
  staffRemarks?: string;
  favouriteCandidate?: string;
  partySupport?: string;
  votingIntention?: string;
  grievances?: string[];
  problemDescription?: string;
  influenceLevel?: string;
  voterPhoto?: string;
  boothId?: { _id: string; name: string; partNumber: number; assemblyConstituency: string; district: string } | string;
  visitedBy?: { _id: string; name: string; phone: string } | string;
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-slate-900">{value || value === 0 ? value : '—'}</p>
    </div>
  );
}

export default function VoterDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [voter, setVoter] = useState<VoterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [remarks, setRemarks] = useState('');
  const [intention, setIntention] = useState('');
  const [favouriteCandidate, setFavouriteCandidate] = useState('');

  const canEdit = user?.role === 'super_admin' || user?.role === 'staff';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/voters/${params.id}`);
      const v: VoterDetail = res.data.data;
      setVoter(v);
      setRemarks(v.staffRemarks || '');
      setIntention(v.votingIntention || '');
      setFavouriteCandidate(v.favouriteCandidate || '');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load voter');
      router.push('/voters');
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function markVisited() {
    if (!voter) return;
    setSaving(true);
    try {
      await api.put(`/voters/${voter._id}`, {
        verificationStatus: true,
        staffRemarks: remarks,
        votingIntention: intention || undefined,
        favouriteCandidate: favouriteCandidate || undefined,
      });
      toast.success('Voter updated');
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div>
          <div className="skeleton h-3 w-12" />
          <div className="skeleton h-7 w-64 mt-2" />
          <div className="skeleton h-3 w-40 mt-2" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm"
              style={{ animation: 'fadeInUp 0.4s ease-out both', animationDelay: `${i * 80}ms` }}>
              <div className="skeleton h-4 w-32" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 4 }).map((__, j) => (
                  <div key={j}>
                    <div className="skeleton h-3 w-20" />
                    <div className="skeleton h-4 w-full mt-1" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (!voter) return null;

  const booth = typeof voter.boothId === 'object' ? voter.boothId : null;
  const visitedBy = typeof voter.visitedBy === 'object' ? voter.visitedBy : null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          {voter.voterPhoto ? (
            <a
              href={voter.voterPhoto}
              target="_blank"
              rel="noreferrer"
              className="shrink-0"
              title="Open full-size photo">
              <img
                src={voter.voterPhoto}
                alt={voter.fullName}
                className="w-20 h-20 rounded-xl object-cover border border-slate-200 bg-slate-100"
              />
            </a>
          ) : (
            <div
              className="shrink-0 w-20 h-20 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400 text-center px-1"
              title="No photo captured yet">
              No photo
              <br />
              yet
            </div>
          )}
          <div className="min-w-0">
            <button onClick={() => router.back()} className="text-xs text-slate-500 hover:text-slate-700 mb-1">
              &larr; Back
            </button>
            <h1 className="text-xl font-semibold text-slate-900 truncate">{voter.fullName}</h1>
            <p className="text-sm text-slate-500 truncate">
              EPIC <span className="font-mono">{voter.epicNumber}</span> · Part {voter.partNumber} · {voter.assemblyConstituency}
            </p>
          </div>
        </div>
        {voter.verificationStatus ? (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
            Verified
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
            Pending Visit
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white rounded-xl border border-slate-200/60 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Official</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Voter Serial #" value={voter.voterSerialNumber} />
            <Field label="Gender" value={voter.gender === 'M' ? 'Male' : voter.gender === 'F' ? 'Female' : 'Transgender'} />
            <Field label="Age" value={voter.age} />
            <Field label="DOB" value={voter.dateOfBirth ? new Date(voter.dateOfBirth).toLocaleDateString('en-IN') : undefined} />
            <Field label="Father / Husband" value={voter.fatherOrHusbandName} />
            <Field label="Booth" value={booth ? `${booth.name} (Part ${booth.partNumber})` : undefined} />
            <div className="col-span-2">
              <Field label="Address" value={voter.address} />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200/60 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Social</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Caste" value={voter.caste} />
            <Field label="Sub-Caste" value={voter.subCaste} />
            <Field label="Religion" value={voter.religion} />
            <Field label="Blood Group" value={voter.bloodGroup} />
            <Field label="Education" value={voter.educationLevel} />
            <Field label="Profession" value={voter.profession} />
            <Field label="Annual Income" value={voter.annualIncome} />
            <Field label="House Type" value={voter.houseType} />
            <Field label="Ration Card" value={voter.rationCardType} />
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200/60 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Contact</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mobile" value={voter.mobileNumber} />
            <Field label="WhatsApp" value={voter.whatsappNumber} />
            <Field label="Email" value={voter.email} />
            <Field label="Last Visit" value={voter.visitDate ? new Date(voter.visitDate).toLocaleString('en-IN') : undefined} />
            <Field label="Visited By" value={visitedBy?.name} />
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200/60 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Political</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Favourite Candidate" value={voter.favouriteCandidate} />
            <Field label="Party Support" value={voter.partySupport} />
            <Field label="Voting Intention" value={voter.votingIntention} />
            <Field label="Influence" value={voter.influenceLevel} />
            <div className="col-span-2">
              <Field label="Grievances" value={voter.grievances?.length ? voter.grievances.join(', ') : undefined} />
            </div>
            <div className="col-span-2">
              <Field label="Problem Description" value={voter.problemDescription} />
            </div>
          </div>
        </section>
      </div>

      {canEdit && (
        <section className="bg-white rounded-xl border border-slate-200/60 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Record Visit</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">Staff Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                placeholder="Notes about this voter…"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Voting Intention</label>
              <select
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              >
                <option value="">—</option>
                <option value="Will Vote">Will Vote</option>
                <option value="May Vote">May Vote</option>
                <option value="Won't Vote">Won't Vote</option>
                <option value="First-Time Voter">First-Time Voter</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Favourite Candidate</label>
              <input
                value={favouriteCandidate}
                onChange={(e) => setFavouriteCandidate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={markVisited}
                disabled={saving}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition"
              >
                {saving ? 'Saving…' : 'Mark Verified & Save'}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
