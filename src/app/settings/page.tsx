'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Branch, Template, Language } from '@/lib/types';
import { compileTemplate } from '@/lib/whatsapp';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Save,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Info,
  CheckCircle2,
} from 'lucide-react';

export default function SettingsPage() {
  const { showToast } = useToast();

  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [templates, setTemplates] = useState<{ [key in Language]: string }>({
    en: '',
    ml: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Active template tab in settings
  const [activeTemplateTab, setActiveTemplateTab] = useState<Language>('en');

  // Branch Modal states (Add & Edit)
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchReviewLink, setBranchReviewLink] = useState('');
  const [isBranchSubmitting, setIsBranchSubmitting] = useState(false);
  const [branchError, setBranchError] = useState('');

  // Delete Branch state
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);

  // Load language preference
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

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const [branchRes, tplRes] = await Promise.all([
        fetch('/api/branches'),
        fetch('/api/templates'),
      ]);

      const branchData = await branchRes.json();
      const tplData = await tplRes.json();

      setBranches(branchData.branches || []);

      const newTpls = {
        en: 'Hello {name}, thank you for visiting Medimall {branch}. Your feedback means a lot to us. Could you please take a minute to share your experience on Google? {review_link}',
        ml: 'നമസ്കാരം {name}, Medimall {branch} സന്ദർശിച്ചതിന് നന്ദി. താങ്കളുടെ അഭിപ്രായം ഞങ്ങൾക്ക് വളരെ വിലപ്പെട്ടതാണ്. ദയവായി ഒരു ഗൂഗിൾ റിവ്യൂ നൽകാമോ? {review_link}',
      };

      if (tplData.templates) {
        tplData.templates.forEach((t: Template) => {
          if (t.language === 'en' || t.language === 'ml') {
            newTpls[t.language] = t.body;
          }
        });
      }
      setTemplates(newTpls);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error loading settings',
        message: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Branch Actions (FR-8)
  const openAddBranch = () => {
    setEditingBranch(null);
    setBranchName('');
    setBranchReviewLink('');
    setBranchError('');
    setIsBranchModalOpen(true);
  };

  const openEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchName(branch.name);
    setBranchReviewLink(branch.review_link);
    setBranchError('');
    setIsBranchModalOpen(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) {
      setBranchError('Branch name is required');
      return;
    }
    if (!branchReviewLink.trim()) {
      setBranchError('Google review link is required');
      return;
    }

    setIsBranchSubmitting(true);
    setBranchError('');

    try {
      if (editingBranch) {
        // Update
        const res = await fetch('/api/branches', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingBranch.id,
            name: branchName.trim(),
            review_link: branchReviewLink.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update branch');

        setBranches((prev) =>
          prev.map((b) => (b.id === editingBranch.id ? data.branch : b))
        );
        showToast({
          type: 'success',
          title: 'Branch Updated',
          message: `${data.branch.name} has been updated.`,
        });
      } else {
        // Create
        const res = await fetch('/api/branches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: branchName.trim(),
            review_link: branchReviewLink.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create branch');

        setBranches((prev) => [...prev, data.branch]);
        showToast({
          type: 'success',
          title: 'Branch Added',
          message: `${data.branch.name} has been configured.`,
        });
      }

      setIsBranchModalOpen(false);
    } catch (err: any) {
      setBranchError(err.message);
    } finally {
      setIsBranchSubmitting(false);
    }
  };

  const handleDeleteBranch = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove the branch "${name}"?`)) {
      return;
    }

    setDeletingBranchId(id);
    try {
      const res = await fetch(`/api/branches?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete branch');

      setBranches((prev) => prev.filter((b) => b.id !== id));
      showToast({
        type: 'success',
        title: 'Branch Removed',
        message: `${name} has been removed from configured branches.`,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message,
      });
    } finally {
      setDeletingBranchId(null);
    }
  };

  // Template Actions (FR-9)
  const handleSaveTemplate = async (lang: Language) => {
    setIsSavingTemplate(true);
    try {
      const body = templates[lang];
      const res = await fetch('/api/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang, body }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save template');

      showToast({
        type: 'success',
        title: 'Template Saved',
        message: `${lang === 'en' ? 'English' : 'Malayalam'} message template updated.`,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Save Error',
        message: err.message,
      });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const insertPlaceholder = (tag: string) => {
    setTemplates((prev) => ({
      ...prev,
      [activeTemplateTab]: prev[activeTemplateTab] + tag,
    }));
  };

  // Live preview message calculation (FR-9)
  const previewMessage = compileTemplate(templates[activeTemplateTab] || '', {
    name: 'Rahul Sharma',
    branch: branches[0]?.name || 'Kunnamangalam',
    review_link: branches[0]?.review_link || 'https://search.google.com/local/writereview?placeid=...',
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        currentLanguage={currentLanguage}
        onLanguageChange={handleLanguageChange}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Settings & Configurations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage clinic branches, Google Review links, and WhatsApp feedback templates.
          </p>
        </div>

        {/* Section 1: Branches Configuration (FR-8) */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-600" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Branches & Google Review Links
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Configure branches and their Google Business review URL (Place ID links).
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={openAddBranch}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add New Branch
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : branches.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No branches configured. Click &ldquo;Add New Branch&rdquo; to add your clinic branches.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition-colors flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 text-sm">
                        {branch.name}
                      </h3>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditBranch(branch)}
                          className="p-1.5 text-slate-500 hover:text-brand-600 rounded-lg hover:bg-white transition-colors"
                          title="Edit branch"
                          aria-label={`Edit ${branch.name}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBranch(branch.id, branch.name)}
                          disabled={deletingBranchId === branch.id}
                          className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
                          title="Delete branch"
                          aria-label={`Delete ${branch.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-slate-500 shrink-0">Review Link:</span>
                      <a
                        href={branch.review_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-brand-600 hover:underline truncate flex items-center gap-1 font-mono"
                      >
                        <span className="truncate">{branch.review_link}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: Message Templates & Live Preview (FR-9) */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-brand-600" />
                <h2 className="text-lg font-semibold text-slate-900">
                  WhatsApp Message Templates
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Customize outgoing review request messages for English and Malayalam.
              </p>
            </div>

            {/* Language Switch for Templates */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTemplateTab('en')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTemplateTab === 'en'
                    ? 'bg-white text-brand-800 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English Template
              </button>
              <button
                type="button"
                onClick={() => setActiveTemplateTab('ml')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTemplateTab === 'ml'
                    ? 'bg-white text-brand-800 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Malayalam Template (മലയാളം)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Template Editor */}
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="template-editor"
                  className="block text-sm font-semibold text-slate-800 mb-1"
                >
                  {activeTemplateTab === 'en' ? 'English' : 'Malayalam'} Template Body
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Click a placeholder below to insert it into your message template:
                </p>
                {/* Clickable Placeholders */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {['{name}', '{branch}', '{review_link}'].map((ph) => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => insertPlaceholder(ph)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-800 font-mono text-xs border border-brand-200 transition-colors"
                      title={`Click to insert ${ph}`}
                    >
                      <Plus className="w-3 h-3" />
                      {ph}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                id="template-editor"
                rows={6}
                value={templates[activeTemplateTab] || ''}
                onChange={(e) =>
                  setTemplates((prev) => ({
                    ...prev,
                    [activeTemplateTab]: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors leading-relaxed"
                placeholder="Enter message template with {name}, {branch}, {review_link}..."
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400">
                  {templates[activeTemplateTab]?.length || 0} characters
                </span>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleSaveTemplate(activeTemplateTab)}
                  isLoading={isSavingTemplate}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save {activeTemplateTab === 'en' ? 'English' : 'Malayalam'} Template
                </Button>
              </div>
            </div>

            {/* Live WhatsApp Preview (FR-9: "A live preview shows the rendered message.") */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-4 h-4 text-brand-600" />
                <span className="text-sm font-semibold text-slate-800">
                  Live WhatsApp Message Preview
                </span>
                <span className="text-xs text-slate-400 ml-auto">
                  Sample: Rahul Sharma &bull; Kunnamangalam
                </span>
              </div>

              {/* WhatsApp Mock Chat Bubble Container */}
              <div className="flex-1 rounded-2xl bg-[#efeae2] p-5 border border-slate-200 flex flex-col justify-end min-h-[220px] relative overflow-hidden">
                {/* Chat Bubble */}
                <div className="max-w-[88%] bg-white rounded-2xl rounded-bl-sm p-4 shadow-sm space-y-2 border border-black/5">
                  <p className="text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">
                    {previewMessage || (
                      <span className="italic text-slate-400">
                        Template is currently empty. Add message text on the left.
                      </span>
                    )}
                  </p>
                  <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 font-mono">
                    <span>Just now</span>
                    <CheckCircle2 className="w-3 h-3 text-[#53bdeb]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Add / Edit Branch Modal */}
      <Modal
        isOpen={isBranchModalOpen}
        onClose={() => setIsBranchModalOpen(false)}
        title={editingBranch ? 'Edit Branch' : 'Add New Branch'}
        description="Enter the clinic branch name and its direct Google review link."
        maxWidth="md"
      >
        <form onSubmit={handleSaveBranch} className="space-y-4">
          <Input
            label="Branch Name"
            required
            placeholder="e.g. Kunnamangalam, Malappuram"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            error={branchError && !branchName.trim() ? branchError : undefined}
            autoFocus
          />

          <Input
            label="Google Review URL"
            required
            placeholder="https://search.google.com/local/writereview?placeid=..."
            value={branchReviewLink}
            onChange={(e) => setBranchReviewLink(e.target.value)}
            helperText="The 'Ask for reviews' URL from Google Business Profile"
          />

          {branchError && (
            <p className="text-xs text-red-600 font-medium">{branchError}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBranchModalOpen(false)}
              disabled={isBranchSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isBranchSubmitting}
            >
              {editingBranch ? 'Update Branch' : 'Add Branch'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
