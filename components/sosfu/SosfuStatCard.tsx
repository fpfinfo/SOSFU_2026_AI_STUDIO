import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SosfuStatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    color: 'blue' | 'teal' | 'amber' | 'emerald' | 'rose' | 'slate';
    badge?: string;
    progress?: number; // 0 to 100
    progressLabel?: string;
    darkMode?: boolean;
}

export const SosfuStatCard: React.FC<SosfuStatCardProps> = ({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
    badge,
    progress,
    progressLabel,
    darkMode = false
}) => {
    const colorClasses = {
        blue: {
            bg: 'bg-blue-50',
            text: 'text-blue-600',
            border: 'border-blue-100',
            iconBg: 'bg-blue-500/10',
            progress: 'bg-blue-500'
        },
        teal: {
            bg: 'bg-teal-50',
            text: 'text-teal-600',
            border: 'border-teal-100',
            iconBg: 'bg-teal-500/10',
            progress: 'bg-teal-500'
        },
        amber: {
            bg: 'bg-amber-50',
            text: 'text-amber-600',
            border: 'border-amber-100',
            iconBg: 'bg-amber-500/10',
            progress: 'bg-amber-500'
        },
        emerald: {
            bg: 'bg-emerald-50',
            text: 'text-emerald-600',
            border: 'border-emerald-100',
            iconBg: 'bg-emerald-500/10',
            progress: 'bg-emerald-500'
        },
        rose: {
            bg: 'bg-rose-50',
            text: 'text-rose-600',
            border: 'border-rose-100',
            iconBg: 'bg-rose-500/10',
            progress: 'bg-rose-500'
        },
        slate: {
            bg: 'bg-slate-50',
            text: 'text-slate-600',
            border: 'border-slate-100',
            iconBg: 'bg-slate-500/10',
            progress: 'bg-slate-500'
        }
    };

    const current = colorClasses[color];

    return (
        <div className={`
            p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden group
            ${darkMode 
                ? 'bg-slate-800 border-slate-700 shadow-slate-950/20 hover:shadow-slate-950/40' 
                : 'bg-white border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200'
            }
        `}>
            {/* Decorative Icon Watermark */}
            <div className={`
                absolute -bottom-6 -right-6 transition-all duration-700 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 group-hover:-rotate-12 pointer-events-none
                ${darkMode ? 'text-white' : current.text}
            `}>
                <Icon size={140} strokeWidth={1} />
            </div>

            <div className="flex justify-between items-start relative z-10">
                <div className={`p-3 rounded-xl transition-colors ${darkMode ? 'bg-slate-700/50' : current.iconBg}`}>
                    <Icon size={24} className={current.text} />
                </div>
                
                {badge && (
                    <span className={`
                        px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                        ${darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}
                    `}>
                        {badge}
                    </span>
                )}
            </div>

            <div className="mt-5 relative z-10">
                <div className="flex items-baseline gap-2">
                    <h3 className={`text-4xl font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {String(value).padStart(2, '0')}
                    </h3>
                </div>
                <p className={`text-sm font-bold mt-1 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    {title}
                </p>
                {subtitle && (
                    <p className={`text-[11px] font-medium uppercase tracking-wider mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {subtitle}
                    </p>
                )}
            </div>

            {progress !== undefined && (
                <div className="mt-6 relative z-10">
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {progressLabel || 'Progresso'}
                        </span>
                        <span className={`text-[10px] font-black ${current.text}`}>
                            {progress}%
                        </span>
                    </div>
                    <div className={`h-1.5 w-full rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${current.progress}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
