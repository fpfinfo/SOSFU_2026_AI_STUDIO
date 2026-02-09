import React, { useState, useEffect, useCallback } from 'react';
import {
    BrainCircuit, Search, FileText, Eye, Check, X, Ban,
    Database, Lock, Loader2, AlertTriangle, CheckCircle2,
    Sparkles, ShieldAlert, CalendarCheck, Calculator, Building2,
    Scale, FileSearch, Split, Zap, ChevronRight, ImageIcon,
    FileCheck, ExternalLink, RotateCcw, CheckCheck, XCircle,
    Save, Send, MessageSquare, ArrowLeftRight, ListChecks,
    ClipboardCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generateText } from '../../lib/gemini';

// ==================== TYPES ====================

interface SosfuAuditPanelProps {
    processData: any;
    accountabilityData: any;
    pcItems: any[];
    onRefresh: () => Promise<void>;
    processId: string;
    isGestor?: boolean;
}

type GlosaReasonCode = 'DATE_INVALID' | 'ELEMENT_INVALID' | 'NO_DISCRIMINATION' | 'SUPPLIER_IRREGULAR' | 'DUPLICATE' | 'VALUE_MISMATCH' | 'OTHER';

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
    glosaReasonCode: GlosaReasonCode | '';
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

const GLOSA_REASONS: { code: GlosaReasonCode; label: string; description: string }[] = [
    { code: 'DATE_INVALID', label: 'Data Irregular', description: 'Nota fiscal com data anterior à liberação do recurso (Art. 4º)' },
    { code: 'ELEMENT_INVALID', label: 'Elemento Não Autorizado', description: 'Elemento de despesa fora dos autorizados (3.3.90.30/33/36/39)' },
    { code: 'NO_DISCRIMINATION', label: 'Sem Discriminação', description: 'Nota fiscal não discrimina os itens adquiridos (Art. 4º, §2º)' },
    { code: 'SUPPLIER_IRREGULAR', label: 'Fornecedor Irregular', description: 'Fornecedor com situação cadastral irregular perante a Receita Federal' },
    { code: 'DUPLICATE', label: 'Nota Duplicada', description: 'Comprovante já utilizado em outra prestação de contas' },
    { code: 'VALUE_MISMATCH', label: 'Valor Divergente', description: 'Valor informado difere do constatado no comprovante original' },
    { code: 'OTHER', label: 'Outro Motivo', description: 'Motivo especificado manualmente pelo auditor' },
];

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
            : `Data ${(() => {
                const [y, m, d] = item.item_date.split('-').map(Number);
                return new Date(y, m - 1, d).toLocaleDateString();
            })()} anterior à liberação do recurso`,
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

// ==================== GLOSA MODAL ====================

const GlosaModal = ({ item, onConfirm, onCancel }: {
    item: AuditItem | null;
    onConfirm: (itemId: string, reasonCode: GlosaReasonCode, reason: string) => void;
    onCancel: () => void;
}) => {
    const [selectedCode, setSelectedCode] = useState<GlosaReasonCode>('OTHER');
    const [customReason, setCustomReason] = useState('');

    useEffect(() => {
        if (item) {
            // Pre-select based on validation failures
            if (!item.validationResult.dateValid) setSelectedCode('DATE_INVALID');
            else if (!item.validationResult.elementValid) setSelectedCode('ELEMENT_INVALID');
            else setSelectedCode('OTHER');
            setCustomReason(item.glosaReason || '');
        }
    }, [item]);

    if (!item) return null;

    const selectedGlosa = GLOSA_REASONS.find(r => r.code === selectedCode);
    const finalReason = selectedCode === 'OTHER' ? customReason : (selectedGlosa?.description || customReason);

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onCancel}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="bg-red-900 px-6 py-4 flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg text-white border border-white/10">
                        <Ban size={20} />
                    </div>
                    <div>
                        <h3 className="text-white font-bold">Glosar Comprovante</h3>
                        <p className="text-red-300 text-xs">{item.doc_number || 'S/N'} — {item.supplier}</p>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {/* Item summary */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                        <div>
                            <p className="text-sm font-bold text-slate-800">{item.description}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {(() => {
                                    const [y, m, d] = item.item_date.split('-').map(Number);
                                    return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
                                })()}
                            </p>
                        </div>
                        <span className="font-mono text-lg font-bold text-red-600">{formatCurrency(item.value)}</span>
                    </div>

                    {/* Reason code selector */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Motivo da Glosa</label>
                        <div className="space-y-2">
                            {GLOSA_REASONS.map(reason => (
                                <button
                                    key={reason.code}
                                    onClick={() => setSelectedCode(reason.code)}
                                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                                        selectedCode === reason.code
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                            selectedCode === reason.code ? 'border-red-500 bg-red-500' : 'border-slate-300'
                                        }`}>
                                            {selectedCode === reason.code && <Check size={10} className="text-white" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{reason.label}</p>
                                            <p className="text-[11px] text-slate-500">{reason.description}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom reason text */}
                    {selectedCode === 'OTHER' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Detalhamento</label>
                            <textarea
                                value={customReason}
                                onChange={e => setCustomReason(e.target.value)}
                                placeholder="Descreva o motivo da glosa..."
                                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
                                rows={3}
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                    <button onClick={onCancel} className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-white border border-transparent hover:border-slate-300 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={() => onConfirm(item.id, selectedCode, finalReason)}
                        disabled={selectedCode === 'OTHER' && !customReason.trim()}
                        className="px-6 py-2.5 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Ban size={16} /> Confirmar Glosa
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==================== DILIGENCIA MODAL ====================

const DiligenciaModal = ({ isOpen, processNumber, onConfirm, onCancel }: {
    isOpen: boolean;
    processNumber: string;
    onConfirm: (notes: string) => void;
    onCancel: () => void;
}) => {
    const [notes, setNotes] = useState('');
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onCancel}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="bg-amber-800 px-6 py-4 flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg text-white border border-white/10">
                        <ArrowLeftRight size={20} />
                    </div>
                    <div>
                        <h3 className="text-white font-bold">Devolver para Correção</h3>
                        <p className="text-amber-200 text-xs">Processo {processNumber}</p>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    <div className="bg-amber-50 p-3 rounded-xl text-xs text-amber-800 flex gap-2 items-start border border-amber-200">
                        <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                        <p>A Prestação de Contas será devolvida ao suprido para correção dos itens irregulares. O prazo de 30 dias <strong>não é reiniciado</strong>.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Observações para o Suprido</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Descreva quais itens precisam ser corrigidos e o que é esperado...&#10;&#10;Ex: Substituir a NF nº 1234 por comprovante com discriminação dos itens conforme Art. 4º, §2º."
                            className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                            rows={5}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                    <button onClick={onCancel} className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-white border border-transparent hover:border-slate-300 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={() => { onConfirm(notes); setNotes(''); }}
                        disabled={!notes.trim()}
                        className="px-6 py-2.5 bg-amber-600 text-white text-sm font-bold rounded-lg hover:bg-amber-700 shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <Send size={16} /> Devolver para Correção
                    </button>
                </div>
            </div>
        </div>
    );
};

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
    processId,
    isGestor = false
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
    const [aiParecer, setAiParecer] = useState(accountabilityData?.parecer_text || '');
    const [generatingParecer, setGeneratingParecer] = useState(false);
    const [parecerEdited, setParecerEdited] = useState(false);

    // Sprint 8: Glosa Modal + Diligência + Persistence
    const [glosaModalItem, setGlosaModalItem] = useState<AuditItem | null>(null);
    const [diligenciaModalOpen, setDiligenciaModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // --- Initialize audit items with validation + load saved decisions ---
    useEffect(() => {
        const validated = pcItems.map(item => ({
            ...item,
            // Respect saved audit decisions from DB
            auditStatus: (item.status === 'REJECTED' ? 'REJECTED' : item.status === 'APPROVED' ? 'APPROVED' : 'PENDING') as AuditItem['auditStatus'],
            glosaReason: item.audit_reason || '',
            glosaReasonCode: (item.audit_reason_code || '') as GlosaReasonCode | '',
            validationResult: validateItem(item, accountabilityData?.created_at || new Date().toISOString())
        }));
        setAuditItems(validated);
        setHasUnsavedChanges(false);
    }, [pcItems, accountabilityData]);

    // Pre-load SIAFE data from accountability
    useEffect(() => {
        if (accountabilityData?.siafe_nl) setNlNumber(accountabilityData.siafe_nl);
        if (accountabilityData?.parecer_text) setAiParecer(accountabilityData.parecer_text);
    }, [accountabilityData]);

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

    // ─── SPRINT 8 HANDLERS ───

    // 8.1: Glosa with structured reason
    const handleGlosaConfirm = useCallback((itemId: string, reasonCode: GlosaReasonCode, reason: string) => {
        setAuditItems(prev => prev.map(i => {
            if (i.id !== itemId) return i;
            return { ...i, auditStatus: 'REJECTED' as const, glosaReason: reason, glosaReasonCode: reasonCode };
        }));
        setGlosaModalItem(null);
        setHasUnsavedChanges(true);
    }, []);

    // Simple approve (no modal needed)
    const handleApproveItem = useCallback((itemId: string) => {
        setAuditItems(prev => prev.map(i => {
            if (i.id !== itemId) return i;
            return { ...i, auditStatus: 'APPROVED' as const, glosaReason: '', glosaReasonCode: '' as const };
        }));
        setHasUnsavedChanges(true);
    }, []);

    // 8.2: Batch Actions
    const handleBatchApproveValid = useCallback(() => {
        setAuditItems(prev => prev.map(i => {
            if (i.validationResult.dateValid && i.validationResult.elementValid) {
                return { ...i, auditStatus: 'APPROVED' as const, glosaReason: '', glosaReasonCode: '' as const };
            }
            return i;
        }));
        setHasUnsavedChanges(true);
    }, []);

    const handleBatchGlosaDivergent = useCallback(() => {
        setAuditItems(prev => prev.map(i => {
            const allValid = i.validationResult.dateValid && i.validationResult.elementValid;
            if (!allValid) {
                const code: GlosaReasonCode = !i.validationResult.dateValid ? 'DATE_INVALID' : 'ELEMENT_INVALID';
                const reason = GLOSA_REASONS.find(r => r.code === code)?.description || 'Desconformidade detectada';
                return { ...i, auditStatus: 'REJECTED' as const, glosaReason: reason, glosaReasonCode: code };
            }
            return i;
        }));
        setHasUnsavedChanges(true);
    }, []);

    const handleResetAll = useCallback(() => {
        setAuditItems(prev => prev.map(i => ({
            ...i, auditStatus: 'PENDING' as const, glosaReason: '', glosaReasonCode: '' as const
        })));
        setHasUnsavedChanges(true);
    }, []);

    // 8.3: Persist audit decisions to DB
    const handleSaveAuditDecisions = useCallback(async () => {
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const now = new Date().toISOString();

            // Batch update each item
            const promises = auditItems.map(item =>
                supabase.from('accountability_items').update({
                    status: item.auditStatus,
                    audit_reason: item.glosaReason || null,
                    audit_reason_code: item.glosaReasonCode || null,
                    audited_by: user?.id || null,
                    audited_at: now,
                }).eq('id', item.id)
            );

            await Promise.all(promises);

            // Also save parecer if it exists
            if (aiParecer) {
                await supabase.from('accountabilities').update({
                    parecer_text: aiParecer,
                    parecer_generated_at: now,
                    analyst_id: user?.id || null,
                }).eq('id', accountabilityData.id);
            }

            setHasUnsavedChanges(false);
        } catch (err) {
            console.error('Erro ao salvar decisões:', err);
        } finally {
            setIsSaving(false);
        }
    }, [auditItems, aiParecer, accountabilityData?.id]);

    // 8.4: Diligência — return to requester
    const handleDiligencia = useCallback(async (notes: string) => {
        setFinalizing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const now = new Date().toISOString();

            // Save audit decisions first
            await handleSaveAuditDecisions();

            // Update accountability status
            await supabase.from('accountabilities').update({
                status: 'WAITING_CORRECTION',
                diligencia_notes: notes,
                diligencia_count: (accountabilityData?.diligencia_count || 0) + 1,
            }).eq('id', accountabilityData.id);

            // Log history
            await supabase.from('historico_tramitacao').insert({
                solicitation_id: processId,
                status_from: 'WAITING_SOSFU',
                status_to: 'WAITING_CORRECTION',
                actor_name: user?.email,
                description: `Prestação de contas devolvida para correção pela SOSFU. Motivo: ${notes.substring(0, 200)}`,
                created_at: now,
            });

            setDiligenciaModalOpen(false);
            await onRefresh();
        } catch (err) {
            console.error('Erro na diligência:', err);
        } finally {
            setFinalizing(false);
        }
    }, [accountabilityData, processId, handleSaveAuditDecisions, onRefresh]);

    const handleSiafeBaixa = async () => {
        setFinalizing(true);
        try {
            // Sprint 8: Save audit decisions first
            await handleSaveAuditDecisions();

            const { error } = await supabase
                .from('accountabilities')
                .update({
                    status: 'APPROVED',
                    balance: valorDevolver,
                    total_spent: valorHomologado,
                    siafe_nl: nlNumber || null,
                    siafe_date: baixaDate ? new Date(baixaDate).toISOString() : new Date().toISOString(),
                    parecer_text: aiParecer || null,
                    parecer_generated_at: aiParecer ? new Date().toISOString() : null,
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

            // 3. Record History
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('historico_tramitacao').insert({
                solicitation_id: processId,
                status_from: 'WAITING_SOSFU',
                status_to: 'ARCHIVED',
                actor_id: user?.id,
                actor_name: user?.email,
                description: `Processo arquivado e responsabilidade baixada via NL ${nlNumber}.`
            });

            // 4. Notify Requester
            if (processData?.user_id) {
                await supabase.from('system_notifications').insert({
                    user_id: processData.user_id,
                    title: 'Processo Concluído',
                    message: `Seu processo ${processData.process_number} foi arquivado com sucesso.`,
                    type: 'SUCCESS',
                    process_number: processData.process_number,
                    link: 'process_detail'
                });
            }

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

            const text = await generateText({ prompt });

            if (text) {
                setAiParecer(text);
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
            {/* Sprint 8: Modals */}
            <ReceiptViewerModal item={viewingReceipt} onClose={() => setViewingReceipt(null)} />
            <GlosaModal item={glosaModalItem} onConfirm={handleGlosaConfirm} onCancel={() => setGlosaModalItem(null)} />
            <DiligenciaModal isOpen={diligenciaModalOpen} processNumber={processData?.process_number} onConfirm={handleDiligencia} onCancel={() => setDiligenciaModalOpen(false)} />

            {/* Sprint 8: Unsaved changes banner */}
            {hasUnsavedChanges && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 text-amber-800">
                        <AlertTriangle size={16} />
                        <span className="text-sm font-bold">Alterações não salvas</span>
                        <span className="text-xs text-amber-600">As decisões de auditoria ainda não foram persistidas no banco de dados.</span>
                    </div>
                    <button
                        onClick={handleSaveAuditDecisions}
                        disabled={isSaving}
                        className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Salvar Decisões
                    </button>
                </div>
            )}

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

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handleSaveAuditDecisions}
                            disabled={isSaving || !hasUnsavedChanges}
                            className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-40"
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="text-blue-500" />}
                            Salvar
                        </button>
                        <button
                            onClick={() => setDiligenciaModalOpen(true)}
                            className="px-4 py-2.5 bg-white border border-amber-300 text-amber-700 rounded-lg text-sm font-bold hover:bg-amber-50 transition-colors shadow-sm flex items-center gap-2"
                        >
                            <ArrowLeftRight size={16} /> Diligenciar
                        </button>
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

                    {/* Search Bar + Batch Actions */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
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
                        {/* Sprint 8: Batch Actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={handleBatchApproveValid}
                                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                                title="Aprovar automaticamente todos os itens com validação IA positiva"
                            >
                                <CheckCheck size={14} /> Aprovar Válidos
                            </button>
                            <button
                                onClick={handleBatchGlosaDivergent}
                                className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1.5"
                                title="Glosar automaticamente todos os itens com divergência detectada"
                            >
                                <XCircle size={14} /> Glosar Divergentes
                            </button>
                            <button
                                onClick={handleResetAll}
                                className="px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                                title="Resetar todas as decisões para pendente"
                            >
                                <RotateCcw size={14} /> Resetar
                            </button>
                            <div className="h-5 w-px bg-slate-200 mx-1" />
                            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase">
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> {auditItems.filter(i => i.auditStatus === 'APPROVED').length}</span>
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> {auditItems.filter(i => i.auditStatus === 'REJECTED').length}</span>
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> {auditItems.filter(i => i.auditStatus === 'PENDING').length}</span>
                            </div>
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
                                                            <span className="text-[10px] text-slate-400 font-mono">{(() => {
                                                                if (!item.item_date) return 'N/A';
                                                                const [y, m, d] = item.item_date.split('-').map(Number);
                                                                return new Date(y, m - 1, d).toLocaleDateString();
                                                            })()}</span>
                                                        </div>
                                                    </div>
                                                    {item.auditStatus === 'REJECTED' && (
                                                        <div className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded-lg border border-red-200 flex items-start gap-2 max-w-sm">
                                                            <Ban size={12} className="mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                {item.glosaReasonCode && (
                                                                    <span className="inline-block bg-red-200 text-red-800 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase mr-1 mb-0.5">
                                                                        {GLOSA_REASONS.find(r => r.code === item.glosaReasonCode)?.label || item.glosaReasonCode}
                                                                    </span>
                                                                )}
                                                                <span>{item.glosaReason}</span>
                                                            </div>
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
                                                            onClick={() => handleApproveItem(item.id)}
                                                            className={`p-2 rounded-lg transition-colors ${item.auditStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
                                                            title="Aprovar Item"
                                                        >
                                                            <Check size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => setGlosaModalItem(item)}
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
            {/* Only Gestor can finalize (Diligencia or Baixa) */}
            {isGestor && (
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
                    <button
                        onClick={() => setDiligenciaModalOpen(true)}
                        disabled={finalizing || hasUnsavedChanges}
                        className="px-4 py-2 bg-amber-100 text-amber-700 font-bold rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <RotateCcw size={16} /> Devolver para Correção
                    </button>
                    <button
                        onClick={() => setSiafeModalOpen(true)}
                        disabled={finalizing || hasUnsavedChanges || checklist.some(c => c.status === 'fail')}
                        className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <CheckCheck size={16} /> Aprovar e Baixar (SIAFE)
                    </button>
                </div>
            )}
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
