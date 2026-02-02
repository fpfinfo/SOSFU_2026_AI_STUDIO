import React, { useState } from 'react';
import { X, Siren, Gavel, DollarSign, Calendar, FileText, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

interface SolicitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType: 'EMERGENCY' | 'JURY' | null;
}

export const SolicitationModal: React.FC<SolicitationModalProps> = ({ isOpen, onClose, initialType }) => {
  const [activeType, setActiveType] = useState<'EMERGENCY' | 'JURY'>(initialType || 'EMERGENCY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulação de envio
    setTimeout(() => {
      setIsSubmitting(false);
      setStep(2); // Vai para tela de sucesso
    }, 1500);
  };

  // Formulário Extra-Emergencial
  const EmergencyForm = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-start gap-3">
        <AlertTriangle className="text-red-600 flex-shrink-0" size={20} />
        <div>
          <h4 className="text-sm font-bold text-red-800">Atenção ao Caráter Emergencial</h4>
          <p className="text-xs text-red-600 mt-1">
            Este tipo de suprimento deve ser utilizado apenas para despesas imprevisíveis e urgentes que não possam aguardar o processo licitatório normal.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-700">Objeto da Despesa (Resumo)</label>
        <input type="text" placeholder="Ex: Reparo urgente na bomba d'água" className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Valor Estimado (R$)</label>
            <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="number" placeholder="0,00" className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-sm" />
            </div>
        </div>
        <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Prazo para Aplicação</label>
            <select className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-sm">
                <option>30 Dias</option>
                <option>60 Dias</option>
                <option>90 Dias</option>
            </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-700">Justificativa da Urgência</label>
        <textarea rows={4} placeholder="Descreva detalhadamente o motivo da urgência..." className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-sm resize-none"></textarea>
      </div>

      <div className="space-y-2">
         <label className="text-sm font-bold text-gray-700">Anexar Orçamentos (Mínimo 3)</label>
         <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer">
            <FileText className="mx-auto text-gray-400 mb-2" size={24} />
            <p className="text-sm text-gray-500">Clique para selecionar ou arraste arquivos PDF</p>
         </div>
      </div>
    </div>
  );

  // Formulário Extra-Júri
  const JuryForm = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
        <Gavel className="text-blue-600 flex-shrink-0" size={20} />
        <div>
          <h4 className="text-sm font-bold text-blue-800">Suprimento para Sessões do Júri</h4>
          <p className="text-xs text-blue-600 mt-1">
            Destinado a despesas com alimentação de jurados e apoio logístico durante sessões do Tribunal do Júri.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Nº do Processo Judicial</label>
            <input type="text" placeholder="0000000-00.0000.8.14.0000" className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm" />
        </div>
        <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Data da Sessão</label>
            <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="date" className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-gray-600" />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Qtd. Jurados/Servidores</label>
            <input type="number" placeholder="0" className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm" />
        </div>
        <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Valor Total Estimado (R$)</label>
            <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="number" placeholder="0,00" className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm" />
            </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-700">Observações Adicionais</label>
        <textarea rows={3} placeholder="Informações complementares..." className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm resize-none"></textarea>
      </div>
    </div>
  );

  const SuccessScreen = () => (
    <div className="text-center py-10 animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
            <CheckCircle2 size={40} />
        </div>
        <h3 className="text-xl font-bold text-gray-800">Solicitação Enviada!</h3>
        <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
            Sua solicitação foi registrada com sucesso e encaminhada para análise. O número do protocolo é <strong>SF-{new Date().getFullYear()}/0892</strong>.
        </p>
        <button 
            onClick={onClose}
            className="mt-8 px-6 py-2 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 transition-colors"
        >
            Voltar ao Painel
        </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-800">
                {step === 1 ? 'Nova Solicitação de Suprimento' : 'Processo Concluído'}
            </h3>
            {step === 1 && <p className="text-xs text-gray-500">Preencha os dados do formulário abaixo</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
            {step === 1 && (
                <>
                    {/* Tab Selection */}
                    <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
                        <button 
                            onClick={() => setActiveType('EMERGENCY')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                activeType === 'EMERGENCY' 
                                ? 'bg-white text-red-600 shadow-sm ring-1 ring-black/5' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Siren size={18} />
                            Extra-Emergencial
                        </button>
                        <button 
                            onClick={() => setActiveType('JURY')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                activeType === 'JURY' 
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Gavel size={18} />
                            Extra-Júri
                        </button>
                    </div>

                    <form id="solicitationForm" onSubmit={handleSubmit}>
                        {activeType === 'EMERGENCY' ? <EmergencyForm /> : <JuryForm />}
                    </form>
                </>
            )}

            {step === 2 && <SuccessScreen />}
        </div>

        {/* Footer */}
        {step === 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button 
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
                Cancelar
            </button>
            <button 
                type="submit"
                form="solicitationForm"
                disabled={isSubmitting}
                className={`
                    px-6 py-2.5 text-sm font-bold text-white rounded-lg shadow-lg flex items-center gap-2 transition-all
                    ${activeType === 'EMERGENCY' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}
                    ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}
                `}
            >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                Confirmar Solicitação
            </button>
            </div>
        )}
      </div>
    </div>
  );
};