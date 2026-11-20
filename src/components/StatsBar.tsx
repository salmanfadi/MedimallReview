import React from 'react';
import { Users, CheckCircle, Clock, Building2 } from 'lucide-react';
import { Patient, Branch } from '@/lib/types';

interface StatsBarProps {
  patients: Patient[];
  branches: Branch[];
}

export const StatsBar: React.FC<StatsBarProps> = ({ patients, branches }) => {
  const total = patients.length;
  const sent = patients.filter((p) => Boolean(p.sent_at)).length;
  const pending = total - sent;
  const branchCount = branches.length;

  const stats = [
    {
      label: 'Total Patients',
      value: total,
      icon: <Users className="w-5 h-5 text-blue-600" />,
      bg: 'bg-blue-50',
    },
    {
      label: 'Feedback Sent',
      value: sent,
      icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-50',
    },
    {
      label: 'Pending Reviews',
      value: pending,
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      bg: 'bg-amber-50',
    },
    {
      label: 'Active Branches',
      value: branchCount,
      icon: <Building2 className="w-5 h-5 text-brand-600" />,
      bg: 'bg-brand-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-subtle flex items-center gap-3.5"
        >
          <div className={`p-2.5 rounded-lg ${stat.bg} shrink-0`}>
            {stat.icon}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {stat.label}
            </p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">
              {stat.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
