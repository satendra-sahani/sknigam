'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Booth } from '@/app/booths/page';

interface Props {
  booth: Booth | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function BoothFormModal({ booth, onClose, onSaved }: Props) {
  const isEdit = !!booth;
  const [partNumber, setPartNumber] = useState(booth?.partNumber?.toString() || '');
  const [name, setName] = useState(booth?.name || '');
  const [assemblyConstituency, setAssemblyConstituency] = useState(booth?.assemblyConstituency || '');
  const [district, setDistrict] = useState(booth?.district || '');
  const [state, setState] = useState(booth?.state || 'Uttar Pradesh');
  const [village, setVillage] = useState(booth?.village || '');
  const [address, setAddress] = useState(booth?.address || '');
  const [totalVoters, setTotalVoters] = useState(booth?.totalVoters?.toString() || '0');
  const [latitude, setLatitude] = useState(booth?.latitude?.toString() || '');
  const [longitude, setLongitude] = useState(booth?.longitude?.toString() || '');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !partNumber || !assemblyConstituency || !district) {
      toast.error('Booth name, part number, constituency and district are required');
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        partNumber: parseInt(partNumber, 10),
        name: name.trim(),
        assemblyConstituency: assemblyConstituency.trim(),
        district: district.trim(),
        state: state.trim() || 'Uttar Pradesh',
        village: village.trim() || undefined,
        address: address.trim() || undefined,
        totalVoters: parseInt(totalVoters || '0', 10),
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
      };
      if (isEdit) {
        await api.put(`/booths/${booth!._id}`, body);
        toast.success('Booth updated');
      } else {
        await api.post('/booths', body);
        toast.success('Booth created');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-modal w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? `Edit Booth · Part ${booth?.partNumber}` : 'New Booth'}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
            &times;
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Part Number *" value={partNumber} onChange={setPartNumber} type="number" />
          <Input label="Booth Name *" value={name} onChange={setName} />
          <Input label="Assembly Constituency *" value={assemblyConstituency} onChange={setAssemblyConstituency} />
          <Input label="District *" value={district} onChange={setDistrict} />
          <Input label="State" value={state} onChange={setState} />
          <Input label="Village / Locality" value={village} onChange={setVillage} />
          <div className="md:col-span-2">
            <Input label="Address" value={address} onChange={setAddress} />
          </div>
          <Input label="Total Voters" value={totalVoters} onChange={setTotalVoters} type="number" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Latitude" value={latitude} onChange={setLatitude} type="number" />
            <Input label="Longitude" value={longitude} onChange={setLongitude} type="number" />
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Booth'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
      />
    </div>
  );
}
