'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface Props {
  onClose: () => void;
  onImported: () => void;
}

interface PreviewRow {
  row: number;
  status: 'valid' | 'invalid';
  data?: any;
  errors?: string[];
}

interface PreviewSummary {
  total: number;
  valid: number;
  invalid: number;
  preview: PreviewRow[];
}

export default function ImportVotersModal({ onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [boothId, setBoothId] = useState('');
  const [preview, setPreview] = useState<PreviewSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  async function runPreview() {
    if (!file) {
      toast.error('Select an Excel file');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (boothId) fd.append('boothId', boothId);
      const res = await api.post('/voters/bulk-import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(res.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Preview failed');
    } finally {
      setLoading(false);
    }
  }

  async function runImport() {
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (boothId) fd.append('boothId', boothId);
      fd.append('confirm', 'true');
      const res = await api.post('/voters/bulk-import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(res.data.message || 'Imported');
      onImported();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-modal w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Bulk Import Voters</h2>
            <p className="text-xs text-slate-500">
              Upload an Excel (.xlsx) with columns: voterSerialNumber, epicNumber, fullName,
              fatherOrHusbandName, gender, age, address, partNumber, caste, religion, mobileNumber
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
            &times;
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {!preview && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Excel File</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:text-sm file:font-medium hover:file:bg-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Booth ID (optional — overrides partNumber column)
                </label>
                <input
                  value={boothId}
                  onChange={(e) => setBoothId(e.target.value)}
                  placeholder="24-char booth ObjectId"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
              </div>
            </>
          )}

          {preview && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[11px] uppercase text-slate-500">Total</p>
                  <p className="text-xl font-semibold text-slate-900">{preview.total}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-[11px] uppercase text-emerald-700">Valid</p>
                  <p className="text-xl font-semibold text-emerald-800">{preview.valid}</p>
                </div>
                <div className="bg-rose-50 rounded-lg p-3">
                  <p className="text-[11px] uppercase text-rose-700">Invalid</p>
                  <p className="text-xl font-semibold text-rose-800">{preview.invalid}</p>
                </div>
              </div>

              {preview.invalid > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase text-slate-500 mb-2">Errors (first 50)</h3>
                  <div className="border border-slate-200 rounded-lg max-h-60 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-slate-500">Row</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-500">Errors</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {preview.preview
                          .filter((r) => r.status === 'invalid')
                          .map((r) => (
                            <tr key={r.row}>
                              <td className="px-3 py-2 font-mono text-slate-600">{r.row}</td>
                              <td className="px-3 py-2 text-rose-700">{r.errors?.join('; ')}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
          {!preview ? (
            <button
              onClick={runPreview}
              disabled={!file || loading}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-40 transition"
            >
              {loading ? 'Validating…' : 'Preview'}
            </button>
          ) : (
            <>
              <button
                onClick={() => setPreview(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
              >
                Back
              </button>
              <button
                onClick={runImport}
                disabled={preview.valid === 0 || importing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40 transition"
              >
                {importing ? 'Importing…' : `Import ${preview.valid} Voters`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
