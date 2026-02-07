import React from 'react';
import { Clock, CheckCircle2, AlertCircle, FileText, Ban, Scale, UserCheck, Wallet, Send, PenTool, Archive } from 'lucide-react';
import { Tooltip } from './ui/Tooltip';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  
  const statusConfig: Record<string, { label: string; color: string; icon: any; tooltip: string }> = {
    // FASE 1: INICIALIZAÇÃO
    'PENDING': { 
      label: 'Rascunho / Em Elaboração', 
      color: 'bg-slate-100 text-slate-600 border-slate-200',
      icon: PenTool,
      tooltip: 'Solicitação em fase de elaboração. Complete os campos e envie para o gestor.'
    },
    'WAITING_MANAGER': { 
      label: 'Aguardando Atesto (Gestor)', 
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: UserCheck,
      tooltip: 'O gestor da unidade precisa analisar e atestar a necessidade desta despesa.'
    },
    
    // FASE 2: ANÁLISE TÉCNICA
    'WAITING_SOSFU': { 
      label: 'Em Análise Técnica (SOSFU)', 
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Clock,
      tooltip: 'A SOSFU está verificando conformidade legal, elementos de despesa e limites.'
    },
    'WAITING_SOSFU_ANALYSIS': { 
      label: 'Em Análise Técnica (SOSFU)', 
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Clock,
      tooltip: 'A SOSFU está verificando conformidade legal, elementos de despesa e limites.'
    },
    'WAITING_CORRECTION': { 
      label: 'Em Diligência / Correção', 
      color: 'bg-orange-50 text-orange-700 border-orange-200',
      icon: AlertCircle,
      tooltip: 'O processo precisa de correções. Verifique as observações e ressubmeta.'
    },

    // FASE 3: EXECUÇÃO SOSFU
    'WAITING_SOSFU_EXECUTION': { 
      label: 'Em Execução (SOSFU)', 
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: FileText,
      tooltip: 'A SOSFU está gerando os documentos financeiros (Portaria SF, NE, DL e OB).'
    },

    // FASE 4: APROVAÇÃO FINANCEIRA
    'WAITING_SEFIN_SIGNATURE': { 
      label: 'Aguardando Ordenador (SEFIN)', 
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: Scale,
      tooltip: 'Documentos enviados para assinatura do Ordenador de Despesa na SEFIN.'
    },
    'WAITING_SOSFU_PAYMENT': { 
      label: 'Processando Pagamento', 
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: Wallet,
      tooltip: 'A SOSFU está processando o pagamento. Em breve os recursos serão liberados.'
    },

    // FASE 5: CONCLUSÃO
    'WAITING_SUPRIDO_CONFIRMATION': { 
      label: 'Dinheiro Enviado', 
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      icon: Send,
      tooltip: 'O pagamento foi realizado. O suprido precisa confirmar o recebimento dos recursos.'
    },
    'PAID': { 
      label: 'Concluído / Pago', 
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: CheckCircle2,
      tooltip: 'Recursos liberados e confirmados. Próximo passo: Prestação de Contas.'
    },
    'APPROVED': { 
      label: 'Aprovado', 
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: CheckCircle2,
      tooltip: 'Processo aprovado e finalizado com sucesso.'
    },
    'ARCHIVED': { 
      label: 'Arquivado', 
      color: 'bg-gray-800 text-white border-gray-900',
      icon: Archive,
      tooltip: 'Processo concluído e arquivado. Disponível apenas para consulta.'
    },

    // EXCEÇÕES
    'REJECTED': { 
      label: 'Indeferido / Cancelado', 
      color: 'bg-red-50 text-red-700 border-red-200',
      icon: Ban,
      tooltip: 'Solicitação indeferida. Verifique o parecer técnico para mais detalhes.'
    }
  };

  const config = statusConfig[status] || { 
    label: status?.replace(/_/g, ' ') || 'Desconhecido', 
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: FileText,
    tooltip: ''
  };

  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2'
  };

  const badge = (
    <span className={`inline-flex items-center font-bold uppercase rounded-full border ${config.color} ${sizeClasses[size]} whitespace-nowrap shadow-sm`}>
      <Icon size={size === 'sm' ? 10 : size === 'md' ? 14 : 16} strokeWidth={2.5} />
      {config.label}
    </span>
  );

  if (!config.tooltip) return badge;

  return (
    <Tooltip content={config.tooltip} position="top" delay={250}>
      {badge}
    </Tooltip>
  );
};