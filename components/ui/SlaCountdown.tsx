import React from 'react';
import { Clock, AlertTriangle, CheckCircle2, Timer } from 'lucide-react';

interface SlaCountdownProps {
    /** ISO date string for the deadline */
    deadline?: string | null;
    /** Fallback: created_at + daysLimit to auto-calculate deadline */
    createdAt?: string;
    /** Days limit for auto-calculation (default 90 for PC, 30 for atesto) */
    daysLimit?: number;
    /** Label to display (e.g. "Prazo PC", "Prazo Atesto") */
    label?: string;
    /** Compact mode for inline display */
    compact?: boolean;
}

const DAY_MS = 86_400_000;

function computeDeadline(props: SlaCountdownProps): Date | null {
    if (props.deadline) return new Date(props.deadline);
    if (props.createdAt && props.daysLimit) {
        const d = new Date(props.createdAt);
        d.setDate(d.getDate() + props.daysLimit);
        return d;
    }
    return null;
}

type SlaLevel = 'safe' | 'warning' | 'danger' | 'expired' | 'unknown';

function getSlaLevel(daysLeft: number): SlaLevel {
    if (daysLeft < 0) return 'expired';
    if (daysLeft <= 15) return 'danger';
    if (daysLeft <= 30) return 'warning';
    return 'safe';
}

const LEVEL_STYLES: Record<SlaLevel, { bg: string; text: string; border: string; icon: React.ReactNode; barColor: string }> = {
    safe: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        icon: <CheckCircle2 size={12} className="text-emerald-500" />,
        barColor: 'bg-emerald-500',
    },
    warning: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        icon: <Timer size={12} className="text-amber-500" />,
        barColor: 'bg-amber-500',
    },
    danger: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        icon: <AlertTriangle size={12} className="text-red-500" />,
        barColor: 'bg-red-500',
    },
    expired: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300',
        icon: <AlertTriangle size={12} className="text-red-600 animate-pulse" />,
        barColor: 'bg-red-600',
    },
    unknown: {
        bg: 'bg-gray-50',
        text: 'text-gray-500',
        border: 'border-gray-200',
        icon: <Clock size={12} className="text-gray-400" />,
        barColor: 'bg-gray-300',
    },
};

export const SlaCountdown: React.FC<SlaCountdownProps> = (props) => {
    const { label = 'Prazo', compact = false, daysLimit = 90 } = props;

    const deadlineDate = computeDeadline(props);
    if (!deadlineDate) {
        if (compact) return null;
        return (
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                <Clock size={10} /> Sem prazo definido
            </span>
        );
    }

    const now = new Date();
    const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / DAY_MS);
    const level = getSlaLevel(daysLeft);
    const styles = LEVEL_STYLES[level];

    // Progress bar: percentage of time elapsed
    const totalDays = daysLimit;
    const elapsed = totalDays - daysLeft;
    const progressPct = Math.min(100, Math.max(0, (elapsed / totalDays) * 100));

    if (compact) {
        return (
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md border ${styles.bg} ${styles.text} ${styles.border}`}>
                {styles.icon}
                {daysLeft < 0
                    ? `Vencido há ${Math.abs(daysLeft)}d`
                    : daysLeft === 0
                        ? 'Vence HOJE'
                        : `${daysLeft}d restantes`
                }
            </span>
        );
    }

    return (
        <div className={`rounded-lg border p-2.5 ${styles.bg} ${styles.border}`}>
            <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[9px] font-black uppercase tracking-wider ${styles.text} opacity-80`}>
                    {label}
                </span>
                <span className={`text-[10px] font-mono font-bold ${styles.text}`}>
                    {deadlineDate.toLocaleDateString('pt-BR')}
                </span>
            </div>
            <div className="flex items-center gap-2">
                {styles.icon}
                <span className={`text-xs font-bold ${styles.text}`}>
                    {daysLeft < 0
                        ? `⚠ Vencido há ${Math.abs(daysLeft)} dias`
                        : daysLeft === 0
                            ? '⚠ Vence HOJE!'
                            : `${daysLeft} dias restantes`
                    }
                </span>
            </div>
            {/* Progress bar */}
            <div className="mt-2 w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${styles.barColor}`}
                    style={{ width: `${progressPct}%` }}
                />
            </div>
        </div>
    );
};

export default SlaCountdown;
