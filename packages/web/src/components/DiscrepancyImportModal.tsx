'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface Props {
  onClose: () => void;
  onImported: () => void;
  defaultAc?: string;
  defaultAcNumber?: number;
  defaultPartNumber?: number;
}

interface PreviewRow {
  voterSerialNumber: number;
  partSerialNumber?: number;
  epicNumber: string;
  voterNameHi: string;
  voterNameEn: string;
  age?: number;
  genderHi?: string;
  gender?: string;
  discrepancyReasonHi: string[];
  discrepancyReasonEn: string[];
}

interface PreviewData {
  fileName: string;
  rowCount: number;
  assemblyConstituencyNumber: number;
  assemblyConstituency: string;
  assemblyConstituencyHi?: string;
  partNumber: number;
  partNameHi?: string;
  partNameEn?: string;
  preview: PreviewRow[];
  warnings: string[];
}

export default function DiscrepancyImportModal({
  onClose,
  onImported,
  defaultAc,
  defaultAcNumber,
  defaultPartNumber,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  // Overrides (used only if the parser couldn't detect them)
  const [acNumber, setAcNumber] = useState(defaultAcNumber ? String(defaultAcNumber) : '');
  const [acName, setAcName] = useState(defaultAc || '');
  const [partNumber, setPartNumber] = useState(defaultPartNumber ? String(defaultPartNumber) : '');

  async function runPreview() {
    if (!file) {
      toast.error('Select a PDF file');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/discrepancies/preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(res.data.data);
      if (res.data.data.assemblyConstituencyNumber && !acNumber) {
        setAcNumber(String(res.data.data.assemblyConstituencyNumber));
      }
      if (res.data.data.assemblyConstituency && !acName) {
        setAcName(res.data.data.assemblyConstituency);
      }
      if (res.data.data.partNumber && !partNumber) {
        setPartNumber(String(res.data.data.partNumber));
      }
      if (res.data.data.warnings?.length) {
        toast((t) => (
          <span className="text-xs">
            {res.data.data.warnings.slice(0, 2).join(' · ')}
          </span>
        ), { icon: '⚠️', duration: 5000 });
      }
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
      if (acNumber) fd.append('assemblyConstituencyNumber', acNumber);
      if (acName) fd.append('assemblyConstituency', acName);
      if (partNumber) fd.append('partNumber', partNumber);
      const res = await api.post('/discrepancies/import', fd, {
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
      <div className="bg-white rounded-2xl shadow-modal w-full max-w-4xl max-h-[92vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Import Discrepancy Report (PDF)
            </h2>
            <p className="text-xs text-slate-500">
              Upload the ECI "List of voters with no mapping and logical discrepancy" PDF.
              We extract voter rows in both Hindi and English.
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
                <label className="block text-xs font-medium text-slate-600 mb-1">PDF File</label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:text-sm file:font-medium hover:file:bg-slate-200"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Example file name: discrepency_2026_s24_SR_FORM_338_discrepency_elector_report_ac338_part1.pdf
                </p>
              </div>
            </>
          )}

          {preview && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[11px] uppercase text-slate-500">Rows parsed</p>
                  <p className="text-xl font-semibold text-slate-900">{preview.rowCount}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[11px] uppercase text-slate-500">Vidhan Sabha</p>
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {preview.assemblyConstituencyNumber
                      ? `${preview.assemblyConstituencyNumber} — ${preview.assemblyConstituency || preview.assemblyConstituencyHi || ''}`
                      : '—'}
                  </p>
                  {preview.assemblyConstituencyHi && (
                    <p className="text-[10px] text-slate-500 truncate">{preview.assemblyConstituencyHi}</p>
                  )}
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[11px] uppercase text-slate-500">Part</p>
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {preview.partNumber || '—'}{preview.partNameEn ? ` — ${preview.partNameEn}` : ''}
                  </p>
                  {preview.partNameHi && (
                    <p className="text-[10px] text-slate-500 truncate">{preview.partNameHi}</p>
                  )}
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-[11px] uppercase text-amber-700">Warnings</p>
                  <p className="text-xl font-semibold text-amber-800">{preview.warnings.length}</p>
                </div>
              </div>

              {(!preview.assemblyConstituencyNumber || !preview.partNumber) && (
                <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-800">
                    Please confirm Assembly Constituency and Part — we could not detect them automatically.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      value={acNumber}
                      onChange={(e) => setAcNumber(e.target.value)}
                      placeholder="AC number"
                      className="px-3 py-2 text-sm bg-white border border-amber-300 rounded-lg"
                    />
                    <input
                      value={acName}
                      onChange={(e) => setAcName(e.target.value)}
                      placeholder="AC name (English)"
                      className="px-3 py-2 text-sm bg-white border border-amber-300 rounded-lg"
                    />
                    <input
                      value={partNumber}
                      onChange={(e) => setPartNumber(e.target.value)}
                      placeholder="Part number"
                      className="px-3 py-2 text-sm bg-white border border-amber-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {preview.warnings.length > 0 && (
                <div className="border border-amber-200 rounded-lg p-3 bg-amber-50 max-h-32 overflow-y-auto">
                  <p className="text-xs font-semibold text-amber-800 mb-1">Parser warnings</p>
                  <ul className="list-disc pl-4 text-[11px] text-amber-700 space-y-0.5">
                    {preview.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="text-xs font-semibold uppercase text-slate-500 mb-2">
                  Preview (first 25 rows — bilingual)
                </h3>
                <div className="border border-slate-200 rounded-lg max-h-80 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium text-slate-500">Sr</th>
                        <th className="px-2 py-2 text-left font-medium text-slate-500">EPIC</th>
                        <th className="px-2 py-2 text-left font-medium text-slate-500">Name (Hindi)</th>
                        <th className="px-2 py-2 text-left font-medium text-slate-500">Name (English)</th>
                        <th className="px-2 py-2 text-left font-medium text-slate-500">Age/Sex</th>
                        <th className="px-2 py-2 text-left font-medium text-slate-500">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.preview.map((r) => (
                        <tr key={r.epicNumber}>
                          <td className="px-2 py-2 font-mono text-slate-600">{r.voterSerialNumber}</td>
                          <td className="px-2 py-2 font-mono text-slate-700">{r.epicNumber}</td>
                          <td className="px-2 py-2 text-slate-900">{r.voterNameHi}</td>
                          <td className="px-2 py-2 text-slate-700">{r.voterNameEn}</td>
                          <td className="px-2 py-2 text-slate-600">
                            {r.age ?? '—'} / {r.gender || '—'}
                          </td>
                          <td className="px-2 py-2 text-slate-700">
                            {r.discrepancyReasonEn.map((en, i) => (
                              <div key={i} className="leading-tight">
                                <span className="text-slate-900">{en}</span>
                                <div className="text-[10px] text-slate-500">{r.discrepancyReasonHi[i]}</div>
                              </div>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
            Cancel
          </button>
          {!preview ? (
            <button
              onClick={runPreview}
              disabled={!file || loading}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-40 transition">
              {loading ? 'Parsing PDF…' : 'Parse PDF'}
            </button>
          ) : (
            <>
              <button onClick={() => setPreview(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
                Back
              </button>
              <button
                onClick={runImport}
                disabled={preview.rowCount === 0 || importing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40 transition">
                {importing ? 'Importing…' : `Import ${preview.rowCount} rows`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
