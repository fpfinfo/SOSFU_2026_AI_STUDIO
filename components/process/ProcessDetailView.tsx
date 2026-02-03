import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, FileText, FolderOpen, Calendar, DollarSign, User, CheckCircle2, Clock, Eye, Download, Printer, Share2, Building2, CreditCard, ChevronRight, File, X, Send, Plus, Loader2, Stamp, Scale, Banknote, FileCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ProcessCoverTemplate, RequestTemplate, AttestationTemplate, GrantActTemplate, RegularityCertificateTemplate, CommitmentNoteTemplate, BankOrderTemplate } from './DocumentTemplates';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ProcessDetailViewProps {
  processId: string;
  onBack: () => void;
}

export const ProcessDetailView: React.FC<ProcessDetailViewProps> = ({ processId, onBack }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DOSSIER'>('DOSSIER'); 
  const [processData, setProcessData] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // States para Modais
  const [isTramitarOpen, setIsTramitarOpen] = useState(false);
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
  
  // Action States
  const [processingAction, setProcessingAction] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  
  // States para Novo Documento (Modal)
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState('DISPATCH'); // Padrão Despacho
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

        const { data: solicitation, error: solError } = await supabase.from('solicitations').select('*').eq('id', processId).single();
        if (solError) throw solError;
        setProcessData(solicitation);

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

  // --- DOC CHECKS ---
  const hasAttestation = documents.some(doc => doc.document_type === 'ATTESTATION');
  const hasGrantAct = documents.some(doc => doc.document_type === 'GRANT_ACT');
  const hasEmpenho = documents.some(doc => doc.document_type === 'COMMITMENT');
  const hasBankOrder = documents.some(doc => doc.document_type === 'BANK_ORDER');

  // --- ACTIONS ---

  const handleSupridoForwardToManager = async () => {
      if (!isSuprido) return;
      if (!confirm(`Deseja tramitar o processo ${processData.process_number} para a análise do Gestor?`)) return;

      setProcessingAction(true);
      try {
          const { error } = await supabase.from('solicitations').update({ status: 'WAITING_MANAGER' }).eq('id', processId);
          if (error) throw error;
          
          await supabase.from('process_documents').insert({
              solicitation_id: processId,
              title: 'DESPACHO DE ENCAMINHAMENTO',
              description: `Encaminho o presente processo à Chefia Imediata para análise e emissão da Certidão de Atesto, conforme regulamento vigente.\n\nRespeitosamente,\n${currentUser.full_name}\n${currentUser.cargo || 'Servidor'}`,
              document_type: 'DISPATCH',
              status: 'GENERATED'
          });

          await fetchProcessData();
          alert('Processo tramitado para o Gestor com sucesso!');
      } catch (error: any) {
          alert('Erro ao tramitar: ' + error.message);
      } finally {
          setProcessingAction(false);
      }
  };

  const handleGestorAction = async () => {
      if (!isGestor) return;
      setProcessingAction(true);
      try {
          if (!hasAttestation) {
              await supabase.from('process_documents').insert({
                  solicitation_id: processId,
                  title: 'CERTIDÃO DE ATESTO DA CHEFIA',
                  description: `Assinado por ${currentUser.full_name}`,
                  document_type: 'ATTESTATION',
                  status: 'SIGNED'
              });
          }
          await supabase.from('solicitations').update({ status: 'WAITING_SOSFU_ANALYSIS' }).eq('id', processId);
          await fetchProcessData();
          alert('Atesto gerado e processo tramitado para a SOSFU!');
      } catch (e: any) { alert(e.message); } finally { setProcessingAction(false); }
  };

  const handleSOSFUGenerateBatch = async () => {
      if (!isSOSFU) return;
      if (!confirm('Gerar minutas de: Portaria, Certidão, Empenho, Liquidação e OB?')) return;
      
      setProcessingAction(true);
      try {
          const docsToCreate = [
              { title: 'CERTIDÃO DE REGULARIDADE', type: 'REGULARITY', desc: 'Análise técnica de conformidade.' },
              { title: 'ATO DE CONCESSÃO (PORTARIA)', type: 'GRANT_ACT', desc: 'Minuta para assinatura do Ordenador.' },
              { title: 'NOTA DE EMPENHO', type: 'COMMITMENT', desc: 'Reserva orçamentária.' },
              { title: 'LIQUIDAÇÃO DA DESPESA', type: 'LIQUIDATION', desc: 'Reconhecimento da obrigação.' },
              { title: 'ORDEM BANCÁRIA (OB)', type: 'BANK_ORDER', desc: 'Autorização de pagamento.' }
          ];

          for (const doc of docsToCreate) {
              await supabase.from('process_documents').insert({
                  solicitation_id: processId,
                  title: doc.title,
                  description: doc.desc,
                  document_type: doc.type,
                  status: 'GENERATED'
              });
          }
          await fetchProcessData();
          alert('Documentos gerados! Verifique o Dossiê e encaminhe para SEFIN.');
      } catch (e: any) { alert(e.message); } finally { setProcessingAction(false); }
  };

  const handleSOSFUForwardToSEFIN = async () => {
      if (!isSOSFU) return;
      setProcessingAction(true);
      try {
          await supabase.from('solicitations').update({ status: 'WAITING_SEFIN_SIGNATURE' }).eq('id', processId);
          await fetchProcessData();
          alert('Encaminhado para assinatura do Ordenador (SEFIN).');
      } catch (e: any) { alert(e.message); } finally { setProcessingAction(false); }
  };

  const handleSEFINSign = async () => {
      if (!isSEFIN) return;
      if (!confirm('Assinar digitalmente o Ato de Concessão e a Nota de Empenho?')) return;
      
      setProcessingAction(true);
      try {
          await supabase.from('process_documents')
            .update({ status: 'SIGNED', description: `Assinado por ${currentUser.full_name}` })
            .eq('solicitation_id', processId)
            .in('document_type', ['GRANT_ACT', 'COMMITMENT']);

          await supabase.from('solicitations').update({ status: 'WAITING_SOSFU_PAYMENT' }).eq('id', processId);
          await fetchProcessData();
          alert('Documentos assinados. Processo devolvido à SOSFU para pagamento.');
      } catch (e: any) { alert(e.message); } finally { setProcessingAction(false); }
  };

  const handleSOSFUPay = async () => {
      if (!isSOSFU) return;
      setProcessingAction(true);
      try {
          await supabase.from('process_documents')
            .update({ status: 'SENT_TO_BANK', description: 'Enviado ao Banco' })
            .eq('solicitation_id', processId)
            .eq('document_type', 'BANK_ORDER');

          await supabase.from('solicitations').update({ status: 'WAITING_SUPRIDO_CONFIRMATION' }).eq('id', processId);
          await fetchProcessData();
          alert('Ordem Bancária enviada! Aguardando confirmação do Suprido.');
      } catch (e: any) { alert(e.message); } finally { setProcessingAction(false); }
  };

  const handleSupridoConfirm = async () => {
      if (!isSuprido) return;
      if (!confirm('O valor já está na sua conta corrente?')) return;
      
      setProcessingAction(true);
      try {
          await supabase.from('solicitations').update({ status: 'PAID' }).eq('id', processId);
          await fetchProcessData();
          alert('Processo concluído! Inicie a Prestação de Contas.');
      } catch (e: any) { alert(e.message); } finally { setProcessingAction(false); }
  };

  const handleNewDoc = async (e: React.FormEvent) => {
      e.preventDefault();
      setProcessingAction(true);
      try {
          const { error } = await supabase.from('process_documents').insert({
              solicitation_id: processId,
              title: newDocTitle,
              description: newDocDesc, // O backend salva o texto
              document_type: newDocType,
              status: 'GENERATED'
          });

          if (error) throw error;

          await fetchProcessData();
          setIsNewDocOpen(false);
          setNewDocTitle('');
          setNewDocDesc('');
          setNewDocType('DISPATCH');
          alert('Documento anexado com sucesso!');
      } catch (error: any) {
          alert('Erro ao criar documento: ' + error.message);
      } finally {
          setProcessingAction(false);
      }
  };

  const handlePrint = () => {
    if (!documentRef.current) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(`<html><head><title>DOC</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-white p-8">${documentRef.current.innerHTML}<script>setTimeout(()=>{window.print();window.close();},500);</script></body></html>`);
        printWindow.document.close();
    }
  };

  const handleDownloadPDF = async () => {
    if (!documentRef.current || !previewDoc) return;
    setIsDownloading(true);
    try {
        const canvas = await html2canvas(documentRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = 210;
        const pageHeight = 297;
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        // Adiciona a primeira página
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;

        // Se o conteúdo for maior que uma página (A4), cria páginas adicionais
        while (heightLeft > 0) {
            position = heightLeft - imgHeight; // Move a "janela" de renderização
            pdf.addPage();
            // A posição negativa "sobe" a imagem para mostrar a parte inferior
            pdf.addImage(imgData, 'PNG', 0, position - (heightLeft - pageHeight), pdfWidth, imgHeight); 
            heightLeft -= pageHeight;
        }

        pdf.save(`${previewDoc.title}.pdf`);
    } catch (e) { 
        console.error(e); 
        alert("Erro ao gerar PDF.");
    } finally { 
        setIsDownloading(false); 
    }
  };

  // Componente de Cabeçalho Padrão para Docs Dinâmicos
  const OfficialHeader = () => (
      <div className="text-center mb-10 pb-6 border-b-2 border-slate-800">
          <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/217479058_brasao-tjpa.png" 
              alt="Brasão TJPA" 
              className="h-20 mx-auto mb-4"
          />
          <h1 className="text-lg font-bold uppercase tracking-widest text-slate-900">Poder Judiciário</h1>
          <h2 className="text-base font-semibold uppercase tracking-wider text-slate-700">Tribunal de Justiça do Estado do Pará</h2>
          <p className="text-xs text-slate-500 mt-2 font-mono uppercase">Processo Administrativo Nº {processData.process_number}</p>
      </div>
  );

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (!processData) return <div>Processo não encontrado.</div>;

  const statusInfo = {
      label: processData.status.replace(/_/g, ' '),
      color: 'bg-blue-100 text-blue-800'
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-12 relative animate-in fade-in">
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusInfo.color}`}>{statusInfo.label}</span>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-3">
            {/* SUPRIDO */}
            {isSuprido && processData.status === 'PENDING' && (
                <button onClick={handleSupridoForwardToManager} disabled={processingAction} className="btn-primary bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                    {processingAction ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} Tramitar para Gestor
                </button>
            )}

            {/* GESTOR */}
            {isGestor && processData.status === 'WAITING_MANAGER' && (
                <button onClick={handleGestorAction} disabled={processingAction} className="btn-primary bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                    {processingAction ? <Loader2 className="animate-spin" size={16} /> : <Stamp size={16} />} Atestar e Tramitar
                </button>
            )}

            {/* SOSFU */}
            {isSOSFU && processData.status === 'WAITING_SOSFU_ANALYSIS' && (
                <>
                    {!hasGrantAct ? (
                        <button onClick={handleSOSFUGenerateBatch} disabled={processingAction} className="btn-primary bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                            {processingAction ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />} Gerar Kit Processual
                        </button>
                    ) : (
                        <button onClick={handleSOSFUForwardToSEFIN} disabled={processingAction} className="btn-primary bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                            <Send size={16} /> Enviar p/ SEFIN
                        </button>
                    )}
                </>
            )}

            {/* SEFIN */}
            {isSEFIN && processData.status === 'WAITING_SEFIN_SIGNATURE' && (
                <button onClick={handleSEFINSign} disabled={processingAction} className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                    {processingAction ? <Loader2 className="animate-spin" size={16} /> : <Scale size={16} />} Assinar e Devolver
                </button>
            )}

            {/* PAY */}
            {isSOSFU && processData.status === 'WAITING_SOSFU_PAYMENT' && (
                <button onClick={handleSOSFUPay} disabled={processingAction} className="btn-primary bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                    {processingAction ? <Loader2 className="animate-spin" size={16} /> : <Banknote size={16} />} Executar Pagamento
                </button>
            )}

            {/* CONFIRM */}
            {isSuprido && processData.status === 'WAITING_SUPRIDO_CONFIRMATION' && (
                <button onClick={handleSupridoConfirm} disabled={processingAction} className="btn-primary bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                    {processingAction ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Confirmar Recebimento
                </button>
            )}

            <button 
                onClick={() => setIsNewDocOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-all text-sm shadow-sm"
            >
                <Plus size={16} />
                Novo Doc
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
            <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)] min-h-[600px]">
                <div className="col-span-4 bg-white rounded-xl border border-gray-200 overflow-y-auto p-2 space-y-2">
                    {documents.map((doc, idx) => (
                        <button key={doc.id} onClick={() => setPreviewDoc(doc)} className={`w-full text-left p-4 rounded-lg border flex items-center gap-3 ${previewDoc?.id === doc.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
                            <div className={`w-10 h-10 rounded flex items-center justify-center font-bold text-xs text-white ${doc.document_type === 'GRANT_ACT' ? 'bg-emerald-500' : doc.document_type === 'COMMITMENT' ? 'bg-purple-500' : 'bg-blue-500'}`}>{doc.document_type.substring(0,3)}</div>
                            <div className="flex-1 min-w-0"><p className="text-[10px] font-bold text-gray-400">Fls. {idx+1}</p><p className="text-xs font-bold truncate text-gray-700">{doc.title}</p></div>
                        </button>
                    ))}
                </div>
                
                {/* PREVIEW CONTAINER - CORRIGIDO SCROLL E CABEÇALHO */}
                <div className="col-span-8 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
                    <div className="h-12 border-b flex items-center justify-between px-4 bg-gray-50 shrink-0">
                        <span className="text-xs font-bold text-gray-600">{previewDoc?.title}</span>
                        <div className="flex gap-2">
                            <button onClick={handlePrint} className="p-1.5 hover:bg-gray-200 rounded text-gray-500"><Printer size={16}/></button>
                            <button onClick={handleDownloadPDF} className="p-1.5 hover:bg-gray-200 rounded text-gray-500">{isDownloading ? <Loader2 size={16} className="animate-spin"/> : <Download size={16}/>}</button>
                        </div>
                    </div>
                    
                    <div className="flex-1 bg-gray-100/50 p-8 overflow-y-auto relative flex flex-col items-center">
                        {previewDoc && (
                            <div 
                                ref={documentRef} 
                                className="bg-transparent w-full max-w-[210mm] mx-auto text-black relative"
                            >
                                {previewDoc.document_type === 'COVER' && <ProcessCoverTemplate data={processData} user={userProfile || {}} />}
                                {previewDoc.document_type === 'REQUEST' && <RequestTemplate data={processData} user={userProfile || {}} />}
                                {previewDoc.document_type === 'ATTESTATION' && <AttestationTemplate data={processData} user={userProfile || {}} gestor={currentUser} />}
                                {previewDoc.document_type === 'GRANT_ACT' && <GrantActTemplate data={processData} user={userProfile || {}} signer={currentUser} />}
                                {previewDoc.document_type === 'REGULARITY' && <RegularityCertificateTemplate data={processData} user={userProfile || {}} />}
                                {previewDoc.document_type === 'COMMITMENT' && <CommitmentNoteTemplate data={processData} user={userProfile || {}} signer={currentUser} />}
                                {(previewDoc.document_type === 'LIQUIDATION' || previewDoc.document_type === 'BANK_ORDER') && <BankOrderTemplate data={processData} user={userProfile || {}} />}
                                
                                {/* TEMPLATES GENÉRICOS (DESPACHO, MEMO) AGORA COM CABEÇALHO */}
                                {(previewDoc.document_type === 'DISPATCH' || previewDoc.document_type === 'MEMO' || previewDoc.document_type === 'OTHER') && (
                                    <div className="bg-white shadow-xl min-h-[297mm] p-16 text-justify font-serif flex flex-col">
                                        <OfficialHeader />
                                        
                                        <h2 className="text-xl font-bold uppercase mb-8 text-center underline decoration-slate-300 underline-offset-4">
                                            {previewDoc.title}
                                        </h2>
                                        
                                        <div className="whitespace-pre-wrap leading-8 text-base text-slate-800 mb-12 min-h-[200px]">
                                            {previewDoc.description}
                                        </div>
                                        
                                        <div className="mt-auto text-center pt-8 border-t border-slate-300 w-2/3 mx-auto">
                                            <p className="text-xs text-slate-400 italic mb-1">Documento assinado digitalmente no sistema SOSFU</p>
                                            <p className="text-sm font-bold text-slate-800 uppercase">{currentUser?.full_name}</p>
                                            <p className="text-xs text-slate-600">{new Date(previewDoc.created_at).toLocaleDateString('pt-BR')} às {new Date(previewDoc.created_at).toLocaleTimeString('pt-BR')}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* MODAL NOVO DOC */}
        {isNewDocOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-800">Adicionar Novo Documento</h3>
                        <button onClick={() => setIsNewDocOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
                    </div>
                    <form onSubmit={handleNewDoc} className="p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Tipo de Documento</label>
                            <select 
                                value={newDocType} 
                                onChange={(e) => setNewDocType(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="DISPATCH">Despacho</option>
                                <option value="MEMO">Memorando</option>
                                <option value="OTHER">Outros Documentos</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Título</label>
                            <input 
                                type="text" 
                                value={newDocTitle}
                                onChange={(e) => setNewDocTitle(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                placeholder="Ex: Despacho de Encaminhamento"
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Conteúdo / Texto</label>
                            <textarea 
                                value={newDocDesc}
                                onChange={(e) => setNewDocDesc(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm h-48 resize-none outline-none focus:ring-2 focus:ring-blue-100 leading-relaxed"
                                placeholder="Digite o teor do documento aqui..."
                                required 
                            />
                        </div>
                        <div className="pt-4 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsNewDocOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                            <button type="submit" disabled={processingAction} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-2">
                                {processingAction ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Adicionar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};