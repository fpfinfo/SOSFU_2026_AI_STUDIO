import React, { useEffect, useState } from 'react';
import { FileText, UserCheck, Search, Scale, Wallet, Receipt, Archive, Check, Clock, AlertTriangle, Loader2, ChevronRight, ClipboardList } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Tooltip } from '../ui/Tooltip';

interface HistoryEntry {
    id: string;
    status_from: string | null;
    status_to: string;
    actor_name: string | null;
    description: string | null;
    created_at: string;
}

interface ProcessTimelineProps {
    status: string;
    solicitationId?: string;
    accountabilityStatus?: string;
    isRejected?: boolean;
}

const STEPS = [
    { id: 0, label: 'Solicitação', shortLabel: 'Solic.', icon: FileText, statuses: ['PENDING', 'DRAFT'], color: 'blue', description: 'Criação e preenchimento da solicitação de suprimento de fundos' },
    { id: 1, label: 'Atesto Gestor', shortLabel: 'Atesto', icon: UserCheck, statuses: ['WAITING_MANAGER'], color: 'indigo', description: 'O gestor da unidade analisa e atesta a necessidade da despesa' },
    { id: 2, label: 'Análise SOSFU', shortLabel: 'Análise', icon: Search, statuses: ['WAITING_SOSFU', 'WAITING_SOSFU_ANALYSIS', 'WAITING_CORRECTION'], color: 'violet', description: 'A SOSFU verifica conformidade legal, elementos e limites (CNJ 169/2013)' },
    { id: 3, label: 'Execução SOSFU', shortLabel: 'Exec.', icon: ClipboardList, statuses: ['WAITING_SOSFU_EXECUTION'], color: 'purple', description: 'Geração dos documentos financeiros: Portaria SF, NE, DL e OB' },
    { id: 4, label: 'Autorização SEFIN', shortLabel: 'Autoriz.', icon: Scale, statuses: ['WAITING_SEFIN_SIGNATURE'], color: 'amber', description: 'O Ordenador de Despesa (SEFIN) autoriza e assina os documentos' },
    { id: 5, label: 'Pagamento SOSFU', shortLabel: 'Pagam.', icon: Wallet, statuses: ['WAITING_SOSFU_PAYMENT', 'WAITING_SUPRIDO_CONFIRMATION', 'PAID'], color: 'emerald', description: 'A SOSFU processa o pagamento e libera os recursos ao suprido' },
    { id: 6, label: 'Prestação de Contas', shortLabel: 'Prest.', icon: Receipt, statuses: ['PC_PENDING', 'PC_ANALYSIS', 'PC_APPROVED'], color: 'cyan', description: 'O suprido comprova a aplicação dos recursos com notas fiscais' },
    { id: 7, label: 'Arquivo', shortLabel: 'Arquiv.', icon: Archive, statuses: ['ARCHIVED'], color: 'gray', description: 'Processo concluído e arquivado para consulta futura' }
];

const STATUS_LABELS: Record<string, string> = {
    'PENDING': 'Pendente',
    'DRAFT': 'Rascunho',
    'WAITING_MANAGER': 'Aguardando Atesto',
    'WAITING_SOSFU': 'Em Análise SOSFU',
    'WAITING_SOSFU_ANALYSIS': 'Em Análise SOSFU',
    'WAITING_CORRECTION': 'Devolvida p/ Correção',
    'WAITING_SOSFU_EXECUTION': 'Em Execução (SOSFU)',
    'WAITING_SEFIN_SIGNATURE': 'Aguardando SEFIN',
    'WAITING_SOSFU_PAYMENT': 'Aguardando Pagamento',
    'WAITING_SUPRIDO_CONFIRMATION': 'Confirmando Recebimento',
    'PAID': 'Pago',
    'REJECTED': 'Rejeitado',
    'ARCHIVED': 'Arquivado',
};

function formatRelativeTime(dateStr: string) {
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now.getTime() - then.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `${diffMin}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return then.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatDateTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + 
        ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export const ProcessTimeline: React.FC<ProcessTimelineProps> = ({ status, solicitationId, accountabilityStatus, isRejected }) => {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedStep, setExpandedStep] = useState<number | null>(null);

    useEffect(() => {
        if (solicitationId) {
            setLoading(true);
            supabase
                .from('historico_tramitacao')
                .select('id, status_from, status_to, actor_name, description, created_at')
                .eq('solicitation_id', solicitationId)
                .order('created_at', { ascending: true })
                .then(({ data }) => {
                    setHistory(data || []);
                    setLoading(false);
                });
        }
    }, [solicitationId, status]);

    const getCurrentStepIndex = () => {
        if (status === 'ARCHIVED') return 7;
        if (status === 'PAID' || status === 'APPROVED') {
            if (accountabilityStatus === 'APPROVED') return 6;
            if (accountabilityStatus) return 6;
            return 5;
        }
        if (status === 'WAITING_SUPRIDO_CONFIRMATION' || status === 'WAITING_SOSFU_PAYMENT') return 5;
        if (status === 'WAITING_SEFIN_SIGNATURE') return 4;
        if (status === 'WAITING_SOSFU_EXECUTION') return 3;
        if (status === 'WAITING_SOSFU' || status === 'WAITING_SOSFU_ANALYSIS' || status === 'WAITING_CORRECTION') return 2;
        if (status === 'WAITING_MANAGER') return 1;
        return 0;
    };

    // O step "Atesto do Gestor" já foi concluído se o histórico mostra a transição
    const isAtestoCompleted = history.some(h => 
        h.status_from === 'WAITING_MANAGER' && h.status_to === 'PENDING'
    );

    const activeIndex = getCurrentStepIndex();

    // Find the history entry that completed each step (arrived at the next step)
    const getStepTimestamp = (stepIndex: number): HistoryEntry | null => {
        const step = STEPS[stepIndex];
        if (!step) return null;
        // A step is "entered" when a transition's status_to matches one of its statuses
        const entry = history.find(h => step.statuses.includes(h.status_to));
        return entry || null;
    };

    // Find the completion timestamp (when it transitioned OUT of this step)
    const getStepCompletionTime = (stepIndex: number): string | null => {
        const nextStep = STEPS[stepIndex + 1];
        if (!nextStep) return null;
        const entry = history.find(h => nextStep.statuses.includes(h.status_to));
        return entry ? entry.created_at : null;
    };

    return (
        <div className="w-full">
            {/* Premium Stepper Container */}
            <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 border border-gray-200/80 rounded-2xl p-6 shadow-sm">
                {/* Current Status Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${isRejected ? 'bg-red-500' : status === 'PAID' || status === 'ARCHIVED' ? 'bg-green-500' : 'bg-blue-500'} animate-pulse`}></div>
                        <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                            {STATUS_LABELS[status] || status}
                        </span>
                    </div>
                    {loading && <Loader2 size={14} className="text-gray-400 animate-spin" />}
                </div>

                {/* Stepper Visual */}
                <div className="relative flex items-start justify-between w-full">
                    {/* Background Track */}
                    <div className="absolute left-6 right-6 top-5 h-0.5 bg-gray-200 z-0"></div>
                    
                    {/* Progress Track */}
                    {(() => {
                        const effectiveProgress = (isAtestoCompleted && activeIndex === 0) ? 1 : activeIndex;
                        return (
                            <div 
                                className="absolute left-6 top-5 h-0.5 bg-gradient-to-r from-green-400 to-green-500 z-0 transition-all duration-1000 ease-out"
                                style={{ width: `calc(${(effectiveProgress / (STEPS.length - 1)) * 100}% - 48px)` }}
                            ></div>
                        );
                    })()}

                    {STEPS.map((step, index) => {
                        // Override: se o Gestor já atestou e status é PENDING, 
                        // step 0 e 1 devem ser "completed", step 0 é "current"
                        let isCompleted = index < activeIndex;
                        let isCurrent = index === activeIndex;
                        let isFuture = index > activeIndex;
                        
                        if (isAtestoCompleted && activeIndex === 0) {
                            if (index === 0) { isCompleted = true; isCurrent = false; isFuture = false; }
                            if (index === 1) { isCompleted = true; isCurrent = false; isFuture = false; }
                        }
                        const Icon = step.icon;
                        const entryData = getStepTimestamp(index);
                        const completionTime = getStepCompletionTime(index);
                        const isExpanded = expandedStep === index;

                        // Determine visual state
                        let ringColor = '';
                        let bgColor = 'bg-gray-100 border-2 border-gray-200';
                        let iconColor = 'text-gray-400';
                        let labelColor = 'text-gray-400';

                        if (isCompleted) {
                            bgColor = 'bg-green-500 shadow-green-200';
                            iconColor = 'text-white';
                            labelColor = 'text-green-700';
                        } else if (isCurrent) {
                            if (isRejected) {
                                bgColor = 'bg-red-500 shadow-red-200';
                                ringColor = 'ring-4 ring-red-100';
                            } else if (status === 'WAITING_CORRECTION') {
                                bgColor = 'bg-orange-500 shadow-orange-200';
                                ringColor = 'ring-4 ring-orange-100';
                            } else {
                                bgColor = 'bg-blue-600 shadow-blue-200';
                                ringColor = 'ring-4 ring-blue-100';
                            }
                            iconColor = 'text-white';
                            labelColor = 'text-gray-900';
                        }

                        return (
                            <Tooltip
                                key={step.id}
                                content={<><span className="font-bold">{step.label}</span><br/><span className="text-gray-300">{step.description}</span></>}
                                position="bottom"
                                delay={200}
                            >
                            <div 
                                className="flex flex-col items-center relative z-10 cursor-pointer group"
                                style={{ flex: 1 }}
                                onClick={() => setExpandedStep(isExpanded ? null : index)}
                            >
                                {/* Step Circle */}
                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-sm
                                    ${bgColor} ${ringColor}
                                    ${isCurrent ? 'scale-110' : isCompleted ? 'scale-95' : 'scale-90'}
                                    group-hover:scale-110
                                `}>
                                    {isCompleted ? (
                                        <Check size={18} className={iconColor} strokeWidth={3} />
                                    ) : isCurrent && isRejected ? (
                                        <AlertTriangle size={16} className={iconColor} />
                                    ) : isCurrent ? (
                                        <div className="relative">
                                            <Icon size={16} className={iconColor} />
                                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full animate-ping"></span>
                                        </div>
                                    ) : (
                                        <Icon size={16} className={iconColor} />
                                    )}
                                </div>

                                {/* Label */}
                                <p className={`mt-2.5 text-[10px] md:text-xs font-bold uppercase tracking-wider text-center leading-tight ${labelColor} transition-colors`}>
                                    <span className="hidden md:inline">{step.label}</span>
                                    <span className="md:hidden">{step.shortLabel}</span>
                                </p>

                                {/* Timestamp / Status Info */}
                                {isCompleted && completionTime && (
                                    <div className="mt-1 flex items-center gap-1 text-[9px] text-green-600 font-medium">
                                        <Check size={8} strokeWidth={3} />
                                        <span>{formatRelativeTime(completionTime)}</span>
                                    </div>
                                )}
                                
                                {isCurrent && (
                                    <div className="mt-1.5">
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                            isRejected ? 'bg-red-50 text-red-600' :
                                            status === 'WAITING_CORRECTION' ? 'bg-orange-50 text-orange-600' :
                                            'bg-blue-50 text-blue-600'
                                        }`}>
                                            <Clock size={8} />
                                            {entryData ? formatRelativeTime(entryData.created_at) : 'Agora'}
                                        </span>
                                    </div>
                                )}

                                {isFuture && (
                                    <p className="mt-1 text-[9px] text-gray-300 font-medium">Pendente</p>
                                )}

                                {/* Expanded Detail Tooltip */}
                                {isExpanded && entryData && (
                                    <div className="absolute top-full mt-3 bg-white border border-gray-200 shadow-xl rounded-xl p-3 min-w-[200px] z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                                            <Icon size={14} className="text-gray-500" />
                                            <span className="text-xs font-bold text-gray-800">{step.label}</span>
                                        </div>
                                        {entryData.description && (
                                            <p className="text-xs text-gray-600 mb-2">{entryData.description}</p>
                                        )}
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                                            <Clock size={10} />
                                            <span>{formatDateTime(entryData.created_at)}</span>
                                        </div>
                                        {entryData.actor_name && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-1">
                                                <UserCheck size={10} />
                                                <span>por {entryData.actor_name}</span>
                                            </div>
                                        )}
                                        {/* Duration */}
                                        {completionTime && (
                                            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1.5 text-[10px] text-green-600 font-medium">
                                                <ChevronRight size={10} />
                                                <span>Concluído em {formatRelativeTime(completionTime)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            </Tooltip>
                        );
                    })}
                </div>

                {/* History Log (compact) */}
                {history.length > 0 && (
                    <details className="mt-6 group">
                        <summary className="text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600 transition-colors flex items-center gap-2">
                            <Clock size={12} />
                            Histórico Completo ({history.length} eventos)
                        </summary>
                        <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                            {[...history].reverse().map((entry) => (
                                <div key={entry.id} className="flex items-start gap-3 text-xs py-2 border-b border-gray-50 last:border-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0"></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-gray-700 font-medium">{entry.description || `${entry.status_from || '—'} → ${entry.status_to}`}</p>
                                        <div className="flex items-center gap-3 mt-0.5 text-gray-400 text-[10px]">
                                            <span>{formatDateTime(entry.created_at)}</span>
                                            {entry.actor_name && <span>• {entry.actor_name}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </details>
                )}
            </div>
        </div>
    );
};
