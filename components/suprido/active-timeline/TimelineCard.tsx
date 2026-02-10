import React from 'react';
import { 
    Clock, 
    ArrowRight, 
    CheckCircle2, 
    AlertTriangle, 
    Banknote, 
    Receipt, 
    FileText, 
    Plane,
    ChevronRight,
    TrendingUp,
    ShieldAlert
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '../../StatusBadge';
import { SlaCountdown } from '../../ui/SlaCountdown';

interface TimelineCardProps {
    process: any;
    onAction: (processId: string, action: string) => void;
}

export const TimelineCard: React.FC<TimelineCardProps> = ({ process, onAction }) => {
    const pc = process.accountabilities?.[0];
    
    // Mapeamento de Fases para Barra de Progresso
    const getProgress = () => {
        if (process.status === 'ARCHIVED' || pc?.status === 'APPROVED') return 100;
        if (pc?.status === 'SUBMITTED' || pc?.status === 'WAITING_MANAGER') return 75;
        if (process.status === 'PAID') return 50;
        if (['APPROVED', 'WAITING_SOSFU_PAYMENT'].includes(process.status)) return 25;
        return 10;
    };

    const getRecommendedAction = () => {
        if (process.status === 'WAITING_SUPRIDO_CONFIRMATION') {
            return {
                label: 'Confirmar Recebimento',
                icon: Banknote,
                color: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200',
                action: 'CONFIRM_RECEIPT'
            };
        }
        if (process.status === 'PAID' && (!pc || pc.status === 'DRAFT')) {
            return {
                label: 'Lançar Despesas',
                icon: Receipt,
                color: 'bg-sky-600 hover:bg-sky-700 shadow-sky-200',
                action: 'START_ACCOUNTABILITY'
            };
        }
        if (pc?.status === 'PENDENCIA') {
            return {
                label: 'Corrigir Prestação',
                icon: AlertTriangle,
                color: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200',
                action: 'FIX_ACCOUNTABILITY'
            };
        }
        return {
            label: 'Ver Detalhes',
            icon: ChevronRight,
            color: 'bg-slate-800 hover:bg-slate-900 shadow-slate-200',
            action: 'VIEW_DETAILS'
        };
    };

    const action = getRecommendedAction();
    const progress = getProgress();

    return (
        <div className="group bg-white rounded-3xl border border-slate-200 p-6 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-300 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-slate-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                {/* Process Info */}
                <div className="flex-1 min-w-[300px]">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black font-mono tracking-tighter transition-colors group-hover:bg-sky-50 group-hover:text-sky-600">
                            {process.process_number}
                        </span>
                        <StatusBadge status={process.status} />
                        {pc?.deadline && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold">
                                <Clock size={12} />
                                <SlaCountdown deadline={pc.deadline} isAbbreviated />
                            </div>
                        )}
                    </div>
                    
                    <h3 className="text-lg font-black text-slate-800 mb-1 flex items-center gap-2">
                        {process.unit.includes('DIARIAS') || process.unit.includes('DPA') ? (
                            <Plane className="text-sky-500" size={20} />
                        ) : (
                            <FileText className="text-slate-400" size={20} />
                        )}
                        {process.description || 'Processo de Suprimento de Fundos'}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
                        <div className="flex items-center gap-1.5">
                            <Banknote size={14} className="text-slate-400" />
                            <span className="font-mono font-bold text-slate-700">{formatCurrency(process.value)}</span>
                        </div>
                        <div className="w-1 h-1 bg-slate-300 rounded-full" />
                        <div className="flex items-center gap-1.5">
                            <Clock size={14} className="text-slate-400" />
                            <span>Iniciado em {new Date(process.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>

                    {/* Active Timeline Progress Bar */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest px-1">
                            <span className={progress >= 10 ? 'text-sky-600' : 'text-slate-300'}>Solicitado</span>
                            <span className={progress >= 25 ? 'text-sky-600' : 'text-slate-300'}>Análise</span>
                            <span className={progress >= 50 ? 'text-indigo-600' : 'text-slate-300'}>Execução</span>
                            <span className={progress >= 75 ? 'text-indigo-600' : 'text-slate-300'}>Prestação</span>
                            <span className={progress >= 100 ? 'text-emerald-600' : 'text-slate-300'}>Homologado</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                            <div 
                                className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500 transition-all duration-1000 ease-out shadow-lg shadow-sky-200"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Sentinela AI Alerts Context */}
                {pc?.sentinela_risk && pc.sentinela_risk !== 'LOW' && (
                    <div className="lg:w-48 bg-red-50 border border-red-100 rounded-2xl p-3 animate-pulse">
                        <div className="flex items-center gap-2 text-red-600 mb-1">
                            <ShieldAlert size={14} />
                            <span className="text-[10px] font-black uppercase tracking-tighter">Alerta IA</span>
                        </div>
                        <p className="text-[10px] text-red-700 leading-tight">
                            Riscos detectados na prestação. Clique para corrigir.
                        </p>
                    </div>
                )}

                {/* Primary Action Button */}
                <div className="lg:w-64">
                    <button 
                        onClick={() => onAction(process.id, action.action)}
                        className={`w-full py-4 px-6 ${action.color} text-white rounded-2xl font-black text-sm transition-all flex items-center justify-between shadow-xl group/btn`}
                    >
                        <span className="flex items-center gap-3">
                            <action.icon size={20} />
                            {action.label}
                        </span>
                        <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
                    </button>
                    {pc?.balance > 0 && pc.status === 'APPROVED' && (
                        <div className="mt-2 text-center">
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                SALDO A DEVOLVER: {formatCurrency(pc.balance)}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
