import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, FileText, FolderOpen, Eye, Plus, Loader2, Send, CheckCircle2, ChevronRight, X, AlertTriangle, File, Stamp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ProcessCoverTemplate, RequestTemplate, AttestationTemplate, GrantActTemplate, RegularityCertificateTemplate, CommitmentNoteTemplate, BankOrderTemplate, GenericDocumentTemplate } from './DocumentTemplates';
import { AccountabilityWizard } from '../accountability/AccountabilityWizard';

interface ProcessDetailViewProps {
  processId: string;
  onBack: () => void;
}

export const ProcessDetailView: React.FC<ProcessDetailViewProps> = ({ processId, onBack }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DOSSIER'>('DOSSIER'); 
  const [processData, setProcessData] = useState<any>(null);
  const [accountabilityData, setAccountabilityData] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // States para Modais e Ações
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
  const [isTramitarOpen, setIsTramitarOpen] = useState(false);
  const [isAccountabilityOpen, setIsAccountabilityOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  
  // Novo Documento
  const [newDocType, setNewDocType] = useState('Memorando');
  const [newDocContent, setNewDocContent] = useState('');

  useEffect(() => {
    fetchProcessData();
  }, [processId]);

  useEffect(() => {
    if (documents.length > 0 && !previewDoc) setPreviewDoc(documents[documents.length - 1]); // Seleciona o último
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
        setProcessData(solicitation);

        const { data: pc } = await supabase.from('accountabilities').select('*').eq('solicitation_id', processId).maybeSingle();
        setAccountabilityData(pc);

        const { data: docs, error: docError } = await supabase.from('process_documents').select('*').eq('solicitation_id', processId).order('created_at', { ascending: true });
        if (docError) throw docError;
        setDocuments(docs || []);

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

  // --- ROLE CHECKS ---
  const isGestor = currentUser && processData && (
      (processData.manager_email && currentUser.email && processData.manager_email.toLowerCase() === currentUser.email.toLowerCase()) ||
      (currentUser.dperfil?.slug === 'GESTOR')
  );
  const isSOSFU = currentUser?.dperfil?.slug === 'SOSFU' || currentUser?.dperfil?.slug === 'ADMIN';
  const isSuprido = currentUser?.id === processData?.user_id || currentUser?.dperfil?.slug === 'SUPRIDO';

  // --- ACTIONS ---

  const handleCreateDocument = async () => {
      if (!newDocContent) return alert("O documento precisa ter conteúdo.");
      setProcessingAction(true);
      try {
          const { data, error } = await supabase.from('process_documents').insert({
              solicitation_id: processId,
              title: newDocType.toUpperCase(),
              description: `Documento criado manualmente por ${currentUser.full_name}`,
              document_type: 'GENERIC',
              metadata: { subType: newDocType, content: newDocContent },
              status: 'GENERATED'
          }).select().single();

          if (error) throw error;
          
          await fetchProcessData();
          setIsNewDocOpen(false);
          setNewDocContent('');
          setPreviewDoc(data);
      } catch (err: any) {
          alert('Erro ao criar documento: ' + err.message);
      } finally {
          setProcessingAction(false);
      }
  };

  const handleTramitar = async () => {
      setProcessingAction(true);
      try {
          let nextStatus = processData.status;
          let successMessage = "Processo tramitado com sucesso!";

          // Lógica de Tramitação
          if (processData.status === 'PENDING') {
              // Suprido -> Gestor
              nextStatus = 'WAITING_MANAGER';
              successMessage = "Processo encaminhado para o Gestor.";
          } else if (processData.status === 'WAITING_MANAGER' && isGestor) {
              // Gestor -> SOSFU (Gera Certidão)
              nextStatus = 'WAITING_SOSFU_ANALYSIS';
              successMessage = "Atesto emitido. Processo encaminhado para a SOSFU.";

              // Gera Certidão de Atesto Automaticamente
              await supabase.from('process_documents').insert({
                  solicitation_id: processId,
                  title: 'CERTIDÃO DE ATESTO DA CHEFIA',
                  description: 'Documento gerado e assinado eletronicamente pelo Gestor.',
                  document_type: 'ATTESTATION',
                  status: 'SIGNED'
              });
          }

          // Atualiza status
          const { error } = await supabase
            .from('solicitations')
            .update({ status: nextStatus })
            .eq('id', processId);

          if (error) throw error;

          alert(successMessage);
          setIsTramitarOpen(false);
          onBack(); // Volta para o dashboard
      } catch (err: any) {
          console.error(err);
          alert('Erro na tramitação: ' + err.message);
      } finally {
          setProcessingAction(false);
      }
  };

  const renderDocumentPreview = () => {
      if (!previewDoc) return <div className="flex items-center justify-center h-full text-gray-400">Selecione um documento para visualizar</div>;

      const commonProps = {
          data: processData,
          user: userProfile || { full_name: 'Usuário Desconhecido' },
          gestor: { full_name: processData.manager_name || 'Gestor' },
          signer: { full_name: 'Ordenador de Despesa' },
          content: previewDoc.metadata?.content,
          subType: previewDoc.metadata?.subType
      };

      switch (previewDoc.document_type) {
          case 'COVER': return <ProcessCoverTemplate {...commonProps} />;
          case 'REQUEST': return <RequestTemplate {...commonProps} />;
          case 'ATTESTATION': return <AttestationTemplate {...commonProps} />;
          case 'GENERIC': return <GenericDocumentTemplate {...commonProps} />;
          case 'GRANT_ACT': return <GrantActTemplate {...commonProps} />;
          case 'REGULARITY': return <RegularityCertificateTemplate {...commonProps} />;
          case 'COMMITMENT': return <CommitmentNoteTemplate {...commonProps} />;
          case 'BANK_ORDER': return <BankOrderTemplate {...commonProps} />;
          default: return <div>Tipo de documento não suportado para visualização.</div>;
      }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (!processData) return <div>Processo não encontrado.</div>;

  // Lógica de visualização do botão Tramitar
  const canTramitar = 
      (isSuprido && processData.status === 'PENDING') ||
      (isGestor && processData.status === 'WAITING_MANAGER');

  const tramitarLabel = 
      processData.status === 'PENDING' ? 'Enviar para Gestor' :
      processData.status === 'WAITING_MANAGER' ? 'Gerar Atesto e Tramitar' : 'Tramitar';

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-12 relative animate-in fade-in">
      
      {/* MODAL NOVO DOCUMENTO */}
      {isNewDocOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><FileText size={20}/> Novo Documento</h3>
                      <button onClick={() => setIsNewDocOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
                  </div>
                  <div className="p-6 overflow-y-auto">
                      <div className="space-y-4">
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Documento</label>
                              <select 
                                value={newDocType} 
                                onChange={(e) => setNewDocType(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                              >
                                  <option value="Memorando">Memorando</option>
                                  <option value="Ofício">Ofício</option>
                                  <option value="Portaria">Portaria</option>
                                  <option value="Minuta">Minuta</option>
                                  <option value="Despacho">Despacho</option>
                                  <option value="Requerimento">Requerimento</option>
                                  <option value="Certidão">Certidão</option>
                                  <option value="Parecer">Parecer</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">Conteúdo do Documento</label>
                              <textarea 
                                value={newDocContent}
                                onChange={(e) => setNewDocContent(e.target.value)}
                                className="w-full h-64 p-4 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none resize-none text-sm leading-relaxed text-gray-900"
                                placeholder="Digite o texto do documento aqui..."
                              />
                          </div>
                      </div>
                  </div>
                  <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                      <button onClick={() => setIsNewDocOpen(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg">Cancelar</button>
                      <button 
                        onClick={handleCreateDocument} 
                        disabled={processingAction || !newDocContent}
                        className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      >
                          {processingAction ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>} Criar Documento
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL TRAMITAR */}
      {isTramitarOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                  <div className="flex items-center gap-3 mb-4 text-blue-600">
                      <div className="p-2 bg-blue-50 rounded-full"><Send size={24}/></div>
                      <h3 className="font-bold text-xl text-gray-800">Tramitar Processo</h3>
                  </div>
                  
                  <div className="space-y-4 mb-6">
                      <p className="text-gray-600 text-sm">
                          {processData.status === 'PENDING' && "Confirma o envio da solicitação para análise do Gestor da Unidade?"}
                          {processData.status === 'WAITING_MANAGER' && "Como Gestor, você está prestes a emitir a Certidão de Atesto e encaminhar o processo para a SOSFU. Confirma?"}
                      </p>
                      
                      {processData.status === 'WAITING_MANAGER' && (
                          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-xs text-yellow-800 flex gap-2">
                              <Stamp size={32} className="flex-shrink-0"/>
                              <div>
                                  <strong>Ação Automática:</strong> A Certidão de Atesto da Chefia Imediata será gerada e assinada digitalmente com seus dados neste momento.
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="flex justify-end gap-3">
                      <button onClick={() => setIsTramitarOpen(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Cancelar</button>
                      <button 
                        onClick={handleTramitar}
                        disabled={processingAction}
                        className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-200"
                      >
                          {processingAction ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>} Confirmar Tramitação
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-30 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 flex items-center gap-2 text-sm font-bold">
                <ArrowLeft size={18} /> Voltar
            </button>
            <div className="h-8 w-px bg-gray-200"></div>
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-gray-900">{processData.process_number}</h1>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                        {processData.status.replace(/_/g, ' ')}
                    </span>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-3">
            {canTramitar && (
                <button 
                    onClick={() => setIsTramitarOpen(true)}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all text-sm shadow-lg shadow-indigo-200 animate-pulse"
                >
                    <Send size={16} /> {tramitarLabel}
                </button>
            )}

            <button onClick={() => setIsNewDocOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-all text-sm shadow-sm">
                <Plus size={16} /> Novo Doc
            </button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="flex gap-8 border-b border-gray-200 mb-8">
            <button onClick={() => setActiveTab('OVERVIEW')} className={`pb-4 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${activeTab === 'OVERVIEW' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}><Eye size={18} /> Visão Geral</button>
            <button onClick={() => setActiveTab('DOSSIER')} className={`pb-4 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${activeTab === 'DOSSIER' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}><FolderOpen size={18} /> Dossiê Digital <span className="bg-gray-100 text-gray-600 px-2 rounded-full text-[10px]">{documents.length}</span></button>
        </div>

        {activeTab === 'OVERVIEW' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-4">Justificativa</h3>
                    <div className="bg-gray-50 p-4 rounded text-sm text-gray-600 whitespace-pre-wrap">{processData.justification || 'N/A'}</div>
                </div>
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-xs font-bold text-gray-400 uppercase">Valor</p>
                    <p className="text-4xl font-bold text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(processData.value)}</p>
                </div>
            </div>
        )}

        {activeTab === 'DOSSIER' && (
            <div className="grid grid-cols-12 gap-6 h-[calc(100vh-350px)] min-h-[600px]">
                {/* LISTA LATERAL DE DOCUMENTOS */}
                <div className="col-span-4 bg-white rounded-xl border border-gray-200 overflow-y-auto p-2 space-y-2">
                    {documents.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">Nenhum documento gerado.</div>
                    ) : (
                        documents.map((doc, idx) => (
                            <button key={doc.id} onClick={() => setPreviewDoc(doc)} className={`w-full text-left p-4 rounded-lg border flex items-center gap-3 transition-colors ${previewDoc?.id === doc.id ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
                                <div className={`w-10 h-10 rounded flex items-center justify-center font-bold text-xs text-white flex-shrink-0 ${doc.document_type === 'COVER' ? 'bg-blue-900' : doc.document_type === 'REQUEST' ? 'bg-blue-600' : doc.document_type === 'ATTESTATION' ? 'bg-yellow-500' : doc.document_type === 'GENERIC' ? 'bg-gray-500' : 'bg-emerald-500'}`}>
                                    {doc.document_type.substring(0,3)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Fls. {idx+1}</p>
                                    <p className="text-xs font-bold truncate text-gray-700">{doc.title}</p>
                                </div>
                                {previewDoc?.id === doc.id && <ChevronRight size={16} className="text-blue-500" />}
                            </button>
                        ))
                    )}
                </div>

                {/* ÁREA DE PREVIEW */}
                <div className="col-span-8 bg-gray-100/50 rounded-xl border border-gray-200 flex flex-col overflow-hidden relative">
                     <div className="flex-1 overflow-auto flex justify-center p-8 custom-scrollbar">
                        <div className="w-full max-w-[210mm] min-h-[297mm] bg-white shadow-lg origin-top transition-transform scale-95 origin-top">
                            {renderDocumentPreview()}
                        </div>
                     </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};