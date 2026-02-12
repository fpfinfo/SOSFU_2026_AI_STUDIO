import React from 'react';
import { Wallet, CheckCircle2, Loader2, UserCheck, Search, User, Clock, AlignLeft, Shield, Calendar } from 'lucide-react';
import { StatusBadge } from '../../StatusBadge';

interface ProcessOverviewTabProps {
  processData: any;
  requesterProfile: any;
  accountabilityData: any;
  currentUserRole: string;
  isSuprido: boolean;
  isRessarcimento: boolean;
  darkMode: boolean;
  confirmReceiptLoading: boolean;
  confirmPaymentLoading: boolean;
  handleConfirmReceipt: () => Promise<void>;
  handleConfirmPayment: () => Promise<void>;
  ManagerReviewPanel: React.FC;
}

export const ProcessOverviewTab: React.FC<ProcessOverviewTabProps> = ({
  processData,
  requesterProfile,
  accountabilityData,
  currentUserRole,
  isSuprido,
  isRessarcimento,
  darkMode,
  confirmReceiptLoading,
  handleConfirmReceipt,
  ManagerReviewPanel,
}) => {
  if (!processData) return <div className={`p-8 text-center ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>Carregando dados...</div>;

  const isWaitingManager = accountabilityData?.status === 'WAITING_MANAGER' || processData?.status === 'WAITING_MANAGER';
  const managerName = processData.manager_name || 'Gestor da Unidade';
  const isWaitingSupridoConfirmation = processData.status === 'WAITING_SUPRIDO_CONFIRMATION';

  return (
    <div className="animate-in fade-in space-y-6">

      {/* Banner: Confirmar Recebimento (Suprido) */}
      {isWaitingSupridoConfirmation && isSuprido && (
        <div className={`${darkMode ? 'bg-emerald-950/20 border-emerald-500/50 shadow-emerald-950/20' : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300 shadow-emerald-200/50'} border-2 rounded-2xl p-6 shadow-md transition-colors`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full animate-pulse ${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                <Wallet size={24} />
              </div>
              <div>
                <h3 className={`text-lg font-black ${darkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>Recursos Creditados</h3>
                <p className={`text-sm mt-1 max-w-xl leading-relaxed ${darkMode ? 'text-emerald-500/80' : 'text-emerald-700'}`}>
                  O pagamento foi processado pela SOSFU. Confirme o recebimento dos recursos na sua conta bancaria para iniciar a <strong>Prestacao de Contas</strong>.
                  <br/><span className={`text-xs ${darkMode ? 'text-emerald-600' : 'text-emerald-600'}`}>Prazo para PC: 30 dias apos confirmacao (Res. CNJ 169/2013)</span>
                </p>
              </div>
            </div>
            <button
              onClick={handleConfirmReceipt}
              disabled={confirmReceiptLoading}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-sm hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 whitespace-nowrap disabled:opacity-50"
            >
              {confirmReceiptLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Confirmar Recebimento
            </button>
          </div>
        </div>
      )}

      {/* Banner: Pagamento Realizado */}
      {processData.status === 'PAID' && (
        <div className={`${darkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'} border rounded-xl p-5 flex items-center gap-4 transition-colors`}>
          <div className={`p-2.5 rounded-full ${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h3 className={`font-bold text-sm ${darkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>
              {isRessarcimento ? 'Ressarcimento Pago' : 'Recurso Recebido'}
            </h3>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-emerald-500/70' : 'text-emerald-600'}`}>
              {isRessarcimento
                ? 'O reembolso foi processado e depositado na conta do servidor.'
                : 'O suprido confirmou o recebimento. A fase de Prestacao de Contas esta aberta.'}
            </p>
          </div>
        </div>
      )}

      {/* Banner: Ressarcimento em Analise */}
      {isRessarcimento && processData.status === 'WAITING_RESSARCIMENTO_ANALYSIS' && (
        <div className={`${darkMode ? 'bg-sky-500/5 border-sky-500/20' : 'bg-sky-50 border-sky-200'} border rounded-xl p-5 flex items-center gap-4 transition-colors`}>
          <div className={`p-2.5 rounded-full ${darkMode ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-100 text-sky-600'}`}>
            <Search size={20} />
          </div>
          <div>
            <h3 className={`font-bold text-sm ${darkMode ? 'text-sky-400' : 'text-sky-800'}`}>Ressarcimento em Analise</h3>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-sky-500/70' : 'text-sky-600'}`}>
              {isSuprido
                ? 'Sua solicitacao de reembolso esta sendo analisada pela equipe SOSFU. Voce sera notificado sobre o resultado.'
                : 'Solicitacao de ressarcimento aguardando auditoria de comprovantes e homologacao.'}
            </p>
          </div>
        </div>
      )}

      {/* Banner: Ressarcimento Aprovado */}
      {isRessarcimento && processData.status === 'WAITING_RESSARCIMENTO_EXECUTION' && (
        <div className={`${darkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'} border rounded-xl p-5 flex items-center gap-4 transition-colors`}>
          <div className={`p-2.5 rounded-full animate-pulse ${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
            <Wallet size={20} />
          </div>
          <div>
            <h3 className={`font-bold text-sm ${darkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>Reembolso Aprovado — Aguardando Pagamento</h3>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-emerald-500/70' : 'text-emerald-600'}`}>
              {isSuprido
                ? 'Seu ressarcimento foi homologado pela SOSFU. O pagamento sera processado em breve na sua conta bancaria.'
                : 'Ressarcimento homologado. Gere a NE, DL e OB para processar o pagamento ao servidor.'}
            </p>
          </div>
        </div>
      )}

      {/* Banner: AGUARDANDO GESTOR */}
      {isWaitingManager && (
        <div className={`${darkMode ? 'bg-amber-500/5 border-amber-500/20 shadow-amber-950/10' : 'bg-amber-50 border-amber-200 shadow-sm'} border rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-colors`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full shadow-sm border ${darkMode ? 'bg-slate-800 text-amber-500 border-amber-500/20' : 'bg-white text-amber-600 border-amber-100'}`}>
              <UserCheck size={24} />
            </div>
            <div>
              <h3 className={`text-lg font-bold ${darkMode ? 'text-amber-400' : 'text-amber-900'}`}>Aguardando Atesto Gerencial</h3>
              <p className={`text-sm mt-1 max-w-xl ${darkMode ? 'text-amber-500/70' : 'text-amber-700'}`}>
                {currentUserRole === 'GESTOR' ? 'A' : 'Sua'} {accountabilityData?.status === 'WAITING_MANAGER' ? 'prestacao de contas' : 'solicitacao'} foi {currentUserRole === 'GESTOR' ? 'encaminhada para sua' : 'enviada com sucesso e agora esta sob'} analise de <strong>{managerName}</strong>.
                <br/>Assim que o atesto for realizado, o processo sera encaminhado automaticamente para a SOSFU.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 min-w-[200px]">
            <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-amber-500/80' : 'text-amber-600'}`}>Etapa Atual</span>
            <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-amber-900/40' : 'bg-amber-200'}`}>
              <div className="bg-amber-500 h-full w-[50%] animate-pulse"></div>
            </div>
            <span className={`text-[10px] font-medium ${darkMode ? 'text-amber-600/80' : 'text-amber-600'}`}>Revisao pelo Gestor</span>
          </div>
        </div>
      )}

      {/* Painel de Assinatura de Minutas (Gestor) */}
      {isWaitingManager && currentUserRole === 'GESTOR' && <ManagerReviewPanel />}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Beneficiario */}
        <div className={`${darkMode ? 'bg-slate-800 border-slate-700 shadow-slate-950/20' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-xl border transition-colors`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
            <User size={16} /> Beneficiario
          </h3>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
              {requesterProfile?.full_name?.charAt(0) || processData.beneficiary?.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className={`font-bold truncate ${darkMode ? 'text-slate-100' : 'text-gray-900'}`} title={requesterProfile?.full_name || processData.beneficiary}>
                {requesterProfile?.full_name || processData.beneficiary}
              </p>
              <p className={`text-sm truncate ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{requesterProfile?.email}</p>
              <p className={`text-xs mt-1 truncate ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>{requesterProfile?.lotacao || processData.unit}</p>
            </div>
          </div>
        </div>

        {/* Dados Financeiros */}
        <div className={`${darkMode ? 'bg-slate-800 border-slate-700 shadow-slate-950/20' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-xl border transition-colors`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
            <Wallet size={16} /> Dados Financeiros
          </h3>
          <div>
            <p className={`text-sm mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{isRessarcimento ? 'Valor Reembolso' : 'Valor Solicitado'}</p>
            <p className={`text-2xl font-bold mb-2 font-mono ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(processData.value)}
            </p>
            <div className={`text-xs p-2 rounded border ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
              <p className="truncate" title={processData.unit}><strong>Unidade:</strong> {processData.unit}</p>
              <p className="mt-1"><strong>Data:</strong> {new Date(processData.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className={`${darkMode ? 'bg-slate-800 border-slate-700 shadow-slate-950/20' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-xl border transition-colors`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
            <Clock size={16} /> Status do Processo
          </h3>
          <div className="flex flex-col items-start gap-3">
            <StatusBadge status={accountabilityData?.status || processData.status} size="lg" />
            <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>Acompanhe os detalhes na linha do tempo acima.</p>
          </div>
        </div>
      </div>

      {/* Justificativa */}
      <div className={`${darkMode ? 'bg-slate-800 border-slate-700 shadow-slate-950/20' : 'bg-white border-gray-200 shadow-sm'} p-8 rounded-xl border transition-colors`}>
        <div className={`flex items-center gap-2 mb-4 border-b pb-2 ${darkMode ? 'border-slate-700' : 'border-gray-100'}`}>
          <AlignLeft size={18} className={`${darkMode ? 'text-slate-500' : 'text-gray-400'}`}/>
          <h3 className={`text-sm font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>
            Justificativa / Objeto da Despesa
          </h3>
        </div>
        <div className={`leading-relaxed whitespace-pre-wrap font-serif text-base ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
          {processData.justification || (
            <span className={`${darkMode ? 'text-slate-600' : 'text-gray-400'} italic`}>Nenhuma justificativa fornecida.</span>
          )}
        </div>
      </div>

      {/* Metadados e Gestor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`${darkMode ? 'bg-slate-800 border-slate-700 shadow-slate-950/20' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-xl border transition-colors`}>
          <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
            <Shield size={16} /> Gestor Responsavel
          </h4>
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${darkMode ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-50 text-teal-600'}`}>
              {processData.manager_name?.charAt(0) || 'G'}
            </div>
            <div>
              <p className={`font-bold ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>{processData.manager_name || 'Nao atribuido'}</p>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{processData.manager_email || '-'}</p>
            </div>
          </div>
        </div>

        <div className={`${darkMode ? 'bg-slate-800 border-slate-700 shadow-slate-950/20' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-xl border transition-colors`}>
          <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
            <Calendar size={16} /> Periodo do Evento
          </h4>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <p className={`text-[10px] uppercase font-bold ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>Inicio</p>
              <p className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                {(() => {
                  if (!processData.event_start_date) return '-';
                  const [y, m, d] = processData.event_start_date.split('-').map(Number);
                  return new Date(y, m - 1, d).toLocaleDateString();
                })()}
              </p>
            </div>
            <div>
              <p className={`text-[10px] uppercase font-bold ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>Fim</p>
              <p className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                {(() => {
                  if (!processData.event_end_date) return '-';
                  const [y, m, d] = processData.event_end_date.split('-').map(Number);
                  return new Date(y, m - 1, d).toLocaleDateString();
                })()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
