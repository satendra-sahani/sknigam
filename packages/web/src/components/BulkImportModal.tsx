'use client';

import { useState, useRef, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PreviewRow {
  row: number;
  status: 'valid' | 'invalid';
  data: any;
  errors?: string[];
}

type Step = 1 | 2 | 3;

const STEPS = [
  { num: 1 as const, label: 'Upload' },
  { num: 2 as const, label: 'Validate' },
  { num: 3 as const, label: 'Import' },
];

export default function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [validCount, setValidCount] = useState(0);
  const [invalidCount, setInvalidCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importDone, setImportDone] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    const validExts = ['.xlsx', '.xls'];
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(selectedFile.type) && !validExts.includes(ext)) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setFile(selectedFile);
    setPreview(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFileSelect(selectedFile);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, []);

  const handleValidate = async () => {
    if (!file) return;

    setStep(2);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/staff/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = response.data.data;
      setPreview(data.preview || []);
      setValidCount(data.valid || 0);
      setInvalidCount(data.invalid || 0);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to validate file');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setStep(3);
    setImporting(true);
    setImportProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setImportProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 300);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/staff/bulk-import?confirm=true', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      clearInterval(interval);
      setImportProgress(100);
      const data = response.data.data;
      setImportedCount(data.imported || validCount);
      setImportDone(true);
      toast.success(`${data.imported} staff members imported successfully`);
      onSuccess();
    } catch (err: any) {
      clearInterval(interval);
      toast.error(err.response?.data?.error || 'Import failed');
      setStep(2);
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setValidCount(0);
    setInvalidCount(0);
    setImportProgress(0);
    setImportDone(false);
    setImportedCount(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const goBack = () => {
    if (step === 2) {
      setStep(1);
      setPreview(null);
    } else if (step === 3 && !importing && !importDone) {
      setStep(2);
    }
  };

  const getStepState = (stepNum: number): 'done' | 'active' | 'pending' => {
    if (stepNum < step) return 'done';
    if (stepNum === step) return 'active';
    return 'pending';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 animate-in slide-in-from-bottom-4 duration-300 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Bulk Import Staff</h3>
            <p className="text-sm text-slate-500 mt-0.5">Import multiple staff members from an Excel file</p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center justify-between relative">
            {/* Connecting Lines */}
            <div className="absolute top-4 left-0 right-0 flex items-center px-12">
              <div className="flex-1 h-0.5 mx-2">
                <div className={`h-full transition-colors duration-300 ${step > 1 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              </div>
              <div className="flex-1 h-0.5 mx-2">
                <div className={`h-full transition-colors duration-300 ${step > 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              </div>
            </div>

            {STEPS.map((s) => {
              const state = getStepState(s.num);
              return (
                <div key={s.num} className="flex flex-col items-center relative z-10">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                      state === 'done'
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                        : state === 'active'
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {state === 'done' ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      s.num
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium mt-2 transition-colors ${
                      state === 'active' ? 'text-brand-600' : state === 'done' ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-brand-400 bg-brand-50/50'
                    : file
                    ? 'border-emerald-300 bg-emerald-50/30'
                    : 'border-slate-300 bg-slate-50/50 hover:border-brand-400 hover:bg-brand-50/30'
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {file ? (
                  <div className="space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
                      <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        if (fileRef.current) fileRef.current.value = '';
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                      <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        Drop your Excel file here
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        or <span className="text-brand-600 font-medium hover:text-brand-700">browse files</span>
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                      Accepts .xlsx and .xls formats
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-600 mb-2">Required columns:</p>
                <div className="flex flex-wrap gap-1.5">
                  {['name', 'email', 'phone', 'role'].map((col) => (
                    <span key={col} className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium bg-white text-slate-700 border border-slate-200/60">
                      {col}
                    </span>
                  ))}
                  {['zone', 'password'].map((col) => (
                    <span key={col} className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium bg-white text-slate-400 border border-slate-200/60">
                      {col} <span className="text-[10px] ml-1">(optional)</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Validate */}
          {step === 2 && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="relative">
                    <svg className="w-12 h-12 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-700">Validating your file...</p>
                    <p className="text-xs text-slate-400 mt-1">Checking each row for errors</p>
                  </div>
                </div>
              ) : preview ? (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 rounded-xl p-3.5 text-center border border-slate-200/60">
                      <p className="text-2xl font-bold text-slate-900">{validCount + invalidCount}</p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">Total Rows</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3.5 text-center border border-emerald-200/60">
                      <p className="text-2xl font-bold text-emerald-700">{validCount}</p>
                      <p className="text-xs font-medium text-emerald-600 mt-0.5">Valid</p>
                    </div>
                    <div className="bg-rose-50 rounded-xl p-3.5 text-center border border-rose-200/60">
                      <p className="text-2xl font-bold text-rose-700">{invalidCount}</p>
                      <p className="text-xs font-medium text-rose-600 mt-0.5">Errors</p>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0">
                          <tr className="bg-slate-50/80">
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Row</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Email</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.map((row) => (
                            <tr
                              key={row.row}
                              className={`border-b border-slate-100 ${
                                row.status === 'invalid' ? 'bg-rose-50/40' : ''
                              }`}
                            >
                              <td className="px-4 py-2.5 font-medium text-slate-600">#{row.row}</td>
                              <td className="px-4 py-2.5 text-slate-700">{row.data?.name || '--'}</td>
                              <td className="px-4 py-2.5 text-slate-500">{row.data?.email || '--'}</td>
                              <td className="px-4 py-2.5">
                                {row.status === 'valid' ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Valid
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-rose-700">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Error
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-rose-600 text-[11px]">
                                {row.errors?.join(', ') || '--'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {invalidCount > 0 && (
                    <button className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Error Report
                    </button>
                  )}
                </>
              ) : null}
            </div>
          )}

          {/* Step 3: Import */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-8 gap-6">
              {importDone ? (
                <>
                  {/* Success Animation */}
                  <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center animate-in zoom-in duration-500">
                    <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-slate-900">Import Successful</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {importedCount} staff members imported successfully
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {!importing && (
                    <div className="text-center space-y-3">
                      <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-slate-900">
                          Import {validCount} valid records?
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                          {invalidCount > 0 && `${invalidCount} invalid rows will be skipped. `}
                          This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  )}

                  {importing && (
                    <div className="w-full space-y-4">
                      <div className="text-center">
                        <p className="text-sm font-medium text-slate-700">Importing staff members...</p>
                        <p className="text-xs text-slate-400 mt-1">Please don't close this window</p>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-600 to-indigo-500 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${importProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-center text-slate-400">
                        {Math.round(importProgress)}% complete
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={handleClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            {step > 1 && !importing && !importDone && (
              <button
                onClick={goBack}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            )}

            {step === 1 && file && (
              <button
                onClick={handleValidate}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-indigo-600 rounded-xl hover:from-brand-700 hover:to-indigo-700 shadow-md shadow-brand-600/25 transition-all"
              >
                Next
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {step === 2 && preview && validCount > 0 && (
              <button
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-indigo-600 rounded-xl hover:from-brand-700 hover:to-indigo-700 shadow-md shadow-brand-600/25 transition-all"
              >
                Next
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {step === 3 && !importing && !importDone && (
              <button
                onClick={handleImport}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/25 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import {validCount} Staff
              </button>
            )}

            {importDone && (
              <button
                onClick={handleClose}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-indigo-600 rounded-xl hover:from-brand-700 hover:to-indigo-700 shadow-md shadow-brand-600/25 transition-all"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
