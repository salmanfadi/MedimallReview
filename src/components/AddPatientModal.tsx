'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Branch, Patient } from '@/lib/types';
import { normalizePhone } from '@/lib/phone';
import { useToast } from '@/components/ui/Toast';
import { UserPlus, Calendar, Phone, User, Building, ClipboardList, Check, Plus, AlertCircle } from 'lucide-react';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  onPatientAdded: (patient: Patient) => void;
  onPatientsBatchAdded?: (patients: Patient[]) => void;
}

export const AddPatientModal: React.FC<AddPatientModalProps> = ({
  isOpen,
  onClose,
  branches,
  onPatientAdded,
  onPatientsBatchAdded,
}) => {
  const { showToast } = useToast();
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Tab mode: 'single' or 'bulk'
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  // Single form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [branchId, setBranchId] = useState('');
  const [keepOpen, setKeepOpen] = useState(true);

  // Ensure branchId is always synchronized with available branches
  useEffect(() => {
    if (branches.length > 0) {
      if (!branchId || !branches.some((b) => b.id === branchId)) {
        setBranchId(branches[0].id);
      }
    }
  }, [branches, branchId, isOpen]);

  // Default visit time to current local time formatted for datetime-local input
  const getNowFormatted = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };
  const [visitTime, setVisitTime] = useState(getNowFormatted());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setVisitTime(getNowFormatted());
      if (branches.length > 0 && !branchId) {
        setBranchId(branches[0].id);
      }
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen, branches, branchId]);

  // Bulk paste state
  const [bulkText, setBulkText] = useState('');
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  const getEffectiveBranchId = () => {
    return branchId || (branches.length > 0 ? branches[0].id : '');
  };

  const validateSingle = () => {
    const errs: { [key: string]: string } = {};
    if (!name.trim()) {
      errs.name = 'Patient name is required';
    }

    const phoneRes = normalizePhone(phone);
    if (!phoneRes.isValid) {
      errs.phone = phoneRes.error || 'Invalid phone number';
    }

    const activeBranch = getEffectiveBranchId();
    if (!activeBranch) {
      errs.branch = 'Please select a branch or configure branches first.';
    }

    if (!visitTime) {
      errs.visitTime = 'Visit time is required';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSingleSubmit = async (e?: React.FormEvent, shouldKeepOpenOverride?: boolean) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!validateSingle()) {
      // Highlight error via toast if branch or something is missing
      if (!getEffectiveBranchId()) {
        showToast({
          type: 'error',
          title: 'Missing Branch',
          message: 'Please select a clinic branch before saving.',
        });
      }
      return;
    }

    setIsSubmitting(true);
    const activeBranchId = getEffectiveBranchId();
    const targetBranch = branches.find((b) => b.id === activeBranchId);

    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          branch_id: activeBranchId,
          visit_time: new Date(visitTime).toISOString(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add patient');
      }

      showToast({
        type: 'success',
        title: 'Patient Added',
        message: `${data.patient.name} has been added successfully.`,
      });

      onPatientAdded(data.patient);

      // Reset patient name and phone fields
      setName('');
      setPhone('');
      setErrors({});

      const shouldStay = shouldKeepOpenOverride !== undefined ? shouldKeepOpenOverride : keepOpen;
      if (shouldStay) {
        setTimeout(() => nameInputRef.current?.focus(), 50);
      } else {
        onClose();
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error Adding Patient',
        message: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Parse bulk text: detects lines like "Salman Faris, 9876543210" or "Ananya 9447123456"
  const parseBulkEntries = () => {
    const lines = bulkText.split('\n');
    const valid: Array<{ name: string; phone: string; normalizedPhone: string }> = [];
    const invalid: string[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const phoneMatch = trimmed.match(/(\+?91[\-\s]?)?[6-9]\d{9}/);
      if (phoneMatch) {
        const rawPhone = phoneMatch[0];
        const rawName = trimmed.replace(rawPhone, '').replace(/[,\-\:\t]/g, ' ').trim();
        const norm = normalizePhone(rawPhone);

        if (rawName && norm.isValid) {
          valid.push({
            name: rawName,
            phone: rawPhone,
            normalizedPhone: norm.normalized!,
          });
          return;
        }
      }
      invalid.push(trimmed);
    });

    return { valid, invalid };
  };

  const parsedBulk = parseBulkEntries();

  const handleBulkSubmit = async () => {
    if (parsedBulk.valid.length === 0) return;
    const activeBranchId = getEffectiveBranchId();
    if (!activeBranchId) {
      showToast({
        type: 'error',
        title: 'Missing Branch',
        message: 'Please select a branch first.',
      });
      return;
    }

    setIsBulkSubmitting(true);

    try {
      const recordsToInsert = parsedBulk.valid.map((item) => ({
        name: item.name,
        phone: item.normalizedPhone,
        branch_id: activeBranchId,
        visit_time: new Date(visitTime).toISOString(),
      }));

      const res = await fetch('/api/patients/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patients: recordsToInsert }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to import bulk patients');

      showToast({
        type: 'success',
        title: 'Batch Patients Added',
        message: `Successfully added ${data.importedCount} patients.`,
      });

      if (onPatientsBatchAdded && data.patients) {
        onPatientsBatchAdded(data.patients);
      } else if (data.patients) {
        data.patients.forEach((p: Patient) => onPatientAdded(p));
      }

      setBulkText('');
      onClose();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Bulk Add Failed',
        message: err.message,
      });
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const currentBranchValue = getEffectiveBranchId();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Patients"
      description="Add patients individually with continuous fast-entry, or paste multiple records."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-200 gap-4 text-sm font-medium">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`pb-2.5 transition-colors flex items-center gap-1.5 ${
              mode === 'single'
                ? 'border-b-2 border-brand-600 text-brand-700 font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Quick Single Add
          </button>
          <button
            type="button"
            onClick={() => setMode('bulk')}
            className={`pb-2.5 transition-colors flex items-center gap-1.5 ${
              mode === 'bulk'
                ? 'border-b-2 border-brand-600 text-brand-700 font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Paste Multiple Patients (Fast)
          </button>
        </div>

        {/* Common: Branch & Visit Time selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <div>
            <label htmlFor="modal-branch-select" className="block text-xs font-semibold text-slate-700 mb-1">
              Select Branch <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
              <select
                id="modal-branch-select"
                value={currentBranchValue}
                onChange={(e) => {
                  setBranchId(e.target.value);
                  if (errors.branch) setErrors((prev) => ({ ...prev, branch: '' }));
                }}
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            {errors.branch && (
              <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.branch}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="modal-visit-time" className="block text-xs font-semibold text-slate-700 mb-1">
              Visit Time <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
              <input
                id="modal-visit-time"
                type="datetime-local"
                value={visitTime}
                onChange={(e) => {
                  setVisitTime(e.target.value);
                  if (errors.visitTime) setErrors((prev) => ({ ...prev, visitTime: '' }));
                }}
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* MODE 1: Fast Single Entry */}
        {mode === 'single' && (
          <form onSubmit={(e) => handleSingleSubmit(e, false)} className="space-y-4">
            <Input
              ref={nameInputRef}
              label="Patient Name"
              required
              placeholder="e.g. Salman Fadi"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              error={errors.name}
              leftIcon={<User className="w-4 h-4" />}
              autoFocus
            />

            <Input
              label="Phone Number"
              required
              placeholder="e.g. 8590070165"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSingleSubmit(undefined, keepOpen);
                }
              }}
              error={errors.phone}
              helperText="10-digit number or 12 digits starting with 91. Press Enter to save."
              leftIcon={<Phone className="w-4 h-4" />}
            />

            {/* Continuous Mode Option */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="keep-open-checkbox"
                checked={keepOpen}
                onChange={(e) => setKeepOpen(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
              />
              <label htmlFor="keep-open-checkbox" className="text-xs font-medium text-slate-700 cursor-pointer select-none">
                Keep modal open to add next patient immediately (Rapid entry)
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Close
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSingleSubmit(undefined, true)}
                  disabled={isSubmitting || !name.trim() || !phone.trim()}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Save & Add Another
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting}
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Save Patient
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* MODE 2: Bulk Quick Paste */}
        {mode === 'bulk' && (
          <div className="space-y-3">
            <div>
              <label htmlFor="bulk-paste-area" className="block text-xs font-semibold text-slate-700 mb-1">
                Paste Patient List (Name & Phone on each line)
              </label>
              <textarea
                id="bulk-paste-area"
                rows={6}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"Salman Fadi 8590070165\nRahul Sharma 9876543210\nAnanya Das, +91 94471 23456"}
                className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
                autoFocus
              />
              <p className="text-[11px] text-slate-500 mt-1">
                You can copy-paste directly from WhatsApp, Excel, or reception text files.
              </p>
            </div>

            {/* Bulk parsed status */}
            {bulkText.trim() && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">
                    Detected Patients: {parsedBulk.valid.length} valid
                  </span>
                  {parsedBulk.invalid.length > 0 && (
                    <span className="text-amber-600 font-medium">
                      {parsedBulk.invalid.length} unparsed lines
                    </span>
                  )}
                </div>

                {parsedBulk.valid.length > 0 && (
                  <div className="max-h-28 overflow-y-auto divide-y divide-slate-200 border border-slate-200 rounded-lg bg-white">
                    {parsedBulk.valid.map((item, idx) => (
                      <div key={idx} className="p-1.5 px-2.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-900">{item.name}</span>
                        <span className="text-slate-500 font-mono">+{item.normalizedPhone}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isBulkSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleBulkSubmit}
                isLoading={isBulkSubmitting}
                disabled={parsedBulk.valid.length === 0}
                leftIcon={<UserPlus className="w-4 h-4" />}
              >
                Add All {parsedBulk.valid.length} Patients
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
