import React from 'react';
import { FileText, UserCheck, Search, Scale, Wallet, Receipt, Archive, Check, Clock, AlertTriangle } from 'lucide-react';

interface ProcessTimelineProps {
    status: string;
    accountabilityStatus?: string;
    isRejected?: boolean;
}

const STEPS = [
    { id: 0, label: 'Solicitação', icon: FileText, statuses: ['PENDING', 'DRAFT'] },
    { id: 1, label: 'Atesto', icon: UserCheck, statuses: ['WAITING_MANAGER'] },
    { id: 2, label: 'Análise', icon: Search, statuses: ['WAITING_SOSFU_ANALYSIS', 'WAITING_CORRECTION'] },
    { id: 3, label: 'Autorização', icon: Scale, statuses: ['WAITING_SEFIN_SIGNATURE'] },
    { id: 4, label: 'Pagamento', icon: Wallet, statuses: ['WAITING_SOSFU_PAYMENT', 'WAITING_SUPRIDO_CONFIRMATION', 'PAID'] },
    { id: 5, label: 'Prest. Contas', icon: Receipt, statuses: ['PC_PENDING', 'PC_ANALYSIS', 'PC_APPROVED'] }, // Status virtuais para lógica visual
    { id: 6, label: 'Arquivado', icon: Archive, statuses: ['ARCHIVED'] }
];

export const ProcessTimeline: React.FC<ProcessTimelineProps> = ({ status, accountabilityStatus, isRejected }) => {
    
    // Determina o índice atual com base nos status combinados
    const getCurrentStepIndex = () => {
        if (status === 'ARCHIVED') return 6;
        
        // Se já foi pago, olhamos para a Prestação de Contas
        if (status === 'PAID' || status === 'APPROVED') {
            if (accountabilityStatus === 'APPROVED') return 5; // PC Concluída, indo para Arquivo
            if (accountabilityStatus) return 5; // PC em andamento
            return 4; // Pago, mas PC não iniciada
        }

        if (status === 'WAITING_SUPRIDO_CONFIRMATION' || status === 'WAITING_SOSFU_PAYMENT') return 4;
        if (status === 'WAITING_SEFIN_SIGNATURE') return 3;
        if (status === 'WAITING_SOSFU_ANALYSIS' || status === 'WAITING_CORRECTION') return 2;
        if (status === 'WAITING_MANAGER') return 1;
        
        return 0; // PENDING
    };

    const activeIndex = getCurrentStepIndex();

    return (
        <div className="w-full py-6 px-4">
            <div className="relative flex items-center justify-between w-full">
                {/* Linha de Conexão de Fundo */}
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10 rounded-full"></div>
                
                {/* Linha de Progresso Colorida */}
                <div 
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-green-500 -z-10 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${(activeIndex / (STEPS.length - 1)) * 100}%` }}
                ></div>

                {STEPS.map((step, index) => {
                    const isCompleted = index < activeIndex;
                    const isCurrent = index === activeIndex;
                    const Icon = step.icon;

                    // Determina cor do status atual (Erro ou Normal)
                    let currentBg = 'bg-blue-600';
                    let currentRing = 'ring-blue-100';
                    let currentIcon = <Icon size={18} className="text-white" />;

                    if (isCurrent && isRejected) {
                        currentBg = 'bg-red-600';
                        currentRing = 'ring-red-100';
                        currentIcon = <AlertTriangle size={18} className="text-white" />;
                    } else if (isCurrent && accountabilityStatus === 'CORRECTION') {
                        currentBg = 'bg-orange-500';
                        currentRing = 'ring-orange-100';
                        currentIcon = <AlertTriangle size={18} className="text-white" />;
                    }

                    return (
                        <div key={step.id} className="flex flex-col items-center relative group">
                            {/* Círculo do Passo */}
                            <div 
                                className={`
                                    w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 z-10
                                    ${isCompleted ? 'bg-green-500 scale-90' : isCurrent ? `${currentBg} ring-4 ${currentRing} scale-110 shadow-lg` : 'bg-gray-100 border-2 border-gray-200'}
                                `}
                            >
                                {isCompleted ? (
                                    <Check size={18} className="text-white" strokeWidth={3} />
                                ) : isCurrent ? (
                                    currentIcon
                                ) : (
                                    <Icon size={18} className="text-gray-400" />
                                )}
                            </div>

                            {/* Label e Status */}
                            <div className={`mt-3 text-center transition-all duration-300 ${isCurrent ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-70'}`}>
                                <p className={`text-xs font-bold uppercase tracking-wider ${isCurrent ? 'text-gray-800' : 'text-gray-400'}`}>
                                    {step.label}
                                </p>
                                {isCurrent && (
                                    <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-1 inline-block whitespace-nowrap">
                                        Em Andamento
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
