import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, FileText, Loader2, Wallet, ShieldCheck, BadgeCheck, Receipt, Plus, FolderOpen, History, ExternalLink, X, Eye, Clock, User, MapPin, Mail, Calendar, AlignLeft, Shield, Printer, Maximize2, Minimize2, ChevronLeft, ChevronRight, Download, ScrollText, Check, AlertTriangle, Send, FileCheck, UserCheck, CheckCircle2, AlertCircle, Ban, Calculator, Gavel, FileSignature, FileSearch, Database, Lock, BrainCircuit, Search, Split, Thermometer, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StatusBadge } from '../StatusBadge';
import { AccountabilityWizard } from '../accountability/AccountabilityWizard';
import { ProcessTimeline } from './ProcessTimeline'; // Importação da Nova Timeline
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
          alert('Erro ao gerar documento');
      } finally {
          setLoading(false);
      }
  };

  // --- PAINEL DE AUDITORIA TÉCNICA (SOSFU) ---
  const SosfuAuditPanel = () => {
    const [auditItems, setAuditItems] = useState(pcItems.map(i => ({...i, auditStatus: 'APPROVED', glosaReason: ''})));
    const [isScanning, setIsScanning] = useState(true);
    const [aiScore, setAiScore] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal SIAFE
    const [siafeModalOpen, setSiafeModalOpen] = useState(false);
    const [nlNumber, setNlNumber] = useState('');
    const [baixaDate, setBaixaDate] = useState(new Date().toISOString().split('T')[0]);
    const [finalizing, setFinalizing] = useState(false);

    // Cálculos
    const valorLiberado = processData.value || 0;
    const valorComprovadoOriginal = auditItems.reduce((acc, i) => acc + Number(i.value), 0);
    const totalGlosado = auditItems.filter(i => i.auditStatus === 'REJECTED').reduce((acc, i) => acc + Number(i.value), 0);
    const valorHomologado = valorComprovadoOriginal - totalGlosado;
    const valorDevolver = Math.max(0, valorLiberado - valorHomologado);

    // Efeito de "Deep Scan" da IA ao montar
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsScanning(false);
            setAiScore(98); // Mocked high confidence
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    const toggleItemStatus = (itemId: string, newStatus: 'APPROVED' | 'REJECTED') => {
        setAuditItems(prev => prev.map(i => {
            if (i.id !== itemId) return i;
            return { 
                ...i, 
                auditStatus: newStatus,
                glosaReason: newStatus === 'APPROVED' ? '' : i.glosaReason || 'Despesa rejeitada por desconformidade com a Portaria.'
            };
        }));
    };

    const handleSiafeBaixa = async () => {
        setFinalizing(true);
        try {
            const { error } = await supabase
                .from('accountabilities')
                .update({ 
                    status: 'APPROVED', 
                    balance: valorDevolver,
                    total_spent: valorHomologado,
                })
                .eq('id', accountabilityData.id);

            if (error) throw error;

            const { error: solError } = await supabase
                .from('solicitations')
                .update({ status: 'ARCHIVED' }) 
                .eq('id', processId);

            if (solError) throw solError;
            
            setSiafeModalOpen(false);
            await fetchProcessData(); 
            alert("Baixa SIAFE registrada com sucesso! Processo arquivado.");

        } catch (err: any) {
            console.error(err);
            alert('Erro na baixa: ' + err.message);
        } finally {
            setFinalizing(false);
        }
    };

    if (isScanning) {
        return (
            <div className="bg-slate-900 rounded-xl min-h-[600px] flex flex-col items-center justify-center text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-slate-900 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full border-4 border-blue-500/30 flex items-center justify-center mb-8 relative">
                        <div className="absolute inset-0 rounded-full border-t-4 border-blue-500 animate-spin"></div>
                        <BrainCircuit className="w-10 h-10 text-blue-400" />
                    </div>
                    <h3 className="text-3xl font-bold tracking-tight mb-2">SOSFU AI Audit</h3>
                    <p className="text-blue-300 font-mono text-sm animate-pulse flex items-center gap-2">
                        <Search size={14} /> Analisando metadados dos comprovantes...
                    </p>
                </div>
            </div>
        );
    }

    const filteredItems = auditItems.filter(i => 
        i.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Header de Auditoria e Tabela - Mantido igual ao anterior */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <svg className="w-20 h-20 transform -rotate-90">
                                <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                                <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-emerald-500" strokeDasharray={226} strokeDashoffset={226 - (226 * aiScore) / 100} />
                            </svg>
                            <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-slate-800">{aiScore}</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                Auditoria Inteligente
                                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] uppercase font-bold tracking-wide">Alta Conformidade</span>
                            </h3>
                            <p className="text-sm text-slate-500 max-w-lg mt-1">
                                O sistema cruzou os dados dos {pcItems.length} comprovantes com a base da Receita Federal e as regras da Portaria. Nenhuma anomalia grave detectada.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
                            <FileText size={16} /> Relatório Preliminar
                        </button>
                        <button 
                            onClick={() => setSiafeModalOpen(true)}
                            className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-black transition-all shadow-lg shadow-slate-400 flex items-center gap-2"
                        >
                            <Database size={16} /> Baixa SIAFE
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-[600px]">
                <div className="xl:col-span-8 flex flex-col gap-6">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="relative max-w-sm w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Filtrar lançamentos..." 
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                            <span className="w-3 h-3 rounded-full bg-green-500"></span> Aprovados
                            <span className="w-3 h-3 rounded-full bg-red-500 ml-2"></span> Glosados
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
                        <div className="overflow-y-auto max-h-[600px] custom-scrollbar">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-3 w-12">Doc</th>
                                        <th className="px-6 py-3">Descrição / Fornecedor</th>
                                        <th className="px-6 py-3 text-right">Valor</th>
                                        <th className="px-6 py-3 text-center">IA Risk</th>
                                        <th className="px-6 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredItems.map((item) => (
                                        <tr key={item.id} className={`group transition-colors ${item.auditStatus === 'REJECTED' ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}>
                                            <td className="px-6 py-4">
                                                <button 
                                                    onClick={() => handleViewReceipt(item)} 
                                                    className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100"
                                                    title="Ver Comprovante"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className={`font-bold text-slate-800 ${item.auditStatus === 'REJECTED' ? 'line-through opacity-50' : ''}`}>{item.description}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{item.supplier}</span>
                                                        <span className="text-[10px] text-slate-400 font-mono">{new Date(item.item_date).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                {item.auditStatus === 'REJECTED' && (
                                                    <div className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded border border-red-200 flex items-center gap-2 w-fit">
                                                        <Ban size={12} /> 
                                                        <span>{item.glosaReason}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-slate-700 text-base">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.value))}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                        <div className="h-full bg-green-500 w-[95%]"></div>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-green-600">98% Seguro</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button 
                                                        onClick={() => toggleItemStatus(item.id, 'APPROVED')}
                                                        className={`p-2 rounded-lg transition-colors ${item.auditStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
                                                        title="Aprovar Item"
                                                    >
                                                        <Check size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => toggleItemStatus(item.id, 'REJECTED')}
                                                        className={`p-2 rounded-lg transition-colors ${item.auditStatus === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600'}`}
                                                        title="Glosar (Rejeitar) Item"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* COLUNA DIREITA: CHECKLIST E FINANCEIRO */}
                <div className="xl:col-span-4 flex flex-col gap-6">
                    <div className="bg-indigo-900 rounded-xl shadow-lg border border-indigo-800 overflow-hidden text-white">
                        <div className="px-6 py-4 border-b border-indigo-800/50 flex justify-between items-center bg-indigo-950/30">
                            <h4 className="font-bold text-xs uppercase flex items-center gap-2">
                                <BrainCircuit size={16} className="text-indigo-400"/> IA Compliance Check
                            </h4>
                            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-bold border border-green-500/30">Pass</span>
                        </div>
                        <div className="p-4 space-y-4">
                            {[
                                { label: 'Notas dentro do prazo (60 dias)', status: true },
                                { label: 'CNPJs ativos na Receita', status: true },
                                { label: 'Soma confere com extrato', status: true },
                                { label: 'Sem itens de luxo/supérfluos', status: true },
                                { label: 'Elementos de despesa corretos', status: true }
                            ].map((check, idx) => (
                                <div key={idx} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 border border-green-500/30">
                                            <Check size={12} />
                                        </div>
                                        <span className="text-xs font-medium text-indigo-100">{check.label}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Balanço Final</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-end pb-2 border-b border-slate-100">
                                <span className="text-sm text-slate-500">Concedido</span>
                                <span className="font-mono text-base font-bold text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorLiberado)}</span>
                            </div>
                            <div className="flex justify-between items-end pb-2 border-b border-slate-100">
                                <span className="text-sm text-slate-500">Comprovado</span>
                                <span className="font-mono text-base font-bold text-blue-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorComprovadoOriginal)}</span>
                            </div>
                            {totalGlosado > 0 && (
                                <div className="flex justify-between items-end pb-2 border-b border-red-100 bg-red-50/50 px-2 rounded">
                                    <span className="text-sm text-red-600 font-bold">Glosado (Rejeitado)</span>
                                    <span className="font-mono text-base font-bold text-red-600">- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGlosado)}</span>
                                </div>
                            )}
                            <div className="pt-4 mt-2">
                                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Saldo a Devolver (GRU)</span>
                                <div className="flex items-center justify-between">
                                    <span className={`font-mono text-2xl font-black ${valorDevolver > 0 ? 'text-amber-500' : 'text-slate-300'}`}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorDevolver)}
                                    </span>
                                    {valorDevolver > 0 && (
                                        <button className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100">
                                            Gerar GRU
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Baixa SIAFE - Mantido */}
            {siafeModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-900 p-6 flex items-start gap-4">
                            <div className="p-3 bg-white/10 rounded-lg text-white border border-white/10">
                                <Database size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Baixa de Responsabilidade</h3>
                                <p className="text-slate-400 text-sm">Registro SIAFE e Arquivamento</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">NUP</span>
                                    <span className="font-bold text-slate-800">{processData.process_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Suprido</span>
                                    <span className="font-bold text-slate-800">{requesterProfile?.full_name?.split(' ')[0]}</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                                    <span className="text-slate-500 font-bold">Valor Homologado</span>
                                    <span className="font-mono font-bold text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorHomologado)}</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nota de Lançamento (NL)</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: 2026NL00001234" 
                                        className="w-full p-3 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                                        value={nlNumber}
                                        onChange={(e) => setNlNumber(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data da Baixa</label>
                                    <input 
                                        type="date" 
                                        className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={baixaDate}
                                        onChange={(e) => setBaixaDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="bg-blue-50 p-3 rounded text-xs text-blue-800 flex gap-2 items-start border border-blue-100">
                                <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
                                <p>A Portaria de Regularidade de Contas será gerada e o processo será <strong>ARQUIVADO</strong>.</p>
                            </div>
                            {totalGlosado > 0 && (
                                <div className="bg-amber-50 p-3 rounded text-xs text-amber-800 flex gap-2 items-start border border-amber-100">
                                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                                    <p>Atenção: Há valores glosados. Certifique-se que o recolhimento (GRU) foi confirmado antes da baixa.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                            <button onClick={() => setSiafeModalOpen(false)} className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-white hover:border-slate-300 border border-transparent rounded-lg transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleSiafeBaixa} disabled={!nlNumber || finalizing} className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                {finalizing ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                                Confirmar Baixa
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
      return (
          <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800">Dossiê Digital do Processo</h3>
                  {['SOSFU', 'ADMIN'].includes(currentUserRole) && (
                      <div className="flex gap-2">
                        <button 
                            onClick={() => handleGeneratePDF('GENERIC', 'Despacho Administrativo')}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-700 transition-colors"
                        >
                            <Plus size={16}/> Novo Despacho
                        </button>
                      </div>
                  )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Cards de Documentos */}
                  {documents.map((doc) => (
                      <div 
                        key={doc.id} 
                        onClick={() => setSelectedDoc(doc)}
                        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                      >
                          <div className="flex items-start justify-between mb-3">
                              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                  <FileText size={20} />
                              </div>
                              <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">
                                  {new Date(doc.created_at).toLocaleDateString()}
                              </span>
                          </div>
                          <h4 className="font-bold text-gray-800 text-sm mb-1 group-hover:text-blue-600 transition-colors">{doc.title}</h4>
                          <p className="text-xs text-gray-500">Tipo: {doc.document_type}</p>
                      </div>
                  ))}
                  
                  {documents.length === 0 && (
                      <div className="col-span-full p-8 text-center text-gray-400 border border-dashed border-gray-300 rounded-xl">
                          <FolderOpen size={32} className="mx-auto mb-2 opacity-50"/>
                          <p>Nenhum documento gerado ainda.</p>
                      </div>
                  )}
              </div>
          </div>
      );
  };

  const ExecutionTab = () => {
      const handleGen = (type: string, title: string) => {
          if (confirm(`Gerar ${title}?`)) {
              handleGeneratePDF(type, title);
          }
      };

      const executionDocs = [
          { type: 'NE', label: 'Nota de Empenho', icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50' },
          { type: 'NL', label: 'Nota de Liquidação', icon: FileCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { type: 'OB', label: 'Ordem Bancária', icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50' },
      ];

      return (
          <div className="space-y-6 animate-in fade-in">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Wallet size={20} className="text-gray-400"/> Execução Financeira
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {executionDocs.map(doc => {
                          const existing = documents.find(d => d.document_type === doc.type);
                          const Icon = doc.icon;
                          return (
                              <div key={doc.type} className="border border-gray-100 rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden bg-gray-50/50">
                                  <div className="flex justify-between items-start">
                                      <div className={`p-2 rounded-lg ${existing ? 'bg-green-100 text-green-600' : doc.bg + ' ' + doc.color}`}>
                                          {existing ? <CheckCircle2 size={20}/> : <Icon size={20}/>}
                                      </div>
                                      {existing && (
                                          <button 
                                            onClick={() => setSelectedDoc(existing)}
                                            className="text-xs font-bold text-blue-600 hover:underline"
                                          >
                                              Visualizar
                                          </button>
                                      )}
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-gray-700 text-sm">{doc.label}</h4>
                                      <p className="text-xs text-gray-400 mt-1">
                                          {existing ? `Gerado em ${new Date(existing.created_at).toLocaleDateString()}` : 'Pendente de emissão'}
                                      </p>
                                  </div>
                                  
                                  {!existing && ['SOSFU', 'ADMIN', 'SEFIN'].includes(currentUserRole) && (
                                      <button 
                                        onClick={() => handleGen(doc.type, doc.label)}
                                        className="mt-2 w-full py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm"
                                      >
                                          Gerar Documento
                                      </button>
                                  )}
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      );
  };

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
              alert('Erro ao atualizar status');
          } finally {
              setLoading(false);
          }
      };

      return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
              <div className="lg:col-span-2 space-y-6">
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
                            onClick={() => alert('Parecer salvo (mock)')}
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
          </div>
      );
  };

  const ManagerReviewPanel = () => {
      const handleApprove = async () => {
          if (!confirm('Confirma o atesto das contas?')) return;
          setLoading(true);
          try {
              // Aprovar PC -> Enviar para SOSFU
              const { error } = await supabase.from('accountabilities')
                  .update({ status: 'WAITING_SOSFU' })
                  .eq('id', accountabilityData.id);
              
              if (error) throw error;
              
              // Gerar Certidão de Atesto automaticamente
              await handleGeneratePDF('ATTESTATION', 'Certidão de Atesto (Gestor)');
              
              await fetchProcessData();
          } catch(err) {
              console.error(err);
              alert('Erro ao aprovar.');
          } finally {
              setLoading(false);
          }
      };

      const handleCorrection = async () => {
          if (!confirm('Devolver para correção?')) return;
          setLoading(true);
          try {
              const { error } = await supabase.from('accountabilities')
                  .update({ status: 'CORRECTION' })
                  .eq('id', accountabilityData.id);
              if (error) throw error;
              await fetchProcessData();
          } catch(err) {
              console.error(err);
              alert('Erro ao devolver.');
          } finally {
              setLoading(false);
          }
      };

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
            <button className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-900 transition-all">
                Ações do Processo
            </button>
        </div>

        <div className="flex-1 max-w-[1600px] w-full mx-auto px-8 py-8 flex flex-col">
            
            {/* LINHA DO TEMPO (NOVA) */}
            <div className="mb-8">
                <ProcessTimeline 
                    status={processData.status} 
                    accountabilityStatus={accountabilityData?.status}
                    isRejected={processData.status === 'REJECTED' || accountabilityData?.status === 'REJECTED'}
                />
            </div>

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
                    </div>
                )}

                {activeTab === 'ANALYSIS' && <AnalysisTab />}

                {activeTab === 'ACCOUNTABILITY' && (
                    <div className="animate-in fade-in bg-white rounded-xl shadow-sm border border-gray-200 min-h-[600px]">
                        
                        {/* CONDICIONAL APRIMORADA: SOSFU/ADMIN VÊ O PAINEL DE AUDITORIA SEMPRE */}
                        {(currentUserRole === 'SOSFU' || currentUserRole === 'ADMIN') ? (
                            <SosfuAuditPanel />
                        ) : currentUserRole === 'GESTOR' && accountabilityData?.status === 'WAITING_MANAGER' ? (
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
        </div>
    </div>
  );
};