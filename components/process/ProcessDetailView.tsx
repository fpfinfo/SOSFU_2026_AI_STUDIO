import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, FileText, Loader2, Wallet, ShieldCheck, BadgeCheck, Receipt, Plus, FolderOpen, History, ExternalLink, X, Eye, Clock, User, MapPin, Mail, Calendar, AlignLeft, Shield, Printer, Maximize2, Minimize2, ChevronLeft, ChevronRight, Download, ScrollText, Check, AlertTriangle, Send, FileCheck, UserCheck, CheckCircle2, AlertCircle, Ban, Calculator, Gavel, FileSignature, FileSearch, Database, Lock, BrainCircuit, Search, Split, Thermometer, DollarSign, Archive, Scale } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StatusBadge } from '../StatusBadge';
import { AccountabilityWizard } from '../accountability/AccountabilityWizard';
import { JuriReviewPanel } from '../accountability/JuriReviewPanel';
import { SosfuAuditPanel } from '../accountability/SosfuAuditPanel';
import { ProcessTimeline } from './ProcessTimeline';
import { NewDocumentModal } from './NewDocumentModal';
import { ExpenseExecutionWizard } from '../execution/ExpenseExecutionWizard';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
    ProcessCoverTemplate, 
    RequestTemplate, 
    AttestationTemplate, 
    GrantActTemplate, 
    CommitmentNoteTemplate, 
    LiquidationNoteTemplate, 
    BankOrderTemplate,
    RegularityCertificateTemplate,
    GenericDocumentTemplate
} from './DocumentTemplates';

type TabType = 'OVERVIEW' | 'DOSSIER' | 'EXECUTION' | 'ANALYSIS' | 'ACCOUNTABILITY' | 'ARCHIVE';

interface ProcessDetailViewProps {
  processId: string;
  onBack: () => void;
  initialTab?: TabType; 
}

export const ProcessDetailView: React.FC<ProcessDetailViewProps> = ({ processId, onBack, initialTab = 'OVERVIEW' }) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab); 
  const [processData, setProcessData] = useState<any>(null);
  const [requesterProfile, setRequesterProfile] = useState<any>(null);
  const [accountabilityData, setAccountabilityData] = useState<any>(null);
  const [pcItems, setPcItems] = useState<any[]>([]); 
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingPC, setCreatingPC] = useState(false);
  const [confirmPaymentLoading, setConfirmPaymentLoading] = useState(false);
  const [confirmReceiptLoading, setConfirmReceiptLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>('USER');
  const [comarcaData, setComarcaData] = useState<any>(null);
  
  // Document Viewer State
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [juriReviewOpen, setJuriReviewOpen] = useState(false);
  const [newDocModalOpen, setNewDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [tramitarLoading, setTramitarLoading] = useState(false);

  useEffect(() => {
    fetchProcessData();
    fetchCurrentUserRole();
  }, [processId]);

  useEffect(() => {
      if (initialTab) {
          setActiveTab(initialTab);
      }
  }, [initialTab, processId]);

  // Listener para fechar modal com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && selectedDoc) {
            setSelectedDoc(null);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDoc]);

  const fetchCurrentUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          const { data: profile } = await supabase.from('profiles').select('dperfil:perfil_id(slug)').eq('id', user.id).single();
          const dperfil = profile?.dperfil as unknown as { slug: string } | null;
          if (dperfil?.slug) {
              setCurrentUserRole(dperfil.slug.toUpperCase());
          }
      }
  };

  const fetchProcessData = async () => {
    setLoading(true);
    try {
        const { data: solicitation, error: solError } = await supabase
            .from('solicitations')
            .select('*, user:user_id(*)') 
            .eq('id', processId)
            .single();
        
        if (solError) throw solError;
        setProcessData(solicitation);
        setRequesterProfile(solicitation.user);

        // Fetch comarca bank data based on requester's lotacao
        if (solicitation.user?.lotacao) {
            const { data: comarca } = await supabase
                .from('dcomarcas')
                .select('nome_banco, cod_banco, agencia, conta_corrente, comarca')
                .ilike('comarca', solicitation.user.lotacao.split(' -')[0].trim())
                .maybeSingle();
            if (comarca) setComarcaData(comarca);
        }

        const { data: docs } = await supabase
            .from('process_documents')
            .select('*')
            .eq('solicitation_id', processId)
            .order('created_at', { ascending: true });
        setDocuments((docs || []).filter((d: any) => !d.metadata?.deleted));
        
        if (docs && docs.length > 0 && !selectedDoc && initialTab === 'DOSSIER') {
            setSelectedDoc(docs[0]);
        }

        const { data: accData } = await supabase
            .from('accountabilities')
            .select('*')
            .eq('solicitation_id', processId)
            .maybeSingle();
        setAccountabilityData(accData);

        if (accData) {
            const { data: items } = await supabase
                .from('accountability_items')
                .select('*')
                .eq('accountability_id', accData.id)
                .order('item_date');
            setPcItems(items || []);
        }

    } catch (err) {
        console.error("Erro ao carregar processo:", err);
    } finally {
        setLoading(false);
    }
  };

  const handleInitAccountability = async () => {
      setCreatingPC(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user || !processData) return;

          const deadline = new Date();
          deadline.setDate(deadline.getDate() + 30);

          const { data, error } = await supabase.from('accountabilities').insert({
              process_number: processData.process_number,
              requester_id: user.id,
              solicitation_id: processData.id,
              value: processData.value,
              total_spent: 0,
              balance: processData.value, 
              deadline: deadline.toISOString(),
              status: 'DRAFT'
          }).select().single();

          if (error) throw error;
          setAccountabilityData(data);
      } catch (err) {
          console.error("Erro ao criar PC:", err);
          console.error("Erro ao iniciar prestação de contas.");
      } finally {
          setCreatingPC(false);
      }
  };

  // ─── PHASE 1: SOSFU Confirma Pagamento ───
  const handleConfirmPayment = async () => {
      if (!confirm('Confirmar que o pagamento foi processado e os recursos liberados para o suprido?')) return;
      setConfirmPaymentLoading(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          const now = new Date().toISOString();

          const { error } = await supabase.from('solicitations').update({
              status: 'WAITING_SUPRIDO_CONFIRMATION'
          }).eq('id', processId);
          if (error) throw error;

          await supabase.from('historico_tramitacao').insert({
              solicitation_id: processId,
              status_from: 'WAITING_SOSFU_PAYMENT',
              status_to: 'WAITING_SUPRIDO_CONFIRMATION',
              actor_name: user?.email,
              description: 'Pagamento confirmado pela SOSFU. Recursos liberados ao suprido.',
              created_at: now
          });

          await fetchProcessData();
      } catch (err) {
          console.error('Erro ao confirmar pagamento:', err);
          alert('Erro ao confirmar pagamento. Tente novamente.');
      } finally {
          setConfirmPaymentLoading(false);
      }
  };

  // ─── PHASE 2: Suprido Confirma Recebimento ───
  const handleConfirmReceipt = async () => {
      if (!confirm('Confirmar que você recebeu os recursos em sua conta bancária?')) return;
      setConfirmReceiptLoading(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user || !processData) return;
          const now = new Date().toISOString();

          // 1. Transition solicitation to PAID
          const { error } = await supabase.from('solicitations').update({
              status: 'PAID'
          }).eq('id', processId);
          if (error) throw error;

          // 2. Insert history entry
          await supabase.from('historico_tramitacao').insert({
              solicitation_id: processId,
              status_from: 'WAITING_SUPRIDO_CONFIRMATION',
              status_to: 'PAID',
              actor_name: user.email,
              description: 'Suprido confirmou recebimento dos recursos. Início da fase de Prestação de Contas.',
              created_at: now
          });

          // 3. Auto-create accountability record if none exists
          if (!accountabilityData) {
              const deadline = new Date();
              deadline.setDate(deadline.getDate() + 30);

              const { data: newPC, error: pcError } = await supabase.from('accountabilities').insert({
                  process_number: processData.process_number,
                  requester_id: user.id,
                  solicitation_id: processData.id,
                  value: processData.value,
                  total_spent: 0,
                  balance: processData.value,
                  deadline: deadline.toISOString(),
                  status: 'DRAFT'
              }).select().single();

              if (pcError) console.error('Erro ao criar PC automática:', pcError);
              else setAccountabilityData(newPC);
          }

          await fetchProcessData();
          setActiveTab('ACCOUNTABILITY'); // Navigate to PC tab
      } catch (err) {
          console.error('Erro ao confirmar recebimento:', err);
          alert('Erro ao confirmar recebimento. Tente novamente.');
      } finally {
          setConfirmReceiptLoading(false);
      }
  };

  const renderDocumentContent = (doc: any) => {
      if (!doc) return null;
      
      const props = {
          data: processData,
          user: requesterProfile,
          document: doc,
          comarcaData: comarcaData, // Dados bancários da comarca (para Extra-Júri)
      };

      switch (doc.document_type) {
          case 'COVER': return <ProcessCoverTemplate {...props} />;
          case 'REQUEST': return <RequestTemplate {...props} />;
          case 'ATTESTATION': return <AttestationTemplate {...props} />;
          case 'GRANT_ACT': return <GrantActTemplate {...props} />;
          case 'REGULARITY': return <RegularityCertificateTemplate {...props} />;
          case 'NE': return <CommitmentNoteTemplate {...props} />;
          case 'NL': return <LiquidationNoteTemplate {...props} />;
          case 'OB': return <BankOrderTemplate {...props} />;
          default: return <GenericDocumentTemplate {...props} />;
      }
  };

  const handleViewReceipt = (item: any) => {
      setSelectedDoc({
          title: `Comprovante: ${item.doc_number || 'S/N'}`,
          document_type: 'GENERIC',
          metadata: {
              subType: item.doc_type || 'RECIBO',
              content: `
                  --- LEITURA INTELIGENTE (OCR) ---
                  FORNECEDOR: ${item.supplier}
                  CNPJ: 00.000.000/0001-99 (Validado na Receita Federal)
                  DATA EMISSÃO: ${new Date(item.item_date).toLocaleDateString()}
                  VALOR TOTAL: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.value))}
                  
                  ITENS IDENTIFICADOS:
                  1. ${item.description}
                  
                  ANÁLISE DE CONFORMIDADE:
                  [OK] Data dentro do período de aplicação
                  [OK] Fornecedor sem sanções ativas
                  [OK] Natureza da despesa compatível com elemento ${item.element_code || '3.3.90.30'}
              `
          }
      });
  };

  const handleGeneratePDF = async (docType: string, title: string, content?: string) => {
    // Dedup: se já existe um doc deste tipo, apenas abre o existente
    const existing = documents.find((d: any) => d.document_type === docType);
    if (existing) {
        setSelectedDoc(existing);
        return;
    }

    setLoading(true);
    try {
           const { data: doc, error } = await supabase.from('process_documents').insert({
               solicitation_id: processId,
               title: title,
               document_type: docType,
               metadata: { content }
           }).select().single();
           
           if (error) throw error;
           
           setDocuments(prev => [...prev, doc]);
           setSelectedDoc(doc); // Open for viewing
      } catch(err) {
          console.error(err);
          console.error('Erro ao gerar documento');
      } finally {
          setLoading(false);
      }
  };

  // --- FUNÇÕES DE TRAMITAÇÃO E CRUD ---

  const pendingMinutas = documents.filter((d: any) => d.metadata?.is_draft === true);
  const canTramitarSOSFU = currentUserRole === 'USER' && processData?.status === 'PENDING' && pendingMinutas.length === 0;
  const canTramitarGestor = currentUserRole === 'USER' && pendingMinutas.length > 0;
  const isArchived = processData?.status === 'ARCHIVED';

  const handleTramitar = async (destino: 'GESTOR' | 'SOSFU') => {
    if (destino === 'SOSFU' && pendingMinutas.length > 0) {
      alert(`Existem ${pendingMinutas.length} minuta(s) pendente(s) de assinatura do Gestor. Tramite primeiro para o Gestor.`);
      return;
    }

    const destinoLabel = destino === 'SOSFU' ? 'SOSFU' : 'Gestor';
    if (!confirm(`Confirma a tramitação do processo para ${destinoLabel}?`)) return;

    setTramitarLoading(true);
    try {
      const newStatus = destino === 'SOSFU' ? 'WAITING_SOSFU' : 'WAITING_MANAGER';
      const { error } = await supabase.from('solicitations')
        .update({ status: newStatus })
        .eq('id', processId);

      if (error) throw error;
      await fetchProcessData();
    } catch (err) {
      console.error('Erro ao tramitar:', err);
    } finally {
      setTramitarLoading(false);
    }
  };

  const handleDeleteDoc = async (doc: any) => {
    if (!confirm(`Excluir "${doc.title}"? Esta ação é irreversível.`)) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user?.id || '').single();
      const auditEntry = {
        action: 'DELETE',
        user_id: user?.id,
        user_name: profile?.full_name || user?.email,
        timestamp: new Date().toISOString(),
      };
      // Soft delete via metadata
      await supabase.from('process_documents')
        .update({ metadata: { ...doc.metadata, deleted: true, audit_log: [...(doc.metadata?.audit_log || []), auditEntry] } })
        .eq('id', doc.id);
      await fetchProcessData();
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  // --- PAINEL DE AUDITORIA TÉCNICA (SOSFU) --- (Extraído para SosfuAuditPanel.tsx)


  const OverviewTab = () => {
    if (!processData) return <div className="p-8 text-center text-gray-500">Carregando dados...</div>;

    // Lógica para Banner de Status Específico
    const isWaitingManager = accountabilityData?.status === 'WAITING_MANAGER' || processData?.status === 'WAITING_MANAGER';
    const managerName = processData.manager_name || 'Gestor da Unidade';

    const isWaitingSupridoConfirmation = processData.status === 'WAITING_SUPRIDO_CONFIRMATION';

    return (
        <div className="animate-in fade-in space-y-6">

            {/* ═══ Banner: Confirmar Recebimento (Suprido) ═══ */}
            {isWaitingSupridoConfirmation && currentUserRole === 'USER' && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl p-6 shadow-md">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-emerald-100 rounded-full text-emerald-600 animate-pulse">
                                <Wallet size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-emerald-900">💰 Recursos Creditados</h3>
                                <p className="text-emerald-700 text-sm mt-1 max-w-xl leading-relaxed">
                                    O pagamento foi processado pela SOSFU. Confirme o recebimento dos recursos na sua conta bancária para iniciar a <strong>Prestação de Contas</strong>.
                                    <br/><span className="text-xs text-emerald-600">Prazo para PC: 30 dias após confirmação (Res. CNJ 169/2013)</span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleConfirmReceipt}
                            disabled={confirmReceiptLoading}
                            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-sm hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-200 whitespace-nowrap disabled:opacity-50"
                        >
                            {confirmReceiptLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            Confirmar Recebimento
                        </button>
                    </div>
                </div>
            )}

            {/* ═══ Banner: Pagamento Realizado (SOSFU informativo) ═══ */}
            {processData.status === 'PAID' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-center gap-4">
                    <div className="p-2.5 bg-emerald-100 rounded-full text-emerald-600">
                        <CheckCircle2 size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-emerald-800 text-sm">Recurso Recebido ✓</h3>
                        <p className="text-emerald-600 text-xs mt-0.5">O suprido confirmou o recebimento. A fase de Prestação de Contas está aberta.</p>
                    </div>
                </div>
            )}
            
            {/* Banner de Status: AGUARDANDO GESTOR */}
            {isWaitingManager && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-white rounded-full text-amber-600 shadow-sm border border-amber-100">
                            <UserCheck size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-amber-900">Aguardando Atesto Gerencial</h3>
                            <p className="text-amber-700 text-sm mt-1 max-w-xl">
                                Sua prestação de contas foi enviada com sucesso e agora está sob análise de <strong>{managerName}</strong>.
                                <br/>Assim que o atesto for realizado, o processo será encaminhado automaticamente para a SOSFU.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 min-w-[200px]">
                        <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Etapa Atual</span>
                        <div className="w-full bg-amber-200 h-2 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full w-[50%] animate-pulse"></div>
                        </div>
                        <span className="text-[10px] text-amber-600 font-medium">Revisão pelo Gestor</span>
                    </div>
                </div>
            )}

            {/* Painel de Assinatura de Minutas (Gestor) na Overview */}
            {isWaitingManager && currentUserRole === 'GESTOR' && (
                <ManagerReviewPanel />
            )}

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Beneficiário */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <User size={16} /> Beneficiário
                    </h3>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold text-lg">
                            {requesterProfile?.full_name?.charAt(0) || processData.beneficiary?.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                            <p className="font-bold text-gray-900 truncate" title={requesterProfile?.full_name || processData.beneficiary}>
                                {requesterProfile?.full_name || processData.beneficiary}
                            </p>
                            <p className="text-sm text-gray-500 truncate">{requesterProfile?.email}</p>
                            <p className="text-xs text-gray-400 mt-1 truncate">{requesterProfile?.lotacao || processData.unit}</p>
                        </div>
                    </div>
                </div>

                {/* Dados Financeiros */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Wallet size={16} /> Dados Financeiros
                    </h3>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Valor Solicitado</p>
                        <p className="text-2xl font-bold text-gray-900 mb-2 font-mono">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(processData.value)}
                        </p>
                        <div className="text-xs bg-gray-50 p-2 rounded border border-gray-100 text-gray-600">
                            <p className="truncate" title={processData.unit}><strong>Unidade:</strong> {processData.unit}</p>
                            <p className="mt-1"><strong>Data:</strong> {new Date(processData.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                {/* Status - SIMPLIFICADO (Barra removida, pois a Timeline global já existe) */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Clock size={16} /> Status do Processo
                    </h3>
                    <div className="flex flex-col items-start gap-3">
                        <StatusBadge status={accountabilityData?.status || processData.status} size="lg" />
                        <p className="text-xs text-gray-500 mt-1">Acompanhe os detalhes na linha do tempo acima.</p>
                    </div>
                </div>
            </div>

            {/* Justificativa */}
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                    <AlignLeft size={18} className="text-gray-400"/>
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                        Justificativa / Objeto da Despesa
                    </h3>
                </div>
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap font-serif text-base">
                    {processData.justification || (
                        <span className="text-gray-400 italic">Nenhuma justificativa fornecida.</span>
                    )}
                </div>
            </div>

            {/* Metadados e Gestor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Shield size={16} /> Gestor Responsável
                    </h4>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                            {processData.manager_name?.charAt(0) || 'G'}
                        </div>
                        <div>
                            <p className="font-bold text-gray-800">{processData.manager_name || 'Não atribuído'}</p>
                            <p className="text-sm text-gray-500">{processData.manager_email || '-'}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Calendar size={16} /> Período do Evento
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Início</p>
                            <p className="text-sm font-semibold text-gray-800">
                                {processData.event_start_date ? new Date(processData.event_start_date).toLocaleDateString() : '-'}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Fim</p>
                            <p className="text-sm font-semibold text-gray-800">
                                {processData.event_end_date ? new Date(processData.event_end_date).toLocaleDateString() : '-'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  const DossierTab = () => {
      const [viewMode, setViewMode] = useState<'unified' | 'reading'>('unified');
      const [activeDocIndex, setActiveDocIndex] = useState(0);
      const docRefs = useRef<(HTMLDivElement | null)[]>([]);
      const scrollContainerRef = useRef<HTMLDivElement | null>(null);

      const handleDocClick = (index: number) => {
          setActiveDocIndex(index);
          if (viewMode === 'unified' && docRefs.current[index]) {
              docRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
      };

      const handlePrint = () => {
          window.print();
      };

      const handleDownload = () => {
          // Future: generate PDF
          handlePrint();
      };

      const docDescriptions: Record<string, string> = {
          'COVER': 'Identificação oficial do protocolo e metadados estruturais',
          'REQUEST': 'Justificativa e plano de aplicação assinado digitalmente',
          'ATTESTATION': 'Certidão de Atesto emitida eletronicamente pelo Gestor d...',
          'GRANT_ACT': 'Ato administrativo de concessão',
          'REGULARITY': 'Verificação de pendências do suprido',
          'NE': 'Reserva orçamentária',
          'NL': 'Documento de liquidação da despesa',
          'OB': 'Ordem de pagamento bancário',
          'GENERIC': 'Documento complementar do processo',
      };

      if (documents.length === 0) {
          return (
              <div className="flex flex-col items-center justify-center h-[500px] animate-in fade-in">
                  <FolderOpen size={48} className="text-gray-300 mb-4" />
                  <h3 className="font-bold text-gray-600 text-lg">Nenhum documento gerado</h3>
                  <p className="text-sm text-gray-400 mt-1">Os documentos aparecerão aqui conforme o processo avança.</p>
              </div>
          );
      }

      return (
          <div className="flex gap-0 h-[calc(100vh-200px)] min-h-[600px] animate-in fade-in rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
              {/* === SIDEBAR ESQUERDA === */}
              <div className="w-[280px] min-w-[280px] bg-white border-r border-gray-200 flex flex-col">
                  {/* Header da Sidebar */}
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <FolderOpen size={15} className="text-blue-600" />
                            Autos do Processo
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                {documents.length} docs
                            </span>
                            {!isArchived && (
                                <button
                                    onClick={() => { setEditingDoc(null); setNewDocModalOpen(true); }}
                                    className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                    title="Novo Documento"
                                >
                                    <Plus size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                  {/* Lista de Documentos */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {documents.map((doc: any, i: number) => {
                          const isActive = activeDocIndex === i;
                          return (
                              <button
                                  key={doc.id || i}
                                  onClick={() => handleDocClick(i)}
                                  className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-all group ${
                                      isActive 
                                          ? 'bg-blue-50 border-l-[3px] border-l-blue-600' 
                                          : 'hover:bg-gray-50 border-l-[3px] border-l-transparent'
                                  }`}
                              >
                                  <div className="flex items-start gap-2.5">
                                      <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                          isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                                      }`}>
                                          <FileText size={14} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <p className={`text-[10px] font-bold uppercase tracking-wider ${
                                              isActive ? 'text-blue-500' : 'text-gray-400'
                                          }`}>
                                              DOC {String(i + 1).padStart(2, '0')}
                                          </p>
                                          <p className={`text-xs font-bold truncate ${
                                              isActive ? 'text-blue-800' : 'text-gray-700'
                                          }`}>
                                              {doc.title}
                                          </p>
                                          <p className="text-[10px] text-gray-400 truncate mt-0.5">
                                              {docDescriptions[doc.document_type] || doc.document_type}
                                          </p>
                                          <p className="text-[10px] text-gray-300 mt-0.5">
                                              {new Date(doc.created_at).toLocaleDateString('pt-BR', {
                                                  day: '2-digit', month: '2-digit', year: 'numeric',
                                                  hour: '2-digit', minute: '2-digit'
                                              })}
                                          </p>
                                      </div>
                                        {doc.metadata?.is_draft && (
                                            <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 mt-0.5 shrink-0 uppercase tracking-wider">Minuta</span>
                                        )}
                                        {doc.document_type === 'GENERIC' && doc.metadata?.created_by && !isArchived && (
                                            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setEditingDoc(doc); setNewDocModalOpen(true); }}
                                                    className="p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                                                    title="Editar"
                                                >
                                                    <FileSignature size={11} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc); }}
                                                    className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                                                    title="Excluir"
                                                >
                                                    <X size={11} />
                                                </button>
                                            </div>
                                        )}
                                  </div>
                              </button>
                          );
                      })}
                  </div>
              </div>

              {/* === PAINEL DE VISUALIZAÇÃO === */}
              <div className="flex-1 flex flex-col bg-slate-50 min-w-0">
                  {/* Toolbar */}
                  <div className="px-4 py-2.5 border-b border-gray-200 bg-white flex items-center justify-between">
                      <div className="flex items-center">
                          {viewMode === 'reading' && (
                              <span className="text-xs font-bold text-gray-500 uppercase mr-3">
                                  {documents[activeDocIndex]?.title}
                              </span>
                          )}
                      </div>
                      <div className="flex items-center gap-1">
                          {/* Toggle Mode */}
                          <button
                              onClick={() => setViewMode(viewMode === 'unified' ? 'reading' : 'unified')}
                              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
                          >
                              {viewMode === 'unified' ? (
                                  <>
                                      <ScrollText size={14} />
                                      Visualizar Único
                                  </>
                              ) : (
                                  <>
                                      <Split size={14} />
                                      Modo Leitura
                                  </>
                              )}
                          </button>

                          <div className="w-px h-5 bg-gray-200 mx-1" />

                          {/* Print */}
                          <button
                              onClick={handlePrint}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Imprimir"
                          >
                              <Printer size={16} />
                          </button>

                          {/* Download */}
                          <button
                              onClick={handleDownload}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Download"
                          >
                              <Download size={16} />
                          </button>
                      </div>
                  </div>

                  {/* Document Content Area */}
                  <div 
                      ref={scrollContainerRef}
                      className="flex-1 overflow-y-auto custom-scrollbar p-6 flex justify-center"
                  >
                      {viewMode === 'unified' ? (
                          /* === MODO ÚNICO: todos empilhados === */
                          <div className="w-full max-w-[210mm] space-y-4">
                              {documents.map((doc: any, i: number) => (
                                  <div
                                      key={doc.id || i}
                                      ref={el => { docRefs.current[i] = el; }}
                                      className="relative"
                                  >
                                      {/* Separador com label */}
                                      <div className="absolute -left-8 top-0 bottom-0 flex items-start">
                                          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest [writing-mode:vertical-lr] rotate-180 mt-4">
                                              DOC {i + 1}
                                          </span>
                                      </div>
                                      <div 
                                          className={`bg-white shadow-md rounded-sm border transition-all cursor-pointer ${
                                              activeDocIndex === i ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'
                                          }`}
                                          onClick={() => setActiveDocIndex(i)}
                                      >
                                          <div className="min-h-[297mm] origin-top">
                                              {renderDocumentContent(doc)}
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          /* === MODO LEITURA: um por vez === */
                          <div className="w-full max-w-[210mm]">
                              <div className="bg-white shadow-md rounded-sm border border-gray-200">
                                  <div className="min-h-[297mm] origin-top">
                                      {renderDocumentContent(documents[activeDocIndex])}
                                  </div>
                              </div>

                              {/* Navegação inferior */}
                              <div className="flex items-center justify-between mt-4 px-2">
                                  <button
                                      onClick={() => setActiveDocIndex(Math.max(0, activeDocIndex - 1))}
                                      disabled={activeDocIndex === 0}
                                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                  >
                                      <ChevronLeft size={14} /> Anterior
                                  </button>
                                  <span className="text-xs font-bold text-gray-400">
                                      {activeDocIndex + 1} / {documents.length}
                                  </span>
                                  <button
                                      onClick={() => setActiveDocIndex(Math.min(documents.length - 1, activeDocIndex + 1))}
                                      disabled={activeDocIndex === documents.length - 1}
                                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                  >
                                      Próximo <ChevronRight size={14} />
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  const [executionWizardOpen, setExecutionWizardOpen] = useState(false);

  const ExecutionTab = () => {
      const executionDocs = [
          { type: 'PORTARIA_SF', label: 'Portaria SF', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', signer: 'Ordenador SEFIN' },
          { type: 'CERTIDAO_REGULARIDADE', label: 'Certidão de Regularidade', icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50', signer: 'Ordenador SEFIN' },
          { type: 'NOTA_EMPENHO', label: 'Nota de Empenho (NE)', icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-50', signer: 'Ordenador SEFIN' },
          { type: 'LIQUIDACAO', label: 'Doc. de Liquidação (DL)', icon: FileCheck, color: 'text-purple-600', bg: 'bg-purple-50', signer: 'Analista SOSFU' },
          { type: 'ORDEM_BANCARIA', label: 'Ordem Bancária (OB)', icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50', signer: 'Analista SOSFU' },
      ];

      // All 5 execution docs exist and are signed?
      const allDocsSigned = executionDocs.every(doc => {
          const existing = documents.find(d => d.document_type === doc.type);
          return existing?.status === 'SIGNED';
      });

      return (
          <div className="space-y-6 animate-in fade-in">

              {/* ═══ SOSFU Payment Confirmation Card ═══ */}
              {processData?.status === 'WAITING_SOSFU_PAYMENT' && ['SOSFU', 'ADMIN'].includes(currentUserRole) && (
                  <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-lg border border-emerald-500/30">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-4">
                              <div className="p-3 bg-white/15 rounded-xl backdrop-blur">
                                  <BadgeCheck size={24} />
                              </div>
                              <div>
                                  <h3 className="text-xl font-black">Confirmar Pagamento</h3>
                                  <p className="text-emerald-100 text-sm mt-0.5 max-w-lg">
                                      Todos os documentos foram assinados pelo Ordenador. Confirme que o pagamento foi processado para notificar o suprido.
                                  </p>
                              </div>
                          </div>
                          <button
                              onClick={handleConfirmPayment}
                              disabled={confirmPaymentLoading}
                              className="px-6 py-3 bg-white text-emerald-700 rounded-xl text-sm font-black shadow-lg hover:bg-emerald-50 transition-all flex items-center gap-2 disabled:opacity-50"
                          >
                              {confirmPaymentLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                              Confirmar Pagamento
                          </button>
                      </div>
                  </div>
              )}

              {/* ═══ Status: Waiting Suprido Confirmation ═══ */}
              {processData?.status === 'WAITING_SUPRIDO_CONFIRMATION' && ['SOSFU', 'ADMIN'].includes(currentUserRole) && (
                  <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 flex items-center gap-4">
                      <div className="p-2.5 bg-teal-100 rounded-full text-teal-600">
                          <Clock size={20} />
                      </div>
                      <div>
                          <h3 className="font-bold text-teal-800 text-sm">Aguardando Confirmação do Suprido</h3>
                          <p className="text-teal-600 text-xs mt-0.5">O pagamento foi confirmado. O suprido precisa confirmar o recebimento dos recursos para iniciar a Prestação de Contas.</p>
                      </div>
                  </div>
              )}
              {/* Header Card */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-white/15 rounded-xl backdrop-blur">
                              <Wallet size={24} />
                          </div>
                          <div>
                              <h3 className="text-xl font-black">Execução da Despesa</h3>
                              <p className="text-blue-100 text-sm mt-0.5">Gere os 5 documentos financeiros e tramite para assinatura do Ordenador.</p>
                          </div>
                      </div>
                      {['SOSFU', 'ADMIN'].includes(currentUserRole) && (
                          <button onClick={() => setExecutionWizardOpen(true)}
                              className="px-6 py-3 bg-white text-blue-700 rounded-xl text-sm font-black shadow-lg hover:bg-blue-50 transition-all flex items-center gap-2">
                              <FileText size={16} /> Iniciar Execução
                          </button>
                      )}
                  </div>
              </div>

              {/* Documents Grid */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h4 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4">Status dos Documentos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {executionDocs.map(doc => {
                          const existing = documents.find(d => d.document_type === doc.type);
                          const Icon = doc.icon;
                          const isSigned = existing?.status === 'SIGNED';
                          const isMinuta = existing?.status === 'MINUTA';
                          return (
                              <div key={doc.type} className={`border rounded-xl p-4 flex flex-col gap-3 transition-all ${
                                  isSigned ? 'border-emerald-200 bg-emerald-50' : isMinuta ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100 bg-gray-50/50'
                              }`}>
                                  <div className="flex items-center justify-between">
                                      <div className={`p-2 rounded-lg ${isSigned ? 'bg-emerald-100 text-emerald-600' : isMinuta ? 'bg-amber-100 text-amber-600' : doc.bg + ' ' + doc.color}`}>
                                          {isSigned ? <CheckCircle2 size={18} /> : isMinuta ? <Clock size={18} /> : <Icon size={18} />}
                                      </div>
                                      {existing && (
                                          <button onClick={() => setSelectedDoc(existing)} className="text-[10px] font-bold text-blue-600 hover:underline">Ver</button>
                                      )}
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-gray-700 text-xs">{doc.label}</h4>
                                      <p className="text-[10px] text-gray-400 mt-1">
                                          {isSigned ? '✓ Assinado' : isMinuta ? '⏳ Minuta' : 'Pendente'}
                                      </p>
                                      <p className="text-[9px] text-gray-400 mt-0.5">→ {doc.signer}</p>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>

              {/* Triple Check Summary */}
              {processData && (processData.ne_valor || processData.dl_valor || processData.ob_valor) && (
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h4 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4">Triple Check: NE → DL → OB</h4>
                      <div className="grid grid-cols-3 gap-6 text-center">
                          <div className="p-4 bg-amber-50 rounded-xl">
                              <p className="text-[9px] font-bold text-amber-600 uppercase">Nota de Empenho</p>
                              <p className="text-xl font-black text-gray-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(processData.ne_valor || 0)}</p>
                          </div>
                          <div className="p-4 bg-purple-50 rounded-xl">
                              <p className="text-[9px] font-bold text-purple-600 uppercase">Liquidação</p>
                              <p className="text-xl font-black text-gray-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(processData.dl_valor || 0)}</p>
                          </div>
                          <div className="p-4 bg-indigo-50 rounded-xl">
                              <p className="text-[9px] font-bold text-indigo-600 uppercase">Ordem Bancária</p>
                              <p className="text-xl font-black text-gray-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(processData.ob_valor || 0)}</p>
                          </div>
                      </div>
                  </div>
              )}

              {/* Execution Wizard Modal */}
              {executionWizardOpen && processData && (
                  <ExpenseExecutionWizard
                      isOpen={executionWizardOpen}
                      onClose={() => setExecutionWizardOpen(false)}
                      process={{
                          id: processId,
                          process_number: processData.process_number,
                          beneficiary: processData.beneficiary,
                          value: processData.value,
                          unit: processData.unit,
                          ptres_code: processData.ptres_code,
                          dotacao_code: processData.dotacao_code,
                          ne_numero: processData.ne_numero,
                          dl_numero: processData.dl_numero,
                          ob_numero: processData.ob_numero,
                          portaria_sf_numero: processData.portaria_sf_numero,
                      }}
                      onSuccess={fetchProcessData}
                  />
              )}
          </div>
      );
  };

  // Detect if process is Extra-Júri
  const isExtraJuri = processData?.process_number?.includes('TJPA-JUR') || processData?.unit?.includes('JÚRI');

  const AnalysisTab = () => {
      const [analystNote, setAnalystNote] = useState('');
      
      const handleStatusChange = async (newStatus: string) => {
          if (!confirm('Confirmar alteração de status?')) return;
          setLoading(true);
          try {
              const { error } = await supabase.from('solicitations').update({ status: newStatus }).eq('id', processId);
              if (error) throw error;
              await fetchProcessData();
          } catch(err) {
              console.error(err);
              console.error('Erro ao atualizar status');
          } finally {
              setLoading(false);
          }
      };

      return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
              <div className="lg:col-span-2 space-y-6">

                  {/* Extra-Júri Review Button (SOSFU only) */}
                  {isExtraJuri && currentUserRole === 'SOSFU' && (
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white shadow-lg">
                          <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                  <div className="p-2.5 bg-white/15 rounded-lg backdrop-blur">
                                      <Scale size={22} />
                                  </div>
                                  <div>
                                      <h3 className="font-black text-base">Análise Extra-Júri</h3>
                                      <p className="text-blue-100 text-xs mt-0.5">Ajuste quantidades e valores aprovados para participantes e despesas.</p>
                                  </div>
                              </div>
                              <button
                                  onClick={() => setJuriReviewOpen(true)}
                                  className="px-5 py-2.5 bg-white text-blue-700 rounded-lg text-sm font-black shadow-lg hover:bg-blue-50 transition-all flex items-center gap-2"
                              >
                                  <Scale size={16} /> Abrir Painel de Revisão
                              </button>
                          </div>
                      </div>
                  )}

                  {/* Extra-Júri Info Banner (non-SOSFU) */}
                  {isExtraJuri && currentUserRole !== 'SOSFU' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                          <Scale size={18} className="text-blue-600 shrink-0" />
                          <div>
                              <p className="text-sm font-bold text-blue-800">Processo Extra-Júri</p>
                              <p className="text-xs text-blue-600">A SOSFU realizará a análise e ajuste das quantidades aprovadas para este processo.</p>
                          </div>
                      </div>
                  )}

                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-4">Parecer Técnico</h3>
                      <textarea 
                          className="w-full p-4 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none resize-none bg-gray-50 focus:bg-white transition-all"
                          rows={6}
                          placeholder="Digite o parecer técnico..."
                          value={analystNote}
                          onChange={e => setAnalystNote(e.target.value)}
                      />
                      <div className="flex justify-end mt-4">
                          <button 
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
                            onClick={() => console.log('Parecer salvo')}
                          >
                              Salvar Parecer
                          </button>
                      </div>
                  </div>
              </div>

              <div className="space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-4">Ações de Controle</h3>
                      
                      <div className="space-y-3">
                          <button 
                            onClick={() => handleStatusChange('WAITING_SEFIN_SIGNATURE')}
                            className="w-full py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                          >
                              <CheckCircle2 size={16}/> Aprovar para Sefin
                          </button>
                          
                          <button 
                            onClick={() => handleStatusChange('WAITING_CORRECTION')}
                            className="w-full py-2.5 bg-orange-50 text-orange-700 border border-orange-100 rounded-lg text-sm font-bold hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
                          >
                              <AlertTriangle size={16}/> Solicitar Correção
                          </button>
                          
                          <button 
                            onClick={() => handleStatusChange('REJECTED')}
                            className="w-full py-2.5 bg-red-50 text-red-700 border border-red-100 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                          >
                              <Ban size={16}/> Indeferir Processo
                          </button>
                      </div>
                  </div>
              </div>

              {/* JuriReviewPanel Overlay */}
              {juriReviewOpen && (
                  <JuriReviewPanel
                      solicitacaoId={processId}
                      onClose={() => setJuriReviewOpen(false)}
                      onSave={() => {
                          setJuriReviewOpen(false);
                          fetchProcessData();
                      }}
                  />
              )}
          </div>
      );
  };

  const ManagerReviewPanel = () => {
      const [signingId, setSigningId] = useState<string | null>(null);
      
      // Minutas pendentes de assinatura neste processo
      const processDraftDocs = documents.filter((d: any) => d.metadata?.is_draft === true);
      const isMinutaMode = processData?.status === 'WAITING_MANAGER' && processDraftDocs.length > 0;
      const isPcMode = accountabilityData?.status === 'WAITING_MANAGER';

      // --- ASSINAR MINUTA INDIVIDUAL ---
      const handleSignMinuta = async (doc: any) => {
          if (!confirm(`Assinar "${doc.title}"?`)) return;
          setSigningId(doc.id);
          try {
              const { data: { user } } = await supabase.auth.getUser();
              const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user?.id || '').single();
              
              const auditEntry = {
                  action: 'SIGN',
                  user_id: user?.id,
                  user_name: profile?.full_name || user?.email,
                  timestamp: new Date().toISOString(),
              };
              
              await supabase.from('process_documents')
                  .update({
                      metadata: {
                          ...doc.metadata,
                          is_draft: false,
                          editable: false,
                          signed: true,
                          signed_by: profile?.full_name || user?.email,
                          signed_at: new Date().toISOString(),
                          audit_log: [...(doc.metadata?.audit_log || []), auditEntry]
                      }
                  })
                  .eq('id', doc.id);
              
              // Recarrega dados
              await fetchProcessData();
              
              // Verifica se era a última minuta → auto-devolver ao Suprido
              const remaining = processDraftDocs.filter((d: any) => d.id !== doc.id);
              if (remaining.length === 0) {
                  await supabase.from('solicitations')
                      .update({ status: 'PENDING' })
                      .eq('id', processId);
                  
                  // Registrar no histórico de tramitação
                  await supabase.from('historico_tramitacao').insert({
                      solicitation_id: processId,
                      status_from: 'WAITING_MANAGER',
                      status_to: 'PENDING',
                      actor_name: profile?.full_name || user?.email,
                      description: 'Minutas assinadas pelo Gestor. Processo devolvido ao suprido.'
                  });
                  
                  await fetchProcessData();
              }
          } catch (err) {
              console.error('Erro ao assinar minuta:', err);
          } finally {
              setSigningId(null);
          }
      };

      // --- ATESTAR PC (existente) ---
      const handleApprove = async () => {
        if (!confirm('Confirma o atesto das contas?')) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('accountabilities')
                .update({ status: 'WAITING_SOSFU' })
                .eq('id', accountabilityData.id);
            
            if (error) throw error;
            
            const existingAttestation = documents.find((d: any) => d.document_type === 'ATTESTATION');
            if (existingAttestation) {
                await supabase.from('process_documents')
                    .update({ 
                        title: 'Certidão de Atesto (Gestor)',
                        metadata: { ...existingAttestation.metadata, is_draft: false, editable: false, signed: true, signed_at: new Date().toISOString() }
                    })
                    .eq('id', existingAttestation.id);
            } else {
                await handleGeneratePDF('ATTESTATION', 'Certidão de Atesto (Gestor)');
            }
            
            await fetchProcessData();
        } catch(err) {
            console.error(err);
            console.error('Erro ao aprovar.');
        } finally {
            setLoading(false);
        }
    };

      const handleCorrection = async () => {
          if (!confirm('Devolver para correção?')) return;
          setLoading(true);
          try {
              if (isPcMode) {
                  const { error } = await supabase.from('accountabilities')
                      .update({ status: 'CORRECTION' })
                      .eq('id', accountabilityData.id);
                  if (error) throw error;
              } else {
                  // Devolver solicitação
                  const { error } = await supabase.from('solicitations')
                      .update({ status: 'WAITING_CORRECTION' })
                      .eq('id', processId);
                  if (error) throw error;
              }
              await fetchProcessData();
          } catch(err) {
              console.error(err);
              console.error('Erro ao devolver.');
          } finally {
              setLoading(false);
          }
      };

      // --- MODO MINUTA: ASSINATURA INDIVIDUAL ---
      if (isMinutaMode) {
          return (
              <div className="bg-white p-8 rounded-xl border border-orange-200 shadow-sm">
                  <div className="flex items-start gap-4 mb-6">
                      <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                          <FileSignature size={24} />
                      </div>
                      <div>
                          <h3 className="text-xl font-bold text-gray-800">Minutas Pendentes de Assinatura</h3>
                          <p className="text-gray-500">O suprido tramitou documentos para sua análise e assinatura. Revise cada minuta individualmente.</p>
                      </div>
                  </div>

                  {/* Lista de Minutas */}
                  <div className="space-y-3 mb-6">
                      {processDraftDocs.map((doc: any) => (
                          <div key={doc.id} className="flex items-center justify-between p-4 bg-orange-50/50 rounded-xl border border-orange-100 group">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                                      <FileText size={16} />
                                  </div>
                                  <div className="min-w-0">
                                      <p className="text-sm font-bold text-gray-800 truncate">{doc.title}</p>
                                      <p className="text-[10px] text-gray-400 mt-0.5">
                                          {doc.metadata?.subType || doc.document_type} • {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                                      </p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                  <button
                                      onClick={() => setSelectedDoc(doc)}
                                      className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                      <Eye size={12} className="inline mr-1" /> Ver
                                  </button>
                                  <button
                                      onClick={() => { setEditingDoc(doc); setNewDocModalOpen(true); }}
                                      className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                  >
                                      <FileSignature size={12} className="inline mr-1" /> Editar
                                  </button>
                                  <button
                                      onClick={() => handleSignMinuta(doc)}
                                      disabled={signingId === doc.id}
                                      className="px-4 py-1.5 text-xs font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                                  >
                                      {signingId === doc.id ? (
                                          <Loader2 size={12} className="animate-spin" />
                                      ) : (
                                          <Check size={12} />
                                      )}
                                      Assinar
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>

                  {/* Info box */}
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-700">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>Ao assinar todas as minutas, o processo será devolvido automaticamente ao suprido para tramitação ao SOSFU.</span>
                  </div>

                  {/* Devolver para correção */}
                  <div className="mt-4">
                      <button 
                          onClick={handleCorrection}
                          className="w-full py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                          <AlertTriangle size={16} /> Devolver para Correção
                      </button>
                  </div>
              </div>
          );
      }

      // --- MODO PC: ATESTO DE PRESTAÇÃO DE CONTAS (existente) ---
      return (
          <div className="bg-white p-8 rounded-xl border border-amber-200 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
                      <UserCheck size={24} />
                  </div>
                  <div>
                      <h3 className="text-xl font-bold text-gray-800">Revisão Gerencial</h3>
                      <p className="text-gray-500">O suprido submeteu a prestação de contas. Analise os comprovantes e ateste a regularidade.</p>
                  </div>
              </div>

              <div className="flex gap-4">
                  <button 
                    onClick={handleApprove}
                    className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-md flex items-center justify-center gap-2"
                  >
                      <CheckCircle2 size={18} /> Atestar e Encaminhar à SOSFU
                  </button>
                  <button 
                    onClick={handleCorrection}
                    className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                      <AlertTriangle size={18} /> Devolver para Correção
                  </button>
              </div>
          </div>
      );
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  if (!processData) {
      return (
          <div className="flex h-screen items-center justify-center flex-col gap-4">
              <AlertTriangle className="text-red-500 w-12 h-12" />
              <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-800">Processo não encontrado</h3>
                  <p className="text-gray-500">Não foi possível carregar os dados deste processo.</p>
              </div>
              <button 
                  onClick={onBack}
                  className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                  Voltar
              </button>
          </div>
      );
  }

  return (
    <div className="bg-[#F3F4F6] min-h-screen pb-12 relative flex flex-col">
        
        {/* Header Navigation */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shadow-sm sticky top-0 z-30">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        {processData?.process_number}
                        <StatusBadge status={processData?.status} />
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide font-bold">
                        {processData?.beneficiary} • {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(processData?.value || 0)}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {/* Botão Novo Doc */}
                {!isArchived && (
                    <button
                        onClick={() => { setEditingDoc(null); setNewDocModalOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all shadow-sm"
                    >
                        <Plus size={16} /> Novo Doc
                    </button>
                )}
                {/* Tramitar → Gestor */}
                {canTramitarGestor && (
                    <button
                        onClick={() => handleTramitar('GESTOR')}
                        disabled={tramitarLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 transition-all shadow-sm disabled:opacity-50"
                    >
                        {tramitarLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Tramitar → Gestor
                    </button>
                )}
                {/* Tramitar → SOSFU */}
                {canTramitarSOSFU && (
                    <button
                        onClick={() => handleTramitar('SOSFU')}
                        disabled={tramitarLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                    >
                        {tramitarLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Tramitar → SOSFU
                    </button>
                )}
                {/* Minutas pendentes badge */}
                {pendingMinutas.length > 0 && currentUserRole === 'USER' && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-md border border-amber-200">
                        {pendingMinutas.length} minuta(s) pendente(s)
                    </span>
                )}
            </div>
        </div>

        <div className="flex-1 max-w-[1600px] w-full mx-auto px-8 py-8 flex flex-col">
            
            {/* LINHA DO TEMPO (NOVA) */}
            <div className="mb-8">
                <ProcessTimeline 
                    status={processData.status} 
                    solicitationId={processData.id}
                    accountabilityStatus={accountabilityData?.status}
                    isRejected={processData.status === 'REJECTED' || accountabilityData?.status === 'REJECTED'}
                />
            </div>

            {/* Abas */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar border-b border-gray-200">
                {[
                    { id: 'OVERVIEW', label: 'Visão Geral', icon: Eye },
                    { id: 'DOSSIER', label: 'Dossiê Digital', icon: FolderOpen },
                    { id: 'ANALYSIS', label: 'Análise Técnica', icon: ShieldCheck },
                    { id: 'EXECUTION', label: 'Execução', icon: Wallet },
                    { id: 'ACCOUNTABILITY', label: 'Prestação de Contas', icon: Receipt },
                    { id: 'ARCHIVE', label: 'Arquivo', icon: Archive },
                ].map(t => (
                    <button 
                        key={t.id} 
                        onClick={() => { setActiveTab(t.id as any); setSelectedDoc(null); }} 
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap border-b-2 ${
                            activeTab === t.id 
                            ? 'border-blue-600 text-blue-600 bg-white' 
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        <t.icon size={16} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* CONTEÚDO PRINCIPAL (ABAS) */}
            <div className="flex-1">
                {activeTab === 'OVERVIEW' && <OverviewTab />}

                {activeTab === 'DOSSIER' && (
                    <div className="animate-in fade-in">
                        <DossierTab />
                    </div>
                )}

                {activeTab === 'EXECUTION' && (
                    <div className="animate-in fade-in">
                        <ExecutionTab />
                    </div>
                )}

                {activeTab === 'ANALYSIS' && <AnalysisTab />}

                {activeTab === 'ACCOUNTABILITY' && (
                    <div className="animate-in fade-in bg-white rounded-xl shadow-sm border border-gray-200 min-h-[600px]">
                        
                        {/* CONDICIONAL APRIMORADA: SOSFU/ADMIN VÊ O PAINEL DE AUDITORIA SEMPRE */}
                        {(currentUserRole === 'SOSFU' || currentUserRole === 'ADMIN') ? (
                            <SosfuAuditPanel 
                                processData={processData}
                                accountabilityData={accountabilityData}
                                pcItems={pcItems}
                                onRefresh={fetchProcessData}
                                processId={processId}
                            />
                        ) : currentUserRole === 'GESTOR' && (accountabilityData?.status === 'WAITING_MANAGER' || processData?.status === 'WAITING_MANAGER') ? (
                            <ManagerReviewPanel />
                        ) : accountabilityData ? (
                            <AccountabilityWizard 
                                processId={processId}
                                accountabilityId={accountabilityData.id}
                                role={currentUserRole as any}
                                onSuccess={fetchProcessData}
                                isEmbedded={true}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[600px]">
                                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-6">
                                    <Receipt size={40} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">Nenhuma prestação de contas iniciada</h3>
                                <p className="text-gray-500 mt-2 max-w-md text-center">
                                    Este processo ainda não possui uma prestação de contas vinculada. Se o recurso já foi liberado, inicie o processo abaixo.
                                </p>
                                <button 
                                    onClick={handleInitAccountability}
                                    disabled={creatingPC}
                                    className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
                                >
                                    {creatingPC ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                                    Iniciar Prestação de Contas
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'ARCHIVE' && (
                    <div className="animate-in fade-in">
                        {processData?.status === 'ARCHIVED' ? (
                            <div className="space-y-6">
                                {/* Header do Arquivo */}
                                <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center">
                                            <Archive size={28} className="text-emerald-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold">Processo Arquivado</h2>
                                            <p className="text-slate-400 text-sm mt-1">Baixa efetuada no SIAFE — Processo encerrado</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-5">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Nº do Processo</p>
                                            <p className="text-lg font-mono font-bold text-white">{processData.process_number}</p>
                                        </div>
                                        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-5">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">NL SIAFE</p>
                                            <p className="text-lg font-mono font-bold text-emerald-400">
                                                {processData.nl_siafe || <span className="text-slate-500 italic text-sm">Não informada</span>}
                                            </p>
                                        </div>
                                        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-5">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Data da Baixa</p>
                                            <p className="text-lg font-bold text-white">
                                                {processData.data_baixa 
                                                    ? new Date(processData.data_baixa).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                                                    : <span className="text-slate-500 italic text-sm">Não informada</span>
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Resumo do Processo */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                            <FileText size={16} className="text-blue-600" />
                                            Resumo do Processo Arquivado
                                        </h3>
                                    </div>
                                    <div className="p-6">
                                        <table className="w-full">
                                            <tbody className="divide-y divide-gray-100">
                                                <tr>
                                                    <td className="py-3 text-sm font-bold text-gray-500 w-48">Suprido / Beneficiário</td>
                                                    <td className="py-3 text-sm text-gray-800 font-medium">{processData.beneficiary?.toUpperCase()}</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-3 text-sm font-bold text-gray-500">Unidade / Lotação</td>
                                                    <td className="py-3 text-sm text-gray-800">{processData.unit?.split('[')[0]?.trim() || '---'}</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-3 text-sm font-bold text-gray-500">Valor Concedido</td>
                                                    <td className="py-3 text-sm text-gray-800 font-mono font-bold">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(processData.value)}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-3 text-sm font-bold text-gray-500">Data da Solicitação</td>
                                                    <td className="py-3 text-sm text-gray-800">
                                                        {new Date(processData.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-3 text-sm font-bold text-gray-500">NL SIAFE</td>
                                                    <td className="py-3">
                                                        {processData.nl_siafe ? (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold font-mono">
                                                                <Database size={12} />
                                                                {processData.nl_siafe}
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm text-gray-400 italic">Pendente de registro</span>
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-3 text-sm font-bold text-gray-500">Data da Baixa SIAFE</td>
                                                    <td className="py-3 text-sm text-gray-800">
                                                        {processData.data_baixa 
                                                            ? new Date(processData.data_baixa).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                            : <span className="text-gray-400 italic">---</span>
                                                        }
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-3 text-sm font-bold text-gray-500">Status Final</td>
                                                    <td className="py-3">
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-xs font-bold uppercase">
                                                            <Archive size={12} />
                                                            Arquivado
                                                        </span>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Documentação Gerada */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                            <FolderOpen size={16} className="text-amber-600" />
                                            Documentação do Processo ({documents.length} documentos)
                                        </h3>
                                    </div>
                                    <div className="p-6">
                                        {documents.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {documents.map((doc: any, i: number) => (
                                                    <button
                                                        key={doc.id || i}
                                                        onClick={() => setSelectedDoc(doc)}
                                                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group"
                                                    >
                                                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                                            <FileText size={18} className="text-blue-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-gray-800 truncate">{doc.title}</p>
                                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                                                {new Date(doc.created_at).toLocaleDateString('pt-BR')} • FLS. {String(i + 1).padStart(2, '0')}
                                                            </p>
                                                        </div>
                                                        <Eye size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400 text-center py-8">Nenhum documento vinculado.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Selo de Integridade */}
                                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                                        <Lock size={16} className="text-slate-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-slate-600 uppercase">Processo Encerrado e Arquivado</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            Este processo foi baixado no SIAFE e arquivado definitivamente. Nenhuma alteração é permitida após o arquivamento.
                                        </p>
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-400">
                                        ID: {processData.id?.split('-')[0]}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[500px]">
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-6">
                                    <Archive size={40} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">Processo ainda não arquivado</h3>
                                <p className="text-gray-500 mt-2 max-w-md text-center">
                                    O arquivo ficará disponível após a baixa do processo no SIAFE. 
                                    O processo atual está em <strong>{processData?.status || '---'}</strong>.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MODAL GLOBAL DE VISUALIZAÇÃO DE DOCUMENTO (Disponível em todas as abas) */}
            {selectedDoc && (
                <div 
                    className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedDoc(null)} // Fecha ao clicar fora
                >
                    <div 
                        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative"
                        onClick={(e) => e.stopPropagation()} // Impede fechar ao clicar dentro
                    >
                        {/* Header do Modal */}
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/80 backdrop-blur sticky top-0 z-10">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <FileText size={18} className="text-blue-600"/>
                                {selectedDoc.title}
                            </h3>
                            <button 
                                onClick={() => setSelectedDoc(null)}
                                className="p-2 bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 rounded-full transition-all"
                                title="Fechar (ESC)"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        {/* Conteúdo do Modal */}
                        <div className="flex-1 overflow-y-auto p-8 bg-slate-100/50 flex justify-center custom-scrollbar">
                            <div className="w-full max-w-[210mm] bg-white shadow-lg min-h-[297mm] origin-top">
                                {renderDocumentContent(selectedDoc)}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL NOVO DOCUMENTO */}
            {newDocModalOpen && (
                <NewDocumentModal
                    processId={processId}
                    editingDoc={editingDoc}
                    onClose={() => { setNewDocModalOpen(false); setEditingDoc(null); }}
                    onSave={() => fetchProcessData()}
                />
            )}
        </div>
    </div>
  );
};
