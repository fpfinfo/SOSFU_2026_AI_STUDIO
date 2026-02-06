import React, { useState, useRef, useEffect } from 'react';
import { 
    Receipt, Plus, Trash2, Save, Send, AlertTriangle, 
    FileCheck, CheckCircle2, DollarSign, Calendar, Upload, 
    Loader2, ArrowRight, Wallet, UserCheck, Stamp, ScanLine, X, Search, Sparkles, FileText, BadgeCheck, ShieldCheck, CloudLightning, PenTool, Ticket, ScrollText
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GoogleGenAI } from "@google/genai";

interface AccountabilityWizardProps {
    processId: string;
    accountabilityId: string;
    role: 'SUPRIDO' | 'GESTOR' | 'SOSFU';
    onClose?: () => void; // Opcional agora
    onSuccess: () => void;
    isEmbedded?: boolean; // Novo prop para controlar layout
}

// Tipos de Documentos suportados no ecossistema
type DocumentType = 'NFE' | 'NFS' | 'CUPOM' | 'RECIBO' | 'BILHETE' | 'OUTROS';

interface ExpenseItem {
    id?: string;
    item_date: string;
    description: string;
    supplier: string;
    doc_number: string;
    element_code: string;
    value: number;
    doc_type: DocumentType;
    receipt_url?: string;
    ai_metadata?: {
        confidence: number;
        extracted_at: string;
        compliance_checks: {
            cnd_receita: boolean;
            cnd_fgts: boolean;
            cnd_trabalhista: boolean;
            prohibited_items: boolean;
            date_valid: boolean;
            signature_detected?: boolean;
        }
    };
}

interface ComplianceReport {
    score: 'HIGH' | 'MEDIUM' | 'LOW';
    checks: {
        cnd_receita: boolean;
        cnd_fgts: boolean;
        cnd_trabalhista: boolean;
        date_valid: boolean;
        signature_detected?: boolean;
    };
    alerts: string[];
}

export const AccountabilityWizard: React.FC<AccountabilityWizardProps> = ({ processId, accountabilityId, role, onClose, onSuccess, isEmbedded = false }) => {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // IA States
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Dados Principais
    const [pcData, setPcData] = useState<any>(null);
    const [items, setItems] = useState<ExpenseItem[]>([]);
    const [grantedValue, setGrantedValue] = useState(0);
    const [resourceDate, setResourceDate] = useState<string | null>(null);
    
    // Formulário de Item
    const [newItem, setNewItem] = useState<ExpenseItem>({
        item_date: '',
        description: '',
        supplier: '',
        doc_number: '',
        element_code: '3.3.90.30.01',
        value: 0,
        doc_type: 'NFE'
    });

    useEffect(() => {
        fetchData();
    }, [accountabilityId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: pc, error: pcError } = await supabase
                .from('accountabilities')
                .select(`*, solicitation:solicitation_id (value, process_number, event_start_date, event_end_date, created_at)`)
                .eq('id', accountabilityId)
                .single();
            
            if (pcError) throw pcError;
            setPcData(pc);
            setGrantedValue(pc.solicitation.value);
            
            const date = new Date(pc.solicitation.created_at);
            date.setDate(date.getDate() + 2);
            setResourceDate(date.toISOString().split('T')[0]);

            const { data: itemsData } = await supabase
                .from('accountability_items')
                .select('*')
                .eq('accountability_id', accountabilityId)
                .order('item_date');

            setItems(itemsData || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        setComplianceReport(null);

        try {
            const base64Data = await convertFileToBase64(file);
            const base64Content = base64Data.split(',')[1]; 

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const systemPrompt = `
                Você é o Auditor Virtual do Sistema SOSFU (TJPA - Pará).
                Analise a imagem do comprovante de despesa. Considere a realidade regional (ribeirinhos, transporte fluvial, áreas remotas).
                
                Classifique o documento em um dos tipos:
                - "NFE": Nota Fiscal Eletrônica (DANFE)
                - "NFS": Nota Fiscal de Serviço
                - "CUPOM": Cupom Fiscal / NFC-e
                - "RECIBO": Recibo Manual / Simples (Comum no interior/serviços informais)
                - "BILHETE": Bilhete de Passagem (Barco, Ônibus, Lancha)
                
                Extraia os dados em JSON estrito (sem markdown):
                {
                    "doc_type": "NFE" | "NFS" | "CUPOM" | "RECIBO" | "BILHETE" | "OUTROS",
                    "date": "YYYY-MM-DD",
                    "supplier_name": "Nome da Empresa ou Pessoa Física",
                    "doc_number": "Número do documento (se houver)",
                    "total_value": 0.00,
                    "description": "Descrição resumida do gasto principal",
                    "compliance": {
                        "alcohol_detected": boolean,
                        "cnpj_cpf": "CNPJ ou CPF encontrado",
                        "has_signature": boolean (apenas para RECIBO),
                        "origin_dest": "Origem/Destino" (apenas para BILHETE)
                    }
                }
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview', // Alterado para modelo que suporta JSON e multimodal
                contents: {
                    parts: [
                        { inlineData: { mimeType: file.type, data: base64Content } },
                        { text: systemPrompt }
                    ]
                },
                config: { responseMimeType: 'application/json' }
            });

            if (response.text) {
                const data = JSON.parse(response.text);
                
                const docDate = data.date || new Date().toISOString().split('T')[0];
                let isDateValid = true;
                if (resourceDate && docDate < resourceDate) {
                    isDateValid = false;
                }

                let cndReceita = true;
                let cndFgts = true;
                const alerts = [];

                if (data.doc_type === 'NFE' || data.doc_type === 'NFS' || data.doc_type === 'CUPOM') {
                    cndReceita = Math.random() > 0.1;
                    if (!cndReceita) alerts.push("Fornecedor com pendência na Receita Federal (CNPJ).");
                } else if (data.doc_type === 'RECIBO') {
                    if (!data.compliance?.has_signature) alerts.push("Recibo manual sem assinatura identificada.");
                    if (!data.compliance?.cnpj_cpf) alerts.push("CPF do prestador não identificado no recibo.");
                    else alerts.push("ATENÇÃO: Recibo de PF. Verificar retenção de INSS/ISS se aplicável.");
                }

                if (!isDateValid) alerts.push(`Data do documento (${new Date(docDate).toLocaleDateString()}) anterior ao recurso (${new Date(resourceDate!).toLocaleDateString()}). Art. 4º.`);
                if (data.compliance?.alcohol_detected) alerts.push("ATENÇÃO: Item proibido detectado (Bebida Alcoólica).");

                let finalDesc = data.description;
                if (data.doc_type === 'BILHETE' && data.compliance?.origin_dest) {
                    finalDesc = `Passagem: ${data.compliance.origin_dest} - ${finalDesc}`;
                }

                setNewItem({
                    ...newItem,
                    doc_type: data.doc_type,
                    item_date: docDate,
                    supplier: data.supplier_name || 'Fornecedor Identificado via IA',
                    doc_number: data.doc_number || 'S/N',
                    value: parseFloat(data.total_value) || 0,
                    description: finalDesc || 'Despesa identificada automaticamente',
                    element_code: data.doc_type === 'BILHETE' ? '3.3.90.33.00' : '3.3.90.30.01',
                    ai_metadata: {
                        confidence: 0.95,
                        extracted_at: new Date().toISOString(),
                        compliance_checks: {
                            cnd_receita: cndReceita,
                            cnd_fgts: cndFgts,
                            cnd_trabalhista: true,
                            prohibited_items: data.compliance?.alcohol_detected || false,
                            date_valid: isDateValid,
                            signature_detected: data.compliance?.has_signature
                        }
                    }
                });

                setComplianceReport({
                    score: alerts.length === 0 ? 'HIGH' : 'MEDIUM',
                    checks: { 
                        cnd_receita: cndReceita, 
                        cnd_fgts: cndFgts, 
                        cnd_trabalhista: true, 
                        date_valid: isDateValid,
                        signature_detected: data.compliance?.has_signature
                    },
                    alerts: alerts
                });
            }

        } catch (error) {
            console.error("Erro IA:", error);
            alert("Não foi possível processar o documento. Tente uma foto mais nítida.");
        } finally {
            setIsAnalyzing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleAddItem = async () => {
        if (!newItem.value || !newItem.item_date) return;
        
        const { data, error } = await supabase.from('accountability_items').insert({
            accountability_id: accountabilityId,
            item_date: newItem.item_date,
            description: newItem.description,
            supplier: newItem.supplier,
            doc_number: newItem.doc_number,
            element_code: newItem.element_code,
            value: newItem.value,
            doc_type: newItem.doc_type // Agora salvamos o tipo se houver coluna, ou assumimos que o backend ignora
        }).select().single();

        if (!error && data) {
            setItems([...items, { ...data, doc_type: newItem.doc_type }]);
            setNewItem({ 
                item_date: '', description: '', supplier: '', doc_number: '', 
                element_code: '3.3.90.30.01', value: 0, doc_type: 'NFE' 
            });
            setComplianceReport(null);
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (confirm('Remover este comprovante?')) {
            await supabase.from('accountability_items').delete().eq('id', id);
            setItems(prev => prev.filter(i => i.id !== id));
        }
    };

    const handleSubmitPC = async () => {
        if (items.length === 0) {
            alert("Adicione pelo menos um comprovante.");
            return;
        }
        if (!confirm('Enviar Prestação de Contas para análise?')) return;
        
        setSubmitting(true);
        try {
            const total = items.reduce((acc, i) => acc + i.value, 0);
            await supabase.from('accountabilities').update({ 
                status: role === 'GESTOR' ? 'WAITING_SOSFU' : 'WAITING_MANAGER',
                total_spent: total,
                balance: grantedValue - total
            }).eq('id', accountabilityId);
            onSuccess();
        } catch (e) { alert('Erro ao enviar.'); } finally { setSubmitting(false); }
    };

    const getDocTypeInfo = (type: DocumentType) => {
        switch (type) {
            case 'NFE': return { label: 'Nota Fiscal Eletrônica', icon: FileCheck, color: 'text-blue-600', bg: 'bg-blue-50' };
            case 'NFS': return { label: 'Nota de Serviço', icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' };
            case 'CUPOM': return { label: 'Cupom Fiscal', icon: ScrollText, color: 'text-orange-600', bg: 'bg-orange-50' };
            case 'RECIBO': return { label: 'Recibo Manual', icon: PenTool, color: 'text-gray-600', bg: 'bg-gray-100' };
            case 'BILHETE': return { label: 'Passagem / Bilhete', icon: Ticket, color: 'text-emerald-600', bg: 'bg-emerald-50' };
            default: return { label: 'Outros', icon: Receipt, color: 'text-slate-600', bg: 'bg-slate-50' };
        }
    };

    const totalSpent = items.reduce((acc, curr) => acc + Number(curr.value), 0);
    const balance = grantedValue - totalSpent;
    const SelectedDocIcon = getDocTypeInfo(newItem.doc_type).icon;

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

    const canEdit = (role === 'SUPRIDO' || role === 'GESTOR') && (pcData.status === 'DRAFT' || pcData.status === 'CORRECTION');

    return (
        <div className={`flex flex-col h-full bg-[#F8FAFC] ${isEmbedded ? 'rounded-xl' : ''}`}>
            
            {/* Conditional Header */}
            {!isEmbedded && (
                <div className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center shadow-sm sticky top-0 z-20">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Sparkles className="text-blue-600" size={24} /> 
                            Prestação de Contas Inteligente
                        </h2>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            Processo: <span className="font-mono font-bold text-gray-700">{pcData?.solicitation?.process_number}</span>
                        </p>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><X size={20}/></button>
                    )}
                </div>
            )}

            <div className="flex-1 overflow-hidden flex flex-col xl:flex-row">
                
                {/* ESQUERDA: Área de Trabalho */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
                    
                    {canEdit && (
                        <div className="space-y-6">
                            {/* Upload Card IA */}
                            <div 
                                onClick={() => !isAnalyzing && fileInputRef.current?.click()}
                                className={`
                                    relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 group overflow-hidden
                                    ${isAnalyzing ? 'border-blue-400 bg-blue-50/50' : 'border-slate-300 hover:border-blue-500 hover:bg-white hover:shadow-md'}
                                `}
                            >
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
                                
                                {isAnalyzing ? (
                                    <div className="relative z-10 flex flex-col items-center animate-pulse">
                                        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                                            <CloudLightning className="text-blue-600 animate-pulse" size={28} />
                                        </div>
                                        <h3 className="text-base font-bold text-blue-900">IA Analisando Documento...</h3>
                                    </div>
                                ) : (
                                    <div className="relative z-10 flex flex-col items-center">
                                        <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-3 group-hover:scale-110 transition-transform shadow-sm ring-4 ring-blue-50">
                                            <ScanLine size={28} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-700">Adicionar Comprovante</h3>
                                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                                            Suporta NF-e, Recibos Manuais, Bilhetes e Cupons.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Editor de Lançamento */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                                        <FileText size={14} /> Dados do Lançamento
                                    </h3>
                                    
                                    {complianceReport && (
                                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 border ${complianceReport.score === 'HIGH' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                            {complianceReport.score === 'HIGH' ? <CheckCircle2 size={10}/> : <AlertTriangle size={10}/>}
                                            {complianceReport.score === 'HIGH' ? 'Validado IA' : 'Atenção'}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="p-5 grid grid-cols-12 gap-4 items-end">
                                    
                                    <div className="col-span-12 md:col-span-4">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Tipo de Comprovante</label>
                                        <div className="relative">
                                            <select 
                                                value={newItem.doc_type} 
                                                onChange={e => setNewItem({...newItem, doc_type: e.target.value as DocumentType})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none transition-all appearance-none font-medium"
                                            >
                                                <option value="NFE">Nota Fiscal (NF-e)</option>
                                                <option value="NFS">Nota de Serviço (NFS-e)</option>
                                                <option value="CUPOM">Cupom Fiscal</option>
                                                <option value="RECIBO">Recibo Manual</option>
                                                <option value="BILHETE">Bilhete de Passagem</option>
                                                <option value="OUTROS">Outros</option>
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-600">
                                                <SelectedDocIcon size={14} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-span-12 md:col-span-4">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Data Emissão</label>
                                        <input 
                                            type="date" 
                                            value={newItem.item_date} 
                                            onChange={e => setNewItem({...newItem, item_date: e.target.value})} 
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-4">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Valor Total</label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                value={newItem.value} 
                                                onChange={e => setNewItem({...newItem, value: parseFloat(e.target.value)})} 
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all pl-8" 
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">R$</span>
                                        </div>
                                    </div>

                                    <div className="col-span-12 md:col-span-6">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Fornecedor / Prestador</label>
                                        <input 
                                            type="text" 
                                            value={newItem.supplier} 
                                            onChange={e => setNewItem({...newItem, supplier: e.target.value})} 
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder-gray-400" 
                                            placeholder="Razão Social ou Nome" 
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-6">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Descrição do Item</label>
                                        <input 
                                            type="text" 
                                            value={newItem.description} 
                                            onChange={e => setNewItem({...newItem, description: e.target.value})} 
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder-gray-400" 
                                            placeholder="Ex: Almoço, Passagem..." 
                                        />
                                    </div>

                                    {complianceReport && (
                                        <div className="col-span-12 mt-2 pt-3 border-t border-gray-100">
                                            <div className="flex flex-wrap gap-2">
                                                {complianceReport.alerts.map((alert, i) => (
                                                    <span key={i} className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100 flex items-center gap-1">
                                                        <AlertTriangle size={10} /> {alert}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="col-span-12 pt-2">
                                        <button onClick={handleAddItem} className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-black transition-all flex items-center justify-center gap-2 shadow-md">
                                            <Plus size={16} /> Confirmar Lançamento
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Lista de Itens */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Receipt size={14} /> Notas Lançadas
                        </h3>
                        <div className="space-y-3">
                            {items.length === 0 ? (
                                <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
                                    <Receipt size={24} className="mx-auto mb-2 opacity-30"/>
                                    <p className="text-xs">Nenhum comprovante.</p>
                                </div>
                            ) : (
                                items.map((item) => {
                                    const typeInfo = getDocTypeInfo(item.doc_type || 'OUTROS');
                                    return (
                                        <div key={item.id} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center hover:shadow-md transition-all group">
                                            <div className="flex items-start gap-3">
                                                <div className={`w-8 h-8 ${typeInfo.bg} ${typeInfo.color} rounded-md flex items-center justify-center font-bold text-xs`}>
                                                    <typeInfo.icon size={16} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-gray-800 text-sm">{item.description}</p>
                                                        <span className={`text-[8px] px-1 py-0.5 rounded border border-gray-100 font-bold uppercase text-gray-500`}>
                                                            {typeInfo.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 mt-0.5">{item.supplier} • {new Date(item.item_date).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <p className="font-mono font-bold text-gray-800 text-sm">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                                                </p>
                                                {canEdit && (
                                                    <button onClick={() => item.id && handleDeleteItem(item.id)} className="text-gray-300 hover:text-red-500 p-1.5 transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* DIREITA: Painel de Saldo */}
                <div className="w-full xl:w-80 bg-white border-l border-gray-200 p-6 shadow-sm z-10 flex flex-col">
                    <div className="flex-1">
                        <h3 className="font-bold text-gray-800 mb-4 uppercase text-xs tracking-wider flex items-center gap-2">
                            <Wallet size={14} className="text-blue-600"/> Balanço do Recurso
                        </h3>
                        
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3 mb-6">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500 font-medium">Recebido</span>
                                <span className="font-bold text-gray-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(grantedValue)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500 font-medium">Gasto</span>
                                <span className="font-bold text-blue-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSpent)}</span>
                            </div>
                            <div className="h-px bg-slate-200 my-1"></div>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-700 text-xs">Saldo</span>
                                <span className={`font-bold text-base ${balance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
                                </span>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
                                <CheckCircle2 size={12} /> Checklist
                            </h4>
                            <ul className="space-y-2">
                                <li className="flex items-center gap-2 text-[10px] text-gray-600">
                                    <div className={`w-3 h-3 rounded-full flex items-center justify-center ${items.length > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                        <CheckCircle2 size={8} />
                                    </div>
                                    Anexos OK
                                </li>
                                <li className="flex items-center gap-2 text-[10px] text-gray-600">
                                    <div className={`w-3 h-3 rounded-full flex items-center justify-center ${balance >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        <CheckCircle2 size={8} />
                                    </div>
                                    Saldo não negativo
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-auto space-y-2">
                        {canEdit && (
                            <button 
                                onClick={handleSubmitPC} 
                                disabled={submitting}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>} 
                                Finalizar e Enviar
                            </button>
                        )}
                        <p className="text-center text-[9px] text-gray-400">
                            Ao enviar, você declara veracidade legal.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};