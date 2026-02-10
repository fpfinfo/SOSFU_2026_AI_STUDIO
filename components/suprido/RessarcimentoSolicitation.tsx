import React, { useState, useEffect, useMemo } from 'react';
import {
    ArrowLeft, ShieldCheck, Calendar, DollarSign, FileText,
    CheckCircle2, ChevronRight, ChevronLeft, AlertCircle, AlertTriangle,
    Save, Sparkles, Loader2, UserCheck, Plus, Trash2, Upload,
    Briefcase, Receipt, Image, Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generateText, generateWithParts } from '../../lib/gemini';
import { Tooltip } from '../ui/Tooltip';

interface RessarcimentoSolicitationProps {
    onNavigate: (page: string, processId?: string) => void;
}

interface ItemRessarcimento {
    id: string;
    descricao: string;
    categoria: string;
    dataOcorrencia: string;
    valor: string;
    notaFiscal: string;
    observacao: string;
    arquivo?: File;
    arquivoUrl?: string;
    isAnalyzing?: boolean;
    sentinelaAlerts?: string[];
    sentinelaRisk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

const CATEGORIAS_RESSARCIMENTO = [
    { value: 'SAUDE', label: 'Saúde (Médico, Odontológico, Exames)' },
    { value: 'TRANSPORTE', label: 'Transporte (Táxi, Combustível, Pedágio)' },
    { value: 'ALIMENTACAO', label: 'Alimentação (Refeições a serviço)' },
    { value: 'HOSPEDAGEM', label: 'Hospedagem / Estadia' },
    { value: 'MATERIAL', label: 'Material de Trabalho / Escritório' },
    { value: 'TELECOMUNICACAO', label: 'Telecomunicação (Telefone, Internet)' },
    { value: 'CAPACITACAO', label: 'Capacitação / Curso / Certificação' },
    { value: 'MANUTENCAO', label: 'Manutenção (Equipamento / Veículo)' },
    { value: 'OUTRO', label: 'Outro (Especificar na descrição)' },
];

export const RessarcimentoSolicitation: React.FC<RessarcimentoSolicitationProps> = ({ onNavigate }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    // Dados do Solicitante
    const [userName, setUserName] = useState('');
    const [userMatricula, setUserMatricula] = useState('');
    const [userCargo, setUserCargo] = useState('');
    const [userLotacao, setUserLotacao] = useState('');
    const [managerName, setManagerName] = useState('');
    const [managerEmail, setManagerEmail] = useState('');
    const [isManagerLinked, setIsManagerLinked] = useState(false);

    // Dados Bancários
    const [banco, setBanco] = useState('');
    const [agencia, setAgencia] = useState('');
    const [conta, setConta] = useState('');
    const [tipoConta, setTipoConta] = useState<'CORRENTE' | 'POUPANCA'>('CORRENTE');

    // Itens de Ressarcimento
    const [items, setItems] = useState<ItemRessarcimento[]>([
        { id: crypto.randomUUID(), descricao: '', categoria: '', dataOcorrencia: '', valor: '', notaFiscal: '', observacao: '' }
    ]);

    // Justificativa
    const [justification, setJustification] = useState('');
    const [urgency, setUrgency] = useState('NORMAL');

    // Total
    const totalValue = useMemo(() => {
        return items.reduce((sum, item) => {
            const v = parseFloat(item.valor.replace(',', '.'));
            return sum + (isNaN(v) ? 0 : v);
        }, 0);
    }, [items]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, email, matricula, cargo, lotacao, gestor_nome, gestor_email, municipio, banco, agencia, conta')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    setUserName(profile.full_name || '');
                    setUserMatricula(profile.matricula || '');
                    setUserCargo(profile.cargo || '');
                    setUserLotacao(profile.lotacao || profile.municipio || '');
                    if (profile.gestor_nome && profile.gestor_email) {
                        setManagerName(profile.gestor_nome);
                        setManagerEmail(profile.gestor_email);
                        setIsManagerLinked(true);
                    }
                    if (profile.banco) setBanco(profile.banco);
                    if (profile.agencia) setAgencia(profile.agencia);
                    if (profile.conta) setConta(profile.conta);
                }
            }
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setLoading(false);
        }
    };

    const addItem = () => {
        setItems(prev => [...prev, {
            id: crypto.randomUUID(), descricao: '', categoria: '', dataOcorrencia: '', valor: '', notaFiscal: '', observacao: ''
        }]);
    };

    const removeItem = (id: string) => {
        if (items.length <= 1) return;
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const updateItem = (id: string, field: keyof ItemRessarcimento, value: string) => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const handleSmartCapture = async (itemId: string, file: File) => {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, isAnalyzing: true, arquivo: file, arquivoUrl: URL.createObjectURL(file) } : i));
        
        try {
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.readAsDataURL(file);
            });

            const base64Content = await base64Promise;

            const prompt = `
                Como Auditor Fiscal Virtual do TJPA (Sentinela Ressarcimento), analise este comprovante.
                1. Extraia: Valor, Data (YYYY-MM-DD), CNPJ Emitente, Número do Documento.
                2. Verifique: Se a despesa é compatível com ressarcimento público (alimentação, transporte, saúde, etc).
                3. Risco: Se a data for superior a 90 dias, o risco é ALTO.
                4. Retorne apenas JSON puro: { "valor": number, "data": "YYYY-MM-DD", "cnpj": "string", "numero": "string", "alerts": ["string"], "risk": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }
            `;

            const responseText = await generateWithParts([
                { inlineData: { mimeType: file.type, data: (base64Content as string).split(',')[1] } },
                { text: prompt }
            ]);

            const jsonStr = responseText.match(/\{[\s\S]*\}/)?.[0];
            if (jsonStr) {
                const data = JSON.parse(jsonStr);
                setItems(prev => prev.map(i => i.id === itemId ? { 
                    ...i, 
                    valor: data.valor?.toString() || i.valor,
                    dataOcorrencia: data.data || i.dataOcorrencia,
                    notaFiscal: data.numero || i.notaFiscal,
                    sentinelaAlerts: data.alerts || [],
                    sentinelaRisk: data.risk || 'LOW',
                    isAnalyzing: false 
                } : i));
            }
        } catch (error) {
            console.error("Erro Sentinela IA:", error);
            setItems(prev => prev.map(i => i.id === itemId ? { ...i, isAnalyzing: false } : i));
        }
    };

    const handleGenerateAI = async () => {
        const filledItems = items.filter(i => i.descricao && i.valor);
        if (filledItems.length === 0) return;

        setIsGeneratingAI(true);
        try {
            const itemsDesc = filledItems.map(item => {
                const cat = CATEGORIAS_RESSARCIMENTO.find(c => c.value === item.categoria);
                return `- ${cat?.label || 'N/I'}: ${item.descricao} - R$ ${item.valor} (NF: ${item.notaFiscal || 'N/A'})`;
            }).join('\n');

            const prompt = `
                Atue como um servidor público do Tribunal de Justiça do Estado do Pará.
                Escreva uma justificativa formal, técnica e concisa (máximo 600 caracteres) para uma Solicitação de Ressarcimento.

                Itens solicitados:
                ${itemsDesc}
                - Valor Total: R$ ${totalValue.toFixed(2)}
                - Solicitante: ${userName} (${userCargo})
                - Lotação: ${userLotacao}

                A justificativa deve explicar que as despesas foram realizadas no interesse do serviço público e
                que o servidor arcou com recursos próprios, necessitando de ressarcimento conforme normativa vigente.
                Texto corrido e direto. Sem formatação markdown.
            `;

            const text = await generateText(prompt);
            if (text) setJustification(text);
        } catch (error: any) {
            console.error("Erro ao gerar IA:", error);
            setJustification(`Erro ao gerar justificativa. Escreva manualmente.`);
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const year = new Date().getFullYear();
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            const procNum = `TJPA-RES-${year}/${randomNum}`;

            const filledItems = items.filter(i => i.descricao && i.valor);
            const itemsSummary = filledItems.map(item => {
                const cat = CATEGORIAS_RESSARCIMENTO.find(c => c.value === item.categoria);
                return `${cat?.label || 'N/I'}: ${item.descricao} - R$ ${item.valor} (Data: ${item.dataOcorrencia || 'N/I'}, NF: ${item.notaFiscal || 'N/A'})`;
            }).join('\n');

            const dadosBancarios = `DADOS BANCÁRIOS: Banco ${banco} | Ag ${agencia} | Conta ${conta} (${tipoConta})`;
            const fullJustification = `${justification}\n\nITENS DO RESSARCIMENTO:\n${itemsSummary}\n\n${dadosBancarios}`;

            // Determine the highest risk among items
            const risks = filledItems.map(i => i.sentinelaRisk || 'LOW');
            const highestRisk = risks.includes('CRITICAL') ? 'CRITICAL' : 
                               risks.includes('HIGH') ? 'HIGH' :
                               risks.includes('MEDIUM') ? 'MEDIUM' : 'LOW';

            // 1. Create Solicitation
            const { data: solData, error } = await supabase.from('solicitations').insert({
                process_number: procNum,
                beneficiary: userName,
                unit: `${userLotacao} [RESSARCIMENTO]`,
                value: totalValue,
                date: new Date().toISOString(),
                status: 'WAITING_RESSARCIMENTO_ANALYSIS', // Updated status
                user_id: user.id,
                event_start_date: filledItems[0]?.dataOcorrencia || null,
                event_end_date: filledItems[filledItems.length - 1]?.dataOcorrencia || null,
                manager_name: managerName,
                manager_email: managerEmail,
                justification: fullJustification,
                type: 'RESSARCIMENTO'
            }).select('id').single();

            if (error) throw error;

            // 2. Create Accountability (Proxy for Audit)
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + 30);
            
            const { data: accData, error: accError } = await supabase.from('accountabilities').insert({
                process_number: procNum,
                requester_id: user.id,
                solicitation_id: solData.id,
                value: totalValue,
                total_spent: totalValue,
                balance: 0,
                deadline: deadline.toISOString(),
                status: 'WAITING_SOSFU',
                sentinela_risk: highestRisk,
                sentinela_alerts: filledItems.flatMap(i => i.sentinelaAlerts || [])
            }).select('id').single();

            if (accError) throw accError;

            // 3. Create Items in both tables (for redundancy and compatibility)
            const solicitationItems = filledItems.map(item => ({
                solicitation_id: solData.id,
                category: 'RESSARCIMENTO',
                item_name: item.descricao,
                element_code: item.categoria,
                qty_requested: 1,
                unit_price_requested: parseFloat(item.valor.replace(',', '.')),
                qty_approved: 0,
                unit_price_approved: 0
            }));

            const accountabilityItems = filledItems.map(item => ({
                accountability_id: accData.id,
                item_date: item.dataOcorrencia || new Date().toISOString(),
                description: item.descricao,
                supplier: item.notaFiscal || 'N/I',
                doc_number: item.notaFiscal || 'S/N',
                element_code: item.categoria === 'SAUDE' ? '3.3.90.30' : 
                              item.categoria === 'TRANSPORTE' ? '3.3.90.33' : 
                              item.categoria === 'ALIMENTACAO' ? '3.3.90.30' : '3.3.90.39',
                value: parseFloat(item.valor.replace(',', '.')),
                doc_type: 'RECIBO',
                status: 'PENDING',
                ai_metadata: {
                    sentinela_risk: item.sentinelaRisk,
                    sentinela_alerts: item.sentinelaAlerts
                }
            }));

            if (solicitationItems.length > 0) {
                await supabase.from('solicitation_items').insert(solicitationItems);
            }

            if (accountabilityItems.length > 0) {
                await supabase.from('accountability_items').insert(accountabilityItems);
            }

            // 4. History
            await supabase.from('historico_tramitacao').insert({
                solicitation_id: solData.id,
                status_from: 'DRAFT',
                status_to: 'WAITING_RESSARCIMENTO_ANALYSIS',
                actor_id: user.id,
                actor_name: userName,
                description: 'Solicitação de Ressarcimento enviada pelo suprido. Aguardando análise da SOSFU.'
            });

            onNavigate('process_detail', solData.id);
        } catch (error: any) {
            console.error('Erro ao enviar:', error.message);
            alert('Erro ao enviar solicitação: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <Loader2 className="w-10 h-10 text-purple-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Carregando formulário...</p>
            </div>
        );
    }

    const renderStep1 = () => (
        <div className="animate-in fade-in slide-in-from-right-8 duration-300 space-y-6">
            <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 flex items-start gap-4">
                <div className="p-3 bg-white rounded-full text-purple-600 shadow-sm"><ShieldCheck size={24} /></div>
                <div>
                    <h4 className="text-lg font-bold text-purple-800">Solicitação de Ressarcimento</h4>
                    <p className="text-sm text-purple-700 mt-1">
                        Utilize este formulário para solicitar o ressarcimento de despesas realizadas com recursos próprios. 
                        Todos os comprovantes deverão ser anexados ao Dossiê Digital.
                    </p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2"><Briefcase size={16} /> Dados do Solicitante</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Nome Completo</label>
                        <input type="text" value={userName} readOnly className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Matrícula</label>
                        <input type="text" value={userMatricula} readOnly className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Cargo / Função</label>
                        <input type="text" value={userCargo} onChange={e => setUserCargo(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none" placeholder="Ex: Analista Judiciário" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Lotação</label>
                        <input type="text" value={userLotacao} onChange={e => setUserLotacao(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none" placeholder="Ex: Gabinete da Presidência" />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2"><Receipt size={16} /> Dados Bancários para Ressarcimento</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Banco</label>
                        <input type="text" value={banco} onChange={e => setBanco(e.target.value)} className="w-full px-4 py-2.5 border rounded-lg text-sm" placeholder="Ex: Banco do Brasil" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Agência</label>
                        <input type="text" value={agencia} onChange={e => setAgencia(e.target.value)} className="w-full px-4 py-2.5 border rounded-lg text-sm" placeholder="0000-0" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Conta</label>
                        <input type="text" value={conta} onChange={e => setConta(e.target.value)} className="w-full px-4 py-2.5 border rounded-lg text-sm" placeholder="00000-0" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Tipo</label>
                        <div className="flex gap-2">
                            <button onClick={() => setTipoConta('CORRENTE')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold border ${tipoConta === 'CORRENTE' ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-white text-gray-500'}`}>Corrente</button>
                            <button onClick={() => setTipoConta('POUPANCA')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold border ${tipoConta === 'POUPANCA' ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-white text-gray-500'}`}>Poupança</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2"><UserCheck size={16} /> Responsável pela Unidade</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Nome do Gestor</label>
                        <input type="text" value={managerName} onChange={e => setManagerName(e.target.value)} readOnly={isManagerLinked} className={`w-full px-4 py-2.5 border rounded-lg text-sm ${isManagerLinked ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`} required />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">E-mail Institucional</label>
                        <input type="email" value={managerEmail} onChange={e => setManagerEmail(e.target.value)} readOnly={isManagerLinked} className={`w-full px-4 py-2.5 border rounded-lg text-sm ${isManagerLinked ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`} required />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="animate-in fade-in slide-in-from-right-8 duration-300 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Receipt size={16} /> Itens para Ressarcimento</h3>
                    <button onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold border border-purple-200"><Plus size={14} /> Adicionar Item</button>
                </div>

                <div className="space-y-4">
                    {items.map((item, index) => (
                        <div key={item.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-gray-400 uppercase">Item {index + 1}</span>
                                {items.length > 1 && <button onClick={() => removeItem(item.id)} className="text-red-500 hover:bg-red-50 p-1 rounded-lg transition-colors"><Trash2 size={14} /></button>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600">Categoria</label>
                                    <select value={item.categoria} onChange={e => updateItem(item.id, 'categoria', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                                        <option value="">Selecione...</option>
                                        {CATEGORIAS_RESSARCIMENTO.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600">Descrição</label>
                                    <input type="text" value={item.descricao} onChange={e => updateItem(item.id, 'descricao', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Ex: Almoço em serviço" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600">Data e Valor</label>
                                    <div className="flex gap-2">
                                        <input type="date" value={item.dataOcorrencia} onChange={e => updateItem(item.id, 'dataOcorrencia', e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                                        <input type="number" step="0.01" value={item.valor} onChange={e => updateItem(item.id, 'valor', e.target.value)} className="w-24 px-3 py-2 border rounded-lg text-sm" placeholder="0.00" />
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-xs font-bold text-gray-600">Comprovante (Sentinela-First)</label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 relative">
                                            <input type="file" id={`file-${item.id}`} className="hidden" accept="image/*,application/pdf" onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleSmartCapture(item.id, file);
                                            }} />
                                            <label htmlFor={`file-${item.id}`} className={`flex items-center justify-between px-3 py-2 bg-white border border-dashed rounded-lg cursor-pointer transition-all ${item.sentinelaRisk ? 'border-purple-300' : 'border-slate-200'}`}>
                                                <div className="flex items-center gap-2 text-slate-500 text-[10px]">
                                                    {item.isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                                    {item.arquivo ? item.arquivo.name.substring(0, 15) + '...' : 'Subir Comprovante'}
                                                </div>
                                            </label>
                                        </div>
                                        {item.sentinelaRisk && (
                                            <div className={`px-2 py-2 rounded-lg border flex items-center gap-1.5 ${
                                                item.sentinelaRisk === 'LOW' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                                                item.sentinelaRisk === 'MEDIUM' ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-red-50 border-red-100 text-red-700'
                                            }`}>
                                                <Sparkles size={14} />
                                                <span className="text-[9px] font-black uppercase">{item.sentinelaRisk}</span>
                                            </div>
                                        )}
                                    </div>
                                    {item.sentinelaAlerts && item.sentinelaAlerts.map((a, i) => (
                                        <p key={i} className="text-[9px] text-red-600 font-bold mt-1 ">{a}</p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}</span>
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="animate-in fade-in slide-in-from-right-8 duration-300 space-y-6">
            <div className="bg-[#1e293b] text-white p-6 rounded-xl shadow-lg border border-slate-700 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg">Resumo</h3>
                    <p className="text-gray-400 text-xs">Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setUrgency('NORMAL')} className={`px-4 py-2 rounded-lg text-xs font-bold border ${urgency === 'NORMAL' ? 'bg-purple-600 border-transparent' : 'bg-slate-800'}`}>Normal</button>
                    <button onClick={() => setUrgency('URGENTE')} className={`px-4 py-2 rounded-lg text-xs font-bold border ${urgency === 'URGENTE' ? 'bg-red-600 border-transparent' : 'bg-slate-800'}`}>Urgente</button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2"><Sparkles size={16} className="text-purple-600" /> Justificativa</h4>
                    <button onClick={handleGenerateAI} disabled={isGeneratingAI} className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg flex items-center gap-2">
                        {isGeneratingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} IA Assistente
                    </button>
                </div>
                <textarea value={justification} onChange={e => setJustification(e.target.value)} rows={5} className="w-full p-4 border rounded-xl text-sm outline-none bg-gray-50 focus:bg-white" placeholder="Descreva o motivo das despesas..." required />
            </div>

            <div className="bg-purple-50 p-6 rounded-xl border border-purple-200 shadow-sm flex flex-col items-center">
                <h4 className="text-base font-bold text-purple-800 mb-4">Assinatura Digital</h4>
                <div className="w-full max-w-md bg-white p-4 rounded-lg border border-dashed border-purple-300 mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold">{userName.charAt(0)}</div>
                    <div className="text-left flex-1">
                        <p className="font-bold text-sm">{userName}</p>
                        <p className="text-[10px] text-gray-500">{userMatricula}</p>
                    </div>
                    <div className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-100 flex items-center gap-1"><CheckCircle2 size={10} /> Validado</div>
                </div>
                <button onClick={handleSubmit} disabled={isSubmitting || !justification || totalValue <= 0} className="w-full max-w-sm py-3.5 bg-purple-600 text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2 disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={18} />} Enviar Solicitação
                </button>
            </div>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
            <div className="bg-gradient-to-r from-purple-900 to-purple-700 rounded-2xl p-8 mb-8 text-white flex justify-between items-center shadow-xl">
                <div className="flex items-center gap-3">
                    <button onClick={() => onNavigate('suprido_dashboard')} className="p-2 hover:bg-white/10 rounded-lg"><ArrowLeft size={20} /></button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Ressarcimento</h1>
                        <p className="text-purple-200 text-xs">Módulo de Reembolso de Despesas Próprias</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {[1, 2, 3].map(s => (
                        <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${step === s ? 'bg-white text-purple-900' : 'bg-purple-800 text-purple-300 border-purple-700'}`}>{s}</div>
                    ))}
                </div>
            </div>

            <div className="min-h-[400px] mb-24">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t p-4 z-50">
                <div className="max-w-5xl mx-auto flex justify-between">
                    <button onClick={() => step === 1 ? onNavigate('suprido_dashboard') : setStep(s => s - 1)} className="px-6 py-2.5 text-sm font-bold text-gray-600 rounded-xl hover:bg-gray-100">{step === 1 ? 'Cancelar' : 'Voltar'}</button>
                    {step < 3 && <button onClick={() => setStep(s => s + 1)} className="px-8 py-3 bg-purple-600 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-purple-700">Próximo</button>}
                </div>
            </div>
        </div>
    );
};
