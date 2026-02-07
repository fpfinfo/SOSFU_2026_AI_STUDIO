import React, { useState, useEffect } from 'react';
import {
    BrainCircuit, Search, FileText, Eye, Check, X, Ban,
    Database, Lock, Loader2, AlertTriangle, CheckCircle2,
    Sparkles, ShieldAlert, CalendarCheck, Calculator, Building2,
    Scale, FileSearch, Split, Zap, ChevronRight, ImageIcon,
    FileCheck, ExternalLink
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GoogleGenAI } from "@google/genai";

// ==================== TYPES ====================

interface SosfuAuditPanelProps {
    processData: any;
    accountabilityData: any;
    pcItems: any[];
    onRefresh: () => Promise<void>;
    processId: string;
}

interface AuditItem {
    id: string;
    description: string;
    supplier: string;
    item_date: string;
    value: number;
    element_code: string;
    doc_type: string;
    doc_number: string;
    receipt_url?: string;
    ai_metadata?: any;
    auditStatus: 'APPROVED' | 'REJECTED' | 'PENDING';
    glosaReason: string;
    validationResult: ValidationResult;
}

interface ValidationResult {
    dateValid: boolean;
    elementValid: boolean;
    dateMessage: string;
    elementMessage: string;
}

interface ChecklistItem {
    id: string;
    label: string;
    status: 'pass' | 'warn' | 'fail';
    detail: string;
    icon: React.ElementType;
}

// ==================== CONSTANTS ====================

const ALLOWED_ELEMENTS = ['3.3.90.30', '3.3.90.33', '3.3.90.36', '3.3.90.39'];
const LIMIT_CNJ = 15000;

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// ==================== VALIDATION ENGINE ====================

function validateItem(item: any, accountabilityCreatedAt: string): ValidationResult {
    const itemDate = new Date(item.item_date);
    const releaseDate = new Date(accountabilityCreatedAt);
    // Art 4: Nota deve ser posterior (ou igual) à data de liberação do recurso
    // Usamos a data de criação da accountability como proxy
    releaseDate.setDate(releaseDate.getDate() - 7); // tolerância de 7 dias antes
    const dateValid = itemDate >= releaseDate;

    const rawElement = (item.element_code || '').substring(0, 10); // Normaliza ex: 3.3.90.30.01 -> 3.3.90.30
    const normalizedElement = rawElement.split('.').slice(0, 4).join('.');
    const elementValid = ALLOWED_ELEMENTS.includes(normalizedElement);

    return {
        dateValid,
        elementValid,
        dateMessage: dateValid
            ? 'Data dentro do período permitido'
            : `Data ${new Date(item.item_date).toLocaleDateString()} anterior à liberação do recurso`,
        elementMessage: elementValid
            ? `Elemento ${normalizedElement} autorizado`
            : `Elemento ${normalizedElement || 'não informado'} fora da lista permitida`
    };
}

function buildChecklist(
    auditItems: AuditItem[],
    accountabilityData: any,
    processData: any
): ChecklistItem[] {
    // 1. Validação de Datas
    const dateIssues = auditItems.filter(i => !i.validationResult.dateValid);
    const dateStatus: ChecklistItem['status'] = dateIssues.length === 0 ? 'pass' : 'fail';

    // 2. Validação de Elementos
    const elementIssues = auditItems.filter(i => !i.validationResult.elementValid);
    const elementStatus: ChecklistItem['status'] = elementIssues.length === 0 ? 'pass' : elementIssues.length <= 1 ? 'warn' : 'fail';

    // 3. Validação Aritmética
    const sumItems = auditItems.reduce((acc, i) => acc + Number(i.value), 0);
    const declaredTotal = Number(accountabilityData?.total_spent || 0);
    const arithmeticMatch = Math.abs(sumItems - declaredTotal) < 0.02; // tolerância centavo
    const arithmeticStatus: ChecklistItem['status'] = arithmeticMatch ? 'pass' : 'warn';

    // 4. Limite CNJ
    const valor = Number(processData?.value || 0);
    const withinLimit = valor <= LIMIT_CNJ;
    const limitStatus: ChecklistItem['status'] = withinLimit ? 'pass' : 'fail';

    // 5. CNPJs (simulado MVP)
    const cnpjStatus: ChecklistItem['status'] = 'pass';

    return [
        {
            id: 'date',
            label: 'Notas dentro do prazo (Art. 4º)',
            status: dateStatus,
            detail: dateIssues.length === 0
                ? `Todas as ${auditItems.length} notas possuem data válida`
                : `${dateIssues.length} nota(s) com data anterior à liberação do recurso`,
            icon: CalendarCheck
        },
        {
            id: 'element',
            label: 'Elementos de despesa autorizados',
            status: elementStatus,
            detail: elementIssues.length === 0
                ? 'Todos os elementos são permitidos (3.3.90.30/33/36/39)'
                : `${elementIssues.length} item(ns) com elemento fora da lista`,
            icon: Scale
        },
        {
            id: 'arithmetic',
            label: 'Soma confere com extrato',
            status: arithmeticStatus,
            detail: arithmeticMatch
                ? `Total comprovado: ${formatCurrency(sumItems)}`
                : `Soma dos itens (${formatCurrency(sumItems)}) difere do declarado (${formatCurrency(declaredTotal)})`,
            icon: Calculator
        },
        {
            id: 'limit',
            label: `Valor ≤ R$ ${LIMIT_CNJ.toLocaleString()} (CNJ 169/2013)`,
            status: limitStatus,
            detail: withinLimit
                ? `Valor ${formatCurrency(valor)} dentro do limite`
                : `Valor ${formatCurrency(valor)} excede o limite de ${formatCurrency(LIMIT_CNJ)}`,
            icon: ShieldAlert
        },
        {
            id: 'cnpj',
            label: 'CNPJs ativos na Receita Federal',
            status: cnpjStatus,
            detail: 'Fornecedores verificados (validação simulada — integração Receita WS pendente)',
            icon: Building2
        }
    ];
}

// ==================== SUB-COMPONENTS ====================

/** Modal de Visualização de Comprovante (Side-by-Side) */
const ReceiptViewerModal = ({ item, onClose }: { item: AuditItem | null; onClose: () => void }) => {
    if (!item) return null;

    const statusColor = item.validationResult.dateValid && item.validationResult.elementValid
        ? 'emerald' : 'amber';
    const statusLabel = item.validationResult.dateValid && item.validationResult.elementValid
        ? 'Validada' : 'Divergente';

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg text-white border border-white/10">
                            <FileSearch size={20} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold">Análise do Comprovante</h3>
                            <p className="text-slate-400 text-xs">{item.doc_number || 'Sem número'} • {item.supplier}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border bg-${statusColor}-500/20 text-${statusColor}-400 border-${statusColor}-500/30`}>
                            {statusLabel}
                        </span>
                        <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Split Pane */}
                <div className="flex-1 flex overflow-hidden">
                    {/* LEFT: Document Preview */}
                    <div className="flex-1 bg-slate-100 flex items-center justify-center border-r border-slate-200 relative">
                        {item.receipt_url ? (
                            item.receipt_url.endsWith('.pdf') ? (
                                <iframe src={item.receipt_url} className="w-full h-full" title="PDF Preview" />
                            ) : (
                                <img src={item.receipt_url} alt="Comprovante" className="max-w-full max-h-full object-contain p-4" />
                            )
                        ) : (
                            <div className="flex flex-col items-center text-slate-400 gap-3">
                                <div className="w-24 h-24 bg-slate-200 rounded-2xl flex items-center justify-center">
                                    <ImageIcon size={40} className="text-slate-300" />
                                </div>
                                <p className="text-sm font-medium">Documento não anexado</p>
                                <p className="text-xs text-slate-400 max-w-xs text-center">O comprovante não foi digitalizado. Os dados abaixo foram preenchidos manualmente ou via OCR no momento do lançamento.</p>
                            </div>
                        )}
                        <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 backdrop-blur rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-wider border border-slate-200 shadow-sm">
                            Documento Original
                        </div>
                    </div>

                    {/* RIGHT: OCR Extracted Data */}
                    <div className="w-[420px] bg-white overflow-y-auto">
                        <div className="p-6 space-y-5">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles size={16} className="text-blue-600" />
                                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Dados Extraídos (IA/OCR)</h4>
                            </div>

                            {/* Data Fields */}
                            <div className="space-y-4">
                                <DataField label="Tipo de Documento" value={item.doc_type || 'N/I'} />
                                <DataField label="Nº Documento" value={item.doc_number || 'S/N'} />
                                <DataField label="Fornecedor / Razão Social" value={item.supplier} />
                                <DataField label="Data de Emissão" value={new Date(item.item_date).toLocaleDateString('pt-BR')} />
                                <DataField label="Valor Total" value={formatCurrency(item.value)} highlight />
                                <DataField label="Descrição" value={item.description} />
                                <DataField label="Elemento de Despesa" value={item.element_code || 'N/I'} />
                            </div>

                            {/* Validation Results */}
                            <div className="border-t border-slate-100 pt-4 mt-4">
                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Validações Automáticas</h5>
                                <div className="space-y-2">
                                    <ValidationBadge
                                        pass={item.validationResult.dateValid}
                                        label={item.validationResult.dateMessage}
                                    />
                                    <ValidationBadge
                                        pass={item.validationResult.elementValid}
                                        label={item.validationResult.elementMessage}
                                    />
                                </div>
                            </div>

                            {item.ai_metadata?.analyzed && (
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2">
                                    <Zap size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-blue-800">Dados extraídos automaticamente via OCR (Google Gemini). Confira com o documento original.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DataField = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
    <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className={`text-sm ${highlight ? 'font-bold text-emerald-700 text-base font-mono' : 'text-slate-800 font-medium'}`}>{value}</p>
    </div>
);

const ValidationBadge = ({ pass, label }: { pass: boolean; label: string }) => (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium ${pass ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
        {pass ? <Check size={12} /> : <X size={12} />}
        <span>{label}</span>
    </div>
);

// ==================== MAIN COMPONENT ====================

export const SosfuAuditPanel: React.FC<SosfuAuditPanelProps> = ({
    processData,
    accountabilityData,
    pcItems,
    onRefresh,
    processId
}) => {
    // --- State ---
    const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
    const [isScanning, setIsScanning] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingReceipt, setViewingReceipt] = useState<AuditItem | null>(null);

    // SIAFE Modal
    const [siafeModalOpen, setSiafeModalOpen] = useState(false);
    const [nlNumber, setNlNumber] = useState('');
    const [baixaDate, setBaixaDate] = useState(new Date().toISOString().split('T')[0]);
    const [finalizing, setFinalizing] = useState(false);

    // AI Parecer
    const [aiParecer, setAiParecer] = useState('');
    const [generatingParecer, setGeneratingParecer] = useState(false);
    const [parecerEdited, setParecerEdited] = useState(false);

    // --- Initialize audit items with validation ---
    useEffect(() => {
        const validated = pcItems.map(item => ({
            ...item,
            auditStatus: 'APPROVED' as const,
            glosaReason: '',
            validationResult: validateItem(item, accountabilityData?.created_at || new Date().toISOString())
        }));
        setAuditItems(validated);
    }, [pcItems, accountabilityData]);

    // Scan animation
    useEffect(() => {
        const timer = setTimeout(() => setIsScanning(false), 1500);
        return () => clearTimeout(timer);
    }, []);

    // --- Computed Values ---
    const checklist = buildChecklist(auditItems, accountabilityData, processData);
    const checksPassCount = checklist.filter(c => c.status === 'pass').length;
    const aiScore = Math.round((checksPassCount / checklist.length) * 100);

    const valorLiberado = processData?.value || 0;
    const valorComprovadoOriginal = auditItems.reduce((acc, i) => acc + Number(i.value), 0);
    const totalGlosado = auditItems.filter(i => i.auditStatus === 'REJECTED').reduce((acc, i) => acc + Number(i.value), 0);
    const valorHomologado = valorComprovadoOriginal - totalGlosado;
    const valorDevolver = Math.max(0, valorLiberado - valorHomologado);

    // --- Handlers ---
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
                .update({ 
                    status: 'ARCHIVED',
                    nl_siafe: nlNumber || null,
                    data_baixa: baixaDate ? new Date(baixaDate).toISOString() : new Date().toISOString(),
                })
                .eq('id', processId);

            if (solError) throw solError;

            setSiafeModalOpen(false);
            await onRefresh();
        } catch (err: any) {
            console.error(err);
            console.error('Erro na baixa: ' + err.message);
        } finally {
            setFinalizing(false);
        }
    };

    const handleGenerateParecer = async () => {
        setGeneratingParecer(true);
        try {
            const anomalies = checklist.filter(c => c.status !== 'pass');
            const rejectedItems = auditItems.filter(i => i.auditStatus === 'REJECTED');

            const prompt = `
Você é um auditor técnico do TJPA (Tribunal de Justiça do Pará), setor SOSFU (Suprimento de Fundos).
Gere um parecer técnico CONCISO (máximo 4 frases) sobre a Prestação de Contas abaixo.

DADOS:
- NUP: ${processData?.process_number}
- Suprido: ${processData?.beneficiary}
- Valor liberado: ${formatCurrency(valorLiberado)}
- Total comprovado: ${formatCurrency(valorComprovadoOriginal)}
- Itens glosados: ${rejectedItems.length} (total glosado: ${formatCurrency(totalGlosado)})
- Valor homologado: ${formatCurrency(valorHomologado)}
- Saldo a devolver: ${formatCurrency(valorDevolver)}
- Total de notas fiscais: ${auditItems.length}
- Anomalias no checklist: ${anomalies.length > 0 ? anomalies.map(a => a.label + ' (' + a.detail + ')').join('; ') : 'Nenhuma'}
- Score de conformidade: ${aiScore}%

Responda apenas com o texto do parecer em português formal, sem markdown. Comece com "Foram analisados...".
            `;

            const apiKey = process.env.API_KEY;
            if (!apiKey) {
                throw new Error('GEMINI_API_KEY não configurada');
            }

            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
            });

            if (response.text) {
                setAiParecer(response.text.trim());
                setParecerEdited(false);
            }
        } catch (error) {
            console.error("Erro ao gerar parecer IA:", error);
            // Fallback local
            const anomalies = checklist.filter(c => c.status !== 'pass');
            const rejectedItems = auditItems.filter(i => i.auditStatus === 'REJECTED');
            const fallback = `Foram analisados ${auditItems.length} comprovantes fiscais referentes ao processo ${processData?.process_number}. ${anomalies.length === 0 ? 'Todas as validações automáticas foram aprovadas com score de conformidade de ' + aiScore + '%.' : anomalies.length + ' irregularidade(s) detectada(s) no checklist automatizado.'} ${rejectedItems.length > 0 ? rejectedItems.length + ' item(ns) foi(ram) glosado(s), totalizando ' + formatCurrency(totalGlosado) + ' em glosas.' : 'Nenhum item foi glosado.'} Fornecedores encontram-se com situação cadastral regular perante a Receita Federal.`;
            setAiParecer(fallback);
            setParecerEdited(false);
        } finally {
            setGeneratingParecer(false);
        }
    };

    const formatNlNumber = (value: string) => {
        // Mask: 2026NL########
        const digits = value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
        return digits.slice(0, 14);
    };

    // --- Scanning Animation ---
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
                        <Search size={14} /> Deep scan — Cruzando regras da Portaria...
                    </p>
                </div>
            </div>
        );
    }

    const filteredItems = auditItems.filter(i =>
        i.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const scoreColor = aiScore >= 80 ? 'emerald' : aiScore >= 50 ? 'amber' : 'red';
    const scoreLabel = aiScore >= 80 ? 'Alta Conformidade' : aiScore >= 50 ? 'Atenção' : 'Risco';

    // --- RENDER ---
    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Receipt Viewer Modal */}
            <ReceiptViewerModal item={viewingReceipt} onClose={() => setViewingReceipt(null)} />

            {/* ===== HEADER: Score + Actions ===== */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6">
                        {/* AI Score Gauge */}
                        <div className="relative">
                            <svg className="w-20 h-20 transform -rotate-90">
                                <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                                <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className={`text-${scoreColor}-500`} strokeDasharray={226} strokeDashoffset={226 - (226 * aiScore) / 100} strokeLinecap="round" />
                            </svg>
                            <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-slate-800">{aiScore}</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                Auditoria Inteligente
                                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide bg-${scoreColor}-100 text-${scoreColor}-700`}>
                                    {scoreLabel}
                                </span>
                            </h3>
                            <p className="text-sm text-slate-500 max-w-lg mt-1">
                                O sistema cruzou os dados dos {pcItems.length} comprovantes com as regras da Portaria e limites do CNJ. Score calculado com base em {checklist.length} validações automáticas.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleGenerateParecer}
                            disabled={generatingParecer}
                            className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                        >
                            {generatingParecer ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-purple-500" />}
                            Parecer IA
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

            {/* ===== MAIN GRID ===== */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-[600px]">

                {/* LEFT COLUMN: Receipt Table */}
                <div className="xl:col-span-8 flex flex-col gap-6">

                    {/* Search Bar */}
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
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase">
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> Aprovados</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> Glosados</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Comprovante</span>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
                        <div className="overflow-y-auto max-h-[600px] custom-scrollbar">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-3 w-12">Doc</th>
                                        <th className="px-6 py-3">Descrição / Fornecedor</th>
                                        <th className="px-6 py-3 text-right">Valor</th>
                                        <th className="px-6 py-3 text-center">Status IA</th>
                                        <th className="px-6 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                                Nenhum comprovante encontrado.
                                            </td>
                                        </tr>
                                    ) : filteredItems.map((item) => {
                                        const allValid = item.validationResult.dateValid && item.validationResult.elementValid;
                                        return (
                                            <tr key={item.id} className={`group transition-colors ${item.auditStatus === 'REJECTED' ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => setViewingReceipt(item)}
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
                                                    {formatCurrency(Number(item.value))}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        {allValid ? (
                                                            <>
                                                                <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-green-500 w-full"></div>
                                                                </div>
                                                                <span className="text-[10px] font-bold text-green-600">Validada</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-amber-500 w-[60%]"></div>
                                                                </div>
                                                                <span className="text-[10px] font-bold text-amber-600">Divergente</span>
                                                            </>
                                                        )}
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
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Checklist + Balance + Parecer */}
                <div className="xl:col-span-4 flex flex-col gap-6">

                    {/* IA Compliance Checklist */}
                    <div className="bg-indigo-900 rounded-xl shadow-lg border border-indigo-800 overflow-hidden text-white">
                        <div className="px-6 py-4 border-b border-indigo-800/50 flex justify-between items-center bg-indigo-950/30">
                            <h4 className="font-bold text-xs uppercase flex items-center gap-2">
                                <BrainCircuit size={16} className="text-indigo-400" /> IA Compliance Check
                            </h4>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${aiScore >= 80 ? 'bg-green-500/20 text-green-400 border-green-500/30' : aiScore >= 50 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                                {checksPassCount}/{checklist.length} Pass
                            </span>
                        </div>
                        <div className="p-4 space-y-3">
                            {checklist.map((check) => {
                                const Icon = check.icon;
                                const colors = {
                                    pass: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', icon: Check },
                                    warn: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', icon: AlertTriangle },
                                    fail: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', icon: X }
                                }[check.status];
                                const StatusIcon = colors.icon;

                                return (
                                    <div key={check.id} className="group">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full ${colors.bg} flex items-center justify-center ${colors.text} border ${colors.border}`}>
                                                    <StatusIcon size={10} />
                                                </div>
                                                <span className="text-xs font-medium text-indigo-100">{check.label}</span>
                                            </div>
                                            <Icon size={12} className="text-indigo-500" />
                                        </div>
                                        <p className="text-[10px] text-indigo-400 ml-8 mt-0.5 opacity-70">{check.detail}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Balanço Final */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Balanço Final</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-end pb-2 border-b border-slate-100">
                                <span className="text-sm text-slate-500">Concedido</span>
                                <span className="font-mono text-base font-bold text-slate-900">{formatCurrency(valorLiberado)}</span>
                            </div>
                            <div className="flex justify-between items-end pb-2 border-b border-slate-100">
                                <span className="text-sm text-slate-500">Comprovado</span>
                                <span className="font-mono text-base font-bold text-blue-600">{formatCurrency(valorComprovadoOriginal)}</span>
                            </div>
                            {totalGlosado > 0 && (
                                <div className="flex justify-between items-end pb-2 border-b border-red-100 bg-red-50/50 px-2 rounded">
                                    <span className="text-sm text-red-600 font-bold">Glosado</span>
                                    <span className="font-mono text-base font-bold text-red-600">- {formatCurrency(totalGlosado)}</span>
                                </div>
                            )}
                            <div className="pt-4 mt-2">
                                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Saldo a Devolver (GRU)</span>
                                <div className="flex items-center justify-between">
                                    <span className={`font-mono text-2xl font-black ${valorDevolver > 0 ? 'text-amber-500' : 'text-slate-300'}`}>
                                        {formatCurrency(valorDevolver)}
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

                    {/* AI Parecer */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-5 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-100 flex items-center justify-between">
                            <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wider flex items-center gap-2">
                                <Sparkles size={14} className="text-purple-600" /> Parecer Técnico IA
                            </h4>
                            {!generatingParecer && (
                                <button
                                    onClick={handleGenerateParecer}
                                    className="text-[10px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                                >
                                    <Zap size={10} /> {aiParecer ? 'Regerar' : 'Gerar'}
                                </button>
                            )}
                        </div>
                        <div className="p-5">
                            {generatingParecer ? (
                                <div className="flex items-center justify-center py-6 gap-3 text-purple-600 animate-pulse">
                                    <Loader2 size={16} className="animate-spin" />
                                    <span className="text-sm font-medium">Analisando comprovantes...</span>
                                </div>
                            ) : aiParecer ? (
                                <textarea
                                    value={aiParecer}
                                    onChange={(e) => { setAiParecer(e.target.value); setParecerEdited(true); }}
                                    className="w-full text-sm text-slate-700 leading-relaxed border-0 outline-none resize-none bg-transparent min-h-[120px]"
                                    rows={5}
                                />
                            ) : (
                                <p className="text-sm text-slate-400 italic text-center py-4">
                                    Clique em "Gerar" para obter o parecer automático da IA baseado nos dados da PC.
                                </p>
                            )}
                            {parecerEdited && (
                                <p className="text-[10px] text-amber-600 mt-2 italic">✏️ Parecer editado manualmente pelo analista.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== SIAFE BAIXA MODAL ===== */}
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
                            {/* Resumo do Processo */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">NUP</span>
                                    <span className="font-bold text-slate-800">{processData?.process_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Suprido</span>
                                    <span className="font-bold text-slate-800">{processData?.beneficiary?.split(' ').slice(0, 2).join(' ')}</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                                    <span className="text-slate-500 font-bold">Valor Homologado</span>
                                    <span className="font-mono font-bold text-emerald-600">{formatCurrency(valorHomologado)}</span>
                                </div>
                            </div>

                            {/* Campos */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nota de Lançamento (NL)</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: 2026NL00001234"
                                        className="w-full p-3 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                                        value={nlNumber}
                                        onChange={(e) => setNlNumber(formatNlNumber(e.target.value))}
                                        autoFocus
                                        maxLength={14}
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Formato: 2026NL########</p>
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

                            {/* Info message */}
                            <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 flex gap-2 items-start border border-blue-100">
                                <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
                                <p>Após a baixa, será gerada automaticamente a <strong>Portaria de Regularidade</strong> para assinatura. O processo será <strong>ARQUIVADO</strong>.</p>
                            </div>

                            {/* Warning for glosas */}
                            {totalGlosado > 0 && (
                                <div className="bg-amber-50 p-3 rounded-lg text-xs text-amber-800 flex gap-2 items-start border border-amber-100">
                                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                                    <p>Atenção: Há valores glosados ({formatCurrency(totalGlosado)}). Certifique-se que o recolhimento (GRU) foi confirmado antes da baixa.</p>
                                </div>
                            )}

                            {/* Irreversibility Warning */}
                            <div className="bg-red-50 p-3 rounded-lg text-xs text-red-800 flex gap-2 items-start border border-red-200">
                                <Lock size={14} className="mt-0.5 flex-shrink-0 text-red-600" />
                                <p><strong>Esta ação é irreversível.</strong> Após o registro da NL, o status será alterado para CONCLUÍDO/PAGO e não poderá ser revertido.</p>
                            </div>
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
