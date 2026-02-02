import React, { useState, useEffect } from 'react';
import { X, Siren, Gavel, DollarSign, Calendar, FileText, AlertTriangle, CheckCircle2, Loader2, Bookmark, User, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SolicitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType: 'EMERGENCY' | 'JURY' | null;
  onSuccess?: () => void;
}

interface ElementoDespesa {
    id: string;
    codigo: string;
    descricao: string;
    elemento_pai: string | null;
}

export const SolicitationModal: React.FC<SolicitationModalProps> = ({ isOpen, onClose, initialType, onSuccess }) => {
  const [activeType, setActiveType] = useState<'EMERGENCY' | 'JURY'>(initialType || 'EMERGENCY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [generatedProcessNumber, setGeneratedProcessNumber] = useState('');
  
  // Data
  const [elementos, setElementos] = useState<ElementoDespesa[]>([]);
  const [loadingElementos, setLoadingElementos] = useState(false);

  // Form States
  const [value, setValue] = useState('');
  const [description, setDescription] = useState(''); // Justificativa ou Info Adicional
  const [processRef, setProcessRef] = useState(''); // Processo Judicial (para Júri)
  const [selectedElemento, setSelectedElemento] = useState(''); // ID ou Código do elemento

  // Novos Campos
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');

  useEffect(() => {
    if (initialType) setActiveType(initialType);
    setStep(1);
    
    // Reset Form
    setValue('');
    setDescription('');
    setProcessRef('');
    setSelectedElemento('');
    setStartDate('');
    setEndDate('');
    // Não limpamos gestor aqui imediatamente para permitir o fetch preencher
    
    if (isOpen) {
        fetchInitialData();
    }
  }, [isOpen, initialType]);

  const fetchInitialData = async () => {
      setLoadingElementos(true);
      try {
          // 1. Buscar Elementos de Despesa
          const { data: elData, error: elError } = await supabase
            .from('delemento')
            .select('*')
            .eq('is_active', true)
            .order('codigo');
          
          if (elError) throw elError;
          setElementos(elData || []);

          // 2. Buscar Dados do Usuário para preencher Gestor
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('gestor_nome, gestor_email')
                .eq('id', user.id)
                .single();
              
              if (profile) {
                  setManagerName(profile.gestor_nome || '');
                  setManagerEmail(profile.gestor_email || '');
              }
          }

      } catch (err) {
          console.error('Erro ao buscar dados iniciais:', err);
      } finally {
          setLoadingElementos(false);
      }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        // Buscar perfil para pegar nome/unidade
        const { data: profile } = await supabase.from('profiles').select('full_name, lotacao').eq('id', user.id).single();

        const year = new Date().getFullYear();
        const randomNum = Math.floor(1000 + Math.random() * 9000); // 4 digitos
        const procNum = `SF-${year}/${randomNum}`;
        
        const numericValue = parseFloat(value.replace(',', '.'));

        // Encontrar descrição do elemento selecionado
        const el = elementos.find(e => e.codigo === selectedElemento);
        const elementoDesc = el ? `[ND: ${el.codigo}]` : '';

        // Construir info para o campo Unit
        const typeLabel = activeType === 'EMERGENCY' ? 'EXTRA-EMERGENCIAL' : 'EXTRA-JÚRI';
        const unitInfo = `${profile?.lotacao || 'Gabinete'} ${elementoDesc}`;

        const { error } = await supabase.from('solicitations').insert({
            process_number: procNum,
            beneficiary: profile?.full_name || user.email,
            unit: unitInfo,
            value: numericValue || 0,
            date: new Date().toISOString(),
            status: 'PENDING',
            user_id: user.id,
            // Novos Campos
            event_start_date: startDate || null,
            event_end_date: endDate || null,
            manager_name: managerName,
            manager_email: managerEmail
        });

        if (error) throw error;

        setGeneratedProcessNumber(procNum);
        setStep(2); // Sucesso
        if (onSuccess) onSuccess();

    } catch (error: any) {
        console.error("Erro ao enviar solicitação:", error);
        alert("Erro ao enviar solicitação: " + error.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  // Campos de Gestor (Reutilizável)
  const ManagerFields = () => (
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
          <h5 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
              <User size={14} /> Dados do Gestor Responsável
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">Nome do Gestor</label>
                  <input 
                      type="text" 
                      placeholder="Nome do Juiz ou Diretor"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:border-blue-500 outline-none"
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      required
                  />
              </div>
              <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">E-mail Institucional</label>
                  <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input 
                          type="email" 
                          placeholder="gestor@tjpa.jus.br"
                          className="w-full pl-8 pr-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:border-blue-500 outline-none"
                          value={managerEmail}
                          onChange={(e) => setManagerEmail(e.target.value)}
                          required
                      />
                  </div>
              </div>
          </div>
      </div>
  );

  // Campos de Data (Reutilizável)
  const DateFields = () => (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Calendar size={14} className="text-gray-400" />
                Início do Evento/Despesa
            </label>
            <input 
                type="date" 
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-gray-600"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
            />
        </div>
        <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Calendar size={14} className="text-gray-400" />
                Fim do Evento/Despesa
            </label>
            <input 
                type="date" 
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-gray-600"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
            />
        </div>
      </div>
  );

  // Formulário Extra-Emergencial
  const EmergencyForm = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-start gap-3">
        <AlertTriangle className="text-red-600 flex-shrink-0" size={20} />
        <div>
          <h4 className="text-sm font-bold text-red-800">Atenção ao Caráter Emergencial</h4>
          <p className="text-xs text-red-600 mt-1">
            Este tipo de suprimento deve ser utilizado apenas para despesas imprevisíveis e urgentes.
          </p>
        </div>
      </div>

      <ManagerFields />

      {/* Seleção de Elemento de Despesa */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Bookmark size={14} className="text-blue-500" />
            Classificação da Despesa (Elemento)
        </label>
        <div className="relative">
            <select 
                value={selectedElemento}
                onChange={(e) => setSelectedElemento(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-sm appearance-none cursor-pointer font-medium text-gray-700"
            >
                <option value="">Selecione a natureza da despesa...</option>
                <optgroup label="Material de Consumo (3.3.90.30)">
                    {elementos.filter(e => e.codigo.startsWith('3.3.90.30')).map(e => (
                        <option key={e.id} value={e.codigo}>{e.codigo} - {e.descricao.replace('Material de Consumo - ', '')}</option>
                    ))}
                </optgroup>
                <optgroup label="Serviços e Outros">
                    {elementos.filter(e => !e.codigo.startsWith('3.3.90.30')).map(e => (
                        <option key={e.id} value={e.codigo}>{e.codigo} - {e.descricao}</option>
                    ))}
                </optgroup>
            </select>
            {loadingElementos && (
                <div className="absolute right-8 top-1/2 -translate-y-1/2">
                    <Loader2 size={16} className="animate-spin text-gray-400" />
                </div>
            )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-700">Objeto da Despesa (Detalhamento)</label>
        <input 
            type="text" 
            placeholder="Ex: Reparo urgente na bomba d'água devido a vazamento" 
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Valor Estimado (R$)</label>
            <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                    type="number" 
                    step="0.01"
                    placeholder="0,00" 
                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-sm"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    required
                />
            </div>
        </div>
        
        {/* Datas agora ocupam a segunda coluna ou linha inteira */}
      </div>
      
      <DateFields />
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
            Destinado a despesas com alimentação de jurados e apoio logístico.
          </p>
        </div>
      </div>

      <ManagerFields />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Nº do Processo Judicial</label>
            <input 
                type="text" 
                placeholder="0000000-00.0000.8.14.0000" 
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                value={processRef}
                onChange={(e) => setProcessRef(e.target.value)}
            />
        </div>
        <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Valor Total Estimado (R$)</label>
            <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                    type="number"
                    step="0.01" 
                    placeholder="0,00" 
                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    required
                />
            </div>
        </div>
      </div>
      
       <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Natureza Principal</label>
            <select 
                value={selectedElemento}
                onChange={(e) => setSelectedElemento(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm"
            >
                <option value="">Selecione...</option>
                <option value="3.3.90.30.01">3.3.90.30.01 - Alimentação (Consumo)</option>
                <option value="3.3.90.39.00">3.3.90.39.00 - Serviços PJ (Restaurante)</option>
            </select>
       </div>

       <DateFields />
    </div>
  );

  const SuccessScreen = () => (
    <div className="text-center py-10 animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
            <CheckCircle2 size={40} />
        </div>
        <h3 className="text-xl font-bold text-gray-800">Solicitação Enviada!</h3>
        <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
            Sua solicitação foi registrada com sucesso e encaminhada para análise. O número do protocolo é <strong>{generatedProcessNumber}</strong>.
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
                            type="button"
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
                            type="button"
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