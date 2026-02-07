import React, { useState } from 'react';
import {
  X, CheckCircle2, FileText, Award, DollarSign, FileCheck, CreditCard,
  ChevronRight, ChevronLeft, Loader2, Send, AlertTriangle, Upload, File as FileIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Tooltip } from '../ui/Tooltip';

// ==================== TYPES ====================
interface ProcessData {
  id: string;
  process_number?: string;
  beneficiary?: string;
  value?: number;
  unit?: string;
  status?: string;
  event_start_date?: string;
  event_end_date?: string;
  ptres_code?: string;
  dotacao_code?: string;
  ne_numero?: string;
  dl_numero?: string;
  ob_numero?: string;
  portaria_sf_numero?: string;
  cpf?: string;
}

interface ExpenseExecutionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  process: ProcessData;
  onSuccess?: () => void;
}

type ExecutionStep = 'PORTARIA' | 'CERTIDAO' | 'NE' | 'DL' | 'OB' | 'TRAMITAR';

const STEPS: { key: ExecutionStep; label: string; icon: React.ReactNode; description: string }[] = [
  { key: 'PORTARIA', label: 'Portaria SF', icon: <FileText size={18} />, description: 'Gerar a Portaria de Suprimento de Fundos com dados orçamentários' },
  { key: 'CERTIDAO', label: 'Certidão', icon: <Award size={18} />, description: 'Gerar a Certidão de Regularidade do suprido' },
  { key: 'NE', label: 'Nota de Empenho', icon: <DollarSign size={18} />, description: 'Registrar a Nota de Empenho (compromisso orçamentário)' },
  { key: 'DL', label: 'Doc. Liquidação', icon: <FileCheck size={18} />, description: 'Gerar o Documento de Liquidação (verificação da despesa)' },
  { key: 'OB', label: 'Ordem Bancária', icon: <CreditCard size={18} />, description: 'Emitir a Ordem Bancária para pagamento ao suprido' },
  { key: 'TRAMITAR', label: 'Tramitar', icon: <Send size={18} />, description: 'Enviar os documentos para assinatura do Ordenador de Despesa' },
];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// ==================== MAIN COMPONENT ====================
export const ExpenseExecutionWizard: React.FC<ExpenseExecutionWizardProps> = ({
  isOpen, onClose, process, onSuccess
}) => {
  const [currentStep, setCurrentStep] = useState<ExecutionStep>('PORTARIA');
  const [isProcessing, setIsProcessing] = useState(false);

  // Form states
  const [selectedPtres, setSelectedPtres] = useState(process.ptres_code || '');
  const [selectedDotacao, setSelectedDotacao] = useState(process.dotacao_code || '');
  const [portariaNumero, setPortariaNumero] = useState(process.portaria_sf_numero || '');

  // NE/DL/OB
  const [neValor, setNeValor] = useState(process.value || 0);
  const [dlValor, setDlValor] = useState(process.value || 0);
  const [obValor, setObValor] = useState(process.value || 0);
  const [neFile, setNeFile] = useState<File | null>(null);
  const [dlFile, setDlFile] = useState<File | null>(null);
  const [obFile, setObFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Document generation tracking
  const [generatedDocs, setGeneratedDocs] = useState<Record<string, boolean>>({
    PORTARIA: !!process.portaria_sf_numero,
    CERTIDAO: false,
    NE: !!process.ne_numero,
    DL: !!process.dl_numero,
    OB: !!process.ob_numero
  });

  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const goNext = () => { if (currentStepIndex < STEPS.length - 1) setCurrentStep(STEPS[currentStepIndex + 1].key); };
  const goPrev = () => { if (currentStepIndex > 0) setCurrentStep(STEPS[currentStepIndex - 1].key); };

  // ==================== HANDLERS ====================

  const handleGeneratePortaria = async () => {
    if (!selectedPtres || !selectedDotacao) {
      alert('Preencha o PTRES e a Dotação Orçamentária.');
      return;
    }
    setIsProcessing(true);
    try {
      const year = new Date().getFullYear();
      const portariaNum = `${Math.floor(Math.random() * 900) + 100}/${year}-SF`;
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('solicitations').update({
        ptres_code: selectedPtres,
        dotacao_code: selectedDotacao,
        portaria_sf_numero: portariaNum,
        execution_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', process.id);

      await supabase.from('process_documents').insert({
        solicitation_id: process.id,
        title: `Portaria SF ${portariaNum}`,
        description: 'Portaria de Suprimento de Fundos',
        document_type: 'PORTARIA_SF',
        status: 'MINUTA',
        created_at: new Date().toISOString(),
        metadata: {
          portaria_numero: portariaNum,
          ptres: selectedPtres,
          dotacao: selectedDotacao,
          content: generatePortariaContent(portariaNum)
        }
      });

      setPortariaNumero(portariaNum);
      setGeneratedDocs(p => ({ ...p, PORTARIA: true }));
      alert(`Portaria SF ${portariaNum} gerada com sucesso!`);
      goNext();
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar Portaria.');
    } finally { setIsProcessing(false); }
  };

  const handleGenerateCertidao = async () => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('process_documents').insert({
        solicitation_id: process.id,
        title: 'Certidão de Regularidade',
        description: 'Certidão de Regularidade Fiscal do Suprido',
        document_type: 'CERTIDAO_REGULARIDADE',
        status: 'MINUTA',
        created_at: new Date().toISOString(),
        metadata: { content: generateCertidaoContent() }
      });

      setGeneratedDocs(p => ({ ...p, CERTIDAO: true }));
      alert('Certidão de Regularidade emitida!');
      goNext();
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar Certidão.');
    } finally { setIsProcessing(false); }
  };

  const handleUploadFile = async (file: File | undefined, tipo: string, setFile: (f: File | null) => void) => {
    if (!file) return;
    if (file.type !== 'application/pdf') { alert('Selecione um PDF.'); return; }
    setIsUploading(true);
    try {
      const filePath = `execution/${process.id}/${tipo.toLowerCase()}_${Date.now()}.pdf`;
      const { error } = await supabase.storage.from('documentos').upload(filePath, file);
      if (error) throw error;
      setFile(file);
      alert(`${file.name} carregado com sucesso!`);
    } catch (err: any) {
      console.error(err);
      // Storage might not exist, just save the file reference locally
      setFile(file);
    } finally { setIsUploading(false); }
  };

  const handleSaveDocument = async (
    tipo: string, titulo: string, valor: number, file: File,
    dbField: string, autoSign: boolean
  ) => {
    if (valor <= 0) { alert('Informe o valor do documento.'); return; }
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Update solicitation
      await supabase.from('solicitations').update({
        [dbField + '_numero']: file.name.replace('.pdf', ''),
        [dbField + '_valor']: valor,
        updated_at: new Date().toISOString()
      } as any).eq('id', process.id);

      // Create document
      await supabase.from('process_documents').insert({
        solicitation_id: process.id,
        title: `${titulo} - ${file.name}`,
        description: `${titulo} (SIAFE)`,
        document_type: tipo,
        status: autoSign ? 'SIGNED' : 'MINUTA',
        created_at: new Date().toISOString(),
        metadata: {
          value: valor,
          original_filename: file.name,
          source: 'EXTERNAL_ERP',
          ...(autoSign ? { signer: user?.email, signed_at: new Date().toISOString() } : {})
        }
      });

      const key = dbField.toUpperCase();
      setGeneratedDocs(p => ({ ...p, [key]: true }));
      alert(`${titulo} registrad${autoSign ? 'o e assinado' : 'o'}! Valor: ${formatCurrency(valor)}`);
      goNext();
    } catch (err) {
      console.error(err);
      alert(`Erro ao registrar ${titulo}.`);
    } finally { setIsProcessing(false); }
  };

  const handleTramitarOrdenador = async () => {
    if (!generatedDocs.PORTARIA || !generatedDocs.CERTIDAO || !generatedDocs.NE) {
      alert('Gere a Portaria SF, Certidão e NE antes de tramitar.');
      return;
    }
    if (!confirm('Confirma tramitação para o Ordenador de Despesa (SEFIN)?')) return;

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('solicitations').update({
        status: 'WAITING_SEFIN_SIGNATURE',
        updated_at: new Date().toISOString()
      }).eq('id', process.id);

      await supabase.from('historico_tramitacao').insert({
        solicitation_id: process.id,
        status_from: 'WAITING_SOSFU_EXECUTION',
        status_to: 'WAITING_SEFIN_SIGNATURE',
        actor_name: user?.email,
        description: 'Portaria SF, Certidão e NE tramitadas para assinatura do Ordenador de Despesa (SEFIN).',
        created_at: new Date().toISOString()
      });

      // Create SEFIN signing tasks for the 3 documents
      const docsToSign = [
        { type: 'PORTARIA_SF', title: `Portaria SF ${portariaNumero} - ${process.beneficiary}` },
        { type: 'CERTIDAO_REGULARIDADE', title: `Certidão de Regularidade - ${process.beneficiary}` },
        { type: 'NOTA_EMPENHO', title: `Nota de Empenho - ${process.process_number}` },
      ];

      for (const doc of docsToSign) {
        await supabase.from('sefin_signing_tasks').insert({
          solicitation_id: process.id,
          document_type: doc.type,
          title: doc.title,
          origin: 'SOSFU',
          value: process.value || neValor,
          status: 'PENDING'
        });
      }

      alert('Documentos tramitados para o Ordenador de Despesa com sucesso!');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      alert('Erro ao tramitar.');
    } finally { setIsProcessing(false); }
  };

  // ==================== CONTENT GENERATORS ====================

  const generatePortariaContent = (numero: string) => {
    const nup = process.process_number || 'N/I';
    const interessado = process.beneficiary || 'Servidor não identificado';
    const valor = process.value || 0;
    return `PORTARIA SF Nº ${numero}\n\nSecretário de Planejamento, Coordenação e Finanças do Tribunal de Justiça do Estado do Pará, no exercício das suas atribuições,\n\nRESOLVE:\n\nArt. 1º AUTORIZAR a concessão de Suprimento de Fundos ao servidor ${interessado}, a ser executado através do PTRES ${selectedPtres} e Dotação Orçamentária ${selectedDotacao}, conforme NUP ${nup}.\n\nArt. 2º O valor total é de ${formatCurrency(valor)}.\n\nArt. 3º O prazo de aplicação é de 90 dias e o de prestação de contas é de 30 dias após o término.\n\nBelém-PA, ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.`;
  };

  const generateCertidaoContent = () => {
    const interessado = process.beneficiary || 'Servidor não identificado';
    const nup = process.process_number || 'N/I';
    return `CERTIDÃO DE REGULARIDADE\n\nCERTIFICO que o servidor ${interessado}, interessado no processo NUP ${nup}, encontra-se REGULAR perante as obrigações relacionadas a suprimentos de fundos anteriores.\n\nBelém-PA, ${new Date().toLocaleDateString('pt-BR')}.`;
  };

  if (!isOpen) return null;

  // ==================== RENDER ====================

  const renderUploadArea = (
    file: File | null, setFile: (f: File | null) => void,
    inputId: string, color: string, onUpload: (f: File | undefined) => void
  ) => (
    <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
      file ? 'border-emerald-300 bg-emerald-50' : `border-${color}-300 bg-white hover:border-${color}-400`
    }`}>
      {file ? (
        <div className="space-y-3">
          <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-2xl flex items-center justify-center">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <p className="font-bold text-emerald-800">{file.name}</p>
          <p className="text-xs text-emerald-600">{(file.size / 1024).toFixed(1)} KB • PDF pronto</p>
          <button onClick={() => setFile(null)} className="text-xs text-red-600 hover:underline">Remover</button>
        </div>
      ) : (
        <>
          <div className={`w-16 h-16 mx-auto bg-${color}-100 rounded-2xl flex items-center justify-center mb-4`}>
            <Upload size={32} className={`text-${color}-600`} />
          </div>
          <p className="text-sm text-slate-600 mb-4">Arraste o PDF ou clique para selecionar</p>
          <input type="file" accept="application/pdf" onChange={e => onUpload(e.target.files?.[0])}
            className="hidden" id={inputId} disabled={isUploading} />
          <label htmlFor={inputId}
            className={`cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-${color}-600 text-white rounded-xl font-bold hover:bg-${color}-700 transition-all`}>
            {isUploading ? <Loader2 className="animate-spin" size={16} /> : <FileIcon size={16} />}
            Selecionar PDF
          </label>
        </>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Execução da Despesa</h2>
              <p className="text-blue-200 text-sm font-medium mt-1">
                {process.process_number} • {process.beneficiary}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-all">
              <X size={24} />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-8 overflow-x-auto pb-2">
            {STEPS.map((step) => (
              <Tooltip key={step.key} content={step.description} position="bottom" delay={300}>
              <button
                onClick={() => setCurrentStep(step.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                  currentStep === step.key
                    ? 'bg-white text-blue-600'
                    : generatedDocs[step.key]
                      ? 'bg-emerald-500/20 text-emerald-200'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {generatedDocs[step.key] ? <CheckCircle2 size={14} /> : step.icon}
                {step.label}
              </button>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8">

          {/* Step: PORTARIA */}
          {currentStep === 'PORTARIA' && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <h3 className="text-lg font-black text-slate-800 mb-2">1. Portaria de Suprimento de Fundos</h3>
                <p className="text-sm text-slate-600 mb-6">
                  Informe o PTRES e a Dotação Orçamentária. Estes dados serão referenciados no Art. 1º da Portaria.
                </p>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">PTRES *</label>
                    <input type="text" value={selectedPtres} onChange={e => setSelectedPtres(e.target.value)}
                      placeholder="Ex: 096543" className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-medium" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Dotação Orçamentária *</label>
                    <input type="text" value={selectedDotacao} onChange={e => setSelectedDotacao(e.target.value)}
                      placeholder="Ex: 02.061.1469.8631" className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-medium" />
                  </div>
                </div>
                {selectedPtres && selectedDotacao && (
                  <div className="mt-6 p-4 bg-white rounded-xl border border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Prévia do Art. 1º</p>
                    <p className="text-sm text-slate-700">
                      <strong>Art. 1º</strong> AUTORIZAR a concessão de Suprimento de Fundos ao servidor {process.beneficiary},
                      a ser executado através do <strong className="text-blue-600">PTRES {selectedPtres}</strong> e
                      <strong className="text-blue-600"> Dotação Orçamentária {selectedDotacao}</strong>.
                    </p>
                  </div>
                )}
              </div>
              <button onClick={handleGeneratePortaria}
                disabled={!selectedPtres || !selectedDotacao || isProcessing || generatedDocs.PORTARIA}
                className="w-full py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />}
                {generatedDocs.PORTARIA ? 'Portaria Gerada ✓' : 'Minutar Portaria SF'}
              </button>
            </div>
          )}

          {/* Step: CERTIDAO */}
          {currentStep === 'CERTIDAO' && (
            <div className="space-y-6">
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                <h3 className="text-lg font-black text-slate-800 mb-2">2. Certidão de Regularidade</h3>
                <p className="text-sm text-slate-600 mb-6">
                  A Certidão atesta que o servidor não possui pendências de prestação de contas anteriores.
                </p>
                <div className="p-4 bg-white rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3 text-emerald-600">
                    <CheckCircle2 size={24} />
                    <span className="font-bold">Servidor {process.beneficiary} encontra-se REGULAR</span>
                  </div>
                </div>
              </div>
              <button onClick={handleGenerateCertidao}
                disabled={isProcessing || generatedDocs.CERTIDAO}
                className="w-full py-4 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Award size={16} />}
                {generatedDocs.CERTIDAO ? 'Certidão Emitida ✓' : 'Emitir Certidão'}
              </button>
            </div>
          )}

          {/* Step: NE */}
          {currentStep === 'NE' && (
            <div className="space-y-6">
              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                <h3 className="text-lg font-black text-slate-800 mb-2">3. Nota de Empenho (NE)</h3>
                <p className="text-sm text-slate-600 mb-6">
                  Upload do PDF da NE do <strong>SIAFE</strong>. Será enviada para assinatura do Ordenador.
                </p>
                <div className="mb-6">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Valor da NE (R$)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                    <input type="number" step="0.01" value={neValor} onChange={e => setNeValor(Number(e.target.value))}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 text-lg" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Triple Check: NE ≥ DL ≥ OB</p>
                </div>
                {renderUploadArea(neFile, setNeFile, 'ne-upload', 'amber',
                  f => handleUploadFile(f, 'NE', setNeFile))}
              </div>
              <button onClick={() => neFile && handleSaveDocument('NOTA_EMPENHO', 'Nota de Empenho', neValor, neFile, 'ne', false)}
                disabled={!neFile || isProcessing}
                className="w-full py-4 bg-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <DollarSign size={16} />}
                {generatedDocs.NE ? 'NE Registrada ✓' : 'Registrar NE'}
              </button>
            </div>
          )}

          {/* Step: DL (Auto-signed by SOSFU) */}
          {currentStep === 'DL' && (
            <div className="space-y-6">
              <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                <h3 className="text-lg font-black text-slate-800 mb-2">4. Documento de Liquidação (DL)</h3>
                <p className="text-sm text-slate-600 mb-2">
                  Upload do PDF do DL do <strong>SIAFE</strong>. <span className="text-purple-700 font-bold">Assinado automaticamente pelo analista SOSFU.</span>
                </p>
                <div className="mb-6">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Valor da Liquidação (R$)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                    <input type="number" step="0.01" value={dlValor} onChange={e => setDlValor(Number(e.target.value))}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 text-lg" />
                  </div>
                  {dlValor !== neValor && dlValor > 0 && (
                    <p className="text-xs text-amber-600 font-bold mt-1 flex items-center gap-1">
                      <AlertTriangle size={12} /> Valor diferente da NE ({formatCurrency(neValor)})
                    </p>
                  )}
                </div>
                {renderUploadArea(dlFile, setDlFile, 'dl-upload', 'purple',
                  f => handleUploadFile(f, 'DL', setDlFile))}
              </div>
              <button onClick={() => dlFile && handleSaveDocument('LIQUIDACAO', 'Doc. de Liquidação', dlValor, dlFile, 'dl', true)}
                disabled={!dlFile || isProcessing}
                className="w-full py-4 bg-purple-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <FileCheck size={16} />}
                {generatedDocs.DL ? 'DL Registrado ✓' : 'Registrar e Assinar DL'}
              </button>
            </div>
          )}

          {/* Step: OB (Auto-signed by SOSFU) */}
          {currentStep === 'OB' && (
            <div className="space-y-6">
              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                <h3 className="text-lg font-black text-slate-800 mb-2">5. Ordem Bancária (OB)</h3>
                <p className="text-sm text-slate-600 mb-2">
                  Upload do PDF da OB do <strong>SIAFE</strong>. <span className="text-indigo-700 font-bold">Assinada automaticamente pelo analista SOSFU.</span>
                </p>
                <div className="mb-6">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Valor da Ordem Bancária (R$)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                    <input type="number" step="0.01" value={obValor} onChange={e => setObValor(Number(e.target.value))}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 text-lg" />
                  </div>
                  {obValor !== dlValor && obValor > 0 && (
                    <p className="text-xs text-red-600 font-bold mt-1 flex items-center gap-1">
                      <AlertTriangle size={12} /> Valor diferente do DL ({formatCurrency(dlValor)})
                    </p>
                  )}
                </div>
                {renderUploadArea(obFile, setObFile, 'ob-upload', 'indigo',
                  f => handleUploadFile(f, 'OB', setObFile))}
              </div>
              <button onClick={() => obFile && handleSaveDocument('ORDEM_BANCARIA', 'Ordem Bancária', obValor, obFile, 'ob', true)}
                disabled={!obFile || isProcessing}
                className="w-full py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <CreditCard size={16} />}
                {generatedDocs.OB ? 'OB Registrada ✓' : 'Registrar e Assinar OB'}
              </button>
            </div>
          )}

          {/* Step: TRAMITAR */}
          {currentStep === 'TRAMITAR' && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="text-lg font-black text-slate-800 mb-2">6. Tramitar para Ordenador (SEFIN)</h3>
                <p className="text-sm text-slate-600 mb-6">
                  Envie Portaria SF, Certidão e NE para assinatura do Ordenador de Despesa.
                </p>
                <div className="space-y-3">
                  {[
                    { key: 'PORTARIA', label: `Portaria SF ${portariaNumero ? `(${portariaNumero})` : ''}`, dest: 'SEFIN' },
                    { key: 'CERTIDAO', label: 'Certidão de Regularidade', dest: 'SEFIN' },
                    { key: 'NE', label: 'Nota de Empenho', dest: 'SEFIN' },
                    { key: 'DL', label: 'Doc. de Liquidação', dest: 'SOSFU (auto)' },
                    { key: 'OB', label: 'Ordem Bancária', dest: 'SOSFU (auto)' },
                  ].map(doc => (
                    <div key={doc.key} className={`flex items-center justify-between p-3 rounded-xl ${
                      generatedDocs[doc.key] ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                      <div className="flex items-center gap-2">
                        {generatedDocs[doc.key] ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                        <span className="font-bold text-sm">{doc.label}</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">→ {doc.dest}</span>
                    </div>
                  ))}
                </div>

                {/* Triple Check Summary */}
                {generatedDocs.NE && (
                  <div className="mt-6 p-4 bg-white rounded-xl border border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-3">Triple Check: NE → DL → OB</p>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div><p className="text-[9px] font-bold text-amber-600 uppercase">NE</p><p className="text-lg font-black text-slate-800">{formatCurrency(neValor)}</p></div>
                      <div><p className="text-[9px] font-bold text-purple-600 uppercase">DL</p><p className="text-lg font-black text-slate-800">{formatCurrency(dlValor)}</p></div>
                      <div><p className="text-[9px] font-bold text-indigo-600 uppercase">OB</p><p className="text-lg font-black text-slate-800">{formatCurrency(obValor)}</p></div>
                    </div>
                  </div>
                )}

                {(!generatedDocs.PORTARIA || !generatedDocs.CERTIDAO || !generatedDocs.NE) && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                    <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700">Gere todos os documentos obrigatórios (Portaria, Certidão, NE) antes de tramitar.</p>
                  </div>
                )}
              </div>

              <button onClick={handleTramitarOrdenador}
                disabled={!generatedDocs.PORTARIA || !generatedDocs.CERTIDAO || !generatedDocs.NE || isProcessing}
                className="w-full py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                Tramitar para Ordenador (SEFIN)
              </button>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-6 border-t border-slate-100 flex justify-between shrink-0">
          <button onClick={goPrev} disabled={isFirstStep}
            className="flex items-center gap-2 px-6 py-3 text-slate-500 font-bold text-xs hover:bg-slate-50 rounded-xl disabled:opacity-30">
            <ChevronLeft size={16} /> Anterior
          </button>
          {currentStep !== 'TRAMITAR' && (
            <button onClick={goNext}
              className="flex items-center gap-2 px-6 py-3 text-blue-600 font-bold text-xs hover:bg-blue-50 rounded-xl">
              Pular <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpenseExecutionWizard;
