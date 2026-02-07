import React from 'react';
import { Clock, CheckCircle2, AlertCircle, FileText, Ban, Scale, UserCheck, Wallet, Send, PenTool, Archive } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  
  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    // FASE 1: INICIALIZAÇÃO
    'PENDING': { 
      label: 'Rascunho / Em Elaboração', 
      color: 'bg-slate-100 text-slate-600 border-slate-200',
      icon: PenTool
    },
    'WAITING_MANAGER': { 
      label: 'Aguardando Atesto (Gestor)', 
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: UserCheck
    },
    
    // FASE 2: ANÁLISE TÉCNICA
    'WAITING_SOSFU_ANALYSIS': { 
      label: 'Em Análise Técnica (SOSFU)', 
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Clock
    },
    'WAITING_CORRECTION': { 
      label: 'Em Diligência / Correção', 
      color: 'bg-orange-50 text-orange-700 border-orange-200',
      icon: AlertCircle
    },

    // FASE 3: APROVAÇÃO FINANCEIRA
    'WAITING_SEFIN_SIGNATURE': { 
      label: 'Aguardando Ordenador (SEFIN)', 
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: Scale
    },
    'WAITING_SOSFU_PAYMENT': { 
      label: 'Processando Pagamento', 
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: Wallet
    },

    // FASE 4: EXECUÇÃO
    'WAITING_SUPRIDO_CONFIRMATION': { 
      label: 'Dinheiro Enviado', 
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      icon: Send
    },
    'PAID': { 
      label: 'Concluído / Pago', 
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: CheckCircle2
    },
    'APPROVED': { 
      label: 'Aprovado', 
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: CheckCircle2
    },
    'ARCHIVED': { 
      label: 'Arquivado', 
      color: 'bg-gray-800 text-white border-gray-900',
      icon: Archive
    },

    // EXCEÇÕES
    'REJECTED': { 
      label: 'Indeferido / Cancelado', 
      color: 'bg-red-50 text-red-700 border-red-200',
      icon: Ban
    }
  };

  const config = statusConfig[status] || { 
    label: status?.replace(/_/g, ' ') || 'Desconhecido', 
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: FileText
  };

  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2'
  };

  return (
    <span className={`inline-flex items-center font-bold uppercase rounded-full border ${config.color} ${sizeClasses[size]} whitespace-nowrap shadow-sm`}>
      <Icon size={size === 'sm' ? 10 : size === 'md' ? 14 : 16} strokeWidth={2.5} />
      {config.label}
    </span>
  );
};