import React, { useState, useEffect, useCallback } from 'react';
import {
    BrainCircuit, Search, FileText, Eye, Check, X, Ban,
    Database, Lock, Loader2, AlertTriangle, CheckCircle2,
    Sparkles, ShieldAlert, CalendarCheck, Calculator, Building2,
    Scale, FileSearch, Split, Zap, ChevronRight, ImageIcon,
    FileCheck, ExternalLink, RotateCcw, CheckCheck, XCircle,
    Save, Send, MessageSquare, ArrowLeftRight, ListChecks,
    ClipboardCheck, Plane, MapPin, Receipt, Clock, User
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generateWithRole } from '../../lib/aiService';

// ==================== TYPES ====================

interface SodpaAuditPanelProps {
    processData: any;
    accountabilityData: any;
    pcItems: any[];
    onRefresh: () => Promise<void>;
    processId: string;
    isGestor?: boolean;
}

type SodpaGlosaCode = 'DATE_MISMATCH' | 'MISSING_BOARDING_PASS' | 'MISSING_REPORT' | 'INVALID_DESTINATION' | 'OTHER';

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
    glosaReasonCode: SodpaGlosaCode | '';
    validationResult: ValidationResult;
    sentinela_alerts?: any[];
    sentinela_risk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface ValidationResult {
    dateValid: boolean;
    docValid: boolean;
    dateMessage: string;
    docMessage: string;
}

interface ChecklistItem {
    id: string;
    label: string;
    status: 'pass' | 'warn' | 'fail';
    detail: string;
    icon: React.ElementType;
}

// ==================== CONSTANTS ====================

const SODPA_GLOSA_REASONS: { code: SodpaGlosaCode; label: string; description: string }[] = [
    { code: 'DATE_MISMATCH', label: 'Divergência de Datas', description: 'Data do bilhete ou recibo não coincide com o período da portaria' },
    { code: 'MISSING_BOARDING_PASS', label: 'Ausência de Canhoto', description: 'Falta o cartão de embarque original ou comprovante de trecho' },
    { code: 'MISSING_REPORT', label: 'Sem Relatório', description: 'Relatório de viagem não anexado ou sem assinatura' },
    { code: 'INVALID_DESTINATION', label: 'Destino Divergente', description: 'O destino realizado difere do destino autorizado na portaria' },
    { code: 'OTHER', label: 'Outro Motivo', description: 'Motivo específico detalhado pelo auditor' },
];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// ==================== VALIDATION ENGINE ====================

function validateCNPJ(cnpj: string): boolean {
    const b = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const c = String(cnpj).replace(/[^\d]/g, "");
    
    if (c.length !== 14) return false;
    if (/0{14}/.test(c)) return false;

    let n = 0;
    for (let i = 0; i < 12; i++) n += parseInt(c[i]) * b[i + 1];
    let r = n % 11;
    if (parseInt(c[12]) !== (r < 2 ? 0 : 11 - r)) return false;

    n = 0;
    for (let i = 0; i <= 12; i++) n += parseInt(c[i]) * b[i];
    r = n % 11;
    if (parseInt(c[13]) !== (r < 2 ? 0 : 11 - r)) return false;

    return true;
}

function validateSodpaItem(item: any, processData: any): ValidationResult {
    const itemDate = new Date(item.item_date || item.data_emissao);
    const start = processData?.event_start_date ? new Date(processData.event_start_date) : null;
    const end = processData?.event_end_date ? new Date(processData.event_end_date) : null;
    
    // Tolerância de 1 dia antes e 1 dia depois para bilhetes/despesas de viagem
    let dateValid = true;
    if (start && end) {
        const toleranceStart = new Date(start);
        toleranceStart.setDate(toleranceStart.getDate() - 1);
        const toleranceEnd = new Date(end);
        toleranceEnd.setDate(toleranceEnd.getDate() + 1);
        dateValid = itemDate >= toleranceStart && itemDate <= toleranceEnd;
    }

    const hasAttachment = !!(item.receipt_url || item.storage_url || item.metadata?.receipt_url);
    const cnpj = item.cnpj_cpf || item.metadata?.cnpj_cpf;
    const isCnpjValid = cnpj ? (cnpj.length > 11 ? validateCNPJ(cnpj) : cnpj.length === 11) : true;

    return {
        dateValid,
        docValid: hasAttachment && isCnpjValid,
        dateMessage: dateValid 
            ? 'Data compatível com o período da viagem' 
            : 'Data fora do período autorizado na portaria',
        docMessage: !hasAttachment 
            ? 'Falta o anexo do comprovante/bilhete' 
            : (!isCnpjValid ? 'Documento fiscal inválido (CNPJ/CPF)' : 'Documento anexado e validado')
    };
}

function buildSodpaChecklist(
    auditItems: AuditItem[],
    accountabilityData: any,
    processData: any,
    allDocs: any[]
): ChecklistItem[] {
    // 1. Bilhetes de Embarque / Cartões (Check in docs and items)
    const hasBoardingPass = allDocs.some(d => d.document_type === 'CARTAO_EMBARQUE' || d.title?.toLowerCase().includes('embarque')) ||
                           auditItems.some(i => i.doc_type === 'BOARDING_PASS' || i.doc_type === 'BILHETE');
    const boardingStatus = hasBoardingPass ? 'pass' : 'fail';

    // 2. Relatório de Viagem (Check in docs and items)
    const hasReport = allDocs.some(d => d.document_type === 'RELATORIO_VIAGEM' || d.title?.toLowerCase().includes('relatório')) ||
                      auditItems.some(i => i.doc_type === 'REPORT');
    const reportStatus = hasReport ? 'pass' : 'fail';

    // 3. Validação de Datas
    const dateIssues = auditItems.filter(i => !i.validationResult.dateValid);
    const dateStatus = dateIssues.length === 0 ? 'pass' : 'warn';

    // 4. Saldo a Restituir
    // Em diárias, se o servidor voltou antes, o saldo_devolver deve ser > 0
    const valorPagar = Number(processData?.value || 0);
    const valorGasto = Number(accountabilityData?.total_spent || 0);
    const saldoDevolver = Math.max(0, valorPagar - valorGasto);
    const balanceStatus = (accountabilityData?.status === 'PARTIAL_RETURN' && saldoDevolver > 0) ? 'warn' : 'pass';

    return [
        {
            id: 'boarding',
            label: 'Cartões de Embarque / Canhotos',
            status: boardingStatus,
            detail: hasBoardingPass ? 'Comprovantes de deslocamento localizados' : 'Ausência de cartões de embarque (Portaria nº 001/2024)',
            icon: Plane
        },
        {
            id: 'report',
            label: 'Relatório de Viagem Consolidado',
            status: reportStatus,
            detail: hasReport ? 'Relatório de atividades anexado' : 'Falta o relatório descritivo das atividades',
            icon: FileText
        },
        {
            id: 'dates',
            label: 'Conformidade Cronológica',
            status: dateStatus,
            detail: dateIssues.length === 0 ? 'Todas as despesas dentro do período' : `${dateIssues.length} despesa(s) com data divergente`,
            icon: Clock
        },
        {
            id: 'balance',
            label: 'Cálculo de Restituição',
            status: balanceStatus,
            detail: saldoDevolver > 0 ? `Saldo a restituir identificado: ${formatCurrency(saldoDevolver)}` : 'Valores compatíveis com o concedido',
            icon: Calculator
        }
    ];
}

export const SodpaAuditPanel: React.FC<SodpaAuditPanelProps> = ({ 
    processData, 
    accountabilityData, 
    pcItems, 
    onRefresh, 
    processId,
    isGestor = false
}) => {
    const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
    const [isGeneratingParecer, setIsGeneratingParecer] = useState(false);
    const [aiParecer, setAiParecer] = useState('');
    const [selectedItem, setSelectedItem] = useState<AuditItem | null>(null);
    const [isGlosaModalOpen, setIsGlosaModalOpen] = useState(false);
    const [glosaNote, setGlosaNote] = useState('');
    const [glosaCode, setGlosaCode] = useState<SodpaGlosaCode | ''>('');
    const [saving, setSaving] = useState(false);
    const [savingItem, setSavingItem] = useState<string | null>(null);
    const [allDocs, setAllDocs] = useState<any[]>([]);

    useEffect(() => {
        const fetchDocs = async () => {
            const { data } = await supabase.from('process_documents').select('*').eq('solicitation_id', processId);
            setAllDocs(data || []);
        };
        fetchDocs();

        if (pcItems) {
            const items = pcItems.map(item => {
                // Determine status based on 'validado' boolean and 'glosa_motivo'
                let status: 'APPROVED' | 'REJECTED' | 'PENDING' = 'PENDING';
                if (item.validado === true) status = 'APPROVED';
                else if (item.validado === false && item.glosa_motivo) status = 'REJECTED';

                return {
                    id: item.id,
                    description: item.description || item.descricao || 'N/I',
                    supplier: item.supplier || item.emitente || 'N/I',
                    item_date: item.item_date || item.data_emissao,
                    value: item.value || item.valor || 0,
                    element_code: item.element_code || item.elemento_despesa,
                    doc_type: item.doc_type || item.tipo,
                    doc_number: item.doc_number || item.numero,
                    receipt_url: item.receipt_url || item.storage_url,
                    ai_metadata: item.ai_metadata || item.ocr_data,
                    sentinela_alerts: item.sentinela_alerts || [],
                    sentinela_risk: item.sentinela_risk || 'LOW',
                    auditStatus: status,
                    glosaReason: item.glosa_motivo || '',
                    glosaReasonCode: item.metadata?.glosaReasonCode || '',
                    validationResult: validateSodpaItem(item, processData)
                };
            });
            setAuditItems(items);
        }
    }, [pcItems, processData, processId]);

    const handleGenerateParecer = async () => {
        setIsGeneratingParecer(true);
        try {
            const checklist = buildSodpaChecklist(auditItems, accountabilityData, processData, allDocs);
            const anomalies = checklist.filter(c => c.status !== 'pass');
            const rejectedItems = auditItems.filter(i => i.auditStatus === 'REJECTED');
            
            const valorConcedido = processData?.value || 0;
            const valorComprovado = auditItems.filter(i => i.auditStatus !== 'REJECTED').reduce((acc, i) => acc + i.value, 0);
            const valorDevolver = Math.max(0, valorConcedido - valorComprovado);

            const prompt = `
Você é o Coordenador da SODPA (Diárias e Passagens) do TJPA.
Sua missão é emitir um PARECER TÉCNICO CONCLUSIVO sobre a conformidade desta Prestação de Contas de Diárias.

DADOS DA VIAGEM (NUP: ${processData?.process_number}):
- Beneficiário: ${processData?.beneficiary}
- Destino: ${processData?.unit}
- Período: ${new Date(processData?.event_start_date).toLocaleDateString()} a ${new Date(processData?.event_end_date).toLocaleDateString()}
- Valor Concedido: ${formatCurrency(valorConcedido)}
- Valor Comprovado/Homologado: ${formatCurrency(valorComprovado)}
- Saldo a Restituir: ${formatCurrency(valorDevolver)}

ANOMALIAS/CHECKLIST:
${checklist.map(c => `- ${c.label}: ${c.status === 'pass' ? 'OK' : 'PENDENTE'} (${c.detail})`).join('\n')}

INSTRUÇÕES:
1. Comece com "Analisamos a prestação de contas de diárias e passagens relativa ao deslocamento...".
2. Verifique se os cartões de embarque e relatório de viagem estão presentes.
3. Se houver divergência de datas, mencione a necessidade de glosa ou justificativa.
4. Conclua pela HOMOLOGAÇÃO INTEGRAL ou PARCIAL, citando o valor a ser restituído se houver.
5. Tom formal, técnico e impessoal. Máximo 5 frases. Não use markdown.
`;

            const text = await generateWithRole(prompt);

            if (text) {
                setAiParecer(text);
            }
        } catch (err) {
            console.error(err);
            setAiParecer("Erro ao gerar parecer automático. Por favor, redija manualmente.");
        } finally {
            setIsGeneratingParecer(false);
        }
    };

    const handleToggleApprove = async (item: AuditItem) => {
        const newStatus = item.auditStatus === 'APPROVED' ? 'PENDING' : 'APPROVED';
        setSavingItem(item.id);
        
        try {
            const { error } = await supabase.from('comprovantes_pc')
                .update({ 
                    validado: newStatus === 'APPROVED',
                    validado_at: newStatus === 'APPROVED' ? new Date().toISOString() : null,
                    glosa_motivo: null,
                    glosa_valor: null
                })
                .eq('id', item.id);
            
            if (error) throw error;
            await onRefresh();
        } catch (err) {
            console.error(err);
            alert('Erro ao atualizar item.');
        } finally {
            setSavingItem(null);
        }
    };

    const handleOpenGlosa = (item: AuditItem) => {
        setSelectedItem(item);
        setGlosaNote(item.glosaReason);
        setGlosaCode(item.glosaReasonCode);
        setIsGlosaModalOpen(true);
    };

    const handleConfirmGlosa = async () => {
        if (!selectedItem || !glosaCode || !glosaNote) {
            alert('Selecione um motivo e escreva uma justificativa.');
            return;
        }

        setSavingItem(selectedItem.id);
        try {
            const { error } = await supabase.from('comprovantes_pc')
                .update({ 
                    validado: false,
                    glosa_motivo: glosaNote,
                    glosa_valor: selectedItem.value,
                    validado_at: new Date().toISOString(),
                    metadata: { 
                        ...(selectedItem.ai_metadata || {}), 
                        glosaReasonCode: glosaCode 
                    }
                })
                .eq('id', selectedItem.id);
            
            if (error) throw error;
            setIsGlosaModalOpen(false);
            await onRefresh();
        } catch (err) {
            console.error(err);
            alert('Erro ao glosar item.');
        } finally {
            setSavingItem(null);
        }
    };

    const handleSaveAudit = async (status: string) => {
        setSaving(true);
        try {
            const { error } = await supabase.from('prestacao_contas')
                .update({ 
                    status: status === 'APPROVED' ? 'APROVADA' : 'PENDENCIA', 
                    motivo_pendencia: status === 'REJECTED' ? aiParecer : null,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', accountabilityData.id);
            
            if (error) throw error;
            await onRefresh();
            alert('Auditoria finalizada com sucesso!');
        } catch (err) {
            console.error(err);
            alert('Erro ao finalizar auditoria.');
        } finally {
            setSaving(false);
        }
    };

    const checklist = buildSodpaChecklist(auditItems, accountabilityData, processData, allDocs);

    return (
        <div className="p-6 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <ShieldAlert className="text-sky-600" size={24} /> Painel de Auditoria SODPA
                    </h2>
                    <p className="text-sm text-slate-500">Sentinela Fiscal TJPA — Monitoramento de Diárias e Passagens</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-sky-50 text-sky-700 border border-sky-100 rounded-full text-xs font-bold font-mono">
                        {processData?.process_number}
                    </span>
                </div>
            </div>

            {/* Checklist de Conformidade */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {checklist.map(item => (
                    <div key={item.id} className={`p-4 rounded-2xl border-2 transition-all ${
                        item.status === 'pass' ? 'bg-emerald-50 border-emerald-100' : 
                        item.status === 'warn' ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'
                    }`}>
                        <div className="flex items-center justify-between mb-2">
                            <item.icon size={18} className={item.status === 'pass' ? 'text-emerald-600' : item.status === 'warn' ? 'text-amber-600' : 'text-red-600'} />
                            {item.status === 'pass' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertTriangle size={16} className="text-amber-500" />}
                        </div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{item.label}</h4>
                        <p className={`text-[11px] mt-1 leading-relaxed ${item.status === 'pass' ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {item.detail}
                        </p>
                    </div>
                ))}
            </div>

            {/* Itens da Prestação */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 uppercase text-xs tracking-widest">
                        <ListChecks size={16} /> Comprovantes de Viagem
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <th className="px-6 py-4">Data / Tipo</th>
                                <th className="px-6 py-4">Descrição / Fornecedor</th>
                                <th className="px-6 py-4">Valor</th>
                                <th className="px-6 py-4">Conformidade</th>
                                <th className="px-6 py-4 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {auditItems.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-slate-700">{new Date(item.item_date).toLocaleDateString()}</div>
                                        <div className="text-[10px] text-slate-400">{item.doc_type}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-slate-800">{item.description}</div>
                                        <div className="text-[10px] text-slate-400">{item.supplier}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-mono font-bold text-slate-800">{formatCurrency(item.value)}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                {item.validationResult.dateValid ? (
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500" title="Data Válida" />
                                                ) : (
                                                    <div className="w-2 h-2 rounded-full bg-red-500" title="Data Divergente" />
                                                )}
                                                <span className="text-[10px] text-slate-500 line-clamp-1">{item.validationResult.dateMessage}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {item.validationResult.docValid ? (
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500" title="Doc Válido" />
                                                ) : (
                                                    <div className="w-2 h-2 rounded-full bg-amber-500" title="Doc com Ressalva" />
                                                )}
                                                <span className="text-[10px] text-slate-500 line-clamp-1">{item.validationResult.docMessage}</span>
                                            </div>
                                            {item.sentinela_alerts && item.sentinela_alerts.length > 0 && (
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    {item.sentinela_alerts.map((alert: string, idx: number) => (
                                                        <span key={idx} className="px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded text-[9px] font-bold">
                                                            {alert}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {item.receipt_url && (
                                                <a 
                                                    href={item.receipt_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                                                >
                                                    <Eye size={16} />
                                                </a>
                                            )}
                                            <button 
                                                onClick={() => handleToggleApprove(item)}
                                                disabled={savingItem === item.id}
                                                className={`p-2 rounded-lg transition-all ${
                                                    item.auditStatus === 'APPROVED' 
                                                        ? 'bg-emerald-100 text-emerald-600' 
                                                        : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                                }`}
                                            >
                                                {savingItem === item.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                            </button>
                                            <button 
                                                onClick={() => handleOpenGlosa(item)}
                                                disabled={savingItem === item.id}
                                                className={`p-2 rounded-lg transition-all ${
                                                    item.auditStatus === 'REJECTED' 
                                                        ? 'bg-red-100 text-red-600' 
                                                        : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                                }`}
                                            >
                                                <Ban size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Glosa */}
            {isGlosaModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 bg-red-600 text-white">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Ban size={24} /> Glosa de Comprovante
                            </h3>
                            <p className="text-red-100 text-sm mt-1">
                                Informe o motivo técnico para a rejeição deste item.
                            </p>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Motivo da Glosa</label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                                    value={glosaCode}
                                    onChange={(e) => setGlosaCode(e.target.value as SodpaGlosaCode)}
                                >
                                    <option value="">Selecione um motivo...</option>
                                    <option value="DATA_DIVERGENTE">Data fora do período</option>
                                    <option value="COMPROVANTE_INVALIDO">Comprovante Ilegível/Inválido</option>
                                    <option value="TRECHO_DIVERGENTE">Trecho fora da portaria</option>
                                    <option value="SEM_RELATORIO">Falta Relatório de Viagem</option>
                                    <option value="DUPLICIDADE">Comprovante em Duplicidade</option>
                                    <option value="OUTROS">Outros Motivos</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Justificativa Detalhada</label>
                                <textarea 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 outline-none min-h-[100px]"
                                    placeholder="Explique o motivo da rejeição para o favorecido..."
                                    value={glosaNote}
                                    onChange={(e) => setGlosaNote(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => setIsGlosaModalOpen(false)}
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleConfirmGlosa}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-600/20"
                                >
                                    Confirmar Glosa
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Parecer IA */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <BrainCircuit size={120} />
                </div>
                
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                                <Sparkles size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Parecer Técnico Coordenadoria SODPA</h3>
                                <p className="text-sky-400 text-xs font-mono uppercase tracking-widest">Análise Assistida por IA</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleGenerateParecer}
                            disabled={isGeneratingParecer}
                            className="px-6 py-2.5 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-sky-50 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isGeneratingParecer ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
                            {aiParecer ? 'Regerar Parecer' : 'Gerar Parecer Conclusivo'}
                        </button>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 min-h-[120px]">
                        {aiParecer ? (
                            <p className="text-slate-200 leading-relaxed italic">"{aiParecer}"</p>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                                <MessageSquare size={32} className="mb-2 opacity-20" />
                                <p className="text-sm">Clique no botão acima para sintetizar os dados em um parecer técnico.</p>
                            </div>
                        )}
                    </div>

                    {aiParecer && (
                        <div className="mt-8 flex gap-4">
                            <button 
                                onClick={() => handleSaveAudit('APPROVED')}
                                className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                            >
                                <CheckCircle2 size={18} /> Homologar Prestação
                            </button>
                            <button 
                                onClick={() => handleSaveAudit('REJECTED')}
                                className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <RotateCcw size={18} /> Devolver para Ajuste
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
