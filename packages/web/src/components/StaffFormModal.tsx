'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { StaffUser } from '@/app/staff/page';

interface Props {
  staff: StaffUser | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function StaffFormModal({ staff, onClose, onSaved }: Props) {
  const isEdit = !!staff;
  const [name, setName] = useState(staff?.name || '');
  const [email, setEmail] = useState(staff?.email || '');
  const [phone, setPhone] = useState(staff?.phone || '');
  const [password, setPassword] = useState('');
  const [constituency, setConstituency] = useState(staff?.assemblyConstituency || '');
  const [district, setDistrict] = useState(staff?.district || '');
  const [idProofUrl, setIdProofUrl] = useState(staff?.idProofUrl || '');
  const [profilePhoto, setProfilePhoto] = useState(staff?.profilePhoto || '');
  const [isActive, setIsActive] = useState(staff?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'idProof' | 'photo' | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !phone) {
      toast.error('Name, email and phone are required');
      return;
    }
    if (!isEdit && !password) {
      toast.error('Password required for new staff');
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        assemblyConstituency: constituency.trim() || undefined,
        district: district.trim() || undefined,
        idProofUrl: idProofUrl || undefined,
        profilePhoto: profilePhoto || undefined,
        isActive,
      };
      if (!isEdit) body.password = password;

      if (isEdit) {
        await api.put(`/staff/${staff!._id}`, body);
        toast.success('Staff updated');
      } else {
        await api.post('/staff', body);
        toast.success('Staff created');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(kind: 'idProof' | 'photo', file: File) {
    if (!isEdit) {
      toast.error('Create the staff first, then upload');
      return;
    }
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', kind);
      const res = await api.post(`/staff/${staff!._id}/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { url } = res.data.data;
      if (kind === 'photo') setProfilePhoto(url);
      else setIdProofUrl(url);
      toast.success('Uploaded');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-modal w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{isEdit ? `Edit · ${staff?.name}` : 'New Field Staff'}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
            &times;
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Full Name *" value={name} onChange={setName} />
          <Input label="Email *" value={email} onChange={setEmail} type="email" disabled={isEdit} />
          <Input label="Phone (10 digits) *" value={phone} onChange={setPhone} />
          {!isEdit && <Input label="Initial Password *" value={password} onChange={setPassword} type="password" />}
          <Input label="Assembly Constituency" value={constituency} onChange={setConstituency} />
          <Input label="District" value={district} onChange={setDistrict} />

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <FileRow
              label="Profile Photo"
              url={profilePhoto}
              uploading={uploading === 'photo'}
              onChange={(f) => uploadFile('photo', f)}
              disabled={!isEdit}
            />
            <FileRow
              label="ID Proof"
              url={idProofUrl}
              uploading={uploading === 'idProof'}
              onChange={(f) => uploadFile('idProof', f)}
              disabled={!isEdit}
            />
          </div>

          {isEdit && (
            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
                Active
              </label>
            </div>
          )}
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
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Staff'}
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
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 disabled:bg-slate-100 disabled:text-slate-500"
      />
    </div>
  );
}

function FileRow({
  label,
  url,
  uploading,
  onChange,
  disabled,
}: {
  label: string;
  url: string;
  uploading: boolean;
  onChange: (file: File) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <div className="flex items-center gap-3">
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="text-xs text-red-600 hover:underline">
            View current
          </a>
        ) : (
          <span className="text-xs text-slate-400">None</span>
        )}
        <input
          type="file"
          accept="image/*"
          disabled={disabled || uploading}
          onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])}
          className="block text-xs text-slate-600 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-slate-100 file:text-slate-700 file:text-xs hover:file:bg-slate-200 disabled:opacity-50"
        />
      </div>
      {disabled && <p className="text-[11px] text-slate-400 mt-1">Create the staff first, then upload</p>}
      {uploading && <p className="text-[11px] text-red-600 mt-1">Uploading…</p>}
    </div>
  );
}
