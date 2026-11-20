'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HeartPulse, Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the staff password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed. Check your password.');
      }

      showToast({
        type: 'success',
        title: 'Authentication Successful',
        message: 'Welcome back to Medimall Feedback Messenger.',
      });

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      showToast({
        type: 'error',
        title: 'Authentication Failed',
        message: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50/50 via-slate-50 to-emerald-50/30 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Medimall Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500 text-white shadow-card mb-4">
            <HeartPulse className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Medimall Messenger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Internal Staff Portal for Patient Review Requests
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="staff-password"
                  className="block text-sm font-medium text-slate-700"
                >
                  Staff Access Password
                </label>
                <span className="text-xs text-slate-400">Single shared role</span>
              </div>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="staff-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter staff password..."
                  required
                  autoFocus
                  className={`block w-full h-11 min-h-[44px] pl-10 pr-11 rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 text-sm transition-colors ${
                    error
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {error && (
                <p className="text-xs text-red-600 font-medium mt-1.5">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Messenger
            </Button>
          </form>

          {/* Security notice */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-2.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" />
            <span>
              Authorized staff only. Patient phone numbers and data are encrypted and protected.
            </span>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Medimall Review Messenger &bull; Version 1.0
        </p>
      </div>
    </div>
  );
}
