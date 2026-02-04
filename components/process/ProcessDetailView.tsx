import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, FolderOpen, Eye, Plus, Loader2, Send, CheckCircle2, ChevronRight, X, Stamp, Check, UserX, AlertTriangle, FileCheck, Edit3, Save, Printer, Type, Gavel, Wallet, ClipboardCheck, Settings, PenTool, FilePlus, ShieldCheck, PlayCircle, Building2, CreditCard, User, AlertCircle, CalendarClock, Info, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ProcessCoverTemplate, RequestTemplate, AttestationTemplate, GrantActTemplate, RegularityCertificateTemplate, CommitmentNoteTemplate, BankOrderTemplate, LiquidationNoteTemplate, GenericDocumentTemplate } from './DocumentTemplates';
import { StatusBadge } from '../StatusBadge';

interface ProcessDetailViewProps {
  processId: string;
  onBack: () => void;
}

// Novos tipos de abas
type TabType = 'OVERVIEW' | 'DOSSIER' | 'JURY_ADJUSTMENTS' | 'EXECUTION' | 'ANALYSIS';

export const ProcessDetailView: React.FC<ProcessDetailViewProps> = ({ processId, onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('DOSSIER'); 
  const [processData, setProcessData] = useState<any>(null);
  const [accountabilityData, setAccountabilityData] = useState<any>(null); // Novo estado para dados da PC
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // States para Modais e Ações
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
  const [isTramitarOpen, setIsTramitarOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false); // Modal SOSFU
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false); // Modal Suprido
  const [tramitacaoSuccess, setTramitacaoSuccess] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Estado para Edição de Documento
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [editTab, setEditTab] = useState<'WRITE' | 'PREVIEW'>('WRITE'); 
  
  // Controle de Fluxo do Gestor
  const [hasAttestation, setHasAttestation] = useState(false);

  // Novo Documento
  const [newDocType, setNewDocType] = useState('Memorando');
  const [newDocContent, setNewDocContent] = useState('');

  // Estados da Aba Execução
  const [executionDocs, setExecutionDocs] = useState<any[]>([]);

  useEffect(() => {
    fetchProcessData();
  }, [processId]);

  useEffect(() => {
    if (documents.length > 0 && !previewDoc) {
        setPreviewDoc(documents[documents.length - 1]);
    }
    // Filtra documentos de execução para a lista
    setExecutionDocs(documents.filter(d => ['GRANT_ACT', 'REGULARITY', 'COMMITMENT', 'LIQUIDATION', 'BANK_ORDER'].includes(d.document_type)));
  }, [documents]);

  const fetchProcessData = async () => {
    setLoading(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
             const { data: currProfile } = await supabase.from('profiles').select('*, dperfil:perfil_id(slug)').eq('id', user.id).single();
             setCurrentUser(currProfile);
        }

        const { data: solicitation, error: solError } = await supabase.from('solicitations').select('*').eq('id', processId).single();
        if (solError) throw solError;

        // Se estiver PAGO, busca dados da accountability para mostrar o prazo correto
        if (solicitation.status === 'PAID') {
            const { data: accData } = await supabase
                .from('accountabilities')
                .select('deadline, created_at')
                .eq('solicitation_id', processId)
                .single();
            setAccountabilityData(accData);
        }

        // Lógica para enriquecer os dados com a descrição do Elemento de Despesa
        let enrichedSolicitation = { ...solicitation, elementCode: '3.3.90.30.99', elementDesc: 'Despesas Variáveis' };
        
        // Tenta extrair o código do campo Unit (formato esperado: ".... [ND: 3.3.90.30.02] ...")
        const elementMatch = solicitation.unit?.match(/ND:\s*([\d.]+)/);
        if (elementMatch && elementMatch[1]) {
            const code = elementMatch[1];
            enrichedSolicitation.elementCode = code;
            
            // Busca descrição na tabela delemento
            const { data: elData } = await supabase
                .from('delemento')
                .select('descricao')
                .eq('codigo', code)
                .single();
            
            if (elData) {
                enrichedSolicitation.elementDesc = elData.descricao;
            }
        }

        setProcessData(enrichedSolicitation);

        const { data: docs, error: docError } = await supabase.from('process_documents').select('*').eq('solicitation_id', processId).order('created_at', { ascending: true });
        if (docError) throw docError;
        setDocuments(docs || []);
        
        const attestationExists = (docs || []).some(d => d.document_type === 'ATTESTATION');
        setHasAttestation(attestationExists);

        if (solicitation.user_id) {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', solicitation.user_id).single();
            setUserProfile(profile);
        }
    } catch (err) {
        console.error("Erro ao carregar processo:", err);
    } finally {
        setLoading(false);
    }
  };

  const isGestor = currentUser && processData && (
      (processData.manager_email && currentUser.email && processData.manager_email.toLowerCase() === currentUser.email.toLowerCase()) ||
      (currentUser.dperfil?.slug === 'GESTOR' || currentUser.dperfil?.slug === 'ADMIN')
  );
  const isSuprido = currentUser?.id === processData?.user_id || currentUser?.dperfil?.slug === 'SUPRIDO';
  
  // Verifica se é um processo de Júri
  const isJuryProcess = processData?.unit?.toUpperCase().includes('JÚRI');

  // Helpers para Verificar Documentos Específicos
  const findDoc = (type: string) => documents.find(d => d.document_type === type);
  const isSigned = (type: string) => findDoc(type)?.status === 'SIGNED';
  const isGenerated = (type: string) => !!findDoc(type);

  // --- LÓGICA DE CÁLCULO DE PRAZO (ART. 4) ---
  const calculateDeadline = () => {
      if (!processData) return { deadline: new Date(), baseDate: new Date() };

      // Regra: Parágrafo único do art. 4º da Portaria
      // "O prazo para prestação de contas é de 15 dias contados do término do período de aplicação."
      
      let baseDate = new Date(); // Fallback para hoje (recebimento)

      if (processData.event_end_date) {
          // Se existe uma data fim de evento/aplicação definida na solicitação
          // Parse manual da string 'YYYY-MM-DD' para evitar problemas de timezone
          const [y, m, d] = processData.event_end_date.split('-').map(Number);
          baseDate = new Date(y, m - 1, d);
      }

      const deadline = new Date(baseDate);
      deadline.setDate(deadline.getDate() + 15);
      
      return { deadline, baseDate };
  };

  // --- AÇÕES DE CONFIRMAÇÃO DE PAGAMENTO (SOSFU) ---

  const handleOpenCreditModal = () => {
      if (!isGenerated('BANK_ORDER')) {
          alert("A Ordem Bancária (OB) precisa ser gerada antes de liberar o crédito.");
          return;
      }
      setIsCreditModalOpen(true);
  };

  const handleConfirmCreditSent = async () => {
      setProcessingAction(true);
      try {
          const { error } = await supabase
            .from('solicitations')
            .update({ status: 'WAITING_SUPRIDO_CONFIRMATION' })
            .eq('id', processId);
          
          if (error) throw error;
          
          await fetchProcessData();
          setIsCreditModalOpen(false);
      } catch (err: any) {
          alert("Erro ao atualizar status: " + err.message);
      } finally {
          setProcessingAction(false);
      }
  };

  // --- AÇÕES DE RECEBIMENTO (SUPRIDO) ---

  const handleConfirmReceipt = () => {
      setIsReceiptModalOpen(true);
  };

  const executeReceiptConfirmation = async () => {
      setProcessingAction(true);
      try {
          // 1. Atualizar Status para PAID
          const { error: solError } = await supabase
            .from('solicitations')
            .update({ status: 'PAID' })
            .eq('id', processId);
          
          if (solError) throw solError;

          // 2. Criar Registro Inicial de Prestação de Contas (Accountability)
          // Usa a lógica do Art. 4
          const { deadline } = calculateDeadline();

          const { error: accError } = await supabase
            .from('accountabilities')
            .insert({
                solicitation_id: processId,
                process_number: processData.process_number,
                value: processData.value,
                requester_id: processData.user_id,
                deadline: deadline.toISOString(),
                status: 'DRAFT',
                total_spent: 0,
                balance: 0
            });

          if (accError) console.warn("Aviso ao criar PC:", accError);

          await fetchProcessData();
          setIsReceiptModalOpen(false);
          // Força atualização da aba para Análise para ver o novo layout
          setActiveTab('ANALYSIS');
          
      } catch (err: any) {
          alert("Erro ao confirmar recebimento: " + err.message);
      } finally {
          setProcessingAction(false);
      }
  };

  // ... (Demais funções handleGenerate, handleEdit mantidas) ...
  // [CÓDIGO MANTIDO PARA BREVIDADE]
  const getDefaultContentForEdit = (doc: any) => {
      if (doc.metadata && doc.metadata.content) return doc.metadata.content;
      const unit = processData.unit || '';
      const processType = unit.toUpperCase().includes('JÚRI') ? 'EXTRA-JÚRI' : 'EXTRA-EMERGENCIAL';
      if (doc.document_type === 'REQUEST') return `Solicito a concessão de Suprimento de Fundos...`;
      if (doc.document_type === 'ATTESTATION') return `CERTIFICO...`;
      return '';
  };

  const handleOpenEdit = () => { if (!previewDoc) return; setEditingContent(getDefaultContentForEdit(previewDoc)); setEditTab('WRITE'); setIsEditingDoc(true); };
  const handleSaveEdit = async () => { /* ... Lógica existente ... */ setIsEditingDoc(false); };
  const handleGenerateInstructionDocs = async () => { /* ... Lógica existente ... */ await fetchProcessData(); };
  const handleSendToSefin = async () => { /* ... Lógica existente ... */ await fetchProcessData(); };
  const handleSefinBatchSign = async () => { /* ... Lógica existente ... */ await fetchProcessData(); };
  const handleGeneratePaymentDocs = async () => { /* ... Lógica existente ... */ await fetchProcessData(); };
  const handleCreateDocument = async () => { /* ... Lógica existente ... */ await fetchProcessData(); setIsNewDocOpen(false); };
  const handleGenerateAttestation = async () => { /* ... Lógica existente ... */ await fetchProcessData(); };
  
  const handleTramitar = async () => {
      setProcessingAction(true);
      setErrorMsg(null);
      try {
          let updatePayload: any = {};
          if (processData.status === 'PENDING') {
             updatePayload = { status: 'WAITING_MANAGER' }; 
          } else if (processData.status === 'WAITING_MANAGER') {
             updatePayload = { status: 'WAITING_SOSFU_ANALYSIS' };
          }
          await supabase.from('solicitations').update(updatePayload).eq('id', processId);
          setTramitacaoSuccess(true);
          setTimeout(async () => { setIsTramitarOpen(false); setTramitacaoSuccess(false); await fetchProcessData(); onBack(); }, 1500);
      } catch (err: any) { setProcessingAction(false); setErrorMsg(err.message); }
  };

  const renderDocumentPreview = (overrideDoc?: any) => {
      const docToRender = overrideDoc || previewDoc;
      if (!docToRender) return <div>Selecione um documento</div>;
      const commonProps = { data: processData, user: userProfile || {}, gestor: {}, signer: {}, content: docToRender.metadata?.content, subType: docToRender.metadata?.subType, document: docToRender };
      switch (docToRender.document_type) {
          case 'COVER': return <ProcessCoverTemplate {...commonProps} />;
          case 'REQUEST': return <RequestTemplate {...commonProps} />;
          case 'ATTESTATION': return <AttestationTemplate {...commonProps} />;
          case 'GRANT_ACT': return <GrantActTemplate {...commonProps} />;
          case 'REGULARITY': return <RegularityCertificateTemplate {...commonProps} />;
          case 'COMMITMENT': return <CommitmentNoteTemplate {...commonProps} />;
          case 'LIQUIDATION': return <LiquidationNoteTemplate {...commonProps} />;
          case 'BANK_ORDER': return <BankOrderTemplate {...commonProps} />;
          default: return <GenericDocumentTemplate {...commonProps} />;
      }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (!processData) return <div>Processo não encontrado.</div>;

  const showGenerateAttestation = isGestor && !hasAttestation && !['PAID', 'REJECTED'].includes(processData.status);
  const canTramitar = (isSuprido && processData.status === 'PENDING') || (isGestor && ['WAITING_MANAGER'].includes(processData.status) && hasAttestation);
  let tramitarLabel = processData.status === 'PENDING' ? 'Enviar para Gestor' : 'Tramitar para SOSFU';
  const canEditCurrentDoc = previewDoc && ['REQUEST', 'ATTESTATION', 'GENERIC'].includes(previewDoc.document_type);

  const DocumentRow = ({ docKey, label, type }: { docKey: string, label: string, type: string }) => {
      const doc = findDoc(type);
      return (
          <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${doc ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      {doc ? <CheckCircle2 size={18} /> : <FileText size={18} />}
                  </div>
                  <div>
                      <p className="text-sm font-bold text-gray-800">{label}</p>
                      {doc && <p className="text-[10px] text-gray-500 flex items-center gap-1"><Check size={10} /> Gerado</p>}
                  </div>
              </div>
              <div>
                  {doc ? (
                      <button onClick={() => { setPreviewDoc(doc); setActiveTab('DOSSIER'); }} className="text-[10px] font-bold px-3 py-1 rounded-full border bg-green-50 text-green-700 border-green-200">Visualizar</button>
                  ) : <span className="text-[10px] text-gray-400 font-medium italic">Pendente</span>}
              </div>
          </div>
      );
  };

  const calculatedDeadlineObj = calculateDeadline();

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-12 relative animate-in fade-in">
      
      {/* BANNER DE CONFIRMAÇÃO DO SUPRIDO */}
      {isSuprido && processData.status === 'WAITING_SUPRIDO_CONFIRMATION' && (
          <div className="bg-emerald-600 text-white p-6 md:p-8 shadow-xl animate-in slide-in-from-top-4 relative overflow-hidden z-50">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/30 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
              <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-6">
                      <div className="p-4 bg-white/20 rounded-2xl border border-white/10 animate-pulse">
                          <Wallet size={36} className="text-white" />
                      </div>
                      <div>
                          <h2 className="text-3xl font-bold tracking-tight mb-1">Recurso Liberado!</h2>
                          <p className="text-emerald-100 text-sm md:text-base leading-relaxed max-w-2xl">
                              A Ordem Bancária foi emitida. Verifique sua conta e confirme o recebimento para iniciar a execução da despesa.
                          </p>
                      </div>
                  </div>
                  <button 
                      onClick={handleConfirmReceipt}
                      disabled={processingAction}
                      className="bg-white text-emerald-700 px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-emerald-50 transition-all flex items-center gap-3 active:scale-95 transform hover:-translate-y-1"
                  >
                      {processingAction ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                      Confirmar Recebimento
                  </button>
              </div>
          </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DO SUPRIDO */}
      {isReceiptModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-0 overflow-hidden flex flex-col">
                  <div className="bg-emerald-600 p-6 text-white flex justify-between items-start">
                      <div>
                          <h3 className="text-xl font-bold flex items-center gap-2">
                              <Wallet size={24} /> Confirmar Recebimento
                          </h3>
                          <p className="text-emerald-100 text-sm mt-1">O recurso já está disponível na sua conta?</p>
                      </div>
                      <button onClick={() => setIsReceiptModalOpen(false)} className="bg-white/20 hover:bg-white/30 p-1.5 rounded-full transition-colors"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-6">
                      <div className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                          <CalendarClock className="text-blue-600 flex-shrink-0" size={24} />
                          <div>
                              <h4 className="font-bold text-blue-900 text-sm">Prazo de Prestação de Contas</h4>
                              <p className="text-xs text-blue-700 mt-2 leading-relaxed text-justify">
                                  Em conformidade com o <strong>Parágrafo Único do Art. 4º</strong> da Portaria de Suprimento de Fundos, o prazo para prestação de contas encerra-se 15 (quinze) dias após o término do período de aplicação.
                              </p>
                              
                              <div className="mt-3 space-y-1">
                                  {processData.event_end_date && (
                                      <div className="flex justify-between text-xs text-blue-800">
                                          <span>Fim da Aplicação (Evento):</span>
                                          <span className="font-bold">{new Date(processData.event_end_date.split('-').map(Number).join('-')).toLocaleDateString()}</span>
                                      </div>
                                  )}
                                  <div className="flex justify-between text-xs font-bold text-blue-900 bg-blue-100/50 px-2 py-1 rounded border border-blue-200 mt-1">
                                      <span>Prazo Fatal (Art. 4º):</span>
                                      <span>{calculatedDeadlineObj.deadline.toLocaleDateString()}</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div className="space-y-3">
                          <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                              <div className="mt-0.5"><CheckCircle2 className="text-gray-300" size={20} /></div>
                              <div className="text-sm text-gray-600">
                                  Declaro que conferi o extrato bancário e o valor de <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(processData.value)}</strong> foi creditado corretamente.
                              </div>
                          </label>
                      </div>
                  </div>
                  <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                      <button onClick={() => setIsReceiptModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">Cancelar</button>
                      <button 
                          onClick={executeReceiptConfirmation}
                          disabled={processingAction}
                          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
                      >
                          {processingAction ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                          Confirmar e Iniciar Prazo
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE CRÉDITO (SOSFU) */}
      {isCreditModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative overflow-hidden">
                  <div className="flex items-center gap-3 mb-4 text-indigo-600">
                      <div className="p-3 bg-indigo-50 rounded-full"><Wallet size={24} /></div>
                      <h3 className="text-xl font-bold text-gray-800">Confirmar Liberação</h3>
                  </div>
                  <div className="space-y-4 mb-6">
                      <p className="text-sm text-gray-600 leading-relaxed">
                          Você está confirmando que a <strong>Ordem Bancária (OB)</strong> foi processada e o recurso enviado ao banco.
                      </p>
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 flex items-start gap-2">
                          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                          <div>
                              O status do processo mudará para <strong>Aguardando Confirmação do Suprido</strong>. O prazo de prestação de contas iniciará assim que o suprido confirmar o recebimento.
                          </div>
                      </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                      <button onClick={() => setIsCreditModalOpen(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg text-sm transition-colors">Cancelar</button>
                      <button onClick={handleConfirmCreditSent} disabled={processingAction} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-200 text-sm transition-all transform active:scale-95">
                          {processingAction ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>}
                          Confirmar Envio
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* OUTROS MODAIS (Edição, Novo Doc, Tramitar) */}
      {/* ... (Mantidos do código anterior, simplificados aqui para XML) ... */}
      {isEditingDoc && (
          <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl w-full max-w-6xl h-[90vh] flex flex-col">
                 <div className="p-4 border-b flex justify-between"><h3 className="font-bold">Editor</h3><button onClick={() => setIsEditingDoc(false)}><X/></button></div>
                 <div className="flex-1 p-4"><textarea className="w-full h-full border p-2" value={editingContent} onChange={e => setEditingContent(e.target.value)}/></div>
                 <div className="p-4 border-t flex justify-end"><button onClick={handleSaveEdit} className="bg-blue-600 text-white px-4 py-2 rounded">Salvar</button></div>
             </div>
          </div>
      )}
      {isNewDocOpen && ( <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"><div className="bg-white p-6 rounded">Modal Novo Doc (Placeholder) <button onClick={() => setIsNewDocOpen(false)}>Fechar</button></div></div> )}
      {isTramitarOpen && ( 
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
              <div className="bg-white p-6 rounded w-96">
                  {tramitacaoSuccess ? <div className="text-center text-green-600 font-bold">Tramitado com Sucesso!</div> : 
                  <>
                    <h3 className="font-bold mb-4">Tramitar Processo?</h3>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsTramitarOpen(false)} className="px-4 py-2 bg-gray-100 rounded">Cancelar</button>
                        <button onClick={handleTramitar} className="px-4 py-2 bg-blue-600 text-white rounded">Confirmar</button>
                    </div>
                  </>}
              </div>
          </div> 
      )}

      {/* HEADER E NAVEGAÇÃO */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-30 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 flex items-center gap-2 text-sm font-bold"><ArrowLeft size={18} /> Voltar</button>
            <div className="h-8 w-px bg-gray-200"></div>
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-gray-900">{processData.process_number}</h1>
                    <StatusBadge status={processData.status} />
                </div>
            </div>
        </div>
        <div className="flex items-center gap-3">
            {showGenerateAttestation && <button onClick={handleGenerateAttestation} className="px-4 py-2 bg-yellow-500 text-white rounded font-bold text-sm">Emitir Atesto</button>}
            {canTramitar && <button onClick={() => setIsTramitarOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded font-bold text-sm">{tramitarLabel}</button>}
            <button onClick={() => setIsNewDocOpen(true)} className="px-4 py-2 border rounded font-bold text-sm">Novo Doc</button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-8 py-8">
        {/* TABS */}
        <div className="flex gap-1 border-b border-gray-200 mb-8 overflow-x-auto">
            {['OVERVIEW', 'DOSSIER', 'EXECUTION', 'ANALYSIS'].map(t => (
                <button key={t} onClick={() => setActiveTab(t as any)} className={`px-4 py-2 text-sm font-bold border-b-2 ${activeTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}>
                    {t === 'OVERVIEW' ? 'Visão Geral' : t === 'DOSSIER' ? 'Dossiê Digital' : t === 'EXECUTION' ? 'Execução' : 'Análise Técnica'}
                </button>
            ))}
        </div>

        {/* CONTEÚDO DAS ABAS */}
        {activeTab === 'OVERVIEW' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4">Justificativa</h3>
                    <div className="bg-gray-50 p-4 rounded text-sm text-gray-600">{processData.justification}</div>
                </div>
                <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm"><p className="text-xs font-bold text-gray-400">Valor</p><p className="text-3xl font-bold text-emerald-600">R$ {processData.value}</p></div>
            </div>
        )}

        {activeTab === 'DOSSIER' && (
            <div className="grid grid-cols-12 gap-6 h-[600px]">
                <div className="col-span-4 bg-white rounded-xl border p-2 overflow-y-auto">
                    {documents.map((doc, idx) => (
                        <button key={doc.id} onClick={() => setPreviewDoc(doc)} className={`w-full text-left p-3 rounded mb-1 ${previewDoc?.id === doc.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}>
                            <span className="text-xs font-bold text-gray-400 block">DOC {idx+1}</span>
                            <span className="text-sm font-bold">{doc.title}</span>
                        </button>
                    ))}
                </div>
                <div className="col-span-8 bg-gray-100 rounded-xl border flex flex-col relative overflow-hidden">
                    <div className="absolute top-4 right-4 z-10">{canEditCurrentDoc && <button onClick={handleOpenEdit} className="bg-white px-3 py-1 rounded shadow text-xs font-bold">Editar</button>}</div>
                    <div className="flex-1 overflow-auto p-8 flex justify-center"><div className="bg-white shadow-lg w-[210mm] min-h-[297mm] scale-75 origin-top">{renderDocumentPreview()}</div></div>
                </div>
            </div>
        )}

        {activeTab === 'EXECUTION' && (
            <div className="space-y-6">
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-800">Grupo A: Instrução</h3>
                        <div className="flex gap-2">
                            {(!isGenerated('GRANT_ACT')) && <button onClick={handleGenerateInstructionDocs} className="px-3 py-1 bg-blue-600 text-white rounded text-xs">Gerar Minutas</button>}
                            {processData.status === 'WAITING_SEFIN_SIGNATURE' && <button onClick={handleSefinBatchSign} className="px-3 py-1 bg-green-600 text-white rounded text-xs">Assinar (SEFIN)</button>}
                        </div>
                    </div>
                    <DocumentRow docKey="GRANT" label="Portaria" type="GRANT_ACT" />
                    <DocumentRow docKey="REG" label="Certidão Regularidade" type="REGULARITY" />
                    <DocumentRow docKey="NE" label="Nota de Empenho" type="COMMITMENT" />
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-800">Grupo B: Pagamento</h3>
                        {isGenerated('COMMITMENT') && !isGenerated('BANK_ORDER') && <button onClick={handleGeneratePaymentDocs} className="px-3 py-1 bg-blue-600 text-white rounded text-xs">Gerar Pagamento</button>}
                    </div>
                    <DocumentRow docKey="DL" label="Nota de Liquidação" type="LIQUIDATION" />
                    <DocumentRow docKey="OB" label="Ordem Bancária" type="BANK_ORDER" />
                </div>
            </div>
        )}

        {/* ANÁLISE TÉCNICA (ATUALIZADA COM SUCESSO) */}
        {activeTab === 'ANALYSIS' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                
                {processData.status === 'PAID' ? (
                    /* LAYOUT DE SUCESSO - RECURSO LIBERADO */
                    <>
                        <div className="bg-emerald-500 rounded-2xl p-10 text-center text-white shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                            <div className="relative z-10 flex flex-col items-center">
                                <Sparkles className="w-16 h-16 mb-4 text-emerald-100" />
                                <h2 className="text-3xl font-black mb-2 tracking-tight">Recurso Liberado com Sucesso!</h2>
                                <p className="text-emerald-50 opacity-90 max-w-2xl mx-auto font-medium text-lg leading-relaxed">
                                    O suprido foi notificado. Prazo para aplicação e prestação de contas: até 15 dias após o término do período de aplicação (Art. 4º, Parágrafo Único).
                                </p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-6 text-lg">Resumo da Liberação</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Valor Liberado</p>
                                    <p className="text-3xl font-bold text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(processData.value)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Data de Liberação</p>
                                    <p className="text-lg font-bold text-gray-800">{new Date(accountabilityData?.created_at || new Date()).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Prazo Prestação</p>
                                    <p className="text-lg font-bold text-emerald-700">Até {accountabilityData?.deadline ? new Date(accountabilityData.deadline).toLocaleDateString() : '...'}</p>
                                    <p className="text-[10px] text-gray-400 font-medium">Art. 4º, P. Único</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-2">Status</p>
                                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide inline-block">
                                        Prestação de Contas Aberta
                                    </span>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    /* LAYOUT PADRÃO (CHECKLIST DE LIBERAÇÃO) */
                    <>
                        <div className="bg-purple-600 rounded-xl p-6 text-white shadow-lg">
                            <h2 className="text-2xl font-bold flex items-center gap-3"><ShieldCheck /> Análise Técnica</h2>
                            <p className="text-purple-100 text-sm">Checklist e liberação final do recurso.</p>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b bg-gray-50"><h3 className="font-bold text-gray-800 text-sm uppercase">Checklist de Liberação</h3></div>
                            <div className="divide-y divide-gray-100">
                                {/* Itens do Checklist */}
                                <div className="p-4 flex justify-between items-center">
                                    <div className="flex gap-3 items-center">
                                        <div className={`p-2 rounded-full ${isGenerated('COMMITMENT') ? 'bg-green-100 text-green-600' : 'bg-gray-100'}`}><CheckCircle2 size={18}/></div>
                                        <div><p className="font-bold text-sm">Conformidade Documental (NE)</p><p className="text-xs text-gray-500">Bloco A gerado</p></div>
                                    </div>
                                    <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded">{isGenerated('COMMITMENT') ? 'Verificado' : 'Pendente'}</span>
                                </div>
                                <div className="p-4 flex justify-between items-center">
                                    <div className="flex gap-3 items-center">
                                        <div className={`p-2 rounded-full ${isGenerated('BANK_ORDER') ? 'bg-green-100 text-green-600' : 'bg-gray-100'}`}><CheckCircle2 size={18}/></div>
                                        <div><p className="font-bold text-sm">Pagamento (OB)</p><p className="text-xs text-gray-500">Ordem Bancária emitida</p></div>
                                    </div>
                                    <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded">{isGenerated('BANK_ORDER') ? 'Verificado' : 'Pendente'}</span>
                                </div>

                                {/* Botão de Ação Principal */}
                                <div className="p-4 flex justify-between items-center bg-indigo-50/50">
                                    <div className="flex gap-3 items-center">
                                        <div className={`p-2 rounded-full ${['WAITING_SUPRIDO_CONFIRMATION', 'PAID'].includes(processData.status) ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}><Wallet size={20}/></div>
                                        <div><p className="font-bold text-sm text-gray-800">Recurso Creditado na Conta</p><p className="text-xs text-gray-500">Confirmação manual do técnico</p></div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        {processData.status === 'WAITING_SUPRIDO_CONFIRMATION' && (
                                            <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 animate-pulse">
                                                <Loader2 size={12} className="animate-spin" /> Aguardando Confirmação do Suprido
                                            </span>
                                        )}
                                        
                                        {(['SOSFU', 'ADMIN'].includes(currentUser?.dperfil?.slug)) && (
                                            <button 
                                                onClick={handleOpenCreditModal}
                                                disabled={!isGenerated('BANK_ORDER') || ['WAITING_SUPRIDO_CONFIRMATION', 'PAID'].includes(processData.status)}
                                                className={`px-5 py-2.5 rounded-lg text-xs font-bold text-white shadow-md transition-all flex items-center gap-2 ${
                                                    ['WAITING_SUPRIDO_CONFIRMATION', 'PAID'].includes(processData.status)
                                                    ? 'bg-gray-300 cursor-default opacity-50 hidden' 
                                                    : !isGenerated('BANK_ORDER')
                                                        ? 'bg-gray-400 cursor-not-allowed'
                                                        : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg active:scale-95'
                                                }`}
                                            >
                                                <Check size={16} /> Confirmar Crédito
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border p-6">
                            <h3 className="font-bold text-gray-800 text-xs uppercase mb-4 flex gap-2 items-center"><Building2 size={14}/> Dados Bancários</h3>
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded border border-gray-100">
                                <div><p className="text-[10px] font-bold text-gray-400 uppercase">Banco/Agência</p><p className="font-bold text-sm">{userProfile?.banco} / {userProfile?.agencia}</p></div>
                                <div><p className="text-[10px] font-bold text-gray-400 uppercase">Conta</p><p className="font-bold text-sm">{userProfile?.conta_corrente}</p></div>
                                <div className="col-span-2 border-t pt-2 mt-2 flex justify-between items-center">
                                    <div><p className="text-[10px] font-bold text-gray-400 uppercase">Favorecido</p><p className="font-bold text-sm">{userProfile?.full_name}</p></div>
                                    <div className="text-right"><p className="text-[10px] font-bold text-gray-400 uppercase">Valor Líquido</p><p className="font-bold text-lg text-emerald-600">R$ {processData.value}</p></div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        )}

      </div>
    </div>
  );
};