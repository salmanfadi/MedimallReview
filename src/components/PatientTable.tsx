'use client';

import React, { useState, useMemo } from 'react';
import {
  Patient,
  Language,
  Branch,
} from '@/lib/types';
import { formatPhoneDisplay } from '@/lib/phone';
import { compileTemplate, generateWhatsAppUrl } from '@/lib/whatsapp';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import {
  Search,
  MessageCircle,
  Download,
  CheckCheck,
  Clock,
  Building,
  User,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Plus,
  Upload,
} from 'lucide-react';

interface PatientTableProps {
  patients: Patient[];
  branches: Branch[];
  templates: { en: string; ml: string };
  currentLanguage: Language;
  isLoading: boolean;
  onPatientSent: (updatedPatient: Patient) => void;
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
}

export const PatientTable: React.FC<PatientTableProps> = ({
  patients,
  branches,
  templates,
  currentLanguage,
  isLoading,
  onPatientSent,
  onOpenAddModal,
  onOpenImportModal,
}) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Filter patients by name or phone (FR-4)
  const filteredPatients = useMemo(() => {
    if (!search.trim()) return patients;
    const q = search.trim().toLowerCase();
    return patients.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(q);
      const phoneMatch = p.phone.includes(q);
      return nameMatch || phoneMatch;
    });
  }, [patients, search]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredPatients.length / pageSize) || 1;
  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPatients.slice(start, start + pageSize);
  }, [filteredPatients, currentPage, pageSize]);

  // Handle WhatsApp Click (FR-5)
  const handleSendWhatsApp = async (patient: Patient) => {
    try {
      setSendingId(patient.id);

      // Select active template based on chosen language
      const templateBody = currentLanguage === 'ml' ? templates.ml : templates.en;

      // Compile message with patient name, branch name, and Google review link
      const compiledMessage = compileTemplate(templateBody, {
        name: patient.name,
        branch: patient.branch_name || 'Medimall',
        review_link: patient.review_link || '',
      });

      // Generate wa.me click-to-chat URL
      const whatsappUrl = generateWhatsAppUrl(patient.phone, compiledMessage);

      // Open WhatsApp chat in a new tab immediately
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

      // Update backend sent status (FR-5: Marks as Sent with date and time)
      const res = await fetch(`/api/patients/${patient.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: currentLanguage }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update sent status');
      }

      onPatientSent(data.patient);

      showToast({
        type: 'success',
        title: 'Review Link Opened',
        message: `WhatsApp opened for ${patient.name}. Marked as Sent.`,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err.message,
      });
    } finally {
      setSendingId(null);
    }
  };

  // Export current table (FR-10)
  const handleExport = () => {
    const exportUrl = `/api/patients/export${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`;
    window.location.href = exportUrl;
    showToast({
      type: 'info',
      title: 'Exporting Excel',
      message: 'Generating spreadsheet with your current search view...',
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
      {/* Top Controls: Search, Export, Add, Upload */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
        {/* Search Bar (FR-4) */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by patient name or phone..."
            className="block w-full h-11 min-h-[44px] pl-10 pr-9 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors shadow-subtle"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setCurrentPage(1);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <FilterX className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* FR-10 Export button */}
          <Button
            variant="outline"
            size="md"
            onClick={handleExport}
            disabled={patients.length === 0}
            leftIcon={<Download className="w-4 h-4" />}
            title="Download current table as Excel .xlsx"
          >
            Export
          </Button>

          {/* FR-2 Upload Excel button */}
          <Button
            variant="secondary"
            size="md"
            onClick={onOpenImportModal}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Upload Excel
          </Button>

          {/* FR-3 Add Patient button */}
          <Button
            variant="primary"
            size="md"
            onClick={onOpenAddModal}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Patient
          </Button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <th scope="col" className="py-3.5 px-4 sm:px-6">Patient</th>
              <th scope="col" className="py-3.5 px-4 sm:px-6">Phone</th>
              <th scope="col" className="py-3.5 px-4 sm:px-6">Branch</th>
              <th scope="col" className="py-3.5 px-4 sm:px-6">Visit Time</th>
              <th scope="col" className="py-3.5 px-4 sm:px-6">Status</th>
              <th scope="col" className="py-3.5 px-4 sm:px-6 text-right">WhatsApp Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              // Loading Skeleton State
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td className="py-4 px-4 sm:px-6"><Skeleton className="h-4 w-32" /></td>
                  <td className="py-4 px-4 sm:px-6"><Skeleton className="h-4 w-28" /></td>
                  <td className="py-4 px-4 sm:px-6"><Skeleton className="h-4 w-24" /></td>
                  <td className="py-4 px-4 sm:px-6"><Skeleton className="h-4 w-32" /></td>
                  <td className="py-4 px-4 sm:px-6"><Skeleton className="h-6 w-20 rounded-full" /></td>
                  <td className="py-4 px-4 sm:px-6 text-right"><Skeleton className="h-10 w-28 rounded-lg ml-auto" /></td>
                </tr>
              ))
            ) : paginatedPatients.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="max-w-sm mx-auto flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                      <User className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-800">
                        {search ? 'No matching patients found' : 'No patients added yet'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {search
                          ? `No results match "${search}". Try searching for another name or phone number.`
                          : 'Add individual patients or upload an Excel file from your clinic reception.'}
                      </p>
                    </div>
                    {search ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSearch('')}
                      >
                        Clear Search Filter
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={onOpenAddModal}
                          leftIcon={<Plus className="w-4 h-4" />}
                        >
                          Add First Patient
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onOpenImportModal}
                          leftIcon={<Upload className="w-4 h-4" />}
                        >
                          Upload Excel
                        </Button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows
              paginatedPatients.map((patient) => {
                const isSent = Boolean(patient.sent_at);
                const isCurrentSending = sendingId === patient.id;

                return (
                  <tr
                    key={patient.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Patient Name */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-semibold text-xs flex items-center justify-center shrink-0 uppercase">
                          {patient.name.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-900">
                          {patient.name}
                        </span>
                      </div>
                    </td>

                    {/* Phone Number */}
                    <td className="py-4 px-4 sm:px-6 font-mono text-xs text-slate-600">
                      {formatPhoneDisplay(patient.phone)}
                    </td>

                    {/* Branch */}
                    <td className="py-4 px-4 sm:px-6">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {patient.branch_name || 'Kunnamangalam'}
                      </span>
                    </td>

                    {/* Visit Time */}
                    <td className="py-4 px-4 sm:px-6 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(patient.visit_time).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 sm:px-6">
                      {isSent ? (
                        <div className="space-y-0.5">
                          <Badge variant="success" icon={<CheckCheck className="w-3.5 h-3.5" />}>
                            Sent ({patient.sent_language === 'ml' ? 'Malayalam' : 'English'})
                          </Badge>
                          <p className="text-[11px] text-slate-400">
                            {new Date(patient.sent_at!).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      ) : (
                        <Badge variant="warning">
                          Pending
                        </Badge>
                      )}
                    </td>

                    {/* FR-5 WhatsApp Button */}
                    <td className="py-4 px-4 sm:px-6 text-right">
                      {isSent ? (
                        // Grey and disabled once sent per FR-5
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled
                          className="bg-slate-100 text-slate-400 cursor-not-allowed opacity-80"
                          leftIcon={<CheckCheck className="w-4 h-4 text-emerald-600" />}
                        >
                          Message Sent
                        </Button>
                      ) : (
                        // Active WhatsApp Button
                        <Button
                          variant="whatsapp"
                          size="sm"
                          onClick={() => handleSendWhatsApp(patient)}
                          isLoading={isCurrentSending}
                          leftIcon={<MessageCircle className="w-4 h-4" />}
                          title={`Send review request in ${currentLanguage === 'ml' ? 'Malayalam' : 'English'}`}
                        >
                          Send WhatsApp
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {filteredPatients.length > 0 && (
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-4">
            <span>
              Showing{' '}
              <strong>
                {Math.min(
                  (currentPage - 1) * pageSize + 1,
                  filteredPatients.length
                )}
              </strong>{' '}
              to{' '}
              <strong>
                {Math.min(currentPage * pageSize, filteredPatients.length)}
              </strong>{' '}
              of <strong>{filteredPatients.length}</strong> patients
            </span>

            {/* Page size dropdown */}
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Page navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
