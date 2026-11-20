'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  AlertCircle,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { ImportPreviewSummary, Branch, Patient } from '@/lib/types';
import { parseExcelFile } from '@/lib/excel';
import * as XLSX from 'xlsx';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  onImportSuccess: (newPatients?: Patient[]) => void;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  branches,
  onImportSuccess,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isCommitLoading, setIsCommitLoading] = useState(false);
  const [summary, setSummary] = useState<ImportPreviewSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'valid' | 'skipped'>('valid');
  const [dragActive, setDragActive] = useState(false);

  const handleReset = () => {
    setSelectedFile(null);
    setSummary(null);
    setIsPreviewLoading(false);
    setIsCommitLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      showToast({
        type: 'error',
        title: 'Invalid File Type',
        message: 'Please upload an Excel spreadsheet (.xlsx format).',
      });
      return;
    }

    setSelectedFile(file);
    setIsPreviewLoading(true);
    setSummary(null);

    try {
      // Instant Client-Side Parsing with SheetJS (0ms network latency!)
      const arrayBuffer = await file.arrayBuffer();
      const clientSummary = parseExcelFile(arrayBuffer, branches);

      setSummary(clientSummary);
      if (clientSummary.validCount === 0 && clientSummary.skippedCount > 0) {
        setActiveTab('skipped');
      } else {
        setActiveTab('valid');
      }
    } catch (err: any) {
      // If client-side parse threw, fall back to server preview
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/patients/import?action=preview', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to preview Excel file');
        setSummary(data.summary);
      } catch (serverErr: any) {
        showToast({
          type: 'error',
          title: 'Excel Read Error',
          message: err.message || serverErr.message,
        });
        handleReset();
      }
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!summary || summary.validRows.length === 0) return;

    setIsCommitLoading(true);
    try {
      // High-speed JSON payload containing only valid, pre-normalized rows
      const rowsToInsert = summary.validRows.map((r) => ({
        name: r.name,
        phone: r.phone,
        branch_id: r.branch_id!,
        visit_time: r.visit_time,
      }));

      const res = await fetch('/api/patients/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patients: rowsToInsert }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import patients');
      }

      showToast({
        type: 'success',
        title: 'Import Successful',
        message: `Imported ${data.importedCount} patients in a flash. ${summary.skippedCount} rows skipped.`,
      });

      onImportSuccess(data.patients);
      handleReset();
      onClose();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Import Failed',
        message: err.message,
      });
    } finally {
      setIsCommitLoading(false);
    }
  };

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        'Name': 'Salman Faris',
        'Phone': '9876543210',
        'Branch': branches[0]?.name || 'Kunnamangalam',
        'Visit Time': '2026-11-20 14:30',
      },
      {
        'Name': 'Ananya Das',
        'Phone': '+91 94471 23456',
        'Branch': branches[1]?.name || 'Malappuram',
        'Visit Time': '2026-11-20 15:45',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 20 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'Medimall_Patient_Import_Template.xlsx');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="Upload Patient Excel (.xlsx)"
      description="Upload patient visit list with instant validation and fast batch import."
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Step 1: Upload Dropzone if no preview yet */}
        {!summary && (
          <div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileChange(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                dragActive
                  ? 'border-brand-500 bg-brand-50/50'
                  : 'border-slate-300 hover:border-brand-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-800">
                    Click to upload or drag & drop .xlsx file
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Headers must be: <strong>Name, Phone, Branch, Visit Time</strong>
                  </p>
                </div>
                <div className="pt-2 flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Instant browser preview enabled</span>
                </div>
              </div>
            </div>

            {/* Template Help */}
            <div className="mt-4 flex items-center justify-between p-3.5 bg-slate-100/80 rounded-xl text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Need the required column format?</span>
              </div>
              <button
                type="button"
                onClick={downloadSampleTemplate}
                className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:text-brand-700 underline"
              >
                <Download className="w-3.5 h-3.5" />
                Download Sample .xlsx
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isPreviewLoading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            <p className="text-sm font-medium text-slate-600">
              Validating rows instantly...
            </p>
          </div>
        )}

        {/* Step 2: Preview & Validation Breakdown (FR-2) */}
        {summary && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <p className="text-xs text-slate-500">Total Rows</p>
                <p className="text-lg font-bold text-slate-800">{summary.totalRows}</p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                <p className="text-xs text-emerald-700 font-medium">Valid Ready</p>
                <p className="text-lg font-bold text-emerald-800">{summary.validCount}</p>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
                <p className="text-xs text-amber-700 font-medium">Flagged & Skipped</p>
                <p className="text-lg font-bold text-amber-800">{summary.skippedCount}</p>
              </div>
            </div>

            {/* Tab switch between Valid & Skipped */}
            <div className="flex border-b border-slate-200 gap-4 text-sm font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('valid')}
                className={`pb-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'valid'
                    ? 'border-b-2 border-brand-600 text-brand-700 font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Valid Rows ({summary.validCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('skipped')}
                className={`pb-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'skipped'
                    ? 'border-b-2 border-brand-600 text-brand-700 font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Skipped Rows ({summary.skippedCount})
              </button>
            </div>

            {/* Preview table view */}
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50/50">
              {activeTab === 'valid' && (
                summary.validRows.length === 0 ? (
                  <p className="p-6 text-center text-sm text-slate-500">
                    No valid rows found in this spreadsheet.
                  </p>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Name</th>
                        <th className="p-2.5">Phone</th>
                        <th className="p-2.5">Branch</th>
                        <th className="p-2.5">Visit Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {summary.validRows.map((r, i) => (
                        <tr key={i} className="hover:bg-white transition-colors">
                          <td className="p-2.5 text-slate-400">{r.rowNumber}</td>
                          <td className="p-2.5 font-medium text-slate-800">{r.name}</td>
                          <td className="p-2.5 text-slate-600">{r.phone}</td>
                          <td className="p-2.5 text-slate-600">{r.branch}</td>
                          <td className="p-2.5 text-slate-600">
                            {new Date(r.visit_time).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {activeTab === 'skipped' && (
                summary.skippedRows.length === 0 ? (
                  <p className="p-6 text-center text-sm text-emerald-700 font-medium">
                    Awesome! 0 rows skipped. All rows are valid.
                  </p>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-red-50 text-red-900 font-semibold sticky top-0">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Row Data</th>
                        <th className="p-2.5">Reason Skipped</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100">
                      {summary.skippedRows.map((s, i) => (
                        <tr key={i} className="hover:bg-red-50/50 transition-colors">
                          <td className="p-2.5 text-slate-500 font-medium">{s.rowNumber}</td>
                          <td className="p-2.5 text-slate-700">
                            <strong>{s.name}</strong> • {s.phone || '(no phone)'} • {s.branch || '(no branch)'}
                          </td>
                          <td className="p-2.5 text-red-700 font-medium">{s.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isCommitLoading}
              >
                Choose Another File
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={isCommitLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleCommitImport}
                  isLoading={isCommitLoading}
                  disabled={summary.validCount === 0}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Import {summary.validCount} Patients Now
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
