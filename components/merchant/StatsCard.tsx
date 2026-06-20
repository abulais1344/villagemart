import type { ReactNode } from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: number;
  color?: string;
}

export function StatsCard({ label, value, icon, trend, color = 'bg-primary-50 text-primary-600' }: StatsCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-success' : 'text-error'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-[#1A1A1A]">{value}</p>
      <p className="text-xs text-[#6B7280] mt-0.5">{label}</p>
    </div>
  );
}
