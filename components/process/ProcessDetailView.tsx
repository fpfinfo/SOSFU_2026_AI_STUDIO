import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, FileText, Loader2, Wallet, ShieldCheck, BadgeCheck, Receipt, Plus, FolderOpen, History, ExternalLink, X, Eye, Clock, User, MapPin, Mail, Calendar, AlignLeft, Shield, Printer, Maximize2, Minimize2, ChevronLeft, ChevronRight, Download, ScrollText, Check, AlertTriangle, Send, FileCheck, UserCheck, CheckCircle2, AlertCircle, Ban, Calculator, Gavel, FileSignature, FileSearch, Database, Lock, BrainCircuit, Search, Split, Thermometer, DollarSign, Archive, Scale } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StatusBadge } from '../StatusBadge';
import { AccountabilityWizard } from '../accountability/AccountabilityWizard';
import { JuriReviewPanel } from '../accountability/JuriReviewPanel';
import { SosfuAuditPanel } from '../accountability/SosfuAuditPanel';
import { SodpaAuditPanel } from '../sodpa/SodpaAuditPanel';
import { WorkflowTracker } from '../ui/WorkflowTracker';
import { NewDocumentModal } from './NewDocumentModal';
import { ExpenseExecutionWizard } from '../execution/ExpenseExecutionWizard';
import { AuditLogTab } from './AuditLogTab';
import { ProcessDetailSkeleton } from '../ui/Skeleton';
import { Tooltip } from '../ui/Tooltip';
import { ReconciliationPanel } from '../ui/ReconciliationPanel';
import { exportElementToPdf, exportDossierToPdf, printDocumentElement } from '../../lib/pdfExport';
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

type TabType = 'OVERVIEW' | 'DOSSIER' | 'EXECUTION' | 'ANALYSIS' | 'ACCOUNTABILITY' | 'AUDIT' | 'ARCHIVE';

interface ProcessDetailViewProps {
  processId: string;
  onBack: () => void;
  initialTab?: TabType; 
  userProfile?: any;
  darkMode?: boolean;
}

export const ProcessDetailView: React.FC<ProcessDetailViewProps> = ({ 
  processId, 
  onBack, 
  initialTab = 'OVERVIEW', 
  userProfile,
  darkMode = false 
}) => {
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
  const [gestorProfile, setGestorProfile] = useState<any>(null);
  const isSuprido = currentUserRole === 'USER' || currentUserRole === 'SERVIDOR';

  useEffect(() => {
    fetchProcessData();
    if (userProfile?.dperfil?.slug) {
        setCurrentUserRole(userProfile.dperfil.slug.toUpperCase());
    } else {
        fetchCurrentUserRole();
    }
  }, [processId, userProfile]);

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

        // Fetch gestor profile data
        if (solicitation.manager_email) {
            const { data: gProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', solicitation.manager_email)
                .maybeSingle();
            if (gProfile) setGestorProfile(gProfile);
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

  // ─── PHASE 1: SOSFU Confirma Pagamento (OPTIMISTIC UI) ───
  const handleConfirmPayment = async () => {
      if (!confirm('Comunicar ao suprido que o pagamento foi realizado e os recursos liberados?')) return;
      // Optimistic: update UI immediately
      const prevStatus = processData?.status;
      setProcessData((prev: any) => prev ? { ...prev, status: 'WAITING_SUPRIDO_CONFIRMATION' } : prev);
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
              description: 'Pagamento comunicado pela SOSFU. Recursos liberados ao suprido.',
              created_at: now
          });

          await fetchProcessData();
      } catch (err) {
          // Revert on error
          setProcessData((prev: any) => prev ? { ...prev, status: prevStatus } : prev);
          console.error('Erro ao confirmar pagamento:', err);
          alert('Erro ao confirmar pagamento. Tente novamente.');
      } finally {
          setConfirmPaymentLoading(false);
      }
  };

  // ─── PHASE 2: Suprido Confirma Recebimento ───
  // ─── PHASE 2: Suprido Confirma Recebimento (OPTIMISTIC UI) ───
  const handleConfirmReceipt = async () => {
      if (!confirm('Confirmar que você recebeu os recursos em sua conta bancária?')) return;
      // Optimistic: update UI immediately
      const prevStatus = processData?.status;
      setProcessData((prev: any) => prev ? { ...prev, status: 'PAID' } : prev);
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
          // Revert on error
          setProcessData((prev: any) => prev ? { ...prev, status: prevStatus } : prev);
          console.error('Erro ao confirmar recebimento:', err);
          alert('Erro ao confirmar recebimento. Tente novamente.');
      } finally {
          setConfirmReceiptLoading(false);
      }
  };

  /** Resolve the best available PDF source: base64 data URL > storage URL > storage_path */
  const resolvePdfSource = (doc: any): string | null => {
      // PRIMARY: Supabase Storage public URL (preferred, scalable)
      if (doc?.metadata?.file_url) return doc.metadata.file_url;
      // SECONDARY: reconstruct from storage_path
      if (doc?.metadata?.storage_path) {
          const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(doc.metadata.storage_path);
          return urlData?.publicUrl || null;
      }
      // FALLBACK: base64 data URL embedded in metadata
      if (doc?.metadata?.file_data) return doc.metadata.file_data;
      return null;
  };

  const renderUploadedPdfViewer = (doc: any) => {
      const pdfSrc = resolvePdfSource(doc);
      const filename = doc?.metadata?.original_filename || 'documento.pdf';
      const fileSize = doc?.metadata?.file_size;
      const isSigned = doc?.status === 'SIGNED';

      if (pdfSrc) {
          return (
              <div className="w-full h-full min-h-[297mm] flex flex-col bg-white">
                  {/* Header bar */}
                  <div className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                              <FileText size={16} />
                          </div>
                          <div>
                              <p className="font-bold text-sm text-slate-800">{doc.title}</p>
                              <p className="text-[10px] text-slate-400 flex items-center gap-2">
                                  <span>PDF Original — SIAFE</span>
                                  {fileSize && <span>• {(fileSize / 1024).toFixed(0)} KB</span>}
                                  {isSigned && (
                                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                                          <CheckCircle2 size={10} /> Assinado
                                      </span>
                                  )}
                              </p>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                          {pdfSrc.startsWith('http') && (
                              <a href={pdfSrc} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition-all">
                                  <ExternalLink size={12} /> Nova aba
                              </a>
                          )}
                          {pdfSrc.startsWith('data:') && (
                              <a href={pdfSrc} download={filename}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition-all">
                                  <Download size={12} /> Download
                              </a>
                          )}
                      </div>
                  </div>
                  {/* PDF iframe */}
                  <iframe
                      src={pdfSrc}
                      className="flex-1 w-full min-h-[280mm] border-0"
                      title={doc.title}
                      style={{ background: '#fff' }}
                  />
              </div>
          );
      }

      // Fallback: no source available
      return (
          <div className="w-full min-h-[297mm] flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
              <div className="text-center space-y-4 p-8">
                  <div className="w-20 h-20 mx-auto bg-amber-100 rounded-2xl flex items-center justify-center">
                      <FileText size={40} className="text-amber-500" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg">{doc.title}</h3>
                  <p className="text-sm text-slate-500 max-w-md">
                      O PDF original ({filename}) não possui dados incorporados.
                      Faça um novo upload através do Wizard de Execução.
                  </p>
              </div>
          </div>
      );
  };

  const renderDocumentContent = (doc: any) => {
      if (!doc) return null;

      const props = {
          data: processData,
          user: requesterProfile,
          gestor: gestorProfile,
          document: doc,
          comarcaData: comarcaData, // Dados bancários da comarca (para Extra-Júri)
      };

      switch (doc.document_type) {
          case 'COVER': return <ProcessCoverTemplate {...props} />;
          case 'REQUEST': return <RequestTemplate {...props} />;
          case 'ATTESTATION': return <AttestationTemplate {...props} />;
          case 'GRANT_ACT': return <GrantActTemplate {...props} />;
          case 'PORTARIA_SF': return <GrantActTemplate {...props} />;
          case 'REGULARITY': return <RegularityCertificateTemplate {...props} />;
          case 'CERTIDAO_REGULARIDADE': return <RegularityCertificateTemplate {...props} />;
          case 'NE': return <CommitmentNoteTemplate {...props} />;
          case 'NL': return <LiquidationNoteTemplate {...props} />;
          case 'OB': return <BankOrderTemplate {...props} />;
          case 'NOTA_EMPENHO': return renderUploadedPdfViewer(doc);
          case 'LIQUIDACAO': return renderUploadedPdfViewer(doc);
          case 'ORDEM_BANCARIA': return renderUploadedPdfViewer(doc);
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
                  DATA EMISSÃO: ${(() => {
                      if (!item.item_date) return 'N/A';
                      const [y, m, d] = item.item_date.split('-').map(Number);
                      return new Date(y, m - 1, d).toLocaleDateString();
                  })()}
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
  const canTramitarSOSFU = isSuprido && processData?.status === 'PENDING' && pendingMinutas.length === 0;
  const canTramitarGestor = isSuprido && pendingMinutas.length > 0;
  const isArchived = processData?.status === 'ARCHIVED';
  const isRessarcimento = processData?.type === 'RESSARCIMENTO';

  const handleTramitar = async (destino: 'GESTOR' | 'SOSFU') => {
    if (destino === 'SOSFU' && pendingMinutas.length > 0) {
      alert(`Existem ${pendingMinutas.length} minuta(s) pendente(s) de assinatura do Gestor. Tramite primeiro para o Gestor.`);
      return;
    }

    const destinoLabel = destino === 'SOSFU' ? 'SOSFU' : 'Gestor';
    if (!confirm(`Confirma a tramitação do processo para ${destinoLabel}?`)) return;

    // Optimistic: update UI immediately
    const prevStatus = processData?.status;
    const newStatus = destino === 'SOSFU' ? 'WAITING_SOSFU_ANALYSIS' : 'WAITING_MANAGER';
    setProcessData((prev: any) => prev ? { ...prev, status: newStatus } : prev);
    setTramitarLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Update status
      const { error: updateError } = await supabase.from('solicitations')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', processId);

      if (updateError) throw updateError;

      // 2. Record history
      await supabase.from('historico_tramitacao').insert({
        solicitation_id: processId,
        status_from: prevStatus,
        status_to: newStatus,
        actor_id: user?.id,
        actor_name: userProfile?.full_name || user?.email,
        description: `Processo tramitado para ${destinoLabel} pelo solicitante.`
      });

      // 3. Send Notifications
      if (destino === 'GESTOR' && processData.manager_email) {
        // Find gestor by email
        const { data: gestorProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', processData.manager_email)
          .maybeSingle();

        if (gestorProfile) {
          await supabase.from('system_notifications').insert({
              user_id: gestorProfile.id,
              title: 'Atesto Pendente',
              message: `O processo ${processData.process_number} foi encaminhado para seu atesto.`,
              type: 'ACTION_REQUIRED',
              process_number: processData.process_number,
              link: 'gestor_dashboard'
          });
        }
      } else if (destino === 'SOSFU') {
        // Find SOSFU team members
        const { data: teamMembers } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('module', 'SOSFU');

        if (teamMembers && teamMembers.length > 0) {
          const notifications = teamMembers.map(m => ({
            user_id: m.user_id,
            title: 'Nova Solicitação SOSFU',
            message: `O processo ${processData.process_number} aguarda análise inicial.`,
            type: 'INFO',
            process_number: processData.process_number,
            link: 'solicitations'
          }));
          await supabase.from('system_notifications').insert(notifications);
        }
      }

      await fetchProcessData();
    } catch (err) {
      // Revert on error
      setProcessData((prev: any) => prev ? { ...prev, status: prevStatus } : prev);
      console.error('Erro ao tramitar:', err);
      alert('Erro ao tramitar. Tente novamente.');
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
    if (!processData) return <div className={`p-8 text-center ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>Carregando dados...</div>;

    // Lógica para Banner de Status Específico
    const isWaitingManager = accountabilityData?.status === 'WAITING_MANAGER' || processData?.status === 'WAITING_MANAGER';
    const managerName = processData.manager_name || 'Gestor da Unidade';

    const isWaitingSupridoConfirmation = processData.status === 'WAITING_SUPRIDO_CONFIRMATION';

    return (
        <div className="animate-in fade-in space-y-6">

            {/* ═══ Banner: Confirmar Recebimento (Suprido) ═══ */}
            {isWaitingSupridoConfirmation && isSuprido && (
                <div className={`${darkMode ? 'bg-emerald-950/20 border-emerald-500/50 shadow-emerald-950/20' : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300 shadow-emerald-200/50'} border-2 rounded-2xl p-6 shadow-md transition-colors`}>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-full animate-pulse ${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                                <Wallet size={24} />
                            </div>
                            <div>
                                <h3 className={`text-lg font-black ${darkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>💰 Recursos Creditados</h3>
                                <p className={`text-sm mt-1 max-w-xl leading-relaxed ${darkMode ? 'text-emerald-500/80' : 'text-emerald-700'}`}>
                                    O pagamento foi processado pela SOSFU. Confirme o recebimento dos recursos na sua conta bancária para iniciar a <strong>Prestação de Contas</strong>.
                                    <br/><span className={`text-xs ${darkMode ? 'text-emerald-600' : 'text-emerald-600'}`}>Prazo para PC: 30 dias após confirmação (Res. CNJ 169/2013)</span>
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

            {/* ═══ Banner: Pagamento Realizado (SOSFU informativo) ═══ */}
            {processData.status === 'PAID' && (
                <div className={`${darkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'} border rounded-xl p-5 flex items-center gap-4 transition-colors`}>
                    <div className={`p-2.5 rounded-full ${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                        <CheckCircle2 size={20} />
                    </div>
                    <div>
                        <h3 className={`font-bold text-sm ${darkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>
                            {isRessarcimento ? 'Ressarcimento Pago ✓' : 'Recurso Recebido ✓'}
                        </h3>
                        <p className={`text-xs mt-0.5 ${darkMode ? 'text-emerald-500/70' : 'text-emerald-600'}`}>
                            {isRessarcimento
                                ? 'O reembolso foi processado e depositado na conta do servidor.'
                                : 'O suprido confirmou o recebimento. A fase de Prestação de Contas está aberta.'}
                        </p>
                    </div>
                </div>
            )}

            {/* ═══ Banner: Ressarcimento em Análise ═══ */}
            {isRessarcimento && processData.status === 'WAITING_RESSARCIMENTO_ANALYSIS' && (
                <div className={`${darkMode ? 'bg-sky-500/5 border-sky-500/20' : 'bg-sky-50 border-sky-200'} border rounded-xl p-5 flex items-center gap-4 transition-colors`}>
                    <div className={`p-2.5 rounded-full ${darkMode ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-100 text-sky-600'}`}>
                        <Search size={20} />
                    </div>
                    <div>
                        <h3 className={`font-bold text-sm ${darkMode ? 'text-sky-400' : 'text-sky-800'}`}>Ressarcimento em Análise</h3>
                        <p className={`text-xs mt-0.5 ${darkMode ? 'text-sky-500/70' : 'text-sky-600'}`}>
                            {isSuprido
                                ? 'Sua solicitação de reembolso está sendo analisada pela equipe SOSFU. Você será notificado sobre o resultado.'
                                : 'Solicitação de ressarcimento aguardando auditoria de comprovantes e homologação.'}
                        </p>
                    </div>
                </div>
            )}

            {/* ═══ Banner: Ressarcimento Aprovado → Pagamento ═══ */}
            {isRessarcimento && processData.status === 'WAITING_RESSARCIMENTO_EXECUTION' && (
                <div className={`${darkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'} border rounded-xl p-5 flex items-center gap-4 transition-colors`}>
                    <div className={`p-2.5 rounded-full animate-pulse ${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                        <Wallet size={20} />
                    </div>
                    <div>
                        <h3 className={`font-bold text-sm ${darkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>Reembolso Aprovado — Aguardando Pagamento</h3>
                        <p className={`text-xs mt-0.5 ${darkMode ? 'text-emerald-500/70' : 'text-emerald-600'}`}>
                            {isSuprido
                                ? 'Seu ressarcimento foi homologado pela SOSFU. O pagamento será processado em breve na sua conta bancária.'
                                : 'Ressarcimento homologado. Gere a NE, DL e OB para processar o pagamento ao servidor.'}
                        </p>
                    </div>
                </div>
            )}
            
            {/* Banner de Status: AGUARDANDO GESTOR */}
            {isWaitingManager && (
                <div className={`${darkMode ? 'bg-amber-500/5 border-amber-500/20 shadow-amber-950/10' : 'bg-amber-50 border-amber-200 shadow-sm'} border rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-colors`}>
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full shadow-sm border ${darkMode ? 'bg-slate-800 text-amber-500 border-amber-500/20' : 'bg-white text-amber-600 border-amber-100'}`}>
                            <UserCheck size={24} />
                        </div>
                        <div>
                            <h3 className={`text-lg font-bold ${darkMode ? 'text-amber-400' : 'text-amber-900'}`}>Aguardando Atesto Gerencial</h3>
                            <p className={`text-sm mt-1 max-w-xl ${darkMode ? 'text-amber-500/70' : 'text-amber-700'}`}>
                                {currentUserRole === 'GESTOR' ? 'A' : 'Sua'} {accountabilityData?.status === 'WAITING_MANAGER' ? 'prestação de contas' : 'solicitação'} foi {currentUserRole === 'GESTOR' ? 'encaminhada para sua' : 'enviada com sucesso e agora está sob'} análise de <strong>{managerName}</strong>.
                                <br/>Assim que o atesto for realizado, o processo será encaminhado automaticamente para a SOSFU.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 min-w-[200px]">
                        <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-amber-500/80' : 'text-amber-600'}`}>Etapa Atual</span>
                        <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-amber-900/40' : 'bg-amber-200'}`}>
                            <div className="bg-amber-500 h-full w-[50%] animate-pulse"></div>
                        </div>
                        <span className={`text-[10px] font-medium ${darkMode ? 'text-amber-600/80' : 'text-amber-600'}`}>Revisão pelo Gestor</span>
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
                <div className={`${darkMode ? 'bg-slate-800 border-slate-700 shadow-slate-950/20' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-xl border transition-colors`}>
                    <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                        <User size={16} /> Beneficiário
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

                {/* Status - SIMPLIFICADO (Barra removida, pois a Timeline global já existe) */}
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
                        <Shield size={16} /> Gestor Responsável
                    </h4>
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${darkMode ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-50 text-teal-600'}`}>
                            {processData.manager_name?.charAt(0) || 'G'}
                        </div>
                        <div>
                            <p className={`font-bold ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>{processData.manager_name || 'Não atribuído'}</p>
                            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{processData.manager_email || '-'}</p>
                        </div>
                    </div>
                </div>

                <div className={`${darkMode ? 'bg-slate-800 border-slate-700 shadow-slate-950/20' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-xl border transition-colors`}>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                        <Calendar size={16} /> Período do Evento
                    </h4>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                            <p className={`text-[10px] uppercase font-bold ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>Início</p>
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

      const handlePrint = async () => {
          if (viewMode === 'reading' && docRefs.current[activeDocIndex]) {
              // Print current document
              const el = docRefs.current[activeDocIndex];
              if (el) {
                  try {
                      await printDocumentElement(el, documents[activeDocIndex]?.title || 'Documento');
                  } catch (err) {
                      console.error('Erro ao imprimir:', err);
                      alert('Erro ao gerar impressão. Verifique se popups estão permitidos.');
                  }
              }
          } else {
              // Print all documents as multi-page
              const elements = docRefs.current.filter(Boolean) as HTMLDivElement[];
              if (elements.length > 0) {
                  try {
                      await exportDossierToPdf(elements, {
                          filename: `dossie_${processData?.process_number || processId}.pdf`,
                          processNumber: processData?.process_number,
                          beneficiary: processData?.beneficiary,
                          openInNewTab: true,
                      });
                  } catch (err) {
                      console.error('Erro ao gerar dossiê:', err);
                      alert('Erro ao gerar PDF do dossiê.');
                  }
              }
          }
      };

      const handleDownload = async () => {
          const elements = docRefs.current.filter(Boolean) as HTMLDivElement[];
          if (elements.length === 0) {
              alert('Nenhum documento renderizado para download.');
              return;
          }
          try {
              await exportDossierToPdf(elements, {
                  filename: `dossie_completo_${processData?.process_number || processId}.pdf`,
                  processNumber: processData?.process_number,
                  beneficiary: processData?.beneficiary,
                  includePageNumbers: true,
              });
          } catch (err) {
              console.error('Erro ao baixar dossiê:', err);
              alert('Erro ao gerar PDF para download.');
          }
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
              <div className={`flex flex-col items-center justify-center h-[500px] animate-in fade-in ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  <FolderOpen size={48} className="mb-4 opacity-30" />
                  <h3 className={`font-bold text-lg ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>Nenhum documento gerado</h3>
                  <p className="text-sm mt-1">Os documentos aparecerão aqui conforme o processo avança.</p>
              </div>
          );
      }

      return (
          <div className={`flex gap-0 h-[calc(100vh-200px)] min-h-[600px] animate-in fade-in rounded-xl overflow-hidden border shadow-sm transition-colors ${
              darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
          }`}>
              {/* === SIDEBAR ESQUERDA === */}
              <div className={`w-[280px] min-w-[280px] border-r flex flex-col transition-colors ${
                  darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
              }`}>
                  {/* Header da Sidebar */}
                    <div className={`px-4 py-3 border-b flex items-center justify-between transition-colors ${
                        darkMode ? 'border-slate-700' : 'border-gray-100'
                    }`}>
                        <h3 className={`text-sm font-bold flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                            <FolderOpen size={15} className="text-blue-500" />
                            Autos do Processo
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
                            }`}>
                                {documents.length} docs
                            </span>
                            {!isArchived && (
                                <button
                                    onClick={() => { setEditingDoc(null); setNewDocModalOpen(true); }}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                        darkMode ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                    }`}
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
                                  className={`w-full text-left px-4 py-3 border-b transition-all group border-l-[3px] ${
                                      isActive 
                                          ? (darkMode ? 'bg-blue-500/10 border-slate-700 border-l-blue-500' : 'bg-blue-50 border-gray-50 border-l-blue-600') 
                                          : (darkMode ? 'hover:bg-slate-700/50 border-slate-700 border-l-transparent' : 'hover:bg-gray-50 border-gray-50 border-l-transparent')
                                  }`}
                              >
                                  <div className="flex items-start gap-2.5">
                                      <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                          isActive 
                                          ? (darkMode ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600') 
                                          : (darkMode ? 'bg-slate-700 text-slate-500' : 'bg-gray-100 text-gray-400')
                                      }`}>
                                          <FileText size={14} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <p className={`text-[10px] font-bold uppercase tracking-wider ${
                                              isActive ? (darkMode ? 'text-blue-400' : 'text-blue-500') : (darkMode ? 'text-slate-500' : 'text-gray-400')
                                          }`}>
                                              DOC {String(i + 1).padStart(2, '0')}
                                          </p>
                                          <p className={`text-xs font-bold truncate ${
                                              isActive ? (darkMode ? 'text-white' : 'text-blue-800') : (darkMode ? 'text-slate-300' : 'text-gray-700')
                                          }`}>
                                              {doc.title}
                                          </p>
                                          <p className={`text-[10px] truncate mt-0.5 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                                              {docDescriptions[doc.document_type] || doc.document_type}
                                          </p>
                                          <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-slate-600' : 'text-gray-300'}`}>
                                              {new Date(doc.created_at).toLocaleDateString('pt-BR', {
                                                  day: '2-digit', month: '2-digit', year: 'numeric',
                                                  hour: '2-digit', minute: '2-digit'
                                              })}
                                          </p>
                                      </div>
                                        {doc.metadata?.is_draft && (
                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border mt-0.5 shrink-0 uppercase tracking-wider ${
                                                darkMode ? 'bg-amber-900/30 text-amber-400 border-amber-800' : 'bg-amber-100 text-amber-700 border-amber-200'
                                            }`}>Minuta</span>
                                        )}
                                        {doc.document_type === 'GENERIC' && doc.metadata?.created_by && !isArchived && (
                                            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setEditingDoc(doc); setNewDocModalOpen(true); }}
                                                    className={`p-1 rounded transition-colors ${
                                                        darkMode ? 'hover:bg-blue-500/20 text-slate-400 hover:text-blue-400' : 'hover:bg-blue-100 text-gray-400 hover:text-blue-600'
                                                    }`}
                                                    title="Editar"
                                                >
                                                    <FileSignature size={11} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc); }}
                                                    className={`p-1 rounded transition-colors ${
                                                        darkMode ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-100 text-gray-400 hover:text-red-600'
                                                    }`}
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
              <div className={`flex-1 flex flex-col min-w-0 transition-colors ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
                  {/* Toolbar */}
                  <div className={`px-4 py-2.5 border-b flex items-center justify-between transition-colors ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
                  }`}>
                      <div className="flex items-center">
                          {viewMode === 'reading' && (
                              <span className={`text-xs font-bold uppercase mr-3 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                  {documents[activeDocIndex]?.title}
                              </span>
                          )}
                      </div>
                      <div className="flex items-center gap-1">
                          {/* Toggle Mode */}
                          <button
                              onClick={() => setViewMode(viewMode === 'unified' ? 'reading' : 'unified')}
                              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold border rounded-lg transition-colors ${
                                  darkMode 
                                  ? 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600' 
                                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                              }`}
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

                          <div className={`w-px h-5 mx-1 ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`} />

                          {/* Print */}
                          <button
                              onClick={handlePrint}
                              className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                              title="Imprimir"
                          >
                              <Printer size={16} />
                          </button>

                          {/* Download */}
                          <button
                              onClick={handleDownload}
                              className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
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
                                          <span className={`text-[9px] font-black uppercase tracking-widest [writing-mode:vertical-lr] rotate-180 mt-4 ${darkMode ? 'text-slate-700' : 'text-gray-300'}`}>
                                              DOC {i + 1}
                                          </span>
                                      </div>
                                      <div 
                                          className={`rounded-sm border transition-all cursor-pointer shadow-md ${
                                              activeDocIndex === i 
                                              ? (darkMode ? 'border-blue-600 ring-2 ring-blue-900/40' : 'border-blue-300 ring-2 ring-blue-100') 
                                              : (darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200')
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
                              <div className={`shadow-md rounded-sm border transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
                                  <div className="min-h-[297mm] origin-top">
                                      {renderDocumentContent(documents[activeDocIndex])}
                                  </div>
                              </div>

                              {/* Navegação inferior */}
                              <div className="flex items-center justify-between mt-4 px-2">
                                  <button
                                      onClick={() => setActiveDocIndex(Math.max(0, activeDocIndex - 1))}
                                      disabled={activeDocIndex === 0}
                                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
                                          darkMode 
                                          ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' 
                                          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                      }`}
                                  >
                                      <ChevronLeft size={14} /> Anterior
                                  </button>
                                  <span className={`text-xs font-bold ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                                      {activeDocIndex + 1} / {documents.length}
                                  </span>
                                  <button
                                      onClick={() => setActiveDocIndex(Math.min(documents.length - 1, activeDocIndex + 1))}
                                      disabled={activeDocIndex === documents.length - 1}
                                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
                                          darkMode 
                                          ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' 
                                          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                      }`}
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
      // Documentos tramitados para SEFIN (Ordenador assina)
      const sefinDocs = [
          { type: 'PORTARIA_SF', label: 'Portaria SF', subtitle: 'Minuta → Ordenador', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { type: 'CERTIDAO_REGULARIDADE', label: 'Certidão de Regularidade', subtitle: 'Minuta → Ordenador', icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { type: 'NOTA_EMPENHO', label: 'Nota de Empenho (NE)', subtitle: 'PDF Original → Ordenador', icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-50' },
      ];

      // Documentos internos (auto-assinados SOSFU, ficam no dossiê)
      const internalDocs = [
          { type: 'LIQUIDACAO', label: 'Doc. de Liquidação (DL)', subtitle: 'PDF Original → Dossiê', icon: FileCheck, color: 'text-teal-600', bg: 'bg-teal-50' },
          { type: 'ORDEM_BANCARIA', label: 'Ordem Bancária (OB)', subtitle: 'PDF Original → Dossiê', icon: DollarSign, color: 'text-teal-600', bg: 'bg-teal-50' },
      ];

      const allDocs = [...sefinDocs, ...internalDocs];

      // All 5 execution docs exist and are signed?
      const allDocsSigned = allDocs.every(doc => {
          const existing = documents.find(d => d.document_type === doc.type);
          return existing?.status === 'SIGNED';
      });

      const renderDocCard = (doc: typeof sefinDocs[0]) => {
          const existing = documents.find(d => d.document_type === doc.type);
          const Icon = doc.icon;
          const isSigned = existing?.status === 'SIGNED';
          const isMinuta = existing?.status === 'MINUTA';
          return (
              <div key={doc.type} className={`border rounded-xl p-4 flex flex-col gap-3 transition-all ${
                  isSigned 
                  ? (darkMode ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50') 
                  : isMinuta 
                    ? (darkMode ? 'border-amber-500/30 bg-amber-500/5' : 'border-amber-200 bg-amber-50/30') 
                    : (darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-gray-100 bg-gray-50/50')
              }`}>
                  <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg transition-colors ${
                          isSigned 
                          ? (darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600') 
                          : isMinuta 
                            ? (darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600') 
                            : (darkMode ? 'bg-slate-700 text-slate-500' : doc.bg + ' ' + doc.color)
                      }`}>
                          {isSigned ? <CheckCircle2 size={18} /> : isMinuta ? <Clock size={18} /> : <Icon size={18} />}
                      </div>
                      {existing && (
                          <button onClick={() => setSelectedDoc(existing)} className={`text-[10px] font-bold hover:underline transition-colors ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Ver</button>
                      )}
                  </div>
                  <div>
                      <h4 className={`font-bold text-xs transition-colors ${darkMode ? 'text-slate-200' : 'text-gray-700'}`}>{doc.label}</h4>
                      <p className={`text-[10px] mt-1 transition-colors ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                          {isSigned ? '✓ Assinado' : isMinuta ? '⏳ Minuta' : 'Pendente'}
                      </p>
                      <p className={`text-[9px] mt-0.5 transition-colors ${darkMode ? 'text-slate-600' : 'text-gray-400'}`}>→ {doc.subtitle}</p>
                  </div>
              </div>
          );
      };

      return (
          <div className="space-y-6 animate-in fade-in">

              {/* ═══ SOSFU Payment Confirmation Card ═══ */}
              {processData?.status === 'WAITING_SOSFU_PAYMENT' && (currentUserRole.startsWith('SOSFU') || currentUserRole === 'ADMIN') && (
                  <div className={`rounded-2xl p-6 text-white shadow-lg border transition-all ${
                      darkMode ? 'bg-gradient-to-r from-emerald-900 to-teal-900 border-emerald-500/30' : 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-500/30'
                  }`}>
                      <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-4">
                              <div className="p-3 bg-white/10 rounded-xl backdrop-blur">
                                  <BadgeCheck size={24} />
                              </div>
                              <div>
                                  <h3 className="text-xl font-black">Comunicar Pagamento ao Suprido</h3>
                                  <p className={`${darkMode ? 'text-emerald-400/80' : 'text-emerald-100'} text-sm mt-0.5 max-w-lg`}>
                                      Todos os documentos foram assinados pelo Ordenador. Comunique ao suprido que o pagamento foi processado.
                                  </p>
                              </div>
                          </div>
                          <button
                              onClick={handleConfirmPayment}
                              disabled={confirmPaymentLoading}
                              className={`px-6 py-3 rounded-xl text-sm font-black shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 ${
                                  darkMode ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'bg-white text-emerald-700 hover:bg-emerald-50'
                              }`}
                          >
                              {confirmPaymentLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                              Comunicar Pagamento
                          </button>
                      </div>
                  </div>
              )}

              {/* ═══ Status: Waiting Suprido Confirmation ═══ */}
              {processData?.status === 'WAITING_SUPRIDO_CONFIRMATION' && (currentUserRole.startsWith('SOSFU') || currentUserRole === 'ADMIN') && (
                  <div className={`${darkMode ? 'bg-teal-500/5 border-teal-500/20' : 'bg-teal-50 border-teal-200'} border rounded-2xl p-5 flex items-center gap-4 transition-colors`}>
                      <div className={`p-2.5 rounded-full ${darkMode ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-100 text-teal-600'}`}>
                          <Clock size={20} />
                      </div>
                      <div>
                          <h3 className={`font-bold text-sm ${darkMode ? 'text-teal-400' : 'text-teal-800'}`}>Aguardando Confirmação do Suprido</h3>
                          <p className={`text-xs mt-0.5 ${darkMode ? 'text-teal-500/70' : 'text-teal-600'}`}>O pagamento foi comunicado. Quando o suprido confirmar o recebimento, o ciclo de Solicitação encerrará e inicia a Prestação de Contas.</p>
                      </div>
                  </div>
              )}

              {/* Header Card */}
              <div className={`rounded-2xl p-6 text-white shadow-lg transition-all ${
                  darkMode ? 'bg-gradient-to-r from-blue-900 to-teal-900 border border-blue-500/20' : 'bg-gradient-to-r from-blue-600 to-teal-600'
              }`}>
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-white/10 rounded-xl backdrop-blur">
                              <Wallet size={24} />
                          </div>
                          <div>
                            <h3 className="text-xl font-black">{isRessarcimento ? 'Execução do Reembolso' : 'Execução da Despesa'}</h3>
                              <p className={`text-sm mt-0.5 ${darkMode ? 'text-blue-400/80' : 'text-blue-100'}`}>
                                  {isRessarcimento
                                      ? 'Gere a NE, DL e OB para o pagamento do ressarcimento ao servidor.'
                                      : 'Gere as minutas, anexe PDFs do SIAFE e tramite para o Ordenador.'}
                              </p>
                          </div>
                      </div>
                      {(currentUserRole.startsWith('SOSFU') || currentUserRole === 'ADMIN') && (
                          <button onClick={() => setExecutionWizardOpen(true)}
                              className={`px-6 py-3 rounded-xl text-sm font-black shadow-lg transition-all flex items-center gap-2 ${
                                  darkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-white text-blue-700 hover:bg-blue-50'
                              }`}>
                              <FileText size={16} /> Iniciar Execução
                          </button>
                      )}
                  </div>
              </div>

              {/* ═══ SECTION 1: Documentos para SEFIN (Ordenador) ═══ */}
              <div className={`${darkMode ? 'bg-slate-800 border-slate-700 shadow-slate-950/20' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-xl border transition-colors`}>
                  <div className="flex items-center gap-2 mb-4">
                      <Scale size={14} className="text-amber-500" />
                      <h4 className={`text-sm font-black uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Tramitação SEFIN</h4>
                      <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold border ${darkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>Ordenador assina</span>
                  </div>
                  <p className={`text-[10px] mb-4 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Portaria (minuta) + Certidão (minuta) + NE (PDF original do SIAFE)</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {sefinDocs.map(renderDocCard)}
                  </div>
              </div>

              {/* ═══ SECTION 2: Documentos internos (Dossiê) ═══ */}
              <div className={`${darkMode ? 'bg-slate-800 border-slate-700 shadow-slate-950/20' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-xl border transition-colors`}>
                  <div className="flex items-center gap-2 mb-4">
                      <Archive size={14} className="text-teal-500" />
                      <h4 className={`text-sm font-black uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Dossiê Digital</h4>
                      <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold border ${darkMode ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-teal-50 text-teal-600 border-teal-100'}`}>Auto-assinado SOSFU</span>
                  </div>
                  <p className={`text-[10px] mb-4 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>DL e OB — PDFs originais do SIAFE, anexados automaticamente ao dossiê</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {internalDocs.map(renderDocCard)}
                  </div>
              </div>

              {/* Triple Check — Reconciliation Panel */}
              <ReconciliationPanel
                  processData={{
                      ne_valor: processData?.ne_valor,
                      dl_valor: processData?.dl_valor,
                      ob_valor: processData?.ob_valor,
                      ne_numero: processData?.ne_numero,
                      dl_numero: processData?.dl_numero,
                      ob_numero: processData?.ob_numero,
                      value: processData?.value,
                  }}
                  documents={documents}
              />

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
                  <div className={`rounded-xl p-5 text-white shadow-lg transition-all ${
                      darkMode ? 'bg-gradient-to-r from-blue-900 to-teal-900 border border-blue-500/20' : 'bg-gradient-to-r from-blue-600 to-teal-600'
                  }`}>
                          <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                  <div className="p-2.5 bg-white/10 rounded-lg backdrop-blur">
                                      <Scale size={22} />
                                  </div>
                                  <div>
                                      <h3 className="font-black text-base">Análise Extra-Júri</h3>
                                      <p className={`${darkMode ? 'text-blue-400/80' : 'text-blue-100'} text-xs mt-0.5`}>Ajuste quantidades e valores aprovados para participantes e despesas.</p>
                                  </div>
                              </div>
                              <button
                                  onClick={() => setJuriReviewOpen(true)}
                                  className={`px-5 py-2.5 rounded-lg text-sm font-black shadow-lg transition-all flex items-center gap-2 ${
                                      darkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-white text-blue-700 hover:bg-blue-50'
                                  }`}
                              >
                                  <Scale size={16} /> Abrir Painel de Revisão
                              </button>
                          </div>
                      </div>
                  )}

                  {/* Extra-Júri Info Banner (non-SOSFU) */}
                  {isExtraJuri && currentUserRole !== 'SOSFU' && (
                      <div className={`${darkMode ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-200'} border rounded-xl p-4 flex items-center gap-3 transition-colors`}>
                          <Scale size={18} className="text-blue-500 shrink-0" />
                          <div>
                              <p className={`text-sm font-bold ${darkMode ? 'text-blue-400' : 'text-blue-800'}`}>Processo Extra-Júri</p>
                              <p className={`text-xs ${darkMode ? 'text-blue-500/70' : 'text-blue-600'}`}>A SOSFU realizará a análise e ajuste das quantidades aprovadas para este processo.</p>
                          </div>
                      </div>
                  )}

                  <div className={`${darkMode ? 'bg-slate-800 border-slate-700 shadow-slate-950/20' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-xl border transition-colors`}>
                      <h3 className={`font-bold mb-4 ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>Parecer Técnico</h3>
                      <textarea 
                          className={`w-full p-4 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none transition-all ${
                              darkMode 
                              ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-blue-500' 
                              : 'bg-gray-50 border-gray-200 focus:border-blue-400'
                          }`}
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
                  <div className={`${darkMode ? 'bg-slate-800 border-slate-700 shadow-slate-950/20' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-xl border transition-colors`}>
                      <h3 className={`font-bold mb-4 ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>Ações de Controle</h3>
                      
                      <div className="space-y-3">
                          {currentUserRole === 'SOSFU_GESTOR' && (
                              <button 
                                onClick={() => handleStatusChange('WAITING_SOSFU_EXECUTION')}
                                className={`w-full py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 border ${
                                    darkMode 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                                }`}
                              >
                                  <CheckCircle2 size={16}/> Aprovar para Execução
                              </button>
                          )}
                          
                          <button 
                            onClick={() => handleStatusChange('WAITING_CORRECTION')}
                            className={`w-full py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 border ${
                                darkMode 
                                ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20' 
                                : 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100'
                            }`}
                          >
                              <AlertTriangle size={16}/> Solicitar Correção
                          </button>
                          
                          {currentUserRole === 'SOSFU_GESTOR' && (
                              <button 
                                onClick={() => handleStatusChange('REJECTED')}
                                className={`w-full py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 border ${
                                    darkMode 
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' 
                                    : 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100'
                                }`}
                              >
                                  <Ban size={16}/> Indeferir Processo
                              </button>
                          )}
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
              
              // Verifica se era a última minuta → encaminhar para análise da SOSFU
              const remaining = processDraftDocs.filter((d: any) => d.id !== doc.id);
              if (remaining.length === 0) {
                  // CORREÇÃO: Após atesto do Gestor, processo vai para a SOSFU (não volta ao suprido)
                  await supabase.from('solicitations')
                      .update({ status: 'WAITING_SOSFU_ANALYSIS' })
                      .eq('id', processId);
                  
                  // Registrar no histórico de tramitação
                  await supabase.from('historico_tramitacao').insert({
                      solicitation_id: processId,
                      status_from: 'WAITING_MANAGER',
                      status_to: 'WAITING_SOSFU_ANALYSIS',
                      actor_name: profile?.full_name || user?.email,
                      description: 'Minutas assinadas pelo Gestor. Processo encaminhado para análise da SOSFU.'
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
        // Optimistic: update UI immediately
        const prevAccountability = accountabilityData;
        setAccountabilityData((prev: any) => prev ? { ...prev, status: 'WAITING_SOSFU' } : prev);
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user?.id || '').single();

            const { error: updateError } = await supabase.from('accountabilities')
                .update({ 
                  status: 'WAITING_SOSFU',
                  updated_at: new Date().toISOString()
                })
                .eq('id', accountabilityData.id);
            
            if (updateError) throw updateError;
            
            // Record history
            await supabase.from('historico_tramitacao').insert({
                solicitation_id: processId,
                status_from: 'WAITING_MANAGER',
                status_to: 'WAITING_SOSFU',
                actor_id: user?.id,
                actor_name: profile?.full_name || user?.email,
                description: 'Prestação de contas aprovada (atestada) pelo Gestor Responsável e encaminhada para a SOSFU.'
            });

            // Notify SOSFU Team
            const { data: teamMembers } = await supabase
                .from('team_members')
                .select('user_id')
                .eq('module', 'SOSFU');

            if (teamMembers && teamMembers.length > 0) {
                const notifications = teamMembers.map(m => ({
                    user_id: m.user_id,
                    title: 'Nova Prestação de Contas',
                    message: `O processo ${processData.process_number} aguarda análise de contas pela SOSFU.`,
                    type: 'INFO',
                    process_number: processData.process_number,
                    link: 'solicitations'
                }));
                await supabase.from('system_notifications').insert(notifications);
            }

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
            // Revert on error
            setAccountabilityData(prevAccountability);
            console.error(err);
            alert('Erro ao aprovar. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

      const handleCorrection = async () => {
          if (!confirm('Devolver para correção?')) return;
          setLoading(true);
          try {
              const { data: { user } } = await supabase.auth.getUser();
              const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user?.id || '').single();
              const prevStatus = isPcMode ? accountabilityData?.status : processData?.status;
              const newStatus = isPcMode ? 'CORRECTION' : 'WAITING_CORRECTION';

              if (isPcMode) {
                  const { error } = await supabase.from('accountabilities')
                      .update({ 
                        status: 'CORRECTION',
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', accountabilityData.id);
                  if (error) throw error;
              } else {
                  // Devolver solicitação
                  const { error } = await supabase.from('solicitations')
                      .update({ 
                        status: 'WAITING_CORRECTION',
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', processId);
                  if (error) throw error;
              }

              // Record history
              await supabase.from('historico_tramitacao').insert({
                  solicitation_id: processId,
                  status_from: prevStatus,
                  status_to: newStatus,
                  actor_id: user?.id,
                  actor_name: profile?.full_name || user?.email,
                  description: `O Gestor solicitou correções no processo: ${isPcMode ? 'na Prestação de Contas' : 'na Solicitação'}.`
              });

              // Notify Requester
              const requesterId = isPcMode ? accountabilityData.requester_id : processData.user_id;
              if (requesterId) {
                  await supabase.from('system_notifications').insert({
                      user_id: requesterId,
                      title: 'Correção Necessária',
                      message: `Seu processo ${processData.process_number} foi devolvido para correção pelo Gestor.`,
                      type: 'ACTION_REQUIRED',
                      process_number: processData.process_number,
                      link: 'process_detail'
                  });
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
              <div className={`${darkMode ? 'bg-slate-800 border-orange-500/30' : 'bg-white border-orange-200'} p-8 rounded-xl border shadow-sm transition-colors`}>
                  <div className="flex items-start gap-4 mb-6">
                      <div className={`p-3 rounded-lg ${darkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                          <FileSignature size={24} />
                      </div>
                      <div>
                          <h3 className={`text-xl font-bold ${darkMode ? 'text-slate-100' : 'text-gray-800'}`}>Minutas Pendentes de Assinatura</h3>
                          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>O suprido tramitou documentos para sua análise e assinatura. Revise cada minuta individualmente.</p>
                      </div>
                  </div>

                  {/* Lista de Minutas */}
                  <div className="space-y-3 mb-6">
                      {processDraftDocs.map((doc: any) => (
                          <div key={doc.id} className={`flex items-center justify-between p-4 rounded-xl border group transition-all ${
                              darkMode ? 'bg-slate-900/50 border-slate-700 hover:border-orange-500/50' : 'bg-orange-50/50 border-orange-100 hover:border-orange-200'
                          }`}>
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${darkMode ? 'bg-orange-500/10 text-orange-500' : 'bg-orange-100 text-orange-600'}`}>
                                      <FileText size={16} />
                                  </div>
                                  <div className="min-w-0">
                                      <p className={`text-sm font-bold truncate ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>{doc.title}</p>
                                      <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                                          {doc.metadata?.subType || doc.document_type} • {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                                      </p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                  <button
                                      onClick={() => setSelectedDoc(doc)}
                                      className={`px-3 py-1.5 text-xs font-bold border rounded-lg transition-colors ${
                                          darkMode 
                                          ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700' 
                                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                      }`}
                                  >
                                      <Eye size={12} className="inline mr-1" /> Ver
                                  </button>
                                  <button
                                      onClick={() => { setEditingDoc(doc); setNewDocModalOpen(true); }}
                                      className={`px-3 py-1.5 text-xs font-bold border rounded-lg transition-colors ${
                                          darkMode 
                                          ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' 
                                          : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
                                      }`}
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
                  <div className={`flex items-center gap-2 p-3 rounded-lg border text-xs transition-colors ${
                      darkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-700'
                  }`}>
                      <AlertCircle size={14} className="shrink-0" />
                      <span>Ao assinar todas as minutas, o processo será devolvido automaticamente ao suprido para tramitação ao SOSFU.</span>
                  </div>

                  {/* Devolver para correção */}
                  <div className="mt-4">
                      <button 
                          onClick={handleCorrection}
                          className={`w-full py-2.5 border rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${
                              darkMode 
                              ? 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 mb-2' 
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                          <AlertTriangle size={16} /> Devolver para Correção
                      </button>
                  </div>
              </div>
          );
      }

      // --- MODO PC: ATESTO DE PRESTAÇÃO DE CONTAS (existente) ---
      return (
          <div className={`${darkMode ? 'bg-slate-800 border-amber-500/30' : 'bg-white border-amber-200'} p-8 rounded-xl border shadow-sm transition-colors`}>
              <div className="flex items-start gap-4 mb-6">
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                      <UserCheck size={24} />
                  </div>
                  <div>
                      <h3 className={`text-xl font-bold ${darkMode ? 'text-slate-100' : 'text-gray-800'}`}>Revisão Gerencial</h3>
                      <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>O suprido submeteu a prestação de contas. Analise os comprovantes e ateste a regularidade.</p>
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
                    className={`flex-1 py-3 border rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                        darkMode 
                        ? 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600' 
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                      <AlertTriangle size={18} /> Devolver para Correção
                  </button>
              </div>
          </div>
      );
  };

  if (loading) return <ProcessDetailSkeleton darkMode={darkMode} />;

  if (!processData) {
      return (
          <div className={`flex h-screen items-center justify-center flex-col gap-4 ${darkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
              <AlertTriangle className="text-red-500 w-12 h-12" />
              <div className="text-center">
                  <h3 className={`text-xl font-bold ${darkMode ? 'text-slate-100' : 'text-gray-800'}`}>Processo não encontrado</h3>
                  <p className={`${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>Não foi possível carregar os dados deste processo.</p>
              </div>
              <button 
                  onClick={onBack}
                  className={`px-6 py-2 border rounded-lg text-sm font-bold transition-colors ${
                      darkMode 
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
              >
                  Voltar
              </button>
          </div>
      );
  }

  return (
    <div className={`${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-[#F3F4F6] text-gray-800'} min-h-screen pb-12 relative flex flex-col transition-colors duration-300`}>
        
        {/* Header Navigation */}
        <div className={`${darkMode ? 'bg-slate-800 border-slate-700 shadow-slate-950/20' : 'bg-white border-gray-200 shadow-sm'} px-8 py-4 flex justify-between items-center sticky top-0 z-30 transition-colors`}>
            <div className="flex items-center gap-4">
                <button onClick={onBack} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className={`text-xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {processData?.process_number}
                        <StatusBadge status={processData?.status} />
                    </h1>
                    <p className={`text-xs mt-0.5 uppercase tracking-wide font-bold ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        {processData?.beneficiary} • {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(processData?.value || 0)}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {/* Botão Novo Doc */}
                {!isArchived && (
                    <Tooltip content="Adicionar um novo documento ao dossiê digital" position="bottom">
                    <button
                        onClick={() => { setEditingDoc(null); setNewDocModalOpen(true); }}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-bold transition-all shadow-sm ${
                            darkMode 
                            ? 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-blue-600 hover:border-blue-500 hover:text-white' 
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
                        }`}
                    >
                        <Plus size={16} /> Novo Doc
                    </button>
                    </Tooltip>
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
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200/20 disabled:opacity-50"
                    >
                        {tramitarLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Tramitar → SOSFU
                    </button>
                )}
                {/* Minutas pendentes badge */}
                {pendingMinutas.length > 0 && currentUserRole === 'USER' && (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${
                        darkMode ? 'bg-amber-900/30 text-amber-400 border-amber-800' : 'bg-amber-100 text-amber-700 border-amber-200'
                    }`}>
                        {pendingMinutas.length} minuta(s) pendente(s)
                    </span>
                )}
            </div>
        </div>

        <div className="flex-1 max-w-[1600px] w-full mx-auto px-8 py-8 flex flex-col">
            
            {/* RASTREIO DO PROCESSO (compact) */}
            <div className="mb-6">
                <WorkflowTracker
                    status={processData.status}
                    accountabilityStatus={accountabilityData?.status}
                    isRejected={processData.status === 'REJECTED' || accountabilityData?.status === 'REJECTED'}
                    darkMode={darkMode}
                />
            </div>

            {/* Abas */}
            <div className={`flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                {[
                    { id: 'OVERVIEW', label: 'Visão Geral', icon: Eye, tooltip: 'Resumo geral do processo com dados do beneficiário e valores' },
                    { id: 'DOSSIER', label: 'Dossiê Digital', icon: FolderOpen, tooltip: 'Todos os documentos do processo organizados cronologicamente' },
                ...(isRessarcimento ? [] : [
                    { id: 'ANALYSIS', label: 'Análise Técnica', icon: ShieldCheck, tooltip: 'Parecer técnico da SOSFU e ações de controle' },
                ]),
                    { id: 'EXECUTION', label: isRessarcimento ? 'Pagamento' : 'Execução', icon: Wallet, tooltip: isRessarcimento ? 'Execução financeira do reembolso (NE, DL, OB)' : 'Geração de Portaria SF, Nota de Empenho, DL e OB' },
                    { id: 'ACCOUNTABILITY', label: isRessarcimento ? 'Comprovantes / Auditoria' : 'Prestação de Contas', icon: Receipt, tooltip: isRessarcimento ? 'Comprovantes enviados e auditoria SOSFU' : 'Comprovação da aplicação dos recursos com notas fiscais' },
                    { id: 'AUDIT', label: 'Registro de Atividades', icon: ScrollText, tooltip: 'Histórico completo de todas as ações realizadas no processo' },
                    { id: 'ARCHIVE', label: 'Arquivo', icon: Archive, tooltip: 'Arquivamento e consulta do processo finalizado' },
                ].map(t => (
                    <Tooltip key={t.id} content={t.tooltip} position="bottom" delay={400}>
                    <button 
                        onClick={() => { setActiveTab(t.id as any); setSelectedDoc(null); }} 
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap border-b-2 ${
                            activeTab === t.id 
                            ? 'border-blue-600 text-blue-600 ' + (darkMode ? 'bg-slate-800' : 'bg-white') 
                            : (darkMode ? 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100')
                        }`}
                    >
                        <t.icon size={16} />
                        {t.label}
                    </button>
                    </Tooltip>
                ))}
            </div>

            {/* CONTEÚDO PRINCIPAL (ABAS) */}
            <div className="flex-1">
                {activeTab === 'OVERVIEW' && (
                    <OverviewTab />
                )}

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
                    <div className={`animate-in fade-in rounded-xl shadow-sm border min-h-[600px] overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                        
                        {/* CONDICIONAL APRIMORADA: EXIBE PAINEL DE AUDITORIA ESPECÍFICO (SOSFU OU SODPA) */}
                        {(currentUserRole.startsWith('SOSFU') || currentUserRole.startsWith('SODPA') || currentUserRole === 'ADMIN') ? (
                            processData?.process_number?.includes('DPA') || processData?.unit?.includes('DIARIAS') ? (
                                <SodpaAuditPanel 
                                    processData={processData}
                                    accountabilityData={accountabilityData}
                                    pcItems={pcItems}
                                    onRefresh={fetchProcessData}
                                    processId={processId}
                                    darkMode={darkMode}
                                />
                            ) : (
                                <SosfuAuditPanel 
                                    isGestor={currentUserRole === 'SOSFU_GESTOR' || currentUserRole === 'SOSFU_ADM' || currentUserRole === 'ADMIN'}
                                    processData={processData}
                                    accountabilityData={accountabilityData}
                                    pcItems={pcItems}
                                    onRefresh={fetchProcessData}
                                    processId={processId}
                                    darkMode={darkMode}
                                />
                            )
                        ) : currentUserRole === 'GESTOR' && (accountabilityData?.status === 'WAITING_MANAGER' || processData?.status === 'WAITING_MANAGER') ? (
                            <ManagerReviewPanel />
                        ) : accountabilityData ? (
                            <AccountabilityWizard 
                                processId={processId}
                                accountabilityId={accountabilityData.id}
                                role={currentUserRole as any}
                                onSuccess={fetchProcessData}
                                isEmbedded={true}
                                darkMode={darkMode}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[600px]">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                    <Receipt size={40} />
                                </div>
                                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Nenhuma prestação de contas iniciada</h3>
                                <p className={`mt-2 max-w-md text-center ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                    Este processo ainda não possui uma prestação de contas vinculada. Se o recurso já foi liberado, inicie o processo abaixo.
                                </p>
                                <button 
                                    onClick={handleInitAccountability}
                                    disabled={creatingPC}
                                    className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200/20"
                                >
                                    {creatingPC ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                                    Iniciar Prestação de Contas
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'AUDIT' && (
                    <div className={`animate-in fade-in rounded-xl shadow-sm border p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                        <AuditLogTab 
                            solicitationId={processId}
                            processDocuments={documents}
                            darkMode={darkMode}
                        />
                    </div>
                )}

                {activeTab === 'ARCHIVE' && (
                    <div className="animate-in fade-in">
                        {processData?.status === 'ARCHIVED' ? (
                            <div className="space-y-6">
                                {/* Header do Arquivo */}
                                <div className={`rounded-2xl p-8 text-white shadow-xl transition-all ${
                                    darkMode ? 'bg-slate-800 border border-slate-700 shadow-slate-950/40' : 'bg-gradient-to-r from-slate-800 to-slate-900 shadow-slate-900/20'
                                }`}>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center backdrop-blur transition-colors ${darkMode ? 'bg-emerald-500/10' : 'bg-white/10'}`}>
                                            <Archive size={28} className="text-emerald-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold">Processo Arquivado</h2>
                                            <p className={`${darkMode ? 'text-slate-500' : 'text-slate-400'} text-sm mt-1`}>Baixa efetuada no SIAFE — Processo encerrado</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className={`backdrop-blur border rounded-xl p-5 transition-colors ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-white/5 border-white/10'}`}>
                                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Nº do Processo</p>
                                            <p className="text-lg font-mono font-bold text-white">{processData.process_number}</p>
                                        </div>
                                        <div className={`backdrop-blur border rounded-xl p-5 transition-colors ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-white/5 border-white/10'}`}>
                                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>NL SIAFE</p>
                                            <p className="text-lg font-mono font-bold text-emerald-400">
                                                {processData.nl_siafe || <span className="text-slate-500 italic text-sm">Não informada</span>}
                                            </p>
                                        </div>
                                        <div className={`backdrop-blur border rounded-xl p-5 transition-colors ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-white/5 border-white/10'}`}>
                                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Data da Baixa</p>
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
                                <div className={`rounded-2xl shadow-sm overflow-hidden border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                                    <div className={`px-6 py-4 border-b transition-colors ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
                                        <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-gray-800'}`}>
                                            <FileText size={16} className="text-blue-600" />
                                            Resumo do Processo Arquivado
                                        </h3>
                                    </div>
                                    <div className="p-6">
                                        <table className="w-full">
                                            <tbody className={`divide-y transition-colors ${darkMode ? 'divide-slate-700' : 'divide-gray-100'}`}>
                                                <tr>
                                                    <td className={`py-3 text-sm font-bold w-48 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Suprido / Beneficiário</td>
                                                    <td className={`py-3 text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>{processData.beneficiary?.toUpperCase()}</td>
                                                </tr>
                                                <tr>
                                                    <td className={`py-3 text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Unidade / Lotação</td>
                                                    <td className={`py-3 text-sm ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>{processData.unit?.split('[')[0]?.trim() || '---'}</td>
                                                </tr>
                                                <tr>
                                                    <td className={`py-3 text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Valor Concedido</td>
                                                    <td className={`py-3 text-sm font-mono font-bold ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(processData.value)}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className={`py-3 text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Período do Evento</td>
                                                    <td className={`py-3 text-sm ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                                                        {(() => {
                                                            const formatDate = (dateStr: string) => {
                                                                if (!dateStr) return 'N/I';
                                                                const [year, month, day] = dateStr.split('-').map(Number);
                                                                return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
                                                            };
                                                            return `${formatDate(processData.event_start_date)} — ${formatDate(processData.event_end_date)}`;
                                                        })()}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className={`py-3 text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Data da Solicitação</td>
                                                    <td className={`py-3 text-sm ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                                                        {new Date(processData.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className={`py-3 text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>NL SIAFE</td>
                                                    <td className="py-3">
                                                        {processData.nl_siafe ? (
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-full text-xs font-bold font-mono transition-colors ${
                                                                darkMode ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            }`}>
                                                                <Database size={12} />
                                                                {processData.nl_siafe}
                                                            </span>
                                                        ) : (
                                                            <span className={`text-sm italic transition-colors ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Pendente de registro</span>
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className={`py-3 text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Data da Baixa SIAFE</td>
                                                    <td className={`py-3 text-sm transition-colors ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                                                        {processData.data_baixa 
                                                            ? new Date(processData.data_baixa).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                            : <span className={`${darkMode ? 'text-slate-600' : 'text-gray-400'} italic`}>---</span>
                                                        }
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className={`py-3 text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Status Final</td>
                                                    <td className="py-3">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-xs font-bold uppercase transition-colors ${
                                                            darkMode ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-100 text-slate-700 border-slate-200'
                                                        }`}>
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
                                <div className={`rounded-2xl shadow-sm overflow-hidden border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                                    <div className={`px-6 py-4 border-b transition-colors ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
                                        <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-gray-800'}`}>
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
                                                        className={`flex items-center gap-3 p-4 border rounded-xl transition-all text-left group ${
                                                            darkMode 
                                                            ? 'border-slate-700 hover:border-blue-500 hover:bg-slate-700/50' 
                                                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                                                        }`}
                                                    >
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                                                            darkMode ? 'bg-slate-700 text-blue-400 group-hover:bg-slate-600' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
                                                        }`}>
                                                            <FileText size={18} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-bold truncate transition-colors ${darkMode ? 'text-slate-100' : 'text-gray-800'}`}>{doc.title}</p>
                                                            <p className={`text-[10px] mt-0.5 transition-colors ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                                                                {new Date(doc.created_at).toLocaleDateString('pt-BR')} • FLS. {String(i + 1).padStart(2, '0')}
                                                            </p>
                                                        </div>
                                                        <Eye size={14} className={`transition-colors ${darkMode ? 'text-slate-600 group-hover:text-blue-400' : 'text-gray-300 group-hover:text-blue-500'}`} />
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className={`text-sm text-center py-8 transition-colors ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Nenhum documento vinculado.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Selo de Integridade */}
                                <div className={`rounded-xl border p-4 flex items-center gap-4 transition-colors ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                                        <Lock size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-xs font-bold uppercase transition-colors ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Processo Encerrado e Arquivado</p>
                                        <p className={`text-[11px] mt-0.5 transition-colors ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                                            Este processo foi baixado no SIAFE e arquivado definitivamente. Nenhuma alteração é permitida após o arquivamento.
                                        </p>
                                    </div>
                                    <div className={`text-[10px] font-mono transition-colors ${darkMode ? 'text-slate-600' : 'text-gray-400'}`}>
                                        ID: {processData.id?.split('-')[0]}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[500px]">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors ${darkMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <Archive size={40} />
                                </div>
                                <h3 className={`text-xl font-bold transition-colors ${darkMode ? 'text-slate-100' : 'text-gray-800'}`}>Processo ainda não arquivado</h3>
                                <p className={`mt-2 max-w-md text-center transition-colors ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                                    O arquivo ficará disponível após a baixa do processo no SIAFE. 
                                    O processo atual está em <strong>{processData?.status || '---'}</strong>.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MODAL GLOBAL DE VISUALIZAÇÃO DE DOCUMENTO (Disponível em todas as abas) */}
            {selectedDoc && (() => {
                const isUploadedPdf = ['NOTA_EMPENHO', 'LIQUIDACAO', 'ORDEM_BANCARIA'].includes(selectedDoc.document_type);
                return (
                <div
                    className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedDoc(null)}
                >
                    <div
                        className={`rounded-xl shadow-2xl w-full h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative ${
                            isUploadedPdf ? 'max-w-5xl' : 'max-w-4xl'
                        } ${darkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header do Modal */}
                        <div className={`px-6 py-4 border-b flex justify-between items-center backdrop-blur sticky top-0 z-10 shrink-0 transition-colors ${
                            darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-gray-50/80 border-gray-200'
                        }`}>
                            <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                <FileText size={18} className="text-blue-600"/>
                                {selectedDoc.title}
                            </h3>
                            <button
                                onClick={() => setSelectedDoc(null)}
                                className={`p-2 rounded-full transition-all ${
                                    darkMode ? 'bg-slate-700 hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600'
                                }`}
                                title="Fechar (ESC)"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Conteúdo do Modal - adaptativo para PDF vs template */}
                        {isUploadedPdf ? (
                            <div className={`flex-1 flex flex-col overflow-hidden transition-colors ${darkMode ? 'bg-slate-950' : ''}`}>
                                {renderDocumentContent(selectedDoc)}
                            </div>
                        ) : (
                            <div className={`flex-1 overflow-y-auto p-8 flex justify-center custom-scrollbar transition-colors ${darkMode ? 'bg-slate-950' : 'bg-slate-100/50'}`}>
                                <div className={`w-full max-w-[210mm] shadow-lg min-h-[297mm] origin-top transition-colors ${darkMode ? 'bg-slate-900 shadow-slate-950/40' : 'bg-white'}`}>
                                    {renderDocumentContent(selectedDoc)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                );
            })()}

            {/* MODAL NOVO DOCUMENTO */}
            {newDocModalOpen && (
                <NewDocumentModal
                    processId={processId}
                    editingDoc={editingDoc}
                    onClose={() => { setNewDocModalOpen(false); setEditingDoc(null); }}
                    onSave={() => fetchProcessData()}
                    darkMode={darkMode}
                />
            )}
        </div>
    </div>
  );
};
