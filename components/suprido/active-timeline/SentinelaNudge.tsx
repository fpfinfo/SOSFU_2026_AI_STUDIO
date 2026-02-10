import React from 'react';
import { ShieldAlert, Info, AlertTriangle } from 'lucide-react';

interface SentinelaNudgeProps {
    risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    alerts: string[];
}

export const SentinelaNudge: React.FC<SentinelaNudgeProps> = ({ risk, alerts }) => {
    if (risk === 'LOW' && (!alerts || alerts.length === 0)) return null;

    const riskConfigs = {
        LOW: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', icon: Info },
        MEDIUM: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: AlertTriangle },
        HIGH: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', icon: ShieldAlert },
        CRITICAL: { bg: 'bg-slate-900', text: 'text-white', border: 'border-red-500', icon: ShieldAlert },
    };

    const config = riskConfigs[risk] || riskConfigs.MEDIUM;

    return (
        <div className={`mt-4 p-4 rounded-2xl border ${config.bg} ${config.border} flex flex-col gap-2 transition-all hover:shadow-md`}>
            <div className={`flex items-center gap-2 font-black text-[10px] uppercase tracking-tighter ${config.text}`}>
                <config.icon size={16} />
                Sentinela IA — Detecção de Risco {risk}
            </div>
            <div className="flex flex-wrap gap-1.5">
                {alerts?.map((alert, idx) => (
                    <span key={idx} className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border ${
                        risk === 'CRITICAL' ? 'bg-white/10 border-white/20 text-white' : 'bg-white/50 border-white/20'
                    }`}>
                        {alert}
                    </span>
                ))}
            </div>
        </div>
    );
};
