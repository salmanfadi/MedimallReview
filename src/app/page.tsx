'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { StatsBar } from '@/components/StatsBar';
import { PatientTable } from '@/components/PatientTable';
import { AddPatientModal } from '@/components/AddPatientModal';
import { ImportExcelModal } from '@/components/ImportExcelModal';
import { Patient, Branch, Language } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function DashboardPage() {
  const { showToast } = useToast();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [templates, setTemplates] = useState<{ en: string; ml: string }>({
    en: 'Hello {name}, thank you for visiting Medimall {branch}. Your feedback means a lot to us. Could you please take a minute to share your experience on Google? {review_link}',
    ml: 'നമസ്കാരം {name}, Medimall {branch} സന്ദർശിച്ചതിന് നന്ദി. താങ്കളുടെ അഭിപ്രായം ഞങ്ങൾക്ക് വളരെ വിലപ്പെട്ടതാണ്. ദയവായി ഒരു ഗൂഗിൾ റിവ്യൂ നൽകാമോ? {review_link}',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // FR-7: Language selection remembered per browser in localStorage
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');

  // Modal visibility states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Initialize language from localStorage on client
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('medimall_lang');
      if (savedLang === 'en' || savedLang === 'ml') {
        setCurrentLanguage(savedLang);
      }
    } catch {}
  }, []);

  const handleLanguageChange = (lang: Language) => {
    setCurrentLanguage(lang);
    try {
      localStorage.setItem('medimall_lang', lang);
    } catch {}
  };

  // Fetch data
  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    setError(null);
    try {
      const [patRes, branchRes, tplRes] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/branches'),
        fetch('/api/templates'),
      ]);

      if (!patRes.ok || !branchRes.ok || !tplRes.ok) {
        throw new Error('Failed to load clinic data. Please refresh.');
      }

      const patData = await patRes.json();
      const branchData = await branchRes.json();
      const tplData = await tplRes.json();

      setPatients(patData.patients || []);
      setBranches(branchData.branches || []);

      if (tplData.templates && tplData.templates.length > 0) {
        const enTpl = tplData.templates.find((t: any) => t.language === 'en')?.body;
        const mlTpl = tplData.templates.find((t: any) => t.language === 'ml')?.body;
        setTemplates((prev) => ({
          en: enTpl || prev.en,
          ml: mlTpl || prev.ml,
        }));
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Instant optimistic update when a single patient is added
  const handlePatientAdded = (newPatient: Patient) => {
    setPatients((prev) => [newPatient, ...prev]);
  };

  // Instant optimistic update when a batch of patients is added or imported
  const handlePatientsBatchAdded = (newPatients: Patient[]) => {
    setPatients((prev) => [...newPatients, ...prev]);
  };

  // Instant update when Excel import finishes
  const handleImportSuccess = (newPatients?: Patient[]) => {
    if (newPatients && newPatients.length > 0) {
      setPatients((prev) => [...newPatients, ...prev]);
    } else {
      fetchData(true);
    }
  };

  // Update local state when patient message is sent
  const handlePatientSent = (updatedPatient: Patient) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === updatedPatient.id ? updatedPatient : p))
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header Navigation */}
      <Header
        currentLanguage={currentLanguage}
        onLanguageChange={handleLanguageChange}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Error Banner if any */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-3 text-red-900">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData()}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Dashboard Overview Stats */}
        <StatsBar patients={patients} branches={branches} />

        {/* Patient Table Component (FR-4, FR-5, FR-10) */}
        <PatientTable
          patients={patients}
          branches={branches}
          templates={templates}
          currentLanguage={currentLanguage}
          isLoading={isLoading}
          onPatientSent={handlePatientSent}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onOpenImportModal={() => setIsImportModalOpen(true)}
        />
      </main>

      {/* Supercharged Add Patient Modal (FR-3, Continuous & Bulk entry) */}
      <AddPatientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        branches={branches}
        onPatientAdded={handlePatientAdded}
        onPatientsBatchAdded={handlePatientsBatchAdded}
      />

      {/* Fast Excel Import Modal (FR-2, Instant browser preview & batch commit) */}
      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        branches={branches}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}
