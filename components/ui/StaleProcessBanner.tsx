import React from 'react';
import { AlertTriangle, Clock, ChevronRight, ExternalLink } from 'lucide-react';

// ==================== STALE PROCESS BANNER ====================
// Displays a warning banner when processes are stuck for too long.
// Used in GestorDashboard, SefinDashboard, and SosfuDashboard.

interface StaleItem {
    id: string;
    process_number: string;
    beneficiary: string;
    value: number;
    staleDays: number;
    status: string;
}

interface StaleProcessBannerProps {
    staleProcesses: StaleItem[];
    onViewProcess: (processId: string) => void;
    /** Module-specific accent color */
    accent?: 'amber' | 'red' | 'orange';
    /** Max items to show inline (default: 3) */
    maxInline?: number;
}

const ACCENT_STYLES = {
    amber: {
        banner: 'bg-amber-50 border-amber-200',
        icon: 'text-amber-600',
        title: 'text-amber-800',
        text: 'text-amber-700',
        badge: 'bg-amber-100 text-amber-600',
        button: 'text-amber-700 hover:bg-amber-100',
        pill: 'bg-amber-500',
    },
    red: {
        banner: 'bg-red-50 border-red-200',
        icon: 'text-red-600',
        title: 'text-red-800',
        text: 'text-red-700',
        badge: 'bg-red-100 text-red-600',
        button: 'text-red-700 hover:bg-red-100',
        pill: 'bg-red-500',
    },
    orange: {
        banner: 'bg-orange-50 border-orange-200',
        icon: 'text-orange-600',
        title: 'text-orange-800',
        text: 'text-orange-700',
        badge: 'bg-orange-100 text-orange-600',
        button: 'text-orange-700 hover:bg-orange-100',
        pill: 'bg-orange-500',
    },
};

export const StaleProcessBanner: React.FC<StaleProcessBannerProps> = ({
    staleProcesses,
    onViewProcess,
    accent = 'amber',
    maxInline = 3,
}) => {
    if (staleProcesses.length === 0) return null;

    const styles = ACCENT_STYLES[accent];
    const shown = staleProcesses.slice(0, maxInline);
    const remaining = staleProcesses.length - shown.length;

    return (
        <div className={`${styles.banner} border rounded-2xl p-5 animate-in fade-in slide-in-from-top-2 duration-300`}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-xl bg-white shadow-sm ${styles.icon}`}>
                    <AlertTriangle size={20} />
                </div>
                <div>
                    <h4 className={`text-sm font-bold ${styles.title}`}>
                        {staleProcesses.length} processo{staleProcesses.length > 1 ? 's' : ''} parado{staleProcesses.length > 1 ? 's' : ''}
                    </h4>
                    <p className={`text-xs ${styles.text} mt-0.5`}>
                        Estes processos não recebem movimentação há mais de 7 dias.
                    </p>
                </div>
            </div>

            {/* Inline list */}
            <div className="space-y-2">
                {shown.map(proc => (
                    <div
                        key={proc.id}
                        onClick={() => onViewProcess(proc.id)}
                        className="flex items-center gap-3 p-3 bg-white rounded-xl border border-white/50 shadow-sm hover:shadow-md cursor-pointer transition-all group"
                    >
                        <div className={`w-2 h-2 rounded-full ${styles.pill} shrink-0`} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate group-hover:text-teal-700 transition-colors">
                                {proc.process_number}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{proc.beneficiary}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className={`${styles.badge} text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1`}>
                                <Clock size={10} /> {proc.staleDays}d parado
                            </span>
                            <ChevronRight size={14} className="text-gray-400 group-hover:text-teal-500 transition-colors" />
                        </div>
                    </div>
                ))}
            </div>

            {remaining > 0 && (
                <p className={`text-xs font-bold ${styles.text} mt-2 pl-5`}>
                    + {remaining} outro{remaining > 1 ? 's' : ''} processo{remaining > 1 ? 's' : ''}...
                </p>
            )}
        </div>
    );
};
