import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'Medimall | Patient Feedback Messenger',
  description: 'Internal staff application for requesting Google reviews from visiting patients via WhatsApp.',
  icons: {
    icon: '/favicon.ico',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 selection:bg-brand-100 selection:text-brand-900">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
