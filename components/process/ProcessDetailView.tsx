import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, FileText, Loader2, Wallet, ShieldCheck, BadgeCheck, Receipt, Plus, FolderOpen, History, ExternalLink, X, Eye, Clock, User, MapPin, Mail, Calendar, AlignLeft, Shield, Printer, Maximize2, Minimize2, ChevronLeft, ChevronRight, Download, ScrollText, Check, AlertTriangle, Send, FileCheck, UserCheck, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StatusBadge } from '../StatusBadge';
import { AccountabilityWizard } from '../accountability/AccountabilityWizard';
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

type TabType = 'OVERVIEW' | 'DOSSIER' | 'EXECUTION' | 'ANALYSIS' | 'ACCOUNTABILITY';

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
  const [currentUserRole, setCurrentUserRole] = useState<string>('SUPRIDO');
  
  // Document Viewer State
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

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
          if (profile?.dperfil?.slug) {
              setCurrentUserRole(profile.dperfil.slug);
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

        const { data: docs } = await supabase
            .from('process_documents')
            .select('*')
            .eq('solicitation_id', processId)
            .order('created_at', { ascending: true });
        setDocuments(docs || []);
        
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
          alert("Erro ao iniciar prestação de contas.");
      } finally {
          setCreatingPC(false);
      }
  };

  // --- RENDERIZADORES DE DOCUMENTO ---
  const renderDocumentContent = (doc: any) => {
      if (!doc) return null;
      
      const props = {
          data: processData,
          user: requesterProfile,
          document: doc // Passa o objeto completo
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

  // --- COMPONENTE: ABA DE ANÁLISE TÉCNICA ---
  const AnalysisTab = () => {
      // Cálculo de execução financeira
      const total = processData?.value || 0;
      const spent = accountabilityData?.total_spent || 0;
      const progress = total > 0 ? (spent / total) * 100 : 0;

      return (
          <div className="animate-in fade-in space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Widget Financeiro */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                      <h4 className="font-bold text-gray-700 text-sm mb-4 flex items-center gap-2">
                          <Wallet size={16} className="text-emerald-600"/> Execução Financeira
                      </h4>
                      <div className="flex justify-between items-end mb-2">
                          <div>
                              <p className="text-xs text-gray-500">Concedido</p>
                              <p className="text-lg font-bold text-gray-800">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                              </p>
                          </div>
                          <div className="text-right">
                              <p className="text-xs text-gray-500">Executado</p>
                              <p className="text-lg font-bold text-blue-600">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(spent)}
                              </p>
                          </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-blue-600 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 text-right">{progress.toFixed(1)}% utilizado</p>
                  </div>

                  {/* Widget Informações */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                      <h4 className="font-bold text-gray-700 text-sm mb-4 flex items-center gap-2">
                          <FileText size={16} className="text-blue-600"/> Dados do Processo
                      </h4>
                      <div className="space-y-3 text-sm">
                          <div className="flex justify-between border-b border-gray-50 pb-2">
                              <span className="text-gray-500">NUP</span>
                              <span className="font-medium text-gray-800">{processData?.process_number}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-50 pb-2">
                              <span className="text-gray-500">Data Autuação</span>
                              <span className="font-medium text-gray-800">{new Date(processData?.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-gray-500">Prazo Legal PC</span>
                              <span className="font-medium text-red-600">
                                  {accountabilityData?.deadline ? new Date(accountabilityData.deadline).toLocaleDateString() : 'A calcular'}
                              </span>
                          </div>
                      </div>
                  </div>

                  {/* Widget Conformidade */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                      <h4 className="font-bold text-gray-700 text-sm mb-4 flex items-center gap-2">
                          <BadgeCheck size={16} className="text-green-600"/> Conformidade Automática
                      </h4>
                      <div className="space-y-3">
                          <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">CND Receita Federal</span>
                              <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded border border-green-100 flex items-center gap-1">
                                  <Check size={10} /> Válida
                              </span>
                          </div>
                          <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Regularidade Cadastral</span>
                              <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded border border-green-100 flex items-center gap-1">
                                  <Check size={10} /> Regular
                              </span>
                          </div>
                          <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Limite Anual</span>
                              <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded border border-green-100 flex items-center gap-1">
                                  <Check size={10} /> Dentro do Teto
                              </span>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Tabela de Itens Verificados */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 bg-gray-50">
                      <h4 className="font-bold text-gray-700 text-sm">Itens da Prestação de Contas</h4>
                  </div>
                  {pcItems.length === 0 ? (
                      <div className="p-12 text-center text-gray-400 text-sm italic">
                          <Receipt size={32} className="mx-auto mb-2 opacity-20"/>
                          Nenhum item lançado ou prestação de contas não iniciada.
                      </div>
                  ) : (
                      <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                              <thead className="bg-gray-50 text-gray-500 font-medium text-xs uppercase">
                                  <tr>
                                      <th className="px-4 py-3">Data</th>
                                      <th className="px-4 py-3">Descrição</th>
                                      <th className="px-4 py-3">Fornecedor</th>
                                      <th className="px-4 py-3 text-right">Valor</th>
                                      <th className="px-4 py-3 text-center">Status</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {pcItems.map((item) => (
                                      <tr key={item.id} className="hover:bg-gray-50">
                                          <td className="px-4 py-3 text-gray-600">{new Date(item.item_date).toLocaleDateString()}</td>
                                          <td className="px-4 py-3 font-medium text-gray-800">{item.description}</td>
                                          <td className="px-4 py-3 text-gray-600">{item.supplier}</td>
                                          <td className="px-4 py-3 text-right font-mono text-gray-800">
                                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-green-50 text-green-700 font-bold border border-green-100 uppercase tracking-wide">
                                                  <CheckCircle2 size={10} /> Validado
                                              </span>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  )}
              </div>
          </div>
      );
  };

  // --- COMPONENTE DE REVISÃO DO GESTOR ---
  const ManagerReviewPanel = () => {
      const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT' | null>(null);
      const [notes, setNotes] = useState('');
      const [processing, setProcessing] = useState(false);
      const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

      const totalItems = pcItems.length;
      const totalValue = pcItems.reduce((acc, i) => acc + Number(i.value), 0);
      const balance = accountabilityData?.balance || 0;
      
      // Compliance Check Count
      const alertsCount = pcItems.reduce((acc, i) => {
          const meta = i.ai_metadata?.compliance_checks;
          if (!meta) return acc;
          return acc + (meta.date_valid ? 0 : 1) + (meta.prohibited_items ? 1 : 0);
      }, 0);

      const handleSubmitReview = async () => {
          if (!confirm('Confirmar ação sobre a prestação de contas?')) return;
          
          setProcessing(true);
          try {
              const newStatus = reviewAction === 'APPROVE' ? 'WAITING_SOSFU' : 'CORRECTION';
              
              const { error } = await supabase
                  .from('accountabilities')
                  .update({ 
                      status: newStatus,
                      // Aqui poderíamos salvar as notas/ressalvas em um campo específico se houvesse no banco
                  })
                  .eq('id', accountabilityData.id);

              if (error) throw error;
              
              await fetchProcessData();
              setReviewAction(null);
          } catch (err) {
              console.error(err);
              alert('Erro ao processar revisão.');
          } finally {
              setProcessing(false);
          }
      };

      return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
              <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/10 rounded-lg"><ShieldCheck size={20} /></div>
                      <div>
                          <h3 className="font-bold text-lg">Revisão do Gestor</h3>
                          <p className="text-slate-400 text-xs">Análise de Prestação de Contas</p>
                      </div>
                  </div>
                  <div className="text-right">
                      <p className="text-xs text-slate-400 uppercase font-bold">Saldo Final</p>
                      <p className={`text-xl font-bold ${balance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
                      </p>
                  </div>
              </div>

              <div className="p-6">
                  {/* Resumo IA */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                              {totalItems}
                          </div>
                          <div>
                              <p className="text-xs text-gray-500 font-bold uppercase">Comprovantes</p>
                              <p className="text-sm font-semibold">Anexados pelo Suprido</p>
                          </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                              <Wallet size={18} />
                          </div>
                          <div>
                              <p className="text-xs text-gray-500 font-bold uppercase">Valor Comprovado</p>
                              <p className="text-sm font-semibold">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                              </p>
                          </div>
                      </div>

                      <div className={`p-4 rounded-xl border flex items-center gap-4 ${alertsCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${alertsCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                              {alertsCount > 0 ? <AlertTriangle size={18} /> : <Check size={18} />}
                          </div>
                          <div>
                              <p className={`text-xs font-bold uppercase ${alertsCount > 0 ? 'text-amber-700' : 'text-green-700'}`}>Auditoria IA</p>
                              <p className="text-sm font-semibold">{alertsCount > 0 ? `${alertsCount} Alertas Detectados` : 'Nenhuma Inconsistência'}</p>
                          </div>
                      </div>
                  </div>

                  {/* Grid de Itens */}
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Receipt size={16} /> Detalhamento dos Gastos
                  </h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl mb-8">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase">
                              <tr>
                                  <th className="px-4 py-3">Data</th>
                                  <th className="px-4 py-3">Fornecedor (OCR)</th>
                                  <th className="px-4 py-3">Descrição</th>
                                  <th className="px-4 py-3">CND</th>
                                  <th className="px-4 py-3 text-right">Valor</th>
                                  <th className="px-4 py-3 text-center">Ação</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {pcItems.map((item) => (
                                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-4 py-3">{new Date(item.item_date).toLocaleDateString()}</td>
                                      <td className="px-4 py-3 font-medium text-gray-800">{item.supplier}</td>
                                      <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">{item.description}</td>
                                      <td className="px-4 py-3">
                                          {item.ai_metadata?.compliance_checks?.cnd_receita === false ? (
                                              <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">Irregular</span>
                                          ) : (
                                              <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded font-bold">Regular</span>
                                          )}
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono font-bold">
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                          <button 
                                              onClick={() => alert(`Visualizar anexo: ${item.doc_number || 'Sem número'}`)} // Mock ação
                                              className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                                              title="Ver Comprovante"
                                          >
                                              <Eye size={16} />
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>

                  {/* Área de Decisão */}
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Parecer do Gestor</h4>
                      
                      <div className="space-y-4">
                          <textarea 
                              className="w-full p-4 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-none resize-none"
                              rows={3}
                              placeholder="Insira aqui ressalvas, observações ou justificativa para devolução..."
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                          ></textarea>

                          <div className="flex gap-4">
                              <button 
                                  onClick={() => setReviewAction('APPROVE')}
                                  className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border-2 ${
                                      reviewAction === 'APPROVE' 
                                      ? 'bg-green-600 text-white border-green-600 shadow-md' 
                                      : 'bg-white text-green-600 border-green-200 hover:border-green-400'
                                  }`}
                              >
                                  <FileCheck size={18} />
                                  Atestar e Enviar para SOSFU
                              </button>
                              
                              <button 
                                  onClick={() => setReviewAction('REJECT')}
                                  className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border-2 ${
                                      reviewAction === 'REJECT' 
                                      ? 'bg-orange-500 text-white border-orange-500 shadow-md' 
                                      : 'bg-white text-orange-500 border-orange-200 hover:border-orange-400'
                                  }`}
                              >
                                  <ChevronLeft size={18} />
                                  Devolver para Correção
                              </button>
                          </div>

                          {reviewAction && (
                              <div className="animate-in slide-in-from-top-2 pt-4 border-t border-gray-200 flex justify-end">
                                  <button 
                                      onClick={handleSubmitReview}
                                      disabled={processing}
                                      className="px-8 py-2.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors shadow-lg flex items-center gap-2"
                                  >
                                      {processing ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                                      Confirmar Decisão
                                  </button>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const OverviewTab = () => {
    if (!processData) return <div className="p-8 text-center text-gray-500">Carregando dados...</div>;

    // Lógica para Banner de Status Específico
    const isWaitingManager = accountabilityData?.status === 'WAITING_MANAGER';
    const managerName = processData.manager_name || 'Gestor da Unidade';

    return (
        <div className="animate-in fade-in space-y-6">
            
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

                {/* Status */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Clock size={16} /> Status do Processo
                    </h3>
                    <div className="flex flex-col items-start gap-3">
                        <StatusBadge status={accountabilityData?.status || processData.status} size="lg" />
                        <div className="w-full bg-gray-50 rounded p-2 text-xs text-gray-500 border border-gray-100">
                            <div className="flex justify-between mb-1">
                                <span>Progresso Estimado</span>
                                <span className="font-bold">
                                    {['PENDING', 'DRAFT'].includes(processData.status) ? '10%' :
                                     ['WAITING_MANAGER'].includes(processData.status) || accountabilityData?.status === 'WAITING_MANAGER' ? '30%' :
                                     ['WAITING_SOSFU_ANALYSIS'].includes(processData.status) || accountabilityData?.status === 'WAITING_SOSFU' ? '50%' :
                                     ['WAITING_SEFIN_SIGNATURE'].includes(processData.status) ? '70%' :
                                     ['WAITING_SOSFU_PAYMENT'].includes(processData.status) ? '85%' :
                                     ['PAID', 'APPROVED'].includes(processData.status) || accountabilityData?.status === 'APPROVED' ? '100%' : '0%'}
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${accountabilityData?.status === 'WAITING_MANAGER' ? 'bg-amber-500' : 'bg-blue-500'}`}
                                    style={{ width: ['PENDING', 'DRAFT'].includes(processData.status) ? '10%' :
                                              ['WAITING_MANAGER'].includes(processData.status) || accountabilityData?.status === 'WAITING_MANAGER' ? '30%' :
                                              ['WAITING_SOSFU_ANALYSIS'].includes(processData.status) || accountabilityData?.status === 'WAITING_SOSFU' ? '50%' :
                                              ['WAITING_SEFIN_SIGNATURE'].includes(processData.status) ? '70%' :
                                              ['WAITING_SOSFU_PAYMENT'].includes(processData.status) ? '85%' :
                                              ['PAID', 'APPROVED'].includes(processData.status) || accountabilityData?.status === 'APPROVED' ? '100%' : '5%' }}
                                ></div>
                            </div>
                        </div>
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

  // --- DOSSIE TAB ---
  const DossierTab = () => {
      const [viewMode, setViewMode] = useState<'PAGINATED' | 'CONTINUOUS'>('PAGINATED');
      const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
      const printRef = useRef<HTMLDivElement>(null);

      // Função Universal de Geração de PDF (Substitui window.print)
      const generatePDF = async (action: 'download' | 'print') => {
          setIsGeneratingPdf(true);
          try {
              const pdf = new jsPDF('p', 'mm', 'a4');
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = pdf.internal.pageSize.getHeight();

              if (viewMode === 'CONTINUOUS') {
                  const docElements = document.querySelectorAll('.doc-page-content');
                  
                  if (docElements.length === 0) {
                      alert("Nenhum documento para gerar.");
                      setIsGeneratingPdf(false);
                      return;
                  }

                  for (let i = 0; i < docElements.length; i++) {
                      const element = docElements[i] as HTMLElement;
                      
                      // Captura com html2canvas
                      const canvas = await html2canvas(element, { 
                          scale: 1.5, 
                          backgroundColor: '#ffffff',
                          logging: false,
                          useCORS: true 
                      });
                      
                      const imgData = canvas.toDataURL('image/png');
                      const imgProps = pdf.getImageProperties(imgData);
                      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
                      
                      if (i > 0) pdf.addPage();
                      
                      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
                  }
                  
                  const filename = `Dossie_Completo_${processData?.process_number}.pdf`;
                  if (action === 'download') {
                      pdf.save(filename);
                  } else {
                      window.open(pdf.output('bloburl'), '_blank');
                  }

              } else {
                  // SINGLE MODE
                  const element = document.querySelector('#printable-single-doc') as HTMLElement;
                  if (element) {
                      const canvas = await html2canvas(element, { 
                          scale: 2, 
                          backgroundColor: '#ffffff',
                          logging: false,
                          useCORS: true
                      });
                      const imgData = canvas.toDataURL('image/png');
                      const imgProps = pdf.getImageProperties(imgData);
                      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
                      
                      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
                      
                      const filename = `${selectedDoc?.title || 'documento'}.pdf`;
                      if (action === 'download') {
                          pdf.save(filename);
                      } else {
                          window.open(pdf.output('bloburl'), '_blank');
                      }
                  }
              }
          } catch (err) {
              console.error(err);
              alert("Erro ao gerar PDF. Tente novamente.");
          } finally {
              setIsGeneratingPdf(false);
          }
      };

      const handleDownloadPdf = () => generatePDF('download');
      const handlePrint = () => generatePDF('print');

      return (
        <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px]">
            
            {/* Toolbar */}
            <div className="mb-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <FolderOpen size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-800">Dossiê Digital do Processo</h3>
                        <p className="text-xs text-gray-500">{documents.length} documentos anexados</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-gray-100/50 p-1 rounded-lg">
                    <button 
                        onClick={() => setViewMode(viewMode === 'PAGINATED' ? 'CONTINUOUS' : 'PAGINATED')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            viewMode === 'CONTINUOUS' 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                        title="Alternar entre modo lista e modo leitura única (rolagem)"
                    >
                        {viewMode === 'CONTINUOUS' ? <ScrollText size={14} /> : <FileText size={14} />}
                        {viewMode === 'CONTINUOUS' ? 'Modo Contínuo' : 'Visualizar Único'}
                    </button>

                    <div className="w-px h-6 bg-gray-300 mx-2"></div>

                    <button 
                        onClick={handlePrint} 
                        disabled={isGeneratingPdf}
                        className="p-2 hover:bg-white hover:text-gray-900 rounded-lg text-gray-500 transition-colors disabled:opacity-50" 
                        title="Imprimir (Gera PDF)"
                    >
                        <Printer size={18} />
                    </button>
                    <button 
                        onClick={handleDownloadPdf} 
                        disabled={isGeneratingPdf}
                        className="p-2 hover:bg-white hover:text-gray-900 rounded-lg text-gray-500 transition-colors disabled:opacity-50" 
                        title="Baixar PDF"
                    >
                        {isGeneratingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    </button>
                </div>
            </div>

            <div className={`grid grid-cols-12 gap-6 flex-1 overflow-hidden transition-all duration-300`}>
                
                {/* Sidebar (Lista) - Oculta no modo Contínuo */}
                {viewMode === 'PAGINATED' && (
                    <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full animate-in slide-in-from-left-4">
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <h4 className="font-bold text-gray-700 text-xs uppercase tracking-wider">Índice de Documentos</h4>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {documents.map((doc, idx) => (
                                <button
                                    key={doc.id}
                                    onClick={() => setSelectedDoc(doc)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 group ${
                                        selectedDoc?.id === doc.id 
                                        ? 'bg-blue-50 border-blue-200 shadow-sm' 
                                        : 'bg-white border-transparent hover:bg-gray-50'
                                    }`}
                                >
                                    <div className={`mt-0.5 p-1.5 rounded-md ${selectedDoc?.id === doc.id ? 'bg-white text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                        <span className="text-[10px] font-bold">{String(idx + 1).padStart(2, '0')}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-bold truncate ${selectedDoc?.id === doc.id ? 'text-blue-800' : 'text-gray-700'}`}>
                                            {doc.title}
                                        </p>
                                        <p className="text-[9px] text-gray-400 mt-0.5">{new Date(doc.created_at).toLocaleDateString()}</p>
                                    </div>
                                    {selectedDoc?.id === doc.id && <Check size={14} className="text-blue-600 mt-1" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Área Principal de Leitura */}
                <div 
                    className={`${viewMode === 'CONTINUOUS' ? 'col-span-12' : 'col-span-12 md:col-span-8 lg:col-span-9'} flex flex-col h-full bg-slate-100/50 rounded-xl border border-gray-200 overflow-hidden relative transition-all duration-300`}
                >
                    <div id="printable-area" ref={printRef} className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar flex flex-col items-center">
                        
                        {viewMode === 'PAGINATED' ? (
                            selectedDoc ? (
                                <div id="printable-single-doc" className="w-full max-w-[210mm] bg-white shadow-lg min-h-[297mm] origin-top transition-transform duration-200">
                                    {renderDocumentContent(selectedDoc)}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <FileText size={48} className="opacity-20 mb-4" />
                                    <p>Selecione um documento.</p>
                                </div>
                            )
                        ) : (
                            // MODO CONTÍNUO: Renderiza TODOS
                            <div className="space-y-8 w-full flex flex-col items-center pb-20">
                                {documents.length > 0 ? (
                                    documents.map((doc, idx) => (
                                        <div key={doc.id} className="w-full max-w-[210mm] relative group doc-page">
                                            {/* Separator / Header no modo contínuo */}
                                            <div className="absolute -top-6 left-0 text-[10px] font-bold text-gray-400 uppercase no-print">
                                                Página {idx + 1} • {doc.title}
                                            </div>
                                            
                                            {/* Identificador para captura do html2canvas */}
                                            <div className="bg-white shadow-lg min-h-[297mm] border border-gray-100 doc-page-content">
                                                {renderDocumentContent(doc)}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-400 mt-10">Nenhum documento para exibir.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      );
  };

  const ExecutionTab = () => {
      // Simulação de Documentos Financeiros com base no Status
      const showNE = ['WAITING_SEFIN_SIGNATURE', 'WAITING_SOSFU_PAYMENT', 'WAITING_SUPRIDO_CONFIRMATION', 'PAID', 'APPROVED'].includes(processData?.status);
      const showNL = ['WAITING_SOSFU_PAYMENT', 'WAITING_SUPRIDO_CONFIRMATION', 'PAID', 'APPROVED'].includes(processData?.status);
      const showOB = ['WAITING_SUPRIDO_CONFIRMATION', 'PAID', 'APPROVED'].includes(processData?.status);

      return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Timeline Vertical */}
              <div className="col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                      <History size={18} /> Histórico de Execução
                  </h4>
                  <div className="relative pl-4 border-l-2 border-gray-100 space-y-8">
                      {/* Steps */}
                      <div className="relative">
                          <div className="absolute -left-[21px] top-0 w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
                          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Criação</p>
                          <p className="text-sm font-bold text-gray-800">Processo Autuado</p>
                          <p className="text-xs text-gray-400">{new Date(processData?.created_at).toLocaleDateString()}</p>
                      </div>
                      
                      <div className="relative">
                          <div className={`absolute -left-[21px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${showNE ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Empenho</p>
                          <p className={`text-sm font-bold ${showNE ? 'text-gray-800' : 'text-gray-400'}`}>Nota de Empenho Emitida</p>
                      </div>

                      <div className="relative">
                          <div className={`absolute -left-[21px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${showNL ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Liquidação</p>
                          <p className={`text-sm font-bold ${showNL ? 'text-gray-800' : 'text-gray-400'}`}>Despesa Liquidada</p>
                      </div>

                      <div className="relative">
                          <div className={`absolute -left-[21px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${showOB ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Pagamento</p>
                          <p className={`text-sm font-bold ${showOB ? 'text-gray-800' : 'text-gray-400'}`}>Ordem Bancária Enviada</p>
                      </div>
                  </div>
              </div>

              {/* Documentos Financeiros (Cards) */}
              <div className="col-span-1 lg:col-span-2 space-y-4">
                  <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                      <Wallet size={18} /> Documentos Financeiros
                  </h4>
                  
                  {showNE ? (
                      <div className="bg-white p-4 rounded-xl border border-l-4 border-l-blue-500 shadow-sm flex justify-between items-center cursor-pointer hover:shadow-md transition-all group" onClick={() => setSelectedDoc({ title: 'NOTA DE EMPENHO', document_type: 'NE', metadata: { doc_number: '2024NE00152' } })}>
                          <div>
                              <p className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">Nota de Empenho (NE)</p>
                              <p className="text-xs text-gray-500">Reserva orçamentária confirmada.</p>
                          </div>
                          <ExternalLink size={16} className="text-gray-400 group-hover:text-blue-600"/>
                      </div>
                  ) : (
                      <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 flex items-center gap-3 text-gray-400">
                          <Clock size={18} />
                          <span className="text-sm">Aguardando emissão de Empenho...</span>
                      </div>
                  )}

                  {showNL ? (
                      <div className="bg-white p-4 rounded-xl border border-l-4 border-l-green-500 shadow-sm flex justify-between items-center cursor-pointer hover:shadow-md transition-all group" onClick={() => setSelectedDoc({ title: 'NOTA DE LIQUIDAÇÃO', document_type: 'NL', metadata: { doc_number: '2024NL00089' } })}>
                          <div>
                              <p className="font-bold text-gray-800 group-hover:text-green-600 transition-colors">Nota de Liquidação (NL)</p>
                              <p className="text-xs text-gray-500">Entrega do serviço/material verificada.</p>
                          </div>
                          <ExternalLink size={16} className="text-gray-400 group-hover:text-green-600"/>
                      </div>
                  ) : (
                      <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 flex items-center gap-3 text-gray-400">
                          <Clock size={18} />
                          <span className="text-sm">Aguardando Liquidação...</span>
                      </div>
                  )}

                  {showOB ? (
                      <div className="bg-white p-4 rounded-xl border border-l-4 border-l-purple-500 shadow-sm flex justify-between items-center cursor-pointer hover:shadow-md transition-all group" onClick={() => setSelectedDoc({ title: 'ORDEM BANCÁRIA', document_type: 'OB', metadata: { doc_number: '2024OB00231' } })}>
                          <div>
                              <p className="font-bold text-gray-800 group-hover:text-purple-600 transition-colors">Ordem Bancária (OB)</p>
                              <p className="text-xs text-gray-500">Pagamento efetuado na conta do suprido.</p>
                          </div>
                          <ExternalLink size={16} className="text-gray-400 group-hover:text-purple-600"/>
                      </div>
                  ) : (
                      <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 flex items-center gap-3 text-gray-400">
                          <Clock size={18} />
                          <span className="text-sm">Aguardando Pagamento...</span>
                      </div>
                  )}
              </div>
          </div>
      );
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

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
            <button className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-900 transition-all">
                Ações do Processo
            </button>
        </div>

        <div className="flex-1 max-w-[1600px] w-full mx-auto px-8 py-8 flex flex-col">
            
            {/* Abas */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar border-b border-gray-200">
                {[
                    { id: 'OVERVIEW', label: 'Visão Geral', icon: Eye },
                    { id: 'DOSSIER', label: 'Dossiê Digital', icon: FolderOpen },
                    { id: 'EXECUTION', label: 'Execução', icon: Wallet },
                    { id: 'ANALYSIS', label: 'Análise Técnica', icon: ShieldCheck },
                    { id: 'ACCOUNTABILITY', label: 'Prestação de Contas', icon: Receipt },
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
                        
                        {/* MODAL DE VISUALIZAÇÃO DE DOCUMENTO (EXECUÇÃO) */}
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
                    </div>
                )}

                {activeTab === 'ANALYSIS' && <AnalysisTab />}

                {activeTab === 'ACCOUNTABILITY' && (
                    <div className="animate-in fade-in bg-white rounded-xl shadow-sm border border-gray-200 min-h-[600px]">
                        
                        {/* SE FOR GESTOR E ESTIVER AGUARDANDO ATESTO, MOSTRA PAINEL DE REVISÃO */}
                        {currentUserRole === 'GESTOR' && accountabilityData?.status === 'WAITING_MANAGER' ? (
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
            </div>
        </div>
    </div>
  );
};