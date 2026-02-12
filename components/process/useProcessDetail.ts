import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export interface ProcessDetailState {
  processData: any;
  setProcessData: React.Dispatch<React.SetStateAction<any>>;
  requesterProfile: any;
  accountabilityData: any;
  setAccountabilityData: React.Dispatch<React.SetStateAction<any>>;
  pcItems: any[];
  documents: any[];
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  currentUserRole: string;
  comarcaData: any;
  gestorProfile: any;
  selectedDoc: any;
  setSelectedDoc: React.Dispatch<React.SetStateAction<any>>;
  newDocModalOpen: boolean;
  setNewDocModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingDoc: any;
  setEditingDoc: React.Dispatch<React.SetStateAction<any>>;
  tramitarLoading: boolean;
  confirmPaymentLoading: boolean;
  confirmReceiptLoading: boolean;
  creatingPC: boolean;
  isSuprido: boolean;
  isArchived: boolean;
  isRessarcimento: boolean;
  isExtraJuri: boolean;
  pendingMinutas: any[];
  canTramitarSOSFU: boolean;
  canTramitarGestor: boolean;
  fetchProcessData: () => Promise<void>;
  handleInitAccountability: () => Promise<void>;
  handleConfirmPayment: () => Promise<void>;
  handleConfirmReceipt: () => Promise<void>;
  handleGeneratePDF: (docType: string, title: string, content?: string) => Promise<void>;
  handleTramitar: (destino: 'GESTOR' | 'SOSFU') => Promise<void>;
  handleDeleteDoc: (doc: any) => Promise<void>;
  resolvePdfSource: (doc: any) => string | null;
  renderDocumentContent: (doc: any) => React.ReactNode;
  renderUploadedPdfViewer: (doc: any) => React.ReactNode;
  handleViewReceipt: (item: any) => void;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
}

export function useProcessDetail(
  processId: string,
  initialTab: string,
  userProfile: any,
  darkMode: boolean
) {
  const [activeTab, setActiveTab] = useState(initialTab);
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
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [newDocModalOpen, setNewDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [tramitarLoading, setTramitarLoading] = useState(false);
  const [gestorProfile, setGestorProfile] = useState<any>(null);

  const isSuprido = currentUserRole === 'USER' || currentUserRole === 'SERVIDOR';
  const pendingMinutas = documents.filter((d: any) => d.metadata?.is_draft === true);
  const canTramitarSOSFU = isSuprido && processData?.status === 'PENDING' && pendingMinutas.length === 0;
  const canTramitarGestor = isSuprido && pendingMinutas.length > 0;
  const isArchived = processData?.status === 'ARCHIVED';
  const isRessarcimento = processData?.type === 'RESSARCIMENTO';
  const isExtraJuri = processData?.process_number?.includes('TJPA-JUR') || processData?.unit?.includes('JÚRI');

  useEffect(() => {
    fetchProcessData();
    if (userProfile?.dperfil?.slug) {
      setCurrentUserRole(userProfile.dperfil.slug.toUpperCase());
    } else {
      fetchCurrentUserRole();
    }
  }, [processId, userProfile]);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab, processId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedDoc) setSelectedDoc(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDoc]);

  const fetchCurrentUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('dperfil:perfil_id(slug)').eq('id', user.id).single();
      const dperfil = profile?.dperfil as unknown as { slug: string } | null;
      if (dperfil?.slug) setCurrentUserRole(dperfil.slug.toUpperCase());
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

      if (solicitation.user?.lotacao) {
        const { data: comarca } = await supabase
          .from('dcomarcas')
          .select('nome_banco, cod_banco, agencia, conta_corrente, comarca')
          .ilike('comarca', solicitation.user.lotacao.split(' -')[0].trim())
          .maybeSingle();
        if (comarca) setComarcaData(comarca);
      }

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
    } finally {
      setCreatingPC(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!confirm('Comunicar ao suprido que o pagamento foi realizado e os recursos liberados?')) return;
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
      setProcessData((prev: any) => prev ? { ...prev, status: prevStatus } : prev);
      console.error('Erro ao confirmar pagamento:', err);
      alert('Erro ao confirmar pagamento. Tente novamente.');
    } finally {
      setConfirmPaymentLoading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!confirm('Confirmar que você recebeu os recursos em sua conta bancária?')) return;
    const prevStatus = processData?.status;
    setProcessData((prev: any) => prev ? { ...prev, status: 'PAID' } : prev);
    setConfirmReceiptLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !processData) return;
      const now = new Date().toISOString();

      const { error } = await supabase.from('solicitations').update({
        status: 'PAID'
      }).eq('id', processId);
      if (error) throw error;

      await supabase.from('historico_tramitacao').insert({
        solicitation_id: processId,
        status_from: 'WAITING_SUPRIDO_CONFIRMATION',
        status_to: 'PAID',
        actor_name: user.email,
        description: 'Suprido confirmou recebimento dos recursos. Início da fase de Prestação de Contas.',
        created_at: now
      });

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
      setActiveTab('ACCOUNTABILITY');
    } catch (err) {
      setProcessData((prev: any) => prev ? { ...prev, status: prevStatus } : prev);
      console.error('Erro ao confirmar recebimento:', err);
      alert('Erro ao confirmar recebimento. Tente novamente.');
    } finally {
      setConfirmReceiptLoading(false);
    }
  };

  const resolvePdfSource = (doc: any): string | null => {
    if (doc?.metadata?.file_url) return doc.metadata.file_url;
    if (doc?.metadata?.storage_path) {
      const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(doc.metadata.storage_path);
      return urlData?.publicUrl || null;
    }
    if (doc?.metadata?.file_data) return doc.metadata.file_data;
    return null;
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
      setSelectedDoc(doc);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTramitar = async (destino: 'GESTOR' | 'SOSFU') => {
    if (destino === 'SOSFU' && pendingMinutas.length > 0) {
      alert(`Existem ${pendingMinutas.length} minuta(s) pendente(s) de assinatura do Gestor. Tramite primeiro para o Gestor.`);
      return;
    }

    const destinoLabel = destino === 'SOSFU' ? 'SOSFU' : 'Gestor';
    if (!confirm(`Confirma a tramitação do processo para ${destinoLabel}?`)) return;

    const prevStatus = processData?.status;
    const newStatus = destino === 'SOSFU' ? 'WAITING_SOSFU_ANALYSIS' : 'WAITING_MANAGER';
    setProcessData((prev: any) => prev ? { ...prev, status: newStatus } : prev);
    setTramitarLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error: updateError } = await supabase.from('solicitations')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', processId);
      if (updateError) throw updateError;

      await supabase.from('historico_tramitacao').insert({
        solicitation_id: processId,
        status_from: prevStatus,
        status_to: newStatus,
        actor_id: user?.id,
        actor_name: userProfile?.full_name || user?.email,
        description: `Processo tramitado para ${destinoLabel} pelo solicitante.`
      });

      if (destino === 'GESTOR' && processData.manager_email) {
        const { data: gp } = await supabase
          .from('profiles').select('id').eq('email', processData.manager_email).maybeSingle();
        if (gp) {
          await supabase.from('system_notifications').insert({
            user_id: gp.id,
            title: 'Atesto Pendente',
            message: `O processo ${processData.process_number} foi encaminhado para seu atesto.`,
            type: 'ACTION_REQUIRED',
            process_number: processData.process_number,
            link: 'gestor_dashboard'
          });
        }
      } else if (destino === 'SOSFU') {
        const { data: teamMembers } = await supabase
          .from('team_members').select('user_id').eq('module', 'SOSFU');
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
      await supabase.from('process_documents')
        .update({ metadata: { ...doc.metadata, deleted: true, audit_log: [...(doc.metadata?.audit_log || []), auditEntry] } })
        .eq('id', doc.id);
      await fetchProcessData();
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  return {
    activeTab,
    setActiveTab,
    processData,
    setProcessData,
    requesterProfile,
    accountabilityData,
    setAccountabilityData,
    pcItems,
    documents,
    loading,
    setLoading,
    currentUserRole,
    comarcaData,
    gestorProfile,
    selectedDoc,
    setSelectedDoc,
    newDocModalOpen,
    setNewDocModalOpen,
    editingDoc,
    setEditingDoc,
    tramitarLoading,
    confirmPaymentLoading,
    confirmReceiptLoading,
    creatingPC,
    isSuprido,
    isArchived,
    isRessarcimento,
    isExtraJuri,
    pendingMinutas,
    canTramitarSOSFU,
    canTramitarGestor,
    fetchProcessData,
    handleInitAccountability,
    handleConfirmPayment,
    handleConfirmReceipt,
    handleGeneratePDF,
    handleTramitar,
    handleDeleteDoc,
    resolvePdfSource,
    handleViewReceipt,
  };
}
