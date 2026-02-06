import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, FileText, Loader2, Wallet, ShieldCheck, BadgeCheck, Receipt, Plus, FolderOpen, History, ExternalLink, X, Eye, Clock, User, MapPin, Mail, Calendar, AlignLeft, Shield, Printer, Maximize2, Minimize2, ChevronLeft, ChevronRight, Download, ScrollText, Check } from 'lucide-react';
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

// Placeholder widgets (Mantidos)
const FinancialSummaryWidget = () => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <h4 className="font-bold text-gray-700 text-sm mb-2">Resumo Financeiro</h4>
        <div className="h-20 bg-gray-50 rounded flex items-center justify-center text-xs text-gray-400">
            Gráfico de execução orçamentária
        </div>
    </div>
);

const GeneralInfoWidget = () => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <h4 className="font-bold text-gray-700 text-sm mb-2">Informações Gerais</h4>
        <div className="space-y-2">
            <div className="h-2 bg-gray-100 rounded w-3/4"></div>
            <div className="h-2 bg-gray-100 rounded w-1/2"></div>
        </div>
    </div>
);

const AutomaticCertificatesWidget = () => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <h4 className="font-bold text-gray-700 text-sm mb-2">Certidões Automáticas</h4>
        <div className="flex gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <BadgeCheck size={16} />
            </div>
            <div className="text-xs text-gray-500">
                <p>Certidão Negativa (Receita)</p>
                <p className="text-green-600 font-bold">Válida</p>
            </div>
        </div>
    </div>
);

const VerifiedItemsTable = () => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <h4 className="font-bold text-gray-700 text-sm mb-4">Itens Verificados</h4>
        <div className="text-center py-8 text-gray-400 text-xs">
            Aguardando análise detalhada dos itens.
        </div>
    </div>
);

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
        
        if (docs && docs.length > 0 && !selectedDoc) {
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
                .eq('accountability_id', accData.id);
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

  // --- WIDGETS DO PAINEL ---

  const OverviewTab = () => (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <User size={16} className="text-blue-600" />
                      Dados do Suprido (Solicitante)
                  </h3>
                  <div className="flex items-start gap-4 mb-6">
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl border-2 border-white shadow-sm overflow-hidden">
                          {requesterProfile?.avatar_url ? <img src={requesterProfile.avatar_url} className="w-full h-full object-cover"/> : requesterProfile?.full_name?.charAt(0)}
                      </div>
                      <div>
                          <h4 className="font-bold text-gray-900 text-lg uppercase">{requesterProfile?.full_name}</h4>
                          <p className="text-sm text-gray-500">{requesterProfile?.cargo || 'Cargo não informado'}</p>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                              {requesterProfile?.vinculo || 'Servidor'}
                          </span>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="p-3 bg-gray-50 rounded-lg">
                          <span className="text-[10px] font-bold text-gray-400 uppercase block">Matrícula</span>
                          <span className="font-medium text-gray-700 font-mono">{requesterProfile?.matricula || '-'}</span>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                          <span className="text-[10px] font-bold text-gray-400 uppercase block">CPF</span>
                          <span className="font-medium text-gray-700 font-mono">{requesterProfile?.cpf || '-'}</span>
                      </div>
                      <div className="col-span-2 p-3 bg-gray-50 rounded-lg">
                          <span className="text-[10px] font-bold text-gray-400 uppercase block">Email Institucional</span>
                          <span className="font-medium text-gray-700 flex items-center gap-2">
                              <Mail size={14} className="text-gray-400" /> {requesterProfile?.email}
                          </span>
                      </div>
                      <div className="col-span-2 p-3 bg-gray-50 rounded-lg">
                          <span className="text-[10px] font-bold text-gray-400 uppercase block">Lotação / Unidade</span>
                          <span className="font-medium text-gray-700 flex items-center gap-2">
                              <MapPin size={14} className="text-gray-400" /> {requesterProfile?.lotacao || processData?.unit}
                          </span>
                      </div>
                  </div>
              </div>

              <div className="space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Shield size={16} className="text-indigo-600" />
                          Gestor da Unidade
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                          <div className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border-2 border-white">
                                  {processData?.manager_name?.charAt(0) || 'G'}
                              </div>
                              <div>
                                  <p className="text-sm font-bold text-gray-800">{processData?.manager_name || 'Não informado'}</p>
                                  <p className="text-xs text-gray-500 flex items-center gap-1">
                                      <Mail size={10} /> {processData?.manager_email || 'Email não informado'}
                                  </p>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Calendar size={16} className="text-emerald-600" />
                          Detalhes do Evento
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                              <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">Valor Concedido</span>
                              <span className="text-xl font-bold text-emerald-800">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(processData?.value || 0)}
                              </span>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Período</span>
                              <span className="text-sm font-bold text-gray-700">
                                  {processData?.event_start_date ? new Date(processData.event_start_date).toLocaleDateString() : 'N/A'} 
                                  {' até '} 
                                  {processData?.event_end_date ? new Date(processData.event_end_date).toLocaleDateString() : 'N/A'}
                              </span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <AlignLeft size={16} className="text-gray-600" />
                  Resumo da Justificativa
              </h3>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-serif">
                  {processData?.justification || 'Nenhuma justificativa informada.'}
              </div>
          </div>
      </div>
  );

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
                      
                      // Adiciona imagem, ajustando altura se necessário
                      // Se for maior que A4, o jsPDF cortaria. 
                      // Para este caso, assumimos documentos padrão A4.
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
                        {/* Renderiza Doc Selecionado na Execução se houver */}
                        {selectedDoc && (
                            <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
                                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                                        <h3 className="font-bold">{selectedDoc.title}</h3>
                                        <button onClick={() => setSelectedDoc(null)}><X /></button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-8 bg-slate-100 flex justify-center">
                                        <div className="w-full max-w-[210mm] bg-white shadow-lg min-h-[297mm]">
                                            {renderDocumentContent(selectedDoc)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'ANALYSIS' && (
                    <div className="animate-in fade-in">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                            <FinancialSummaryWidget />
                            <GeneralInfoWidget />
                            <AutomaticCertificatesWidget />
                        </div>
                        <div className="grid grid-cols-1">
                            <VerifiedItemsTable />
                        </div>
                    </div>
                )}

                {activeTab === 'ACCOUNTABILITY' && (
                    <div className="animate-in fade-in bg-white rounded-xl shadow-sm border border-gray-200 min-h-[600px]">
                        {accountabilityData ? (
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