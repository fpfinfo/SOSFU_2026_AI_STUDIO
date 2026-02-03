import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, FileText, FolderOpen, Calendar, DollarSign, User, CheckCircle2, Clock, Eye, Download, Printer, Share2, Building2, CreditCard, ChevronRight, File, X, Send, Plus, Loader2, Stamp, Scale, Banknote, FileCheck, Wallet } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ProcessCoverTemplate, RequestTemplate, AttestationTemplate, GrantActTemplate, RegularityCertificateTemplate, CommitmentNoteTemplate, BankOrderTemplate } from './DocumentTemplates';
import { AccountabilityWizard } from '../accountability/AccountabilityWizard';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ProcessDetailViewProps {
  processId: string;
  onBack: () => void;
}

export const ProcessDetailView: React.FC<ProcessDetailViewProps> = ({ processId, onBack }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DOSSIER'>('DOSSIER'); 
  const [processData, setProcessData] = useState<any>(null);
  const [accountabilityData, setAccountabilityData] = useState<any>(null); // Dados da PC
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // States para Modais
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
  const [isAccountabilityOpen, setIsAccountabilityOpen] = useState(false); // Modal PC
  
  // Action States
  const [processingAction, setProcessingAction] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  
  // States para Novo Documento (Modal)
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState('DISPATCH'); 
  const [newDocDesc, setNewDocDesc] = useState('');

  const documentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProcessData();
  }, [processId]);

  useEffect(() => {
    if (documents.length > 0 && !previewDoc) setPreviewDoc(documents[0]);
  }, [documents]);

  const fetchProcessData = async () => {
    setLoading(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
             const { data: currProfile } = await supabase.from('profiles').select('*, dperfil:perfil_id(slug)').eq('id', user.id).single();
             setCurrentUser(currProfile);
        }

        // 1. Processo
        const { data: solicitation, error: solError } = await supabase.from('solicitations').select('*').eq('id', processId).single();
        if (solError) throw solError;
        setProcessData(solicitation);

        // 2. Prestação de Contas (Se houver)
        const { data: pc } = await supabase.from('accountabilities').select('*').eq('solicitation_id', processId).maybeSingle();
        setAccountabilityData(pc);

        // 3. Documentos
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
  const isSEFIN = currentUser?.dperfil?.slug === 'SEFIN' || currentUser?.dperfil?.slug === 'ADMIN';
  const isSuprido = currentUser?.id === processData?.user_id || currentUser?.dperfil?.slug === 'SUPRIDO';

  // --- ACTIONS ---
  
  // Apenas a lógica de iniciar PC, as demais são placeholders se o arquivo não for completo
  const handleStartAccountability = async () => {
      if (!isSuprido) return;
      setProcessingAction(true);
      try {
          if (!accountabilityData) {
              const { data, error } = await supabase.from('accountabilities').insert({
                  solicitation_id: processId,
                  requester_id: currentUser.id,
                  process_number: processData.process_number,
                  value: processData.value,
                  deadline: new Date(new Date().setDate(new Date().getDate() + 60)).toISOString(), // 60 dias
                  status: 'DRAFT'
              }).select().single();
              
              if (error) throw error;
              setAccountabilityData(data);
          }
          setIsAccountabilityOpen(true);
      } catch (e: any) {
          alert('Erro ao iniciar PC: ' + e.message);
      } finally {
          setProcessingAction(false);
      }
  };

  const handleOpenAccountability = () => {
      setIsAccountabilityOpen(true);
  };

  const renderDocumentPreview = () => {
      if (!previewDoc) return <p className="text-gray-400">Selecione um documento</p>;

      const commonProps = {
          data: processData,
          user: userProfile || { full_name: 'Usuário Desconhecido' },
          gestor: { full_name: processData.manager_name || 'Gestor' },
          signer: { full_name: 'Ordenador de Despesa' }
      };

      switch (previewDoc.document_type) {
          case 'COVER': return <ProcessCoverTemplate {...commonProps} />;
          case 'REQUEST': return <RequestTemplate {...commonProps} />;
          case 'ATTESTATION': return <AttestationTemplate {...commonProps} />;
          case 'GRANT_ACT': return <GrantActTemplate {...commonProps} />;
          case 'REGULARITY': return <RegularityCertificateTemplate {...commonProps} />;
          case 'COMMITMENT': return <CommitmentNoteTemplate {...commonProps} />;
          case 'BANK_ORDER': return <BankOrderTemplate {...commonProps} />;
          default:
              return (
                  <div className="p-16 bg-white min-h-[500px]">
                      <div className="border-2 border-dashed border-gray-200 rounded-lg p-10 flex flex-col items-center justify-center text-center h-full">
                          <FileText size={48} className="text-gray-300 mb-4" />
                          <h2 className="text-xl font-bold text-gray-700 mb-2">{previewDoc.title}</h2>
                          <p className="text-gray-500 whitespace-pre-wrap max-w-lg">{previewDoc.description}</p>
                      </div>
                  </div>
              );
      }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (!processData) return <div>Processo não encontrado.</div>;

  const pcRole = isSOSFU ? 'SOSFU' : isGestor ? 'GESTOR' : 'SUPRIDO';

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-12 relative animate-in fade-in">
      
      {/* MODAL DE PRESTAÇÃO DE CONTAS */}
      {isAccountabilityOpen && accountabilityData && (
          <div className="fixed inset-0 z-[60] bg-white animate-in slide-in-from-bottom-10">
              <AccountabilityWizard 
                  processId={processId}
                  accountabilityId={accountabilityData.id}
                  role={pcRole}
                  onClose={() => setIsAccountabilityOpen(false)}
                  onSuccess={() => {
                      setIsAccountabilityOpen(false);
                      fetchProcessData();
                  }}
              />
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
            {processData.status === 'PAID' && (
                <>
                    {!accountabilityData && isSuprido && (
                        <button onClick={handleStartAccountability} disabled={processingAction} className="btn-primary bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-orange-200">
                            {processingAction ? <Loader2 className="animate-spin" size={16} /> : <Wallet size={16} />} Iniciar Prestação de Contas
                        </button>
                    )}
                    
                    {accountabilityData && (
                        <button onClick={handleOpenAccountability} className="btn-primary bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                            <FileCheck size={16} /> 
                            {accountabilityData.status === 'DRAFT' ? 'Continuar PC (Rascunho)' : 'Visualizar Prestação de Contas'}
                        </button>
                    )}
                </>
            )}

            <button onClick={() => setIsNewDocOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-all text-sm shadow-sm">
                <Plus size={16} /> Novo Doc
            </button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-8 py-8">
        {/* Status da PC se existir */}
        {accountabilityData && (
            <div className="mb-6 bg-orange-50 border border-orange-200 p-4 rounded-xl flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg text-orange-600 shadow-sm"><Wallet size={20}/></div>
                    <div>
                        <h4 className="font-bold text-orange-900">Prestação de Contas Ativa</h4>
                        <p className="text-sm text-orange-700">Status Atual: <strong>{accountabilityData.status}</strong></p>
                    </div>
                </div>
                {/* Alerts */}
                {isGestor && accountabilityData.status === 'WAITING_MANAGER' && (
                    <button onClick={handleOpenAccountability} className="px-4 py-2 bg-orange-600 text-white rounded-lg font-bold text-sm animate-pulse">
                        Ação Necessária: Analisar Contas
                    </button>
                )}
                {isSOSFU && accountabilityData.status === 'WAITING_SOSFU' && (
                    <button onClick={handleOpenAccountability} className="px-4 py-2 bg-orange-600 text-white rounded-lg font-bold text-sm animate-pulse">
                        Ação Necessária: Auditar Contas
                    </button>
                )}
            </div>
        )}

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
                                <div className={`w-10 h-10 rounded flex items-center justify-center font-bold text-xs text-white flex-shrink-0 ${doc.document_type === 'COVER' ? 'bg-blue-900' : doc.document_type === 'REQUEST' ? 'bg-blue-600' : doc.document_type === 'GRANT_ACT' ? 'bg-emerald-500' : 'bg-gray-400'}`}>
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
                        <div className="w-full max-w-[210mm] min-h-[297mm] bg-white shadow-lg origin-top transition-transform">
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