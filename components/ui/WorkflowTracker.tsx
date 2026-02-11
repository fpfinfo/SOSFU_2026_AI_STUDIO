import React from 'react';
import {
    FileText, UserCheck, Search, ClipboardList, Scale,
    Wallet, Receipt, Archive, CheckCircle2, Clock, AlertTriangle,
    ArrowRight
} from 'lucide-react';

// ==================== WORKFLOW TRACKER ====================
// Compact horizontal progress bar showing the 8 workflow
// stages with module attribution — "Correios-style" tracking.

interface WorkflowTrackerProps {
    status: string;
    accountabilityStatus?: string;
    isRejected?: boolean;
}

interface Station {
    id: number;
    label: string;
    module: string;
    icon: React.ElementType;
    color: string;
    statuses: string[];
    description: string;
}

const STATIONS: Station[] = [
    { id: 0, label: 'Solicitação',          module: 'USER',   icon: FileText,      color: 'teal',    statuses: ['PENDING', 'DRAFT'], description: 'Criação e preenchimento da solicitação de suprimento de fundos' },
    { id: 1, label: 'Atesto',               module: 'GESTOR', icon: UserCheck,      color: 'amber',   statuses: ['WAITING_MANAGER'], description: 'O gestor da unidade analisa e atesta a necessidade da despesa' },
    { id: 2, label: 'Análise',              module: 'SOSFU',  icon: Search,         color: 'teal',    statuses: ['WAITING_SOSFU', 'WAITING_SOSFU_ANALYSIS', 'WAITING_CORRECTION', 'WAITING_RESSARCIMENTO_ANALYSIS'], description: 'A SOSFU verifica conformidade legal, elementos e limites (CNJ 169/2013)' },
    { id: 3, label: 'Execução',             module: 'SOSFU',  icon: ClipboardList,  color: 'cyan', statuses: ['WAITING_SOSFU_EXECUTION', 'WAITING_RESSARCIMENTO_EXECUTION'], description: 'Geração dos documentos financeiros: Portaria SF, NE, DL e OB' },
    { id: 4, label: 'Autorização',          module: 'SEFIN',  icon: Scale,          color: 'teal',    statuses: ['WAITING_SEFIN_SIGNATURE'], description: 'O Ordenador de Despesa (SEFIN) autoriza e assina os documentos' },
    { id: 5, label: 'Pagamento',            module: 'SOSFU',  icon: Wallet,         color: 'emerald', statuses: ['WAITING_SOSFU_PAYMENT', 'WAITING_SUPRIDO_CONFIRMATION', 'PAID'], description: 'A SOSFU processa o pagamento e libera os recursos ao suprido' },
    { id: 6, label: 'Prestação de Contas',  module: 'USER',   icon: Receipt,        color: 'teal',    statuses: ['PC_PENDING', 'PC_ANALYSIS', 'PC_APPROVED'], description: 'O suprido comprova a aplicação dos recursos com notas fiscais' },
    { id: 7, label: 'Arquivo',              module: 'SOSFU',  icon: Archive,        color: 'gray',    statuses: ['ARCHIVED'], description: 'Processo concluído e arquivado para consulta futura' },
];

function getCurrentStation(status: string, accountabilityStatus?: string): number {
    if (status === 'ARCHIVED') return 7;
    if (status === 'PAID' || status === 'APPROVED') {
        if (accountabilityStatus === 'APPROVED') return 6;
        if (accountabilityStatus) return 6;
        return 5;
    }
    if (status === 'WAITING_SUPRIDO_CONFIRMATION' || status === 'WAITING_SOSFU_PAYMENT') return 5;
    if (status === 'WAITING_SEFIN_SIGNATURE') return 4;
    if (status === 'WAITING_SOSFU_EXECUTION' || status === 'WAITING_RESSARCIMENTO_EXECUTION') return 3;
    if (status === 'WAITING_SOSFU' || status === 'WAITING_SOSFU_ANALYSIS' || status === 'WAITING_CORRECTION' || status === 'WAITING_RESSARCIMENTO_ANALYSIS') return 2;
    if (status === 'WAITING_MANAGER') return 1;
    return 0;
}

const MODULE_COLORS: Record<string, { text: string; bg: string }> = {
    'USER':   { text: 'text-teal-600',    bg: 'bg-teal-50' },
    'GESTOR': { text: 'text-amber-600',   bg: 'bg-amber-50' },
    'SOSFU':  { text: 'text-teal-600',    bg: 'bg-teal-50' },
    'SEFIN':  { text: 'text-teal-600',    bg: 'bg-teal-50' },
};

export const WorkflowTracker: React.FC<WorkflowTrackerProps> = ({
    status,
    accountabilityStatus,
    isRejected,
}) => {
    const currentIdx = getCurrentStation(status, accountabilityStatus);

    if (isRejected) {
        return (
            <div className="flex items-center gap-3 px-5 py-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle size={16} className="text-red-500 shrink-0" />
                <span className="text-sm font-bold text-red-700">Processo Rejeitado</span>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            {/* Module indicator */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rastreio do Processo</span>
                </div>
                {STATIONS[currentIdx] && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${MODULE_COLORS[STATIONS[currentIdx].module]?.bg} ${MODULE_COLORS[STATIONS[currentIdx].module]?.text}`}>
                        📍 {STATIONS[currentIdx].module} — {STATIONS[currentIdx].label}
                    </span>
                )}
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-0.5">
                {STATIONS.map((station, i) => {
                    const Icon = station.icon;
                    const isPast = i < currentIdx;
                    const isCurrent = i === currentIdx;
                    const isFuture = i > currentIdx;

                    return (
                        <React.Fragment key={station.id}>
                            {/* Station dot */}
                            <div className="flex flex-col items-center flex-1 min-w-0 group relative">
                                {/* Dot */}
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                    isPast
                                        ? 'bg-emerald-100 text-emerald-600 ring-2 ring-emerald-200'
                                        : isCurrent
                                            ? 'bg-blue-600 text-white ring-4 ring-blue-200 shadow-lg shadow-blue-200 scale-110'
                                            : 'bg-gray-100 text-gray-400 ring-1 ring-gray-200'
                                }`}>
                                    {isPast ? <CheckCircle2 size={13} /> : isCurrent ? <Icon size={13} /> : <Clock size={11} className="opacity-50" />}
                                </div>

                                {/* Label */}
                                <span className={`text-[9px] font-bold mt-1.5 text-center leading-tight truncate w-full px-0.5 ${
                                    isPast ? 'text-emerald-600' : isCurrent ? 'text-blue-700' : 'text-gray-400'
                                }`}>
                                    {station.label}
                                </span>

                                {/* Module badge (only for current) */}
                                {isCurrent && (
                                    <span className="text-[8px] text-blue-500 font-medium mt-0.5">{station.module}</span>
                                )}

                                {/* Tooltip */}
                                <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl min-w-[180px] max-w-[240px] text-center">
                                    <div className="font-bold text-[11px] mb-0.5">{isPast ? '✅' : isCurrent ? '🔵' : '⏳'} {station.label}</div>
                                    <div className="text-gray-300 leading-tight">{station.description}</div>
                                    <div className="text-gray-400 mt-1 text-[9px]">Módulo: {station.module}</div>
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                                </div>
                            </div>

                            {/* Connector line */}
                            {i < STATIONS.length - 1 && (
                                <div className={`h-0.5 w-3 shrink-0 rounded-full ${
                                    i < currentIdx ? 'bg-emerald-300' : 'bg-gray-200'
                                }`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

