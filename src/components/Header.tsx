'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  HeartPulse,
  Users,
  Settings,
  LogOut,
} from 'lucide-react';
import { LanguageToggle } from './LanguageToggle';
import { Language } from '@/lib/types';

interface HeaderProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLanguage,
  onLanguageChange,
}) => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navLinks = [
    {
      href: '/',
      label: 'Patients',
      icon: <Users className="w-4 h-4" />,
      active: pathname === '/',
    },
    {
      href: '/settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
      active: pathname === '/settings',
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg p-1"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-subtle group-hover:bg-brand-600 transition-colors">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-slate-900 group-hover:text-brand-600 transition-colors">
                  Medimall
                </span>
                <span className="text-[11px] font-medium text-slate-500 -mt-0.5">
                  Feedback Messenger
                </span>
              </div>
            </Link>

            {/* Navigation tabs */}
            <nav className="hidden md:flex items-center gap-1.5 ml-4">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    item.active
                      ? 'bg-brand-50 text-brand-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* Language Switch Toggle (FR-7) */}
            <LanguageToggle
              value={currentLanguage}
              onChange={onLanguageChange}
            />

            {/* Mobile nav buttons */}
            <div className="flex md:hidden items-center gap-1">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`p-2 rounded-lg text-sm transition-colors ${
                    item.active
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  aria-label={item.label}
                >
                  {item.icon}
                </Link>
              ))}
            </div>

            {/* Logout button (FR-1) */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              title="Logout from staff session"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
