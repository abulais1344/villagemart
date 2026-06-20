import type { ReactNode } from 'react';

interface Stat { label: string; value: string | number; icon: ReactNode; color?: string; }

export function StatsGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <div className={`w-9 h-9 rounded-xl ${stat.color ?? 'bg-primary-50 text-primary-600'} flex items-center justify-center mb-3`}>
            {stat.icon}
          </div>
          <p className="text-xl font-bold text-[#1A1A1A]">{stat.value}</p>
          <p className="text-xs text-[#6B7280] mt-0.5">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
