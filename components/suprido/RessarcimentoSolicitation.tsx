import React, { useState, useEffect, useMemo } from 'react';
import {
    ArrowLeft, ShieldCheck, Calendar, DollarSign, FileText,
    CheckCircle2, ChevronRight, ChevronLeft, AlertCircle, AlertTriangle,
    Save, Sparkles, Loader2, UserCheck, Plus, Trash2, Upload,
    Briefcase, Receipt, Image, Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GoogleGenAI } from "@google/genai";
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
}

const CATEGORIAS_RESSARCIMENTO = [
    { value: 'SAUDE', label: 'Saude (Medico, Odontologico, Exames)' },
    { value: 'TRANSPORTE', label: 'Transporte (Taxi, Combustivel, Pedagio)' },
    { value: 'ALIMENTACAO', label: 'Alimentacao (Refeicoes a servico)' },
    { value: 'HOSPEDAGEM', label: 'Hospedagem / Estadia' },
    { value: 'MATERIAL', label: 'Material de Trabalho / Escritorio' },
    { value: 'TELECOMUNICACAO', label: 'Telecomunicacao (Telefone, Internet)' },
    { value: 'CAPACITACAO', label: 'Capacitacao / Curso / Certificacao' },
    { value: 'MANUTENCAO', label: 'Manutencao (Equipamento / Veiculo)' },
    { value: 'OUTRO', label: 'Outro (Especificar na descricao)' },
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

    // Dados Bancarios
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
                    // Dados bancarios do perfil
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

    // Item management
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

    const handleGenerateAI = async () => {
        const filledItems = items.filter(i => i.descricao && i.valor);
        if (filledItems.length === 0) {
            return;
        }

        setIsGeneratingAI(true);
        try {
            const apiKey = process.env.API_KEY;
            if (!apiKey) {
                setJustification('Chave da API Gemini nao configurada.');
                return;
            }

            const ai = new GoogleGenAI({ apiKey });

            const itemsDesc = filledItems.map(item => {
                const cat = CATEGORIAS_RESSARCIMENTO.find(c => c.value === item.categoria);
                return `- ${cat?.label || 'N/I'}: ${item.descricao} - R$ ${item.valor} (NF: ${item.notaFiscal || 'N/A'})`;
            }).join('\n');

            const prompt = `
                Atue como um servidor publico do Tribunal de Justica do Estado do Para.
                Escreva uma justificativa formal, tecnica e concisa (maximo 600 caracteres) para uma Solicitacao de Ressarcimento.

                Itens solicitados:
                ${itemsDesc}
                - Valor Total: R$ ${totalValue.toFixed(2)}
                - Solicitante: ${userName} (${userCargo})
                - Lotacao: ${userLotacao}

                A justificativa deve explicar que as despesas foram realizadas no interesse do servico publico e
                que o servidor arcou com recursos proprios, necessitando de ressarcimento conforme normativa vigente.
                Nao use saudacoes. Texto corrido e direto. Sem formatacao markdown.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
            });

            if (response.text) {
                setJustification(response.text.trim());
            }
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
            if (!user) throw new Error('Usuario nao autenticado');

            const year = new Date().getFullYear();
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            const procNum = `TJPA-RES-${year}/${randomNum}`;

            // Build items summary
            const filledItems = items.filter(i => i.descricao && i.valor);
            const itemsSummary = filledItems.map(item => {
                const cat = CATEGORIAS_RESSARCIMENTO.find(c => c.value === item.categoria);
                return `${cat?.label || 'N/I'}: ${item.descricao} - R$ ${item.valor} (Data: ${item.dataOcorrencia || 'N/I'}, NF: ${item.notaFiscal || 'N/A'})`;
            }).join('\n');

            const dadosBancarios = `DADOS BANCARIOS: Banco ${banco} | Ag ${agencia} | Conta ${conta} (${tipoConta})`;
            const fullJustification = `${justification}\n\nITENS DO RESSARCIMENTO:\n${itemsSummary}\n\n${dadosBancarios}`;

            const unitInfo = `${userLotacao} [RESSARCIMENTO]`;

            const { data: solData, error } = await supabase.from('solicitations').insert({
                process_number: procNum,
                beneficiary: userName,
                unit: unitInfo,
                value: totalValue,
                date: new Date().toISOString(),
                status: 'PENDING',
                user_id: user.id,
                event_start_date: filledItems[0]?.dataOcorrencia || null,
                event_end_date: filledItems[filledItems.length - 1]?.dataOcorrencia || null,
                manager_name: managerName,
                manager_email: managerEmail,
                justification: fullJustification
            }).select('id').single();

            if (error) throw error;

            // Save items
            const itemsToSave = filledItems.map(item => {
                const numVal = parseFloat(item.valor.replace(',', '.'));
                return {
                    solicitation_id: solData.id,
                    category: 'RESSARCIMENTO',
                    item_name: item.descricao,
                    element_code: item.categoria,
                    qty_requested: 1,
                    unit_price_requested: isNaN(numVal) ? 0 : numVal,
                    qty_approved: 0,
                    unit_price_approved: 0
                };
            });

            if (itemsToSave.length > 0) {
                await supabase.from('solicitation_items').insert(itemsToSave);
            }

            onNavigate('process_detail', solData.id);

        } catch (error: any) {
            console.error('Erro ao enviar:', error.message);
            alert('Erro ao enviar solicitacao: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <Loader2 className="w-10 h-10 text-purple-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Carregando formulario...</p>
            </div>
        );
    }

    // ──── Step 1: Dados do Solicitante ────
    const renderStep1 = () => (
        <div className="animate-in fade-in slide-in-from-right-8 duration-300 space-y-6">
            {/* Info Banner */}
            <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 flex items-start gap-4">
                <div className="p-3 bg-white rounded-full text-purple-600 shadow-sm">
                    <ShieldCheck size={24} />
                </div>
                <div>
                    <h4 className="text-lg font-bold text-purple-800">Solicitacao de Ressarcimento</h4>
                    <p className="text-sm text-purple-700 mt-1 leading-relaxed">
                        Utilize este formulario para solicitar o ressarcimento de despesas realizadas com recursos
                        proprios no interesse do servico publico. Todos os comprovantes deverao ser anexados ao Dossie Digital.
                    </p>
                </div>
            </div>

            {/* Dados Pessoais */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Briefcase size={16} /> Dados do Solicitante
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Nome Completo</label>
                        <input type="text" value={userName} readOnly className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Matricula</label>
                        <input type="text" value={userMatricula} readOnly className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Cargo / Funcao</label>
                        <input
                            type="text"
                            value={userCargo}
                            onChange={e => setUserCargo(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-gray-900"
                            placeholder="Ex: Analista Judiciario"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Lotacao</label>
                        <input
                            type="text"
                            value={userLotacao}
                            onChange={e => setUserLotacao(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-gray-900"
                            placeholder="Ex: Gabinete da Presidencia"
                        />
                    </div>
                </div>
            </div>

            {/* Dados Bancarios */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Receipt size={16} /> Dados Bancarios para Ressarcimento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Banco</label>
                        <input
                            type="text"
                            value={banco}
                            onChange={e => setBanco(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-gray-900"
                            placeholder="Ex: 001 - Banco do Brasil"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Agencia</label>
                        <input
                            type="text"
                            value={agencia}
                            onChange={e => setAgencia(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-gray-900"
                            placeholder="0000-0"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Conta</label>
                        <input
                            type="text"
                            value={conta}
                            onChange={e => setConta(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-gray-900"
                            placeholder="00000-0"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Tipo</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setTipoConta('CORRENTE')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all ${tipoConta === 'CORRENTE' ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-white border-gray-200 text-gray-500'}`}
                            >
                                Corrente
                            </button>
                            <button
                                type="button"
                                onClick={() => setTipoConta('POUPANCA')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all ${tipoConta === 'POUPANCA' ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-white border-gray-200 text-gray-500'}`}
                            >
                                Poupanca
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Gestor */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <UserCheck size={16} /> Responsavel pela Unidade (Aprovador)
                </h3>
                {!isManagerLinked && (
                    <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 text-xs rounded-lg flex items-center gap-2">
                        <AlertCircle size={16} />
                        <span>
                            <strong>Atencao:</strong> Dados do gestor nao vinculados ao perfil.
                            <button type="button" onClick={() => onNavigate('profile')} className="underline ml-1 font-bold">Atualize seu perfil</button>.
                        </span>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Nome do Gestor</label>
                        <input
                            type="text"
                            value={managerName}
                            onChange={e => setManagerName(e.target.value)}
                            readOnly={isManagerLinked}
                            className={`w-full px-4 py-2.5 border rounded-lg text-sm outline-none transition-all ${isManagerLinked ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-gray-900'}`}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">E-mail Institucional</label>
                        <input
                            type="email"
                            value={managerEmail}
                            onChange={e => setManagerEmail(e.target.value)}
                            readOnly={isManagerLinked}
                            className={`w-full px-4 py-2.5 border rounded-lg text-sm outline-none transition-all ${isManagerLinked ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-gray-900'}`}
                            required
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    // ──── Step 2: Itens de Ressarcimento ────
    const renderStep2 = () => (
        <div className="animate-in fade-in slide-in-from-right-8 duration-300 space-y-6">
            {/* Items */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Receipt size={16} /> Itens para Ressarcimento
                    </h3>
                    <button
                        type="button"
                        onClick={addItem}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors border border-purple-200 shadow-sm"
                    >
                        <Plus size={14} /> Adicionar Item
                    </button>
                </div>

                <div className="space-y-4">
                    {items.map((item, index) => (
                        <div key={item.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    Item {index + 1}
                                </span>
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeItem(item.id)}
                                        className="flex items-center gap-1 px-2 py-1 text-red-500 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors"
                                    >
                                        <Trash2 size={12} /> Remover
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600">Categoria</label>
                                    <select
                                        value={item.categoria}
                                        onChange={e => updateItem(item.id, 'categoria', e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-gray-900"
                                        required
                                    >
                                        <option value="">Selecione a categoria...</option>
                                        {CATEGORIAS_RESSARCIMENTO.map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600">Descricao</label>
                                    <input
                                        type="text"
                                        value={item.descricao}
                                        onChange={e => updateItem(item.id, 'descricao', e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-gray-900"
                                        placeholder="Descreva o item..."
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600">Data da Despesa</label>
                                    <input
                                        type="date"
                                        value={item.dataOcorrencia}
                                        onChange={e => updateItem(item.id, 'dataOcorrencia', e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-gray-900"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600">Valor (R$)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={item.valor}
                                            onChange={e => updateItem(item.id, 'valor', e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-gray-900"
                                            placeholder="0,00"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600">Nr. Nota Fiscal / Recibo</label>
                                    <input
                                        type="text"
                                        value={item.notaFiscal}
                                        onChange={e => updateItem(item.id, 'notaFiscal', e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-gray-900"
                                        placeholder="Nr. do comprovante"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Total */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                        {items.filter(i => i.descricao && i.valor).length} {items.filter(i => i.descricao && i.valor).length === 1 ? 'item' : 'itens'}
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600">Total:</span>
                        <span className="text-xl font-black tabular-nums text-gray-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Reminder */}
            <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                    <h4 className="text-sm font-bold text-amber-800 mb-1">Comprovantes Obrigatorios</h4>
                    <p className="text-xs text-amber-700 leading-relaxed">
                        Todos os itens de ressarcimento devem ter comprovante fiscal (nota fiscal, recibo ou cupom fiscal).
                        Apos a criacao do processo, anexe os documentos comprobatorios no <strong>Dossie Digital</strong> do processo.
                    </p>
                </div>
            </div>
        </div>
    );

    // ──── Step 3: Justificativa e Assinatura ────
    const renderStep3 = () => (
        <div className="animate-in fade-in slide-in-from-right-8 duration-300 space-y-6">
            {/* Resumo */}
            <div className="bg-[#1e293b] text-white p-6 rounded-xl shadow-lg border border-slate-700 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg">Resumo do Ressarcimento</h3>
                    <p className="text-gray-400 text-xs mt-1">{items.filter(i => i.descricao && i.valor).length} item(ns) | Banco {banco} Ag {agencia}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Total Solicitado</p>
                    <p className="text-3xl font-black tracking-tight">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                    </p>
                </div>
            </div>

            {/* Urgencia */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Urgencia da Solicitacao</h4>
                <div className="flex gap-2">
                    <button onClick={() => setUrgency('NORMAL')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all ${urgency === 'NORMAL' ? 'bg-purple-50 border-purple-200 text-purple-600 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>Normal</button>
                    <button onClick={() => setUrgency('URGENTE')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all ${urgency === 'URGENTE' ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>Urgente</button>
                </div>
            </div>

            {/* Justificativa */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
                        <Sparkles size={16} className="text-purple-600" /> Justificativa do Ressarcimento
                    </h4>
                    <Tooltip content="Usar IA para gerar justificativa formal baseada nos dados preenchidos" position="left">
                        <button
                            onClick={handleGenerateAI}
                            disabled={isGeneratingAI}
                            className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-100 text-xs font-bold rounded-lg hover:bg-purple-100 flex items-center gap-2 transition-all shadow-sm"
                        >
                            {isGeneratingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            Gerar com IA
                        </button>
                    </Tooltip>
                </div>
                <textarea
                    value={justification}
                    onChange={e => setJustification(e.target.value)}
                    rows={5}
                    className="w-full p-4 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-100 focus:border-purple-300 outline-none resize-none bg-gray-50 focus:bg-white leading-relaxed text-gray-900 transition-all"
                    placeholder="Descreva o motivo das despesas realizadas e a necessidade de ressarcimento..."
                    required
                />
                <p className="text-[11px] text-gray-500 italic mt-2 flex items-center gap-1">
                    <AlertCircle size={10} />
                    Dica: A sugestao da IA e apenas um esboco. Revise e edite conforme a realidade.
                </p>
            </div>

            {/* Assinatura */}
            <div className="bg-purple-50 p-6 rounded-xl border border-purple-200 shadow-sm flex flex-col items-center text-center">
                <div className="mb-4 bg-white p-4 rounded-full shadow-sm border border-purple-100">
                    <FileText size={24} className="text-purple-600" />
                </div>
                <h4 className="text-base font-bold text-purple-800 uppercase mb-1">
                    Assinatura Digital do Solicitante
                </h4>
                <p className="text-xs text-purple-700 mb-6 max-w-lg leading-relaxed">
                    Declaro, sob as penas da lei, que as despesas indicadas foram efetivamente realizadas com recursos
                    proprios no interesse do servico publico e que os comprovantes apresentados sao autenticos.
                </p>

                <div className="w-full max-w-md bg-white p-4 rounded-lg border border-dashed border-purple-300 mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold text-sm">
                        {userName.charAt(0)}
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-gray-800 text-sm">{userName}</p>
                        <p className="text-xs text-gray-500">Matricula: {userMatricula}</p>
                    </div>
                    <div className="ml-auto text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-100 flex items-center gap-1">
                        <CheckCircle2 size={10} /> Validado
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !justification || totalValue <= 0}
                    className="w-full max-w-sm py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-200 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                    Assinar e Enviar Solicitacao
                </button>
            </div>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900 to-purple-700 rounded-2xl p-8 mb-8 text-white relative overflow-hidden shadow-xl">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <button
                                onClick={() => onNavigate('suprido_dashboard')}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10"><ShieldCheck size={24} /></div>
                            <h1 className="text-2xl font-bold tracking-tight">Solicitacao de Ressarcimento</h1>
                        </div>
                        <p className="text-purple-200 text-sm max-w-lg ml-12">Formulario para solicitacao de ressarcimento de despesas do TJPA.</p>
                    </div>

                    {/* Steps Indicator */}
                    <div className="flex gap-1 bg-purple-800/50 p-1 rounded-xl border border-purple-600/50">
                        {[
                            { id: 1, label: 'DADOS', icon: Briefcase },
                            { id: 2, label: 'ITENS', icon: Receipt },
                            { id: 3, label: 'ASSINATURA', icon: FileText },
                        ].map(s => (
                            <button
                                key={s.id}
                                onClick={() => step > s.id ? setStep(s.id) : null}
                                disabled={step < s.id}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${step === s.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : step > s.id ? 'text-purple-300 hover:bg-purple-700' : 'text-purple-500 opacity-50 cursor-not-allowed'}`}
                            >
                                <s.icon size={16} />
                                <span className="text-[10px] font-bold tracking-wider hidden sm:inline">{s.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="min-h-[400px] mb-24">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </div>

            {/* Navigation Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-200 p-4 z-50">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <button
                        onClick={() => step === 1 ? onNavigate('suprido_dashboard') : setStep(s => s - 1)}
                        className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl border border-transparent hover:border-gray-200 transition-colors flex items-center gap-2"
                    >
                        {step === 1 ? 'Cancelar' : <><ChevronLeft size={16} /> Voltar</>}
                    </button>

                    {step < 3 && (
                        <button
                            onClick={() => setStep(s => s + 1)}
                            className="px-8 py-3 bg-purple-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all flex items-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            Proximo <ChevronRight size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
