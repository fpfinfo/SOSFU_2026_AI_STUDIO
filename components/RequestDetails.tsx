
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { signRequest, getProfile, getRequestHistory, updateRequestStatus, signByOrdenador, returnByOrdenador, updateRequest, tramitarRequest } from '../services/dataService';
import { generateFormalDocument, analyzeRequestProcess } from '../services/geminiService';
import { RequestItem, Profile, HistoryItem, AppModule } from '../types';
import { supabase } from '../services/supabaseClient';

interface RequestDetailsProps {
  request: RequestItem;
  onBack: () => void;
  isManagerView?: boolean;
  activeModule?: AppModule;
  onRefresh?: () => void;
}

type DetailTab = 'Visão Geral' | 'Dossiê Digital' | 'Análise Técnica' | 'Execução' | 'Prestação de Contas' | 'Baixa SIAFE' | 'Arquivo' | 'Ordenador';

interface CustomDoc {
  id: string;
  name: string;
  icon: string;
  date: string;
  status: string;
  content: string;
  isUpload?: boolean;
  fileUrl?: string;
  creatorProfile?: Profile;
  signatureDate?: string;
}

const RequestDetails: React.FC<RequestDetailsProps> = ({ request, onBack, isManagerView = false, activeModule, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('Visão Geral');
  const [selectedDocId, setSelectedDocId] = useState<string>('doc-1');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [technicalOpinion, setTechnicalOpinion] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessingDecision, setIsProcessingDecision] = useState(false);
  const [isConsolidated, setIsConsolidated] = useState(false);
  const [managerProfile, setManagerProfile] = useState<Profile | null>(null);
  const [requesterProfile, setRequesterProfile] = useState<Profile | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signPassword, setSignPassword] = useState('');
  const [signLoading, setSignLoading] = useState(false);
  const [signError, setSignError] = useState('');

  const [customDocs, setCustomDocs] = useState<CustomDoc[]>([]);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const executionUploadRef = useRef<HTMLInputElement>(null);
  const [pendingExecUploadType, setPendingExecUploadType] = useState<'doc-ne' | 'doc-dl' | 'doc-ob' | null>(null);
  const [tramitedExecDocs, setTramitedExecDocs] = useState<string[]>([]);

  // Ordenador de Despesas (SEFIN)
  const [ordenadorProfile, setOrdenadorProfile] = useState<Profile | null>(null);
  const [ordenadorNotes, setOrdenadorNotes] = useState('');
  const [showOrdenadorSignModal, setShowOrdenadorSignModal] = useState(false);
  const [isOrdenadorSigning, setIsOrdenadorSigning] = useState(false);
  const [ordenadorSignError, setOrdenadorSignError] = useState('');
  const [ordenadorSignPassword, setOrdenadorSignPassword] = useState('');
  
  // Tramitação
  const [showTramitarModal, setShowTramitarModal] = useState(false);
  const [targetModule, setTargetModule] = useState<AppModule | ''>('');
  const [tramitarNotes, setTramitarNotes] = useState('');
  const [isTramitando, setIsTramitando] = useState(false);
  const [tramitarError, setTramitarError] = useState('');

  // Novas funcionalidades (Dossiê)
  const [aiResult, setAiResult] = useState('');
  const [isEditingAi, setIsEditingAi] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Assinatura de Documentos Customizados IA
  const [showAiSignModal, setShowAiSignModal] = useState(false);
  const [aiSignPassword, setAiSignPassword] = useState('');
  const [aiSignLoading, setAiSignLoading] = useState(false);
  const [aiSignError, setAiSignError] = useState('');
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);

  const isSefinView = activeModule === 'sefin';
  const isOrdenadorPending = isSefinView && request.status === 'Assinatura Ordenador';

  const BRASAO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/217479058_brasao-tjpa.png";

  useEffect(() => {
    if (isManagerView && request.status === 'Pendente') {
      setSelectedDocId('doc-3');
      setActiveTab('Dossiê Digital');
    }
    if (isOrdenadorPending) {
      setSelectedDocId('doc-4');
      setActiveTab('Dossiê Digital');
    }
    if (request.status === 'Execucao') {
      setActiveTab('Execução');
    }
    getProfile(request.userId).then(setRequesterProfile);
    const targetManagerId = request.signedByManagerId;
    if (targetManagerId) {
        getProfile(targetManagerId).then(setManagerProfile);
    } else if (isManagerView) {
        supabase.auth.getUser().then(({data}) => {
            if (data.user) getProfile(data.user.id).then(setManagerProfile);
        });
    }
    // Carregar perfil do Ordenador
    if (isSefinView) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) getProfile(data.user.id).then(setOrdenadorProfile);
      });
    }
    if (request.signedByOrdenadorId) {
      getProfile(request.signedByOrdenadorId).then(setOrdenadorProfile);
    }
    getRequestHistory(request.id).then(setHistory);
  }, [request.id, isManagerView, request.signedByManagerId, isSefinView]);

  const loadHistory = async () => {
    try {
      const data = await getRequestHistory(request.id);
      setHistory(data);
    } catch (e) {
      console.error("Erro ao carregar histórico:", e);
    }
  };

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeRequestProcess(request);
      setAiAnalysis(result);
      setTechnicalOpinion(result.summary);
    } catch (e) {
      console.error("Erro na análise IA:", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDecision = async (status: string) => {
    setIsProcessingDecision(true);
    try {
      await updateRequestStatus(request.id, status, technicalOpinion);
      if (status === 'Assinatura Ordenador' && activeModule) {
        await updateRequest(request.id, { origin_module: activeModule });
      }
      if (onRefresh) onRefresh();
      onBack();
    } catch (e) {
      console.error("Erro ao registrar decisão:", e);
    } finally {
      setIsProcessingDecision(false);
    }
  };

  const canAnalyze = request.status === 'Em Analise' || request.status === 'Pendente';

  const handleSignAction = async () => {
    setSignLoading(true);
    setSignError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado.");
      const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email!, password: signPassword });
      if (authError) { setSignError("Senha incorreta."); return; }
      
      await signRequest(request.id, user.id);
      setShowSignModal(false);
      if (onRefresh) onRefresh();
      onBack();
    } catch (err) {
      setSignError("Erro na assinatura.");
    } finally {
      setSignLoading(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt) return;
    setAiGenerating(true);
    try {
      const content = await generateFormalDocument(aiPrompt, request);
      if (content) {
        setAiResult(content);
        setIsEditingAi(true);
      }
    } catch (e) {
      alert("Erro ao gerar documento com IA.");
    } finally {
      setAiGenerating(false);
    }
  };

  const generateExecDoc = async (type: 'doc-portaria' | 'doc-certidao') => {
    setAiGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const profile = await getProfile(user.id);
      
      const names = {
        'doc-portaria': 'PORTARIA DE CONCESSÃO SF',
        'doc-certidao': 'CERTIDÃO DE REGULARIDADE'
      };

      const newDoc: CustomDoc = {
        id: type,
        name: names[type],
        icon: type === 'doc-portaria' ? 'fa-file-invoice' : 'fa-certificate',
        date: new Date().toLocaleDateString(),
        status: 'Minuta',
        content: 'Conteúdo automatizado via sistema ÁGIL.',
        creatorProfile: profile,
        signatureDate: new Date().toISOString()
      };

      setCustomDocs(prev => [...prev.filter(d => d.id !== type), newDoc]);
      setSelectedDocId(newDoc.id);
      setIsConsolidated(false);
      setActiveTab('Dossiê Digital');
      
      alert(`${names[type]} — Minuta gerada com sucesso! Agora tramite para a SEFIN na Esteira de Execução.`);
    } catch (e) {
      console.error(e);
    } finally {
      setAiGenerating(false);
    }
  };



  const handleSaveAiDoc = () => {
    // Agora exigimos assinatura antes de salvar definitivamente
    setShowAiSignModal(true);
  };

  const finalizeAiDocSave = async () => {
    if (!aiResult) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAiSignError("Usuário não autenticado.");
      return;
    }

    const profile = await getProfile(user.id);
    
    const newDoc: CustomDoc = {
      id: `ai-${Date.now()}`,
      name: `${(customDocs.length + 4).toString().padStart(2, '0')} - DESPACHO IA`,
      icon: 'fa-robot-astronomer',
      date: new Date().toLocaleDateString(),
      status: 'Assinado',
      content: aiResult,
      creatorProfile: profile,
      signatureDate: new Date().toISOString()
    };

    setCustomDocs([...customDocs, newDoc]);
    setSelectedDocId(newDoc.id);
    setShowAiModal(false);
    setAiPrompt('');
    setAiResult('');
    setIsEditingAi(false);
    setShowAiSignModal(false);
    setAiSignPassword('');
    
    alert('Documento assinado e incluído no dossiê com sucesso!');
  };

  const handleAiSign = async () => {
    if (!aiSignPassword) return;
    setAiSignLoading(true);
    setAiSignError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado.");
      
      const { error: authError } = await supabase.auth.signInWithPassword({ 
        email: user.email!, 
        password: aiSignPassword 
      });

      if (authError) { 
        setAiSignError("Senha de assinatura incorreta."); 
        return; 
      }
      
      await finalizeAiDocSave();
    } catch (err: any) {
      setAiSignError(err.message || "Erro na assinatura.");
    } finally {
      setAiSignLoading(false);
    }
  };

  const handleUploadClick = () => {
    uploadInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadLoading(true);
      setTimeout(() => {
        const newDoc: CustomDoc = {
          id: `up-${Date.now()}`,
          name: `${(customDocs.length + 4).toString().padStart(2, '0')} - ${file.name.toUpperCase()}`,
          icon: 'fa-file-pdf',
          date: 'Upload Manual',
          status: 'Anexado',
          content: `Documento anexado manualmente pelo usuário: ${file.name}. \nEste documento foi digitalizado e integrado ao processo eletrônico sob fé pública do servidor responsável.`,
          isUpload: true,
          fileUrl: URL.createObjectURL(file)
        };
        setCustomDocs([...customDocs, newDoc]);
        setSelectedDocId(newDoc.id);
        setUploadLoading(false);
      }, 1500);
    }
  };

  const handleDeleteDoc = async () => {
    if (!docToDelete || !deleteReason) return;
    setIsDeleting(true);
    try {
      // Registrar exclusão no histórico (simulado ou via logAuditEvent)
      // await logAuditEvent(request.id, 'EXCLUSÃO DOC', `Documento excluído. Motivo: ${deleteReason}`);
      
      setCustomDocs(customDocs.filter(d => d.id !== docToDelete));
      if (selectedDocId === docToDelete) {
        setSelectedDocId('doc-1');
      }
      setShowDeleteModal(false);
      setDocToDelete(null);
      setDeleteReason('');
    } catch (err) {
      alert('Erro ao excluir documento.');
    } finally {
      setIsDeleting(false);
    }
  };

  const dossierList = useMemo(() => [
    { id: 'doc-1', name: '01 - CAPA DO PROCESSO', icon: 'fa-file-invoice', date: 'Digital', status: 'Gerado' },
    { id: 'doc-2', name: '02 - REQUERIMENTO INICIAL', icon: 'fa-file-lines', date: 'Assinado', status: 'Validado' },
    { id: 'doc-3', name: '03 - CERTIDÃO DE ATESTO', icon: 'fa-stamp', date: 'Gestão', status: request.signedByManagerId ? 'Assinado' : 'Pendente' },
    ...(['Assinatura Ordenador', 'Autorizado', 'Aprovado'].includes(request.status) ? [{
      id: 'doc-4',
      name: '04 - MINUTA DE AUTORIZAÇÃO',
      icon: 'fa-file-contract',
      date: 'SEFIN',
      status: request.signedByOrdenadorAt ? 'Assinado' : 'Aguardando'
    }] : []),
    ...customDocs.map(d => ({ id: d.id, name: d.name, icon: d.icon, date: d.date, status: d.status }))
  ], [request.status, request.signedByOrdenadorAt, customDocs]);

  const SideVerificationBar = () => (
    <div className="absolute left-4 top-0 bottom-0 flex flex-col items-center justify-center pointer-events-none select-none no-print" style={{ width: '20px' }}>
      <p className="text-[7px] font-bold text-slate-300 uppercase tracking-[0.4em] whitespace-nowrap -rotate-90 origin-center opacity-40">
        AUTENTICIDADE VERIFICADA DIGITALMENTE • ID: {request.id.slice(0,18).toUpperCase()} • SISTEMA ÁGIL TJPA
      </p>
    </div>
  );

  const SignatureFooter = ({ profile, date, label }: { profile: Profile | null, date?: string, label: string }) => (
    <div className="mt-auto pt-10 border-t border-slate-100 flex flex-col items-center font-sans">
      <div className="relative flex flex-col items-center group">
        {profile?.signatureUrl ? (
          <img src={profile.signatureUrl} className="max-h-20 opacity-90 mix-blend-multiply mb-2" alt="Assinatura" />
        ) : (
          <div className="italic text-slate-200 font-serif text-2xl py-6 opacity-40 select-none">
            {profile?.fullName || 'Assinatura Digital'}
          </div>
        )}
        <div className="h-px w-64 bg-slate-200 mb-2"></div>
        <p className="text-[9px] font-black text-slate-800 uppercase tracking-widest">{profile?.fullName || 'IDENTIFICAÇÃO NÃO CARREGADA'}</p>
        <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">
            {label} • CPF {profile?.cpf || '***.***.***-**'}
        </p>
        
        <div className="mt-4 flex items-center gap-6 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 no-print">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100">
               <i className="fa-solid fa-qrcode text-slate-400 text-xl"></i>
            </div>
            <div className="text-left">
                <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">VALIDADO VIA ÁGIL EM {date ? new Date(date).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}</p>
                <p className="text-[6px] text-slate-400 font-medium max-w-[200px] leading-tight mt-1">
                  A integridade deste documento é garantida por criptografia assimétrica e pode ser consultada no Portal de Verificação do TJPA.
                </p>
            </div>
        </div>
      </div>
    </div>
  );

  const renderDocumentContent = (docId: string) => {
    const commonStyles = "relative flex flex-col w-full h-full p-[2.5cm] text-justify font-serif text-slate-800 bg-white overflow-hidden";
    const customDoc = customDocs.find(d => d.id === docId);
    
    // NE, DL, OB: Render the original PDF via iframe if uploaded
    if (['doc-ne', 'doc-dl', 'doc-ob'].includes(docId) && customDoc?.fileUrl) {
      const docLabels: Record<string, string> = {
        'doc-ne': 'NOTA DE EMPENHO (NE)',
        'doc-dl': 'DOCUMENTO DE LIQUIDAÇÃO (DL)',
        'doc-ob': 'ORDEM BANCÁRIA (OB)'
      };
      return (
        <div className="relative flex flex-col w-full h-full bg-white overflow-hidden">
          {/* Header strip */}
          <div className="flex items-center justify-between px-8 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <i className={`fa-solid ${customDoc.icon} text-lg`}></i>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest">{docLabels[docId] || customDoc.name}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider opacity-60">PDF Original • Processo {request.nup}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                <i className="fa-solid fa-shield-check mr-1"></i> Documento Original
              </span>
              <a href={customDoc.fileUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                <i className="fa-solid fa-external-link mr-1"></i> Abrir
              </a>
            </div>
          </div>
          {/* PDF viewer */}
          <iframe
            src={`${customDoc.fileUrl}#toolbar=1&navpanes=0`}
            className="flex-1 w-full min-h-[800px] border-0"
            title={docLabels[docId]}
          />
          {/* Footer with upload metadata */}
          <div className="flex items-center justify-between px-8 py-3 bg-slate-50 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-cloud-arrow-up text-emerald-500 text-sm"></i>
              <p className="text-[9px] font-bold text-slate-500">
                Anexado por <span className="text-slate-900 font-black">{customDoc.creatorProfile?.fullName}</span> em {customDoc.date}
              </p>
            </div>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Armazenado no Supabase Storage • Bucket: documents</p>
          </div>
        </div>
      );
    }

    // Prioritize special templates for fixed IDs, even if they come from customDocs
    if (docId === 'doc-portaria') {
        // Helper: valor por extenso em português
        const valorPorExtenso = (valor: number): string => {
          const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
          const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
          const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

          const parteInteira = Math.floor(valor);
          const centavos = Math.round((valor - parteInteira) * 100);

          const extensoNumero = (n: number): string => {
            if (n === 0) return 'zero';
            if (n === 100) return 'cem';
            if (n < 20) return unidades[n];
            if (n < 100) {
              const d = Math.floor(n / 10);
              const u = n % 10;
              return u > 0 ? `${dezenas[d]} e ${unidades[u]}` : dezenas[d];
            }
            if (n < 1000) {
              const c = Math.floor(n / 100);
              const resto = n % 100;
              if (resto === 0) return n === 100 ? 'cem' : centenas[c];
              return `${centenas[c]} e ${extensoNumero(resto)}`;
            }
            if (n < 1000000) {
              const milhar = Math.floor(n / 1000);
              const resto = n % 1000;
              const milharStr = milhar === 1 ? 'mil' : `${extensoNumero(milhar)} mil`;
              return resto === 0 ? milharStr : `${milharStr} e ${extensoNumero(resto)}`;
            }
            return n.toString();
          };

          let resultado = extensoNumero(parteInteira);
          resultado += parteInteira === 1 ? ' real' : ' reais';
          if (centavos > 0) {
            resultado += ` e ${extensoNumero(centavos)}`;
            resultado += centavos === 1 ? ' centavo' : ' centavos';
          }
          return resultado;
        };

        // Cálculo de prazo: data de emissão (hoje) até end_date + 15 dias
        const dataEmissao = new Date();
        const endDateEvent = request.endDate ? new Date(request.endDate + 'T00:00:00') : dataEmissao;
        const dataFinalPrazo = new Date(endDateEvent);
        dataFinalPrazo.setDate(dataFinalPrazo.getDate() + 15);

        const formatDateBR = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

        return (
          <div className={commonStyles + " font-serif"} style={{ padding: '1.8cm 2.2cm' }}>
            <SideVerificationBar />
            <div className="flex flex-col items-center mb-8 space-y-3">
              <img src={BRASAO_URL} className="w-14" alt="" />
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-[0.18em] text-center border-b border-slate-200 pb-3 w-full">
                Tribunal de Justiça do Estado do Pará
              </h2>
            </div>
            
            <div className="space-y-6 text-[13px] leading-loose text-slate-800 px-6">
              <div className="flex items-baseline justify-center gap-2 mb-8">
                <span className="font-bold text-slate-900 uppercase tracking-tighter text-base">PORTARIA SF Nº</span>
                <span className="text-4xl font-black text-slate-900 tracking-tighter">
                  {Math.floor(Math.random() * 100).toString().padStart(3, '0')}
                </span>
                <span className="font-bold text-slate-900 text-base">/2026-SEPLAN/TJE</span>
              </div>
              
              <p className="indent-14 text-justify">
                <strong>O SECRETÁRIO DE PLANEJAMENTO, COORDENAÇÃO E FINANÇAS DO TRIBUNAL DE JUSTIÇA DO ESTADO DO PARÁ</strong>, no exercício das suas atribuições delegadas pela Presidência, e considerando o disposto na Resolução CNJ nº 169/2013 e nas normas internas deste Egrégio Tribunal,
              </p>
              
              <p className="font-bold uppercase tracking-widest text-sm mt-6">RESOLVE:</p>

              <div className="space-y-5">
                <p className="text-justify indent-12">
                  <strong>Art. 1º</strong> <strong>AUTORIZAR</strong> a concessão de Suprimento de Fundos ao servidor <strong>{request.userProfile?.fullName?.toUpperCase() || 'NÃO INFORMADO'}</strong>, matrícula <strong>{request.userProfile?.registrationNumber || '—'}</strong>, portador do CPF <strong>{request.userProfile?.cpf || '***.***.***-**'}</strong>, lotado na unidade <strong>{request.userProfile?.unit?.toUpperCase() || '—'}</strong>.
                </p>

                <p className="text-justify indent-12">
                  <strong>Art. 2º</strong> O valor total do presente Suprimento de Fundos é de <strong>R$ {request.totalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> ({valorPorExtenso(request.totalValue || 0)}), destinado a atender despesas extraordinárias e de pequeno vulto, devendo ser creditado na conta funcional do suprido:
                </p>

                <div className="pl-12 font-medium italic text-slate-600 flex items-center gap-8 flex-wrap">
                  <span>Banco: <strong>{request.userProfile?.bankCode || '—'} - {request.userProfile?.bankName || '—'}</strong></span>
                  <span>Agência: <strong>{request.userProfile?.bankAgency || '—'}</strong></span>
                  <span>Conta: <strong>{request.userProfile?.bankAccount || '—'}</strong></span>
                </div>

                <p className="text-justify indent-12">
                  <strong>Art. 3º</strong> A despesa correrá sob a responsabilidade orçamentária deste Tribunal, classificada nos seguintes elementos de despesa, conforme dotação aprovada para o exercício de {new Date().getFullYear()}:
                </p>

                <div className="pl-12 space-y-2 font-bold text-slate-900">
                  {request.items?.map((item: any, i: number) => (
                    <p key={i}>— {item.code || '—'} — {item.classification || item.description || '—'}: R$ {parseFloat(item.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  ))}
                </div>

                <p className="text-justify indent-12">
                  <strong>Art. 4º</strong> A aplicação e prestação de contas do valor referenciado no Artigo 2º desta Portaria deverão observar os prazos a seguir:
                </p>

                <p className="pl-12 font-bold text-slate-900">
                  <strong>Parágrafo Único:</strong> Prazo de aplicação e prestação de contas: <strong>{formatDateBR(dataEmissao)}</strong> até <strong>{formatDateBR(dataFinalPrazo)}</strong>.
                </p>
              </div>

              <div className="pt-8 space-y-3 text-center">
                <p className="font-black uppercase tracking-[0.2em] text-sm">Registre-se e Cumpra-se.</p>
                <p className="italic text-slate-500">Belém-PA, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            
            {/* Espaço para assinatura do Ordenador de Despesa */}
            <div className="pt-14 flex flex-col items-center font-sans">
              <div className="h-px w-64 bg-slate-300 mb-2"></div>
              <p className="text-[9px] font-black text-slate-800 uppercase tracking-widest">{ordenadorProfile?.fullName || 'NOME DO ORDENADOR DE DESPESA'}</p>
              <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">
                ORDENADOR DE DESPESA • SEPLAN/SEFIN • TJPA
              </p>
              {ordenadorProfile?.cpf && (
                <p className="text-[6px] text-slate-300 font-medium mt-1">CPF: {ordenadorProfile.cpf}</p>
              )}
            </div>
          </div>
        );
    }

    if (docId === 'doc-certidao') {
        return (
          <div className={commonStyles}>
            <SideVerificationBar />
            <div className="flex flex-col items-center mb-10 space-y-4">
              <img src={BRASAO_URL} className="w-16" alt="" />
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest font-sans text-center">Tribunal de Justiça do Estado do Pará</h2>
            </div>

            <div className="space-y-10 text-sm leading-relaxed">
              <div className="text-center space-y-2">
                <h3 className="font-sans font-black text-2xl uppercase tracking-tighter">CERTIDÃO DE REGULARIDADE</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic">Documento emitido via Sistema ÁGIL - SOSFU</p>
              </div>

              <div className="text-center">
                <p className="font-sans font-black text-lg uppercase tracking-tight">CERTIDÃO Nº {Math.floor(Math.random() * 9000 + 1000).toString()} / 2026-SOSFU/TJE</p>
              </div>

              <div className="space-y-6">
                <p className="indent-12">
                  <strong>CERTIFICO</strong>, para os devidos fins, que após consulta minuciosa aos registros do Sistema de Suprimento de Fundos (SISUP) e do SIAFE-PA, verificou-se que o(a) servidor(a) <strong>{request.userProfile?.fullName?.toUpperCase()}</strong>, matrícula <strong>{request.userProfile?.registrationNumber}</strong>, lotado(a) na unidade <strong>{request.userProfile?.unit?.toUpperCase()}</strong>, <strong>NÃO POSSUI PENDÊNCIAS</strong> de prestação de contas relativas a suprimentos de fundos anteriormente concedidos.
                </p>

                <p className="indent-12">
                  Constatou-se a plena regularidade fiscal e administrativa do(a) interessado(a), estando o mesmo em conformidade com as exigências da Resolução CNJ nº 169/2013 e da Instrução Normativa vigente deste Tribunal, estando <strong>APTO</strong> para o recebimento de nova concessão.
                </p>

                <p className="indent-12">
                  Esta certidão atesta a ausência de impedimentos para o prosseguimento do processo digital <strong>{request.nup}</strong>, referente à solicitação de <strong>{request.title.toUpperCase()}</strong>.
                </p>
              </div>

              <div className="bg-slate-50 p-8 rounded-4xl border border-slate-100 flex flex-col items-start gap-4">
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Validade e Autenticidade</h4>
                <p className="text-xs font-medium text-slate-500">
                  Esta certidão é válida por 30 dias. A autenticidade deste documento pode ser conferida através do QR Code de validação presente no rodapé, integrante do sistema de auditoria digital do TJPA.
                </p>
              </div>

              <div className="text-right italic text-xs mt-10">Belém-PA, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.</div>
            </div>

            <SignatureFooter profile={ordenadorProfile} date={customDoc?.signatureDate} label="ORDENADOR DE DESPESA" />
          </div>
        );
    }

    if (customDoc) {
      return (
        <div className={commonStyles}>
          <SideVerificationBar />
          <div className="flex flex-col items-center mb-16 space-y-4">
            <img src={BRASAO_URL} className="w-16" alt="" />
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest font-sans text-center">Tribunal de Justiça do Pará<br/><span className="text-sm font-medium text-slate-500">Dossiê de Documentação Integrada</span></h2>
          </div>
          <div className="space-y-8 text-sm leading-relaxed whitespace-pre-wrap">
             <p className="text-right font-sans font-bold text-xs mb-10">PROCESSO Nº: {request.nup}</p>
             <div className="italic font-serif leading-relaxed text-slate-800 p-8 border-l-4 border-slate-100 bg-slate-50/30 rounded-r-2xl">
                {customDoc.content}
             </div>
             {customDoc.isUpload && (
               <div className="mt-8 flex items-center gap-4 p-6 bg-blue-50 rounded-2xl border border-blue-100">
                 <i className="fa-solid fa-file-pdf text-blue-500 text-3xl"></i>
                 <div>
                   <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Mídia Externa Anexada</p>
                   <p className="text-[9px] text-blue-600 font-medium">O arquivo original está armazenado nos servidores de arquivos do TJPA.</p>
                 </div>
               </div>
             )}
          </div>
          <SignatureFooter 
             profile={customDoc.creatorProfile || request.userProfile} 
             date={customDoc.signatureDate || request.created_at} 
             label={customDoc.creatorProfile ? "SERVIDOR RESPONSÁVEL" : "RESPONSÁVEL PELA INCLUSÃO"} 
          />
        </div>
      );
    }

    switch (docId) {
      case 'doc-1':
        return (
          <div className={commonStyles}>
            <SideVerificationBar />
            <div className="flex flex-col items-center text-center space-y-6 pt-10">
              <img src={BRASAO_URL} className="w-24 h-auto drop-shadow-sm" alt="Brasão" />
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-[0.2em] font-sans">Poder Judiciário</h2>
                <p className="text-xl font-medium text-slate-500 uppercase tracking-[0.1em] font-sans">Tribunal de Justiça do Pará</p>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center items-center">
               <div className="w-full bg-slate-50 rounded-4xl p-16 border border-slate-100 text-center relative">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mb-4 font-sans">Número de Protocolo Unificado</p>
                  <h1 className="text-6xl font-black text-slate-900 tracking-tighter uppercase italic font-sans">{request.nup}</h1>
                  <img src={BRASAO_URL} className="absolute inset-0 m-auto w-64 opacity-[0.03] pointer-events-none" />
               </div>
               <div className="grid grid-cols-2 w-full gap-12 mt-20 text-left font-sans">
                  <div className="space-y-1">
                     <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Interessado</p>
                     <p className="text-base font-black text-slate-800 uppercase leading-tight">{request.userProfile?.fullName}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Modalidade</p>
                     <p className="text-base font-black text-slate-800 uppercase leading-tight">{request.title}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Data do Pedido</p>
                     <p className="text-base font-black text-slate-800 uppercase leading-tight">{new Date(request.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Valor Solicitado</p>
                     <p className="text-2xl font-black text-blue-600 italic">R$ {request.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
               </div>
            </div>
            <div className="mt-auto flex flex-col items-center gap-4 opacity-50 font-sans">
               <i className="fa-solid fa-barcode text-6xl text-slate-300"></i>
               <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">GERADO PELO SISTEMA ÁGIL - AUDITORIA EM TEMPO REAL</p>
            </div>
          </div>
        );
      case 'doc-2':
        return (
          <div className={commonStyles}>
            <SideVerificationBar />
            <div className="flex flex-col items-center mb-16 space-y-4">
              <img src={BRASAO_URL} className="w-16" alt="" />
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest font-sans text-center">Tribunal de Justiça do Pará<br/><span className="text-sm font-medium text-slate-500">Unidade de Gestão Financeira</span></h2>
            </div>
            <div className="space-y-8 text-sm leading-relaxed">
               <p className="text-right font-sans font-bold text-xs mb-10">PROCESSO Nº: {request.nup}</p>
               <p className="indent-12">
                 Eu, <strong>{request.userProfile?.fullName?.toUpperCase()}</strong>, ocupante do cargo de <strong>{request.userProfile?.role?.toUpperCase()}</strong>, lotado na <strong>{request.userProfile?.unit?.toUpperCase()}</strong>, venho mui respeitosamente requerer a concessão de <strong>{request.title.toUpperCase()}</strong>, sob a modalidade de suprimento de fundos, em conformidade com o Regulamento vigente deste Tribunal.
               </p>
               <div className="space-y-4 pt-6">
                  <h3 className="font-sans font-black text-xs uppercase tracking-widest border-b border-slate-100 pb-2">I - Justificativa da Demanda</h3>
                  <p className="italic font-serif leading-relaxed text-slate-600">
                    "{request.justification || 'Justificativa não informada no ato do protocolo.'}"
                  </p>
               </div>
               <div className="space-y-4 pt-6">
                  <h3 className="font-sans font-black text-xs uppercase tracking-widest border-b border-slate-100 pb-2">II - Cronograma e Localização</h3>
                  <div className="grid grid-cols-2 gap-6 font-sans text-[11px]">
                     <p><strong>DESTINO:</strong> {request.destination || 'LOTAÇÃO DE ORIGEM'}</p>
                     <p><strong>PERÍODO:</strong> {new Date(request.createdAt).toLocaleDateString()} a {new Date(request.createdAt).toLocaleDateString()}</p>
                  </div>
               </div>
               <div className="space-y-4 pt-6">
                  <h3 className="font-sans font-black text-xs uppercase tracking-widest border-b border-slate-100 pb-2">III - Estimativa de Custos</h3>
                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 font-sans">
                     <table className="w-full text-[10px]">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400">
                            <th className="py-2 text-left">ELEMENTO</th>
                            <th className="py-2 text-right">VALOR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {request.items?.map((item, i) => (
                            <tr key={i} className="border-b border-slate-100 last:border-0">
                               <td className="py-3 font-bold">{item.classification}</td>
                               <td className="py-3 text-right font-black">R$ {parseFloat(item.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                             <td className="pt-4 font-black uppercase tracking-widest">Total Requisitado</td>
                             <td className="pt-4 text-right font-black text-sm text-blue-600">R$ {request.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        </tfoot>
                     </table>
                  </div>
               </div>
            </div>
            <SignatureFooter profile={requesterProfile} date={request.createdAt} label="SERVIDOR REQUERENTE" />
          </div>
        );
      case 'doc-3':
        return (
          <div className={commonStyles}>
            <SideVerificationBar />
            <div className="flex flex-col items-center mb-16 space-y-4">
              <img src={BRASAO_URL} className="w-16" alt="" />
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter font-sans border-b-2 border-slate-900 pb-2">Certidão de Atesto de Chefia</h1>
            </div>
            <div className="space-y-12 text-base leading-[1.8]">
               <p className="indent-12">
                 <strong>CERTIFICO</strong>, para os devidos fins de direito, que a solicitação de suprimento de fundos formulada pelo servidor <strong>{request.userProfile?.fullName?.toUpperCase()}</strong>, por meio do processo digital <strong>{request.nup}</strong>, encontra-se em estrita consonância com o interesse público e com as necessidades operacionais desta unidade judiciária.
               </p>
               <p className="indent-12">
                 <strong>ATESTO</strong> que a prestação do serviço ou a aquisição do material pretendido é de caráter imprescindível e que foram observados os limites de valor e as vedações constantes na norma vigente do Tribunal de Justiça do Pará.
               </p>
               <p className="indent-12">
                 Declaro estar ciente das responsabilidades inerentes ao atesto de despesa pública e encaminho o presente à <strong>SEFIN</strong> para as providências de empenho e liquidação.
               </p>
            </div>
            <div className="mt-16 text-center font-sans text-xs text-slate-400 font-bold italic uppercase tracking-widest">
              Belém, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
            <SignatureFooter profile={managerProfile} date={request.signedByManagerAt} label="CHEFIA IMEDIATA / ORDENADOR" />
          </div>
        );
      default: return null;
    }
  };

  const renderA4Page = (docId: string, showActions = true) => {
    return (
      <div key={docId} className="flex flex-col items-center w-full mb-12 print:mb-0 a4-print-container">
        {showActions && (
          <div className="w-full max-w-[21cm] flex justify-between items-center mb-4 no-print px-4">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
               {dossierList.find(d => d.id === docId)?.name}
             </span>
             <div className="flex gap-2">
                <button 
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  onClick={() => alert('Download do PDF gerado pelo servidor ÁGIL em processamento...')}
                >
                  <i className="fa-solid fa-download"></i> PDF
                </button>
                <button 
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  onClick={() => window.print()}
                >
                  <i className="fa-solid fa-print"></i> IMIPRIMIR
                </button>
             </div>
          </div>
        )}
        <div className="w-full max-w-[21cm] min-h-[29.7cm] bg-white shadow-[0_50px_100px_rgba(0,0,0,0.15)] relative print:shadow-none print:m-0"
           style={{ aspectRatio: '1 / 1.4142' }}>
           {renderDocumentContent(docId)}
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] select-none">
              <img src={BRASAO_URL} className="w-1/2" alt="" />
           </div>
        </div>
      </div>
    );
  };

  const renderStepper = () => {
    const stages = [
      { id: 'Solicitação', label: 'SOLICITAÇÃO', icon: 'fa-file-invoice' },
      { id: 'Atesto Gestor', label: 'ATESTO GESTOR', icon: 'fa-user-check' },
      { id: 'Análise Técnica', label: 'ANÁLISE TÉCNICA', icon: 'fa-magnifying-glass' },
      { id: 'Execução', label: 'EXECUÇÃO', icon: 'fa-money-bill-transfer' },
      { id: 'Ord. Despesas', label: 'ORD. DESPESAS', icon: 'fa-file-contract' },
      { id: 'Pagamento', label: 'PAGAMENTO', icon: 'fa-bank' },
      { id: 'Finalizado', label: 'CONCLUÍDO', icon: 'fa-check-double' }
    ];

    const statusToIndex: Record<string, number> = {
      'Pendente': 1,
      'Aprovado': 2,
      'Em Analise': 2,
      'Parecer Juridico': 2,
      'Execucao': 3,
      'Assinatura Ordenador': 4,
      'Autorizado': 4,
      'Pago': 5,
      'Aguardando Prestacao': 6,
      'Concluido': 6
    };

    const currentStageIndex = statusToIndex[request.status] || 0;

    return (
      <div className="mb-12 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
        <div className="flex justify-between items-center min-w-[900px] px-4 relative">
          <div className="absolute top-[30px] left-[5%] right-[5%] h-[2px] bg-slate-100 z-0" />
          
          {stages.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isActive = idx === currentStageIndex;
            
            return (
              <div key={stage.id} className="flex flex-col items-center gap-4 relative z-10 flex-1">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg transition-all duration-500 ${
                  isCompleted ? 'bg-emerald-600 text-white shadow-lg' :
                  isActive ? 'bg-white border-2 border-emerald-500 text-emerald-600 shadow-md scale-110' :
                  'bg-white border border-slate-100 text-slate-200'
                }`}>
                  <i className={`fa-solid ${stage.icon}`}></i>
                  {isCompleted && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white">
                      <i className="fa-solid fa-check"></i>
                    </div>
                  )}
                </div>

                <div className="text-center">
                   <p className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-emerald-900' : 'text-slate-300'}`}>
                      {stage.label}
                   </p>
                   {isActive && (
                      <span className="text-[6px] font-black text-emerald-500 uppercase tracking-tighter mt-0.5 block">
                         AGORA
                      </span>
                   )}
                </div>

                {idx < stages.length - 1 && (
                  <div className={`absolute top-[30px] left-[50%] w-full h-[2px] -z-10 ${
                    idx < currentStageIndex ? 'bg-emerald-500' : 'bg-transparent'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderOverviewTab = () => {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
        {/* Banner de Confirmação de Recebimento (Requester Only) */}
        {request.status === 'Pago' && activeModule !== 'suprimento' && (
          <div className="bg-emerald-600 p-10 rounded-[2.5rem] text-white shadow-xl shadow-emerald-200/50 flex flex-col md:flex-row items-center justify-between gap-8 border border-white/10 animate-pulse">
            <div className="flex items-center gap-6 text-center md:text-left">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">
                <i className="fa-solid fa-hand-holding-dollar"></i>
              </div>
              <div>
                <h4 className="text-xl font-black uppercase tracking-tight italic">O recurso foi creditado!</h4>
                <p className="text-xs font-bold uppercase tracking-widest opacity-80 mt-1">Confirme o recebimento para iniciar a prestação de contas</p>
              </div>
            </div>
            <button 
              onClick={() => handleDecision('Aguardando Prestacao')}
              className="px-10 py-5 bg-white text-emerald-600 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              Confirmar Recebimento
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Card Dados do Solicitante */}
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-10 group hover:shadow-xl transition-all duration-500">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <i className="fa-solid fa-user-gear"></i>
                 </div>
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Dados do Solicitante</h4>
              </div>

              <div className="grid grid-cols-2 gap-y-10">
                 <div>
                    <h5 className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Nome Completo</h5>
                    <p className="font-black text-slate-900 text-sm tracking-tight uppercase">{requesterProfile?.fullName || request.userProfile?.fullName || '---'}</p>
                 </div>
                 <div>
                    <h5 className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Matrícula</h5>
                    <p className="font-black text-slate-900 text-sm tracking-tight">{requesterProfile?.registrationNumber || request.userProfile?.registrationNumber || '---'}</p>
                 </div>
                 <div>
                    <h5 className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Cargo</h5>
                    <p className="font-black text-slate-900 text-sm tracking-tight uppercase">{requesterProfile?.role || 'ANALISTA JUDICIÁRIO'}</p>
                 </div>
                 <div>
                    <h5 className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Lotação</h5>
                    <p className="font-black text-slate-900 text-sm tracking-tight uppercase truncate pr-4">{requesterProfile?.unit || request.userProfile?.unit || 'COMARCA DE ITAITUBA'}</p>
                 </div>
              </div>
           </div>

           {/* Card Dados do Gestor Imediato */}
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-10 group hover:shadow-xl transition-all duration-500">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    <i className="fa-solid fa-user-tie"></i>
                 </div>
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Dados do Gestor Imediato</h4>
              </div>

              <div className="space-y-10">
                 <div>
                    <h5 className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Nome do Gestor</h5>
                    <p className="font-black text-slate-900 text-sm tracking-tight uppercase">{request.managerInfo?.name || 'DIRETOR DA UNIDADE'}</p>
                 </div>
                 <div>
                    <h5 className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Email Corporativo</h5>
                    <p className="font-black text-emerald-600 text-sm tracking-tight lowercase">{request.managerInfo?.email || 'gestor@tjpa.jus.br'}</p>
                 </div>
              </div>
           </div>

           {/* Card Dados Bancários */}
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-10 group hover:shadow-xl transition-all duration-500">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                    <i className="fa-solid fa-building-columns"></i>
                 </div>
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Dados Bancários para Crédito</h4>
              </div>

              <div className="grid grid-cols-2 gap-y-10">
                 <div>
                    <h5 className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Banco</h5>
                    <p className="font-black text-slate-900 text-sm tracking-tight uppercase">{requesterProfile?.bankName || 'BANPARÁ'}</p>
                 </div>
                 <div>
                    <h5 className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Cod. Banco</h5>
                    <p className="font-black text-slate-900 text-sm tracking-tight">037</p>
                 </div>
                 <div>
                    <h5 className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Agência</h5>
                    <p className="font-black text-slate-900 text-sm tracking-tight">{requesterProfile?.bankAgency || '0021'}</p>
                 </div>
                 <div>
                    <h5 className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Conta Corrente</h5>
                    <p className="font-black text-slate-900 text-sm tracking-tight">{requesterProfile?.bankAccount || 'XXXXX-X'}</p>
                 </div>
              </div>
           </div>

           {/* Card Justificativa */}
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-10 group hover:shadow-xl transition-all duration-500">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
                    <i className="fa-solid fa-pen-nib"></i>
                 </div>
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Justificativa do Pedido</h4>
              </div>

              <div className="p-6 bg-slate-50/50 rounded-2xl border-l-4 border-emerald-500">
                 <p className="text-xs text-slate-600 leading-relaxed italic">
                    {request.justification || 'Solicitação de diárias para deslocamento institucional à Comarca de Itaituba para fins de mutirão judicial.'}
                 </p>
              </div>
           </div>
        </div>
      </div>
    );
  };

  const renderAnalysisTab = () => {
    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
           {/* Painel da IA */}
           <div className="lg:col-span-2 space-y-10">
              <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-2xl space-y-10 relative overflow-hidden group">
                 {/* Background Glow */}
                 <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-[100px] opacity-20 -mr-32 -mt-32 transition-all group-hover:opacity-40" />
                 
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 relative z-10">
                    <div className="flex items-center gap-6">
                       <div className="w-20 h-20 rounded-[1.8rem] bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl shadow-inner animate-pulse">
                          <i className="fa-solid fa-wand-magic-sparkles"></i>
                       </div>
                       <div>
                          <h4 className="text-[11px] font-black text-emerald-600/60 uppercase tracking-[0.4em] mb-1">Assistente SOSFU IA</h4>
                          <p className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Análise de Conformidade</p>
                       </div>
                    </div>
                    <button 
                      onClick={handleAiAnalysis}
                      disabled={isAnalyzing || !canAnalyze}
                      className={`px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-4 ${
                        isAnalyzing ? 'bg-slate-50 text-slate-300' : 'bg-emerald-600 text-white shadow-xl shadow-emerald-200 hover:scale-105 active:scale-95'
                      }`}
                    >
                       {isAnalyzing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-microchip"></i>}
                       {isAnalyzing ? 'Analisando...' : 'Iniciar Análise IA'}
                    </button>
                 </div>

                 {aiAnalysis ? (
                   <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700">
                      <div className="p-8 bg-emerald-50/50 rounded-[2.5rem] border border-emerald-100/50 flex flex-col md:flex-row items-center gap-10">
                         <div className="relative">
                            <svg className="w-32 h-32 transform -rotate-90">
                               <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                               <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={364.42} strokeDashoffset={364.42 * (1 - (aiAnalysis.conformityScore || 0) / 100)} className="text-emerald-500 transition-all duration-1000 ease-out" />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-2xl font-black text-slate-800 italic">{(aiAnalysis.conformityScore || 0)}%</span>
                         </div>
                         <div className="flex-1 space-y-2 text-center md:text-left">
                            <h5 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Score de Conformidade</h5>
                            <p className="text-3xl font-black text-slate-800 tracking-tight italic">Recomendação: {aiAnalysis.recommendation}</p>
                         </div>
                      </div>

                      <div className="space-y-6">
                         <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Checklist Institucional</h5>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {aiAnalysis.checks?.map((check, idx) => (
                               <div key={idx} className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100/50">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${check.pass ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                     <i className={`fa-solid ${check.pass ? 'fa-check' : 'fa-xmark'}`}></i>
                                  </div>
                                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{check.item}</span>
                               </div>
                            ))}
                         </div>
                      </div>
                   </div>
                 ) : (
                   <div className="py-20 flex flex-col items-center justify-center space-y-6 border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/30">
                      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-slate-200 text-2xl shadow-sm"><i className="fa-solid fa-robot"></i></div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">IA Pronta para auditoria técnica</p>
                   </div>
                 )}
              </div>

              {canAnalyze && (
                <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-xl space-y-8 animate-in slide-in-from-bottom-5 duration-700">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-900 flex items-center justify-center text-xl shadow-inner"><i className="fa-solid fa-pen-fancy"></i></div>
                      <h4 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Parecer Técnico Final</h4>
                   </div>
                   <textarea 
                     value={technicalOpinion} 
                     onChange={e => setTechnicalOpinion(e.target.value)} 
                     placeholder="Escreva aqui o parecer fundamentado para a decisão final..." 
                     className="w-full px-10 py-8 bg-slate-50 border-2 border-slate-50 rounded-[2.5rem] outline-none font-medium text-slate-800 text-lg h-64 focus:border-slate-200 transition-all placeholder:text-slate-300" 
                   />
                </div>
              )}
           </div>

           {/* Painel de Decisão */}
           <div className="space-y-8">
              <div className="bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl border border-white/5 space-y-10">
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Ações Formais</p>
                    <h4 className="text-3xl font-black text-white italic tracking-tighter uppercase">Decisão SOSFU</h4>
                 </div>

                 <div className="space-y-4">
                    <button
                      onClick={() => handleDecision('Execucao')}
                      disabled={isProcessingDecision || !technicalOpinion || !canAnalyze}
                      className="w-full py-7 bg-emerald-600 text-white rounded-4xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-4 hover:bg-emerald-500 hover:scale-[1.03] transition-all shadow-xl shadow-emerald-900/40"
                    >
                       <i className="fa-solid fa-play-circle text-lg"></i> Iniciar a Fase de Execução da Despesa
                    </button>
                    <button 
                      onClick={() => handleDecision('Em Ajuste')}
                      disabled={isProcessingDecision || !technicalOpinion || !canAnalyze}
                      className="w-full py-7 bg-amber-500 text-white rounded-4xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-4 hover:bg-amber-400 hover:scale-[1.03] transition-all shadow-xl shadow-amber-900/40"
                    >
                       <i className="fa-solid fa-rotate text-lg"></i> Solicitar Ajustes
                    </button>
                    <button 
                      onClick={() => handleDecision('Rejeitado')}
                      disabled={isProcessingDecision || !technicalOpinion || !canAnalyze}
                      className="w-full py-7 bg-rose-600 text-white rounded-4xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-4 hover:bg-rose-500 hover:scale-[1.03] transition-all shadow-xl shadow-rose-900/40"
                    >
                       <i className="fa-solid fa-ban text-lg"></i> Indeferir Pedido
                    </button>
                 </div>

                 <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-white/50 text-[9px] font-bold uppercase leading-relaxed tracking-wider">
                    <i className="fa-solid fa-circle-info mr-2 text-emerald-400"></i>
                    A decisão será registrada permanentemente no histórico de auditoria do sistema.
                 </div>
              </div>

           </div>
        </div>
      </div>
    );
  };

  const handleOrdenadorSign = async () => {
    setIsOrdenadorSigning(true);
    setOrdenadorSignError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado.');
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email!, password: ordenadorSignPassword
      });
      if (authError) { setOrdenadorSignError('Senha incorreta.'); setIsOrdenadorSigning(false); return; }
      let coords: { latitude: number; longitude: number } | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch { /* GPS opcional */ }
      await signByOrdenador(request.id, user.id, ordenadorNotes, coords);
      setShowOrdenadorSignModal(false);
      if (onRefresh) onRefresh();
      onBack();
    } catch (err) {
      setOrdenadorSignError('Erro ao processar assinatura.');
    } finally {
      setIsOrdenadorSigning(false);
    }
  };

  const handleOrdenadorReturn = async () => {
    if (!ordenadorNotes) return;
    setIsOrdenadorSigning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado.');
      await returnByOrdenador(request.id, user.id, ordenadorNotes);
      if (onRefresh) onRefresh();
      onBack();
    } catch (err) {
      alert('Erro ao devolver processo.');
    } finally {
      setIsOrdenadorSigning(false);
    }
  };

  const handleTramitar = async () => {
    if (!targetModule) return;
    setIsTramitando(true);
    setTramitarError('');
    try {
      await tramitarRequest(request.id, targetModule as AppModule, tramitarNotes);
      setShowTramitarModal(false);
      if (onRefresh) onRefresh();
      onBack();
    } catch (err) {
      setTramitarError('Erro ao tramitar processo.');
    } finally {
      setIsTramitando(false);
    }
  };

  const renderOrdenadorTab = () => (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          {/* Resumo do parecer técnico */}
          <div className="bg-blue-50 border border-blue-100 rounded-[2.5rem] p-10 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center"><i className="fa-solid fa-magnifying-glass-chart"></i></div>
              <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Parecer Técnico (Origem)</h4>
            </div>
            <p className="text-sm text-blue-800 italic leading-relaxed">Processo analisado e encaminhado para assinatura do Ordenador de Despesas.</p>
            <div className="flex items-center gap-3 pt-2">
              <span className="px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-widest">Aprovado por Analista</span>
              <span className="text-[10px] text-blue-500 font-bold uppercase">Módulo: {request.originModule?.toUpperCase() || 'SOSFU'}</span>
            </div>
          </div>

          {/* Despacho do Ordenador */}
          <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-xl space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-xl shadow-inner"><i className="fa-solid fa-pen-fancy"></i></div>
              <h4 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Despacho do Ordenador de Despesas</h4>
            </div>
            <textarea
              value={ordenadorNotes}
              onChange={e => setOrdenadorNotes(e.target.value)}
              placeholder="Exare o despacho fundamentado da autorização ou devolução..."
              className="w-full px-10 py-8 bg-slate-50 border-2 border-slate-50 rounded-[2.5rem] outline-none font-medium text-slate-800 text-lg h-48 focus:border-blue-200 transition-all placeholder:text-slate-300"
            />
          </div>
        </div>

        {/* Painel de decisão SEFIN */}
        <div className="space-y-8">
          <div className="bg-[#0f172a] p-10 rounded-[3.5rem] shadow-2xl border border-white/5 space-y-10">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Assinatura Digital</p>
              <h4 className="text-3xl font-black text-white italic tracking-tighter uppercase">Ordenador SEFIN</h4>
            </div>
            <div className="space-y-4">
              <button
                onClick={() => setShowOrdenadorSignModal(true)}
                disabled={!ordenadorNotes}
                className="w-full py-7 bg-blue-600 text-white rounded-4xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-4 hover:bg-blue-500 hover:scale-[1.03] transition-all shadow-xl shadow-blue-900/40 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <i className="fa-solid fa-file-signature text-lg"></i> Autorizar e Assinar Minuta
              </button>
              <button
                onClick={handleOrdenadorReturn}
                disabled={!ordenadorNotes || isOrdenadorSigning}
                className="w-full py-7 bg-amber-600 text-white rounded-4xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-4 hover:bg-amber-500 hover:scale-[1.03] transition-all shadow-xl shadow-amber-900/40 disabled:opacity-40"
              >
                <i className="fa-solid fa-arrow-rotate-left text-lg"></i> Devolver para Análise
              </button>
            </div>
            <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-white/50 text-[9px] font-bold uppercase leading-relaxed tracking-wider">
              <i className="fa-solid fa-shield-halved mr-2 text-blue-400"></i>
              A assinatura da Minuta de Autorização gera efeito jurídico imediato e é registrada com timestamp, coordenadas GPS e hash criptográfico.
            </div>
          </div>

          {ordenadorProfile && (
            <div className="bg-white p-8 rounded-[2.5rem] border border-blue-100 shadow-sm space-y-4">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assinar como</p>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-[1.5rem] overflow-hidden bg-blue-50 border-2 border-blue-100 shadow-sm">
                  {ordenadorProfile.avatarUrl
                    ? <img src={ordenadorProfile.avatarUrl} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full flex items-center justify-center text-blue-600 font-black text-xl">{ordenadorProfile.fullName?.[0]}</div>
                  }
                </div>
                <div>
                  <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{ordenadorProfile.fullName}</p>
                  <p className="text-[9px] text-blue-600 font-bold uppercase tracking-widest">Ordenador de Despesas</p>
                  {ordenadorProfile.signatureUrl && (
                    <img src={ordenadorProfile.signatureUrl} className="h-8 mt-2 mix-blend-multiply opacity-80" alt="Assinatura" />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const triggerExecutionUpload = (docId: 'doc-ne' | 'doc-dl' | 'doc-ob') => {
    setPendingExecUploadType(docId);
    // Small delay to allow state to update before click
    setTimeout(() => executionUploadRef.current?.click(), 50);
  };

  const handleExecutionFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const docId = pendingExecUploadType;
    if (!file || !docId) return;
    
    // Validate PDF
    if (file.type !== 'application/pdf') {
      alert('Apenas arquivos PDF são permitidos para documentos de execução financeira.');
      e.target.value = '';
      return;
    }

    setUploadLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      const profile = await getProfile(user.id);

      const docConfigs = {
        'doc-ne': { name: 'NOTA DE EMPENHO (NE)', icon: 'fa-file-signature' },
        'doc-dl': { name: 'DOCUMENTO DE LIQUIDAÇÃO (DL)', icon: 'fa-file-invoice-dollar' },
        'doc-ob': { name: 'ORDEM BANCÁRIA (OB)', icon: 'fa-money-check-dollar' }
      };
      const config = docConfigs[docId];

      // Upload to Supabase Storage: documents/execution/{requestId}/{docType}.pdf
      const storagePath = `execution/${request.id}/${docId}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, { upsert: true, contentType: 'application/pdf' });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;

      // Save the doc reference with the real file URL
      const newDoc: CustomDoc = {
        id: docId,
        name: config.name,
        icon: config.icon,
        date: new Date().toLocaleDateString(),
        status: 'Anexado (Original)',
        content: `PDF original do documento ${config.name} anexado ao processo ${request.nup}. Upload realizado por ${profile.fullName} em ${new Date().toLocaleString('pt-BR')}.`,
        creatorProfile: profile,
        isUpload: true,
        fileUrl: publicUrl
      };

      setCustomDocs(prev => [...prev.filter(d => d.id !== docId), newDoc]);

      // Also persist the file URL in the request's dossier metadata
      const currentDossier = request.dossier || [];
      const updatedDossier = [
        ...currentDossier.filter((d: any) => d.id !== docId),
        { id: docId, name: config.name, fileUrl: publicUrl, uploadedBy: user.id, uploadedAt: new Date().toISOString(), type: 'PDF_ORIGINAL' }
      ];
      await supabase.from('requests').update({ dossier: updatedDossier, updated_at: new Date().toISOString() }).eq('id', request.id);

      alert(`${config.name} — PDF original anexado com sucesso ao dossiê!`);
    } catch (err: any) {
      console.error('Erro no upload:', err);
      alert(`Erro ao anexar documento: ${err.message || 'Falha no upload'}`);
    } finally {
      setUploadLoading(false);
      setPendingExecUploadType(null);
      e.target.value = ''; // Reset file input
    }
  };

  const handleTramitarExecDoc = async (docId: 'doc-portaria' | 'doc-certidao' | 'doc-ne') => {
    const docNames: Record<string, string> = {
      'doc-portaria': 'PORTARIA DE CONCESSÃO SF',
      'doc-certidao': 'CERTIDÃO DE REGULARIDADE',
      'doc-ne': 'NOTA DE EMPENHO (NE)'
    };
    const docName = docNames[docId];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Record tramitation in system_history
      await supabase.from('system_history').insert({
        request_id: request.id,
        user_id: user.id,
        action: 'TRAMITAR_EXECUCAO',
        description: `${docName} tramitada para assinatura do Ordenador de Despesas (SEFIN). Processo: ${request.nup}`,
        metadata: {
          docId,
          docName,
          target: 'SEFIN',
          tramitedAt: new Date().toISOString()
        }
      });

      // 2. Create notification for SEFIN role users
      await supabase.from('system_notifications').insert({
        role_target: 'SEFIN',
        type: 'INFO',
        category: 'PROCESS',
        title: `Documento pendente de assinatura`,
        message: `${docName} do processo ${request.nup} aguarda assinatura do Ordenador de Despesas.`,
        link_action: request.id
      });

      // 3. Update the customDoc status to reflect tramitation
      setCustomDocs(prev => prev.map(d => 
        d.id === docId ? { ...d, status: 'Tramitado SEFIN' } : d
      ));

      // 4. Mark as tramited in local state
      setTramitedExecDocs(prev => [...prev, docId]);

      alert(`${docName} — Tramitada com sucesso para a SEFIN!\nO Ordenador de Despesas será notificado.`);
    } catch (err: any) {
      console.error('Erro na tramitação:', err);
      alert(`Erro ao tramitar documento: ${err.message || 'Falha na tramitação'}`);
    }
  };

  const renderExecucaoTab = () => {
    const hasDoc = (id: string) => dossierList.some(d => d.id === id || d.name.toLowerCase().includes(id.toLowerCase()));
    
    const getGenerateDocStatus = (docId: string): string => {
      if (tramitedExecDocs.includes(docId)) return 'Tramitado SEFIN';
      if (hasDoc(docId)) return 'Minuta Gerada';
      return 'Pendente';
    };

    // NE status: Pendente → Anexado (Original) → Tramitado SEFIN
    const getNeStatus = (): string => {
      if (tramitedExecDocs.includes('doc-ne')) return 'Tramitado SEFIN';
      if (dossierList.some(d => d.id === 'doc-ne')) return 'Anexado (Original)';
      return 'Pendente';
    };

    const execDocs = [
      { id: 'doc-portaria', name: 'Portaria de Concessão SF', icon: 'fa-file-invoice', group: 'A', status: getGenerateDocStatus('doc-portaria'), mode: 'generate' as const },
      { id: 'doc-certidao', name: 'Certidão de Regularidade', icon: 'fa-certificate', group: 'A', status: getGenerateDocStatus('doc-certidao'), mode: 'generate' as const },
      { id: 'doc-ne', name: 'Nota de Empenho (NE)', icon: 'fa-file-signature', group: 'A', status: getNeStatus(), mode: 'upload-tramitar' as const },
      { id: 'doc-dl', name: 'Documento de Liquidação (DL)', icon: 'fa-file-invoice-dollar', group: 'B', status: dossierList.some(d => d.id === 'doc-dl') ? 'Anexado (Original)' : 'Pendente', mode: 'upload' as const },
      { id: 'doc-ob', name: 'Ordem Bancária (OB)', icon: 'fa-money-check-dollar', group: 'B', status: dossierList.some(d => d.id === 'doc-ob') ? 'Anexado (Original)' : 'Pendente', mode: 'upload' as const },
    ];

    // Group A complete = all docs tramited to SEFIN for Ordenador batch signing
    const isGroupAComplete = execDocs.filter(d => d.group === 'A').every(d => 
      d.status === 'Tramitado SEFIN'
    );
    // Ready for payment = both groups done
    const isReadyForPayment = execDocs.every(d => 
      d.status === 'Tramitado SEFIN' || d.status === 'Anexado (Original)'
    );

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500 pb-32">
        <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-xl shadow-slate-200/50 flex items-center justify-between">
          <div>
            <h4 className="text-2xl font-black uppercase tracking-tight italic">Esteira de Execução Financeira</h4>
            <p className="text-xs font-bold uppercase tracking-widest opacity-60 mt-1">Siga a ordem cronológica dos blocos de instrução</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isGroupAComplete ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
              <i className={`fa-solid ${isGroupAComplete ? 'fa-check-double' : 'fa-circle-dot'} mr-2`}></i> Passo A
            </div>
            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isReadyForPayment ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
              <i className={`fa-solid ${isReadyForPayment ? 'fa-check-double' : 'fa-circle-dot'} mr-2`}></i> Passo B
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Bloco A: Instrução e Empenho */}
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8 h-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-black shadow-inner">A</div>
                <div>
                  <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight">Instrução e Empenho</h5>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider italic">Responsabilidade: SEFIN / SOSFU</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {execDocs.filter(d => d.group === 'A').map(doc => (
                <div key={doc.id} className="group flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100/50 hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all duration-300">
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-sm transition-all duration-500 ${
                      doc.status === 'Tramitado SEFIN' || doc.status === 'Anexado (Original)' 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : doc.status === 'Minuta Gerada' 
                          ? 'bg-amber-50 text-amber-600' 
                          : 'bg-white text-slate-200 group-hover:text-blue-200'
                    }`}>
                      <i className={`fa-solid ${doc.icon}`}></i>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{doc.name}</p>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${
                        doc.status === 'Tramitado SEFIN' || doc.status === 'Anexado (Original)' 
                          ? 'text-emerald-600' 
                          : doc.status === 'Minuta Gerada' 
                            ? 'text-amber-600' 
                            : 'text-slate-300'
                      }`}>
                        <i className={`fa-solid ${
                          doc.status === 'Tramitado SEFIN' || doc.status === 'Anexado (Original)' 
                            ? 'fa-circle-check mr-1' 
                            : doc.status === 'Minuta Gerada' 
                              ? 'fa-clock mr-1' 
                              : 'fa-circle-thin mr-1'
                        }`}></i> {doc.status}
                      </span>
                    </div>
                  </div>
                  
                  {/* Phase 1: Pending → Show action button */}
                  {doc.status === 'Pendente' ? (
                    <button 
                      onClick={() => {
                        if (doc.mode === 'upload' || doc.mode === 'upload-tramitar') triggerExecutionUpload(doc.id as 'doc-ne' | 'doc-dl' | 'doc-ob');
                        else if (doc.id === 'doc-portaria') generateExecDoc('doc-portaria');
                        else if (doc.id === 'doc-certidao') generateExecDoc('doc-certidao');
                      }}
                      disabled={uploadLoading || aiGenerating}
                      className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all active:scale-95 flex items-center gap-2 ${
                        doc.mode === 'upload' || doc.mode === 'upload-tramitar'
                          ? 'bg-blue-600 text-white hover:bg-blue-500' 
                          : 'bg-slate-900 text-white hover:bg-blue-600'
                      }`}
                    >
                      {uploadLoading && pendingExecUploadType === doc.id ? (
                        <><i className="fa-solid fa-circle-notch fa-spin"></i> Enviando...</>
                      ) : aiGenerating ? (
                        <><i className="fa-solid fa-circle-notch fa-spin"></i> Gerando...</>
                      ) : doc.mode === 'upload' || doc.mode === 'upload-tramitar' ? (
                        <><i className="fa-solid fa-cloud-arrow-up"></i> Upload PDF</>
                      ) : (
                        <><i className="fa-solid fa-wand-magic-sparkles"></i> Gerar Minuta</>
                      )}
                    </button>

                  /* Phase 2: Minuta Gerada OR Anexado (waiting tramitation) → Show Tramitar SEFIN button */
                  ) : (doc.status === 'Minuta Gerada' || (doc.status === 'Anexado (Original)' && doc.mode === 'upload-tramitar')) ? (
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => { setSelectedDocId(doc.id); setActiveTab('Dossiê Digital'); }} 
                        className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
                        title="Visualizar Documento"
                      >
                        <i className="fa-solid fa-eye text-xs"></i>
                      </button>
                      <button 
                        onClick={() => handleTramitarExecDoc(doc.id as 'doc-portaria' | 'doc-certidao' | 'doc-ne')}
                        className="px-8 py-3 bg-amber-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-amber-500 transition-all active:scale-95 flex items-center gap-2"
                      >
                        <i className="fa-solid fa-paper-plane"></i> Tramitar SEFIN
                      </button>
                    </div>

                  /* Phase 3: Tramitado → Show view button */
                  ) : (
                    <button onClick={() => { setSelectedDocId(doc.id); setActiveTab('Dossiê Digital'); }} className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors">
                      <i className="fa-solid fa-eye text-xs"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bloco B: Liquidação e Pagamento */}
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8 transition-all duration-700 opacity-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner bg-indigo-50 text-indigo-600">B</div>
              <div>
                <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight">Liquidação e Pagamento</h5>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider italic">Responsabilidade: SOSFU EXECUÇÃO</p>
              </div>
            </div>

            <div className="space-y-4">
              {execDocs.filter(d => d.group === 'B').map(doc => (
                <div key={doc.id} className="group flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100/50 hover:bg-white hover:shadow-xl hover:border-indigo-100 transition-all duration-300">
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-sm transition-all duration-500 ${doc.status !== 'Pendente' ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-slate-200 group-hover:text-indigo-200'}`}>
                      <i className={`fa-solid ${doc.icon}`}></i>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{doc.name}</p>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${doc.status !== 'Pendente' ? 'text-emerald-600' : 'text-slate-300'}`}>
                        <i className={`fa-solid ${doc.status !== 'Pendente' ? 'fa-circle-check mr-1' : 'fa-circle-thin mr-1'}`}></i> {doc.status}
                      </span>
                    </div>
                  </div>
                  
                  {doc.status === 'Pendente' ? (
                    <button 
                      onClick={() => triggerExecutionUpload(doc.id as 'doc-dl' | 'doc-ob')}
                      disabled={uploadLoading}
                      className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-indigo-500 transition-all active:scale-95 flex items-center gap-2"
                    >
                      {uploadLoading && pendingExecUploadType === doc.id ? (
                        <><i className="fa-solid fa-circle-notch fa-spin"></i> Enviando...</>
                      ) : (
                        <><i className="fa-solid fa-cloud-arrow-up"></i> Upload PDF</>
                      )}
                    </button>
                   ) : (
                    <button onClick={() => { setSelectedDocId(doc.id); setActiveTab('Dossiê Digital'); }} className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors">
                      <i className="fa-solid fa-eye text-xs"></i>
                    </button>
                  )}
                </div>
              ))}
              
              <div className="mt-6 p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-center gap-4">
                 <i className="fa-solid fa-info-circle text-blue-400 text-lg"></i>
                 <p className="text-[10px] font-bold text-blue-400 uppercase leading-relaxed">O Bloco B está liberado para execução paralela. O Ordenador de Despesas assinará os documentos do Bloco A em lote.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Detalhamento Financeiro */}
        <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-10 group hover:shadow-xl transition-all duration-700">
           <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform"><i className="fa-solid fa-coins"></i></div>
              <div>
                <h5 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Detalhamento Financeiro</h5>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Elementos de despesa e dotação orçamentária</p>
              </div>
           </div>

           <div className="overflow-hidden rounded-4xl border border-slate-50">
             <table className="w-full">
               <thead>
                 <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                   <th className="py-6 px-10 text-left">Elemento de Despesa</th>
                   <th className="py-6 px-10 text-right">Valor Alocado</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 text-sm font-sans">
                 {(request.items || []).map((item, idx) => (
                   <tr key={idx} className="hover:bg-slate-50/30 transition-colors group/row">
                     <td className="py-6 px-10 font-bold text-slate-700">
                        <span className="text-[10px] font-black text-slate-300 mr-4 tracking-widest">{item.code || '3.3.90.30'}</span>
                        {item.classification || item.description}
                     </td>
                     <td className="py-6 px-10 text-right font-black text-slate-900 tabular-nums">R$ {parseFloat(item.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                   </tr>
                 ))}
                 <tr className="bg-blue-600/5">
                   <td className="py-10 px-10">
                      <p className="text-[11px] font-black text-blue-900 uppercase tracking-[0.3em]">VALOR TOTAL DESTA CONCESSÃO</p>
                      <p className="text-[10px] text-blue-500 font-bold uppercase italic mt-1 italic">Válido para o exercício financeiro de 2026</p>
                   </td>
                   <td className="py-10 px-10 text-right font-black text-3xl text-blue-600 tracking-tighter italic">R$ {request.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                 </tr>
               </tbody>
             </table>
           </div>
         </div>

        {/* Hidden file input for execution document uploads (NE, DL, OB) */}
        <input
          type="file"
          ref={executionUploadRef}
          onChange={handleExecutionFileSelected}
          accept="application/pdf"
          className="hidden"
        />

        {/* Notificar Pagamento - SOSFU Analyst Only */}
        {activeModule === 'suprimento' && isReadyForPayment && request.status !== 'Pago' && (
          <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-20 fade-in duration-700">
            <button 
              onClick={() => handleDecision('Pago')}
              className="px-20 py-8 bg-slate-900 text-white rounded-[3rem] font-black uppercase tracking-[0.4em] text-xs shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] hover:scale-105 active:scale-95 hover:bg-blue-700 transition-all flex items-center gap-8 border border-white/20"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400 group-hover:rotate-12 transition-transform">
                <i className="fa-solid fa-paper-plane text-xl"></i>
              </div>
              INFORMAR PAGAMENTO AO USUÁRIO
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in duration-700 h-auto print:p-0 print:m-0 print:bg-white overflow-visible">
      {renderStepper()}
      {/* Modais */}
      {showAiModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300 no-print modal-overlay">
           <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-12 space-y-10">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl"><i className="fa-solid fa-wand-magic-sparkles"></i></div>
                 <h3 className="text-3xl font-black uppercase text-slate-900 tracking-tight">
                   {isEditingAi ? 'Revisar Documento' : 'Agent ÁGIL IA'}
                 </h3>
              </div>
              
              {!isEditingAi ? (
                <div className="space-y-6">
                   <p className="text-sm text-slate-500 font-medium">Descreva qual tipo de documento você deseja gerar para integrar a este dossiê digital.</p>
                   <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Ex: Gere um despacho de encaminhamento para a COORC..." className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none font-medium text-slate-800 text-lg h-40 focus:border-blue-500/20" />
                </div>
              ) : (
                <div className="space-y-6">
                   <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-4 py-2 rounded-lg border border-amber-100 italic">
                     <i className="fa-solid fa-circle-exclamation mr-2"></i> Você pode editar o texto gerado pela IA antes de aceitá-lo.
                   </p>
                   <textarea 
                     value={aiResult} 
                     onChange={e => setAiResult(e.target.value)} 
                     className="w-full px-8 py-8 bg-slate-50 border-2 border-slate-50 rounded-4xl outline-none font-serif text-slate-800 text-base h-80 focus:border-blue-500/20 leading-relaxed" 
                   />
                </div>
              )}

              <div className="flex gap-4">
                 <button onClick={() => { setShowAiModal(false); setIsEditingAi(false); setAiResult(''); }} className="flex-1 py-6 bg-slate-50 text-slate-400 font-black uppercase tracking-widest rounded-3xl">Cancelar</button>
                 
                 {!isEditingAi ? (
                   <button onClick={handleAiGenerate} disabled={aiGenerating || !aiPrompt} className="flex-[2] py-6 bg-slate-900 text-white font-black uppercase tracking-widest rounded-3xl shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-4">
                      {aiGenerating ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-sparkles"></i>}
                      Gerar Documento
                   </button>
                 ) : (
                   <button onClick={handleSaveAiDoc} className="flex-[2] py-6 bg-emerald-600 text-white font-black uppercase tracking-widest rounded-3xl shadow-xl hover:bg-emerald-500 transition-all flex items-center justify-center gap-4">
                      <i className="fa-solid fa-check"></i> Aceitar e Incluir no Dossiê
                   </button>
                 )}
              </div>
           </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300 no-print modal-overlay">
           <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-12 space-y-10">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl"><i className="fa-solid fa-trash-can"></i></div>
                 <h3 className="text-3xl font-black uppercase text-slate-900 tracking-tight">Exclusão de Documento</h3>
              </div>
              <div className="space-y-6">
                 <p className="text-sm text-slate-500 font-medium">Para excluir este documento do dossiê digital, é obrigatório informar o motivo da exclusão para fins de auditoria.</p>
                 <textarea 
                   value={deleteReason} 
                   onChange={e => setDeleteReason(e.target.value)} 
                   placeholder="Informe o motivo da exclusão..." 
                   className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none font-medium text-slate-800 text-lg h-32 focus:border-rose-500/20" 
                 />
              </div>
              <div className="flex gap-4">
                 <button onClick={() => { setShowDeleteModal(false); setDocToDelete(null); setDeleteReason(''); }} className="flex-1 py-6 bg-slate-50 text-slate-400 font-black uppercase tracking-widest rounded-3xl">Cancelar</button>
                 <button 
                   onClick={handleDeleteDoc} 
                   disabled={isDeleting || !deleteReason} 
                   className="flex-[2] py-6 bg-rose-600 text-white font-black uppercase tracking-widest rounded-3xl shadow-xl hover:bg-rose-500 transition-all disabled:opacity-40"
                 >
                    {isDeleting ? <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> : <i className="fa-solid fa-trash mr-2"></i>}Confirmar Exclusão
                 </button>
              </div>
           </div>
        </div>
      )}

      {showSignModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300 no-print modal-overlay">
           <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-12 space-y-10">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl"><i className="fa-solid fa-signature"></i></div>
                 <h3 className="text-3xl font-black uppercase text-slate-900 tracking-tight">Assinatura Digital</h3>
              </div>
              <div className="space-y-6">
                 <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 text-sm text-blue-700 font-medium italic">"Declaro que atesto a conformidade legal do pedido de {request.userProfile?.fullName}."</div>
                 <input type="password" value={signPassword} onChange={e => setSignPassword(e.target.value)} autoFocus className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none font-black text-slate-900 text-xl tracking-[0.2em] focus:border-emerald-500/20" placeholder="••••••••" />
                 {signError && <p className="text-red-500 text-[10px] font-black uppercase">{signError}</p>}
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setShowSignModal(false)} className="flex-1 py-6 bg-slate-50 text-slate-400 font-black uppercase tracking-widest rounded-2xl">Cancelar</button>
                 <button onClick={handleSignAction} disabled={signLoading || !signPassword} className="flex-[2] py-6 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-emerald-600 transition-all">Confirmar Assinatura</button>
              </div>
           </div>
        </div>
      )}

      {showOrdenadorSignModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300 no-print modal-overlay">
           <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-12 space-y-10">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl"><i className="fa-solid fa-vault"></i></div>
                 <h3 className="text-3xl font-black uppercase text-slate-900 tracking-tight">Assinatura Ordenador</h3>
              </div>
              <div className="space-y-6">
                 <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 text-sm text-blue-700 font-medium italic">"Autorizo a execução da despesa referente ao processo {request.nup}, conforme análise técnica de conformidade."</div>
                 <input type="password" value={ordenadorSignPassword} onChange={e => setOrdenadorSignPassword(e.target.value)} autoFocus className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none font-black text-slate-900 text-xl tracking-[0.2em] focus:border-blue-500/20" placeholder="••••••••" />
                 {ordenadorSignError && <p className="text-red-500 text-[10px] font-black uppercase">{ordenadorSignError}</p>}
              </div>
              <div className="flex gap-4">
                 <button onClick={() => { setShowOrdenadorSignModal(false); setOrdenadorSignPassword(''); setOrdenadorSignError(''); }} className="flex-1 py-6 bg-slate-50 text-slate-400 font-black uppercase tracking-widest rounded-2xl">Cancelar</button>
                 <button onClick={handleOrdenadorSign} disabled={isOrdenadorSigning || !ordenadorSignPassword} className="flex-[2] py-6 bg-blue-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-blue-600 transition-all disabled:opacity-40">
                    {isOrdenadorSigning ? <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> : null}Confirmar Autorização
                 </button>
              </div>
           </div>
        </div>
      )}

      {showTramitarModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300 no-print modal-overlay">
           <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-12 space-y-10">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl"><i className="fa-solid fa-arrows-turn-right"></i></div>
                 <h3 className="text-3xl font-black uppercase text-slate-900 tracking-tight">Tramitar Processo</h3>
              </div>
              
              <div className="space-y-8">
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Módulo de Destino</label>
                    <div className="grid grid-cols-2 gap-3">
                       {([
                          { id: 'suprimento', label: 'SOSFU', icon: 'fa-box-open' },
                          { id: 'sefin', label: 'SEFIN', icon: 'fa-building-columns' },
                          { id: 'ajsefin', label: 'AJSEFIN', icon: 'fa-gavel' },
                          { id: 'sgp', label: 'SGP', icon: 'fa-user-tie' },
                          { id: 'coorc', label: 'COORC', icon: 'fa-coins' },
                          { id: 'presidencia', label: 'PRESIDÊNCIA', icon: 'fa-landmark' }
                       ] as const).map(m => (
                          <button
                            key={m.id}
                            onClick={() => setTargetModule(m.id)}
                            className={`flex items-center gap-3 p-5 rounded-2xl border-2 transition-all ${
                               targetModule === m.id 
                               ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-lg' 
                               : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                            }`}
                          >
                             <i className={`fa-solid ${m.icon} text-lg`}></i>
                             <span className="text-[11px] font-black uppercase tracking-widest">{m.label}</span>
                          </button>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Observações da Tramitação</label>
                    <textarea 
                       value={tramitarNotes} 
                       onChange={e => setTramitarNotes(e.target.value)} 
                       placeholder="Descreva o motivo ou instruções para a unidade de destino..." 
                       className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none font-medium text-slate-800 text-sm h-32 focus:border-emerald-500/20 transition-all"
                    />
                 </div>

                 {tramitarError && <p className="text-red-500 text-[10px] font-black uppercase text-center">{tramitarError}</p>}
              </div>

              <div className="flex gap-4">
                 <button onClick={() => { setShowTramitarModal(false); setTargetModule(''); setTramitarNotes(''); }} className="flex-1 py-6 bg-slate-50 text-slate-400 font-black uppercase tracking-widest rounded-3xl">Cancelar</button>
                 <button 
                    onClick={handleTramitar} 
                    disabled={isTramitando || !targetModule} 
                    className="flex-[2] py-6 bg-slate-900 text-white font-black uppercase tracking-widest rounded-3xl shadow-xl hover:bg-emerald-600 transition-all disabled:opacity-40"
                 >
                    {isTramitando ? <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> : null}Confirmar Tramitação
                 </button>
              </div>
           </div>
        </div>
      )}

      {showAiSignModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300 no-print modal-overlay">
           <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-12 space-y-10">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl"><i className="fa-solid fa-file-signature"></i></div>
                 <h3 className="text-3xl font-black uppercase text-slate-900 tracking-tight">Assinar Documento IA</h3>
              </div>
              <div className="space-y-6">
                 <p className="text-sm text-slate-500 font-medium">Confirme sua senha para assinar digitalmente este despacho e integrá-lo ao processo.</p>
                 <input type="password" value={aiSignPassword} onChange={e => setAiSignPassword(e.target.value)} autoFocus className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none font-black text-slate-900 text-xl tracking-[0.2em] focus:border-blue-500/20" placeholder="••••••••" />
                 {aiSignError && <p className="text-red-500 text-[10px] font-black uppercase">{aiSignError}</p>}
              </div>
              <div className="flex gap-4">
                 <button onClick={() => { setShowAiSignModal(false); setAiSignPassword(''); setAiSignError(''); }} className="flex-1 py-6 bg-slate-50 text-slate-400 font-black uppercase tracking-widest rounded-3xl">Cancelar</button>
                 <button onClick={handleAiSign} disabled={aiSignLoading || !aiSignPassword} className="flex-[2] py-6 bg-slate-900 text-white font-black uppercase tracking-widest rounded-3xl shadow-xl hover:bg-blue-600 transition-all">
                    {aiSignLoading ? <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> : null}Confirmar e Assinar
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Header Visual */}
      <div className="flex justify-between items-end no-print">
        <div className="flex items-center gap-8">
          <button onClick={onBack} className="w-16 h-16 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-xl transition-all"><i className="fa-solid fa-arrow-left text-xl"></i></button>
          <div className="space-y-1">
             <div className="flex items-center gap-4">
                <img src={BRASAO_URL} className="w-8 h-auto opacity-50" alt="" />
                <h2 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">{request.nup}</h2>
             </div>
             <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.3em] flex items-center gap-3">Dossiê Digital <span className="text-slate-200">•</span> <span className="text-emerald-600">{request.title}</span></p>
          </div>
        </div>
        <div className="flex gap-3">
           <button onClick={() => setIsConsolidated(!isConsolidated)} className={`px-8 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] border transition-all ${isConsolidated ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-900 border-slate-100 shadow-xl hover:bg-slate-50'}`}>
             <i className={`fa-solid ${isConsolidated ? 'fa-list-check' : 'fa-list'} mr-2`}></i>{isConsolidated ? 'Sair do Modo Consolidado' : 'Visão Consolidada'}
           </button>
           <button 
             onClick={() => setShowTramitarModal(true)} 
             className="bg-emerald-600 text-white px-8 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-2"
           >
              <i className="fa-solid fa-arrows-turn-right"></i> TRAMITAR
           </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-100 no-print overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap pb-1">
        {([...(['Visão Geral', 'Dossiê Digital', 'Análise Técnica'] as DetailTab[]), ...(isSefinView ? ['Ordenador' as DetailTab] : []), ...(['Execução', 'Prestação de Contas', 'Baixa SIAFE', 'Arquivo'] as DetailTab[])]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-8 py-5 text-[9px] font-black uppercase tracking-[0.2em] transition-all relative inline-block ${
              activeTab === tab
                ? 'text-emerald-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-full shadow-[0_-4px_10px_rgba(16,185,129,0.3)] animate-in slide-in-from-bottom-2" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'Visão Geral' && renderOverviewTab()}
      
      {activeTab === 'Análise Técnica' && renderAnalysisTab()}

      {activeTab === 'Execução' && renderExecucaoTab()}

      {activeTab === 'Ordenador' && isSefinView && renderOrdenadorTab()}

      {['Prestação de Contas', 'Baixa SIAFE', 'Arquivo'].includes(activeTab) && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
           <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-3xl text-slate-200">
              <i className="fa-solid fa-layer-group"></i>
           </div>
           <div className="text-center">
              <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Fase {activeTab}</h4>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">Esta funcionalidade está sendo preparada para o próximo sprint.</p>
           </div>
        </div>
      )}

      {activeTab === 'Dossiê Digital' && (
        <div className="flex flex-col lg:flex-row gap-12 print:block print:gap-0">
          <div className="w-full lg:w-80 space-y-3 no-print">
            <div className="flex justify-between items-center ml-2 mb-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Estrutura do Processo</h4>
              <div className="flex gap-2">
                 <button onClick={() => setShowAiModal(true)} title="Novo Doc. com IA" className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm"><i className="fa-solid fa-wand-magic-sparkles text-[10px]"></i></button>
                 <button onClick={handleUploadClick} title="Upload de Documento" className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><i className="fa-solid fa-plus text-[10px]"></i></button>
                 <input type="file" ref={uploadInputRef} onChange={handleFileChange} className="hidden" />
              </div>
            </div>
            <div className="space-y-3">
              {dossierList.map(doc => (
                <div key={doc.id} className="relative group/doc animate-in slide-in-from-left-5 duration-300">
                  <button onClick={() => { setSelectedDocId(doc.id); setIsConsolidated(false); }} className={`w-full text-left p-6 rounded-4xl border transition-all ${selectedDocId === doc.id && !isConsolidated ? 'bg-white border-blue-500 shadow-2xl scale-[1.05] z-10' : 'bg-white border-slate-50 opacity-60 hover:opacity-100'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${selectedDocId === doc.id && !isConsolidated ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-300'}`}><i className={`fa-solid ${doc.icon}`}></i></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-slate-900 uppercase truncate mb-1">{doc.name}</p>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${doc.status === 'Assinado' || doc.status === 'Validado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{doc.status}</span>
                      </div>
                    </div>
                  </button>
                  {doc.id.startsWith('ai-') || doc.id.startsWith('up-') ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDocToDelete(doc.id); setShowDeleteModal(true); }}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-rose-50 text-rose-500 opacity-0 group-hover/doc:opacity-100 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center shadow-lg"
                      title="Excluir Documento"
                    >
                      <i className="fa-solid fa-trash text-[10px]"></i>
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Visualização A4 Realista - Área de Impressão Principal */}
          <div className="flex-1 flex flex-col items-center bg-slate-100/50 rounded-[4rem] p-4 md:p-12 border border-slate-200 shadow-inner min-h-[800px] print:bg-white print:border-none print:p-0 print:block overflow-visible">
             {uploadLoading || aiGenerating ? (
               <div className="flex-1 flex flex-col items-center justify-center space-y-6 no-print">
                  <div className="relative"><div className="w-24 h-24 border-8 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div><i className={`fa-solid ${aiGenerating ? 'fa-robot' : 'fa-upload'} absolute inset-0 flex items-center justify-center text-2xl text-blue-600`}></i></div>
                  <div className="text-center"><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">{aiGenerating ? 'Agent ÁGIL IA Gerando Conteúdo...' : 'Digitalizando Documento...'}</p></div>
               </div>
             ) : (
               <div className="w-full flex flex-col items-center print:block">
                 {isConsolidated ? (
                   dossierList.map(doc => renderA4Page(doc.id, true))
                 ) : (
                   renderA4Page(selectedDocId, true)
                 )}
               </div>
             )}

             {isManagerView && request.status === 'Pendente' && (selectedDocId === 'doc-3' || isConsolidated) && (
               <div className="mt-12 no-print flex flex-col items-center gap-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Validação Final de Gestão</p>
                  <button onClick={() => setShowSignModal(true)} className="bg-[#00422d] text-white px-20 py-7 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-6"><i className="fa-solid fa-file-signature text-xl text-emerald-400"></i>CONCORDAR E ASSINAR DIGITALMENTE</button>
               </div>
             )}

             {isOrdenadorPending && (selectedDocId === 'doc-4' || isConsolidated) && (
               <div className="mt-12 no-print flex flex-col items-center gap-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Autorização do Ordenador de Despesas</p>
                  <button onClick={() => setActiveTab('Ordenador')} className="bg-blue-700 text-white px-20 py-7 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-6"><i className="fa-solid fa-file-contract text-xl text-blue-300"></i>REVISAR E ASSINAR MINUTA DE AUTORIZAÇÃO</button>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestDetails;
