'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface KPITileProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: ReactNode;
  color: 'emerald' | 'amber' | 'rose' | 'sky' | 'brand';
  suffix?: string;
  trend?: number;
  previousValue?: number;
  loading?: boolean;
}

const colorMap = {
  emerald: {
    iconBg: 'bg-emerald-50',
    iconText: 'text-emerald-600',
    gradient: 'from-emerald-500 to-emerald-400',
    value: 'text-slate-900',
  },
  amber: {
    iconBg: 'bg-amber-50',
    iconText: 'text-amber-600',
    gradient: 'from-amber-500 to-amber-400',
    value: 'text-slate-900',
  },
  rose: {
    iconBg: 'bg-rose-50',
    iconText: 'text-rose-600',
    gradient: 'from-rose-500 to-rose-400',
    value: 'text-slate-900',
  },
  sky: {
    iconBg: 'bg-sky-50',
    iconText: 'text-sky-600',
    gradient: 'from-sky-500 to-sky-400',
    value: 'text-slate-900',
  },
  brand: {
    iconBg: 'bg-indigo-50',
    iconText: 'text-indigo-600',
    gradient: 'from-indigo-500 to-violet-500',
    value: 'text-slate-900',
  },
};

export default function KPITile({
  title,
  value,
  subtitle,
  icon,
  color,
  suffix,
  trend,
  previousValue,
  loading = false,
}: KPITileProps) {
  const [displayValue, setDisplayValue] = useState<number | string>(typeof value === 'number' ? 0 : value);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof value !== 'number') {
      setDisplayValue(value);
      return;
    }

    const startValue = typeof previousValue === 'number' ? previousValue : 0;
    const endValue = value;
    const duration = 800;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * eased;

      setDisplayValue(
        Number.isInteger(endValue) ? Math.round(current) : Math.round(current * 100) / 100
      );

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, previousValue]);

  const colors = colorMap[color];

  if (loading) {
    return (
      <div className="relative bg-white rounded-2xl border border-slate-200/60 p-6 overflow-hidden">
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.gradient}`} />
        <div className="animate-pulse">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              <div className="h-3 w-20 bg-slate-200 rounded" />
              <div className="h-8 w-24 bg-slate-200 rounded" />
              <div className="h-3 w-16 bg-slate-100 rounded" />
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200/60 p-6 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-200 group overflow-hidden">
      {/* Top gradient bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.gradient}`} />

      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className={`text-3xl font-bold ${colors.value}`}>{displayValue}</span>
            {suffix && <span className="text-lg text-slate-400">{suffix}</span>}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
          {typeof trend === 'number' && trend !== 0 && (
            <div className="mt-2 flex items-center gap-1">
              {trend > 0 ? (
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
                </svg>
              )}
              <span className={`text-xs font-medium ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {Math.abs(trend)}%
              </span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl ${colors.iconBg} ${colors.iconText} flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-110`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
