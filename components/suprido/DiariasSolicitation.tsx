import React, { useState, useEffect, useMemo } from 'react';
import {
    ArrowLeft, Plane, Calendar, DollarSign, MapPin, FileText,
    CheckCircle2, ChevronRight, ChevronLeft, AlertCircle, AlertTriangle,
    Save, Sparkles, Loader2, UserCheck, Plus, Trash2, Clock, Users,
    Briefcase, Building2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GoogleGenAI } from "@google/genai";
import { Tooltip } from '../ui/Tooltip';

interface DiariasSolicitationProps {
    onNavigate: (page: string, processId?: string) => void;
}

interface TrechoViagem {
    id: string;
    origem: string;
    destino: string;
    dataIda: string;
    dataVolta: string;
    meioTransporte: 'AEREO' | 'TERRESTRE' | 'FLUVIAL';
    necessitaPassagem: boolean;
}

interface Participante {
    id: string;
    nome: string;
    cargo: string;
    matricula: string;
}

interface ComarcaOption {
    id: string;
    nome: string;
    uf: string;
}

// Valores de referência diárias (Resolução TJ)
const VALORES_DIARIA: Record<string, { descricao: string; valor: number }> = {
    'CAPITAL': { descricao: 'Capital do Estado (Belém)', valor: 350.00 },
    'INTERIOR': { descricao: 'Interior do Estado', valor: 280.00 },
    'FORA_ESTADO': { descricao: 'Fora do Estado', valor: 450.00 },
    'INTERNACIONAL': { descricao: 'Internacional', valor: 700.00 },
};

export const DiariasSolicitation: React.FC<DiariasSolicitationProps> = ({ onNavigate }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    // Step 1: Dados do Solicitante
    const [userName, setUserName] = useState('');
    const [userMatricula, setUserMatricula] = useState('');
    const [userCargo, setUserCargo] = useState('');
    const [userLotacao, setUserLotacao] = useState('');
    const [managerName, setManagerName] = useState('');
    const [managerEmail, setManagerEmail] = useState('');
    const [isManagerLinked, setIsManagerLinked] = useState(false);

    // Step 2: Dados da Viagem
    const [motivoViagem, setMotivoViagem] = useState('');
    const [tipoDeslocamento, setTipoDeslocamento] = useState<'CAPITAL' | 'INTERIOR' | 'FORA_ESTADO' | 'INTERNACIONAL'>('INTERIOR');
    const [trechos, setTrechos] = useState<TrechoViagem[]>([
        { id: crypto.randomUUID(), origem: '', destino: '', dataIda: '', dataVolta: '', meioTransporte: 'TERRESTRE', necessitaPassagem: false }
    ]);
    const [participantes, setParticipantes] = useState<Participante[]>([]);
    const [incluirParticipantes, setIncluirParticipantes] = useState(false);

    // Step 3: Justificativa e Assinatura
    const [justification, setJustification] = useState('');
    const [urgency, setUrgency] = useState('NORMAL');
    const [observacoes, setObservacoes] = useState('');

    // Comarcas
    const [comarcas, setComarcas] = useState<ComarcaOption[]>([]);

    // Calculated values
    const totalDiasViagem = useMemo(() => {
        return trechos.reduce((total, trecho) => {
            if (trecho.dataIda && trecho.dataVolta) {
                const dias = Math.ceil(
                    (new Date(trecho.dataVolta).getTime() - new Date(trecho.dataIda).getTime()) / 86_400_000
                ) + 1;
                return total + Math.max(dias, 1);
            }
            return total;
        }, 0);
    }, [trechos]);

    const valorDiariaUnitario = VALORES_DIARIA[tipoDeslocamento]?.valor || 280;
    const totalParticipantes = 1 + participantes.length; // Solicitante + acompanhantes
    const totalDiarias = totalDiasViagem * totalParticipantes;
    const valorTotalDiarias = totalDiarias * valorDiariaUnitario;

    const trechosComPassagem = trechos.filter(t => t.necessitaPassagem);
    const valorEstimadoPassagens = trechosComPassagem.length * 1200; // Estimativa média

    const valorTotal = valorTotalDiarias + valorEstimadoPassagens;

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // Fetch user profile
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, email, matricula, cargo, lotacao, gestor_nome, gestor_email, municipio')
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
                    // Set origin for first trecho
                    if (profile.municipio || profile.lotacao) {
                        setTrechos(prev => {
                            const next = [...prev];
                            next[0] = { ...next[0], origem: profile.municipio || profile.lotacao || '' };
                            return next;
                        });
                    }
                }
            }

            // Fetch comarcas
            const { data: comarcasData } = await supabase
                .from('dcomarcas')
                .select('id, nome, uf')
                .order('nome');
            if (comarcasData) setComarcas(comarcasData);

        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setLoading(false);
        }
    };

    // Trecho management
    const addTrecho = () => {
        const lastTrecho = trechos[trechos.length - 1];
        setTrechos(prev => [...prev, {
            id: crypto.randomUUID(),
            origem: lastTrecho?.destino || '',
            destino: '',
            dataIda: lastTrecho?.dataVolta || '',
            dataVolta: '',
            meioTransporte: 'TERRESTRE',
            necessitaPassagem: false
        }]);
    };

    const removeTrecho = (id: string) => {
        if (trechos.length <= 1) return;
        setTrechos(prev => prev.filter(t => t.id !== id));
    };

    const updateTrecho = (id: string, field: keyof TrechoViagem, value: any) => {
        setTrechos(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    // Participante management
    const addParticipante = () => {
        setParticipantes(prev => [...prev, { id: crypto.randomUUID(), nome: '', cargo: '', matricula: '' }]);
    };

    const removeParticipante = (id: string) => {
        setParticipantes(prev => prev.filter(p => p.id !== id));
    };

    const updateParticipante = (id: string, field: keyof Participante, value: string) => {
        setParticipantes(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleGenerateAI = async () => {
        setIsGeneratingAI(true);
        try {
            const apiKey = process.env.API_KEY;
            if (!apiKey) {
                setJustification('Chave da API Gemini nao configurada.');
                return;
            }

            const ai = new GoogleGenAI({ apiKey });

            const trechosDesc = trechos.map((t, i) =>
                `Trecho ${i + 1}: ${t.origem} -> ${t.destino} (${t.dataIda} a ${t.dataVolta}) via ${t.meioTransporte}${t.necessitaPassagem ? ' [com passagem aerea]' : ''}`
            ).join('\n');

            const prompt = `
                Atue como um servidor publico do Tribunal de Justica do Estado do Para.
                Escreva uma justificativa formal, tecnica e concisa (maximo 600 caracteres) para uma Solicitacao de Diarias e Passagens Aereas.

                Dados da Viagem:
                - Motivo: ${motivoViagem || 'Atividade jurisdicional'}
                - Tipo: ${VALORES_DIARIA[tipoDeslocamento]?.descricao || 'Interior'}
                - Trechos:
                ${trechosDesc}
                - Total de dias: ${totalDiasViagem}
                - Total de participantes: ${totalParticipantes}
                - Valor total estimado: R$ ${valorTotal.toFixed(2)}

                A justificativa deve explicar a necessidade do deslocamento para o bom andamento das atividades jurisdicionais.
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
            setJustification(`Erro ao gerar justificativa: ${error?.message || 'Erro desconhecido'}. Escreva manualmente.`);
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
            const procNum = `TJPA-DPA-${year}/${randomNum}`;

            // Build trechos summary
            const trechosSummary = trechos.map((t, i) =>
                `Trecho ${i + 1}: ${t.origem} -> ${t.destino} | ${t.dataIda} a ${t.dataVolta} | ${t.meioTransporte}${t.necessitaPassagem ? ' [PASSAGEM]' : ''}`
            ).join('\n');

            const participantesSummary = participantes.length > 0
                ? `\n\nPARTICIPANTES:\n${participantes.map(p => `- ${p.nome} (${p.cargo}) Mat: ${p.matricula}`).join('\n')}`
                : '';

            const fullJustification = `${justification}\n\nTRECHOS:\n${trechosSummary}${participantesSummary}\n\nVALOR DIARIAS: R$ ${valorTotalDiarias.toFixed(2)} (${totalDiarias} diarias x R$ ${valorDiariaUnitario.toFixed(2)})\nVALOR PASSAGENS: R$ ${valorEstimadoPassagens.toFixed(2)}\nOBSERVACOES: ${observacoes || 'N/A'}`;

            const destinoPrincipal = trechos[0]?.destino || 'N/I';
            const unitInfo = `${userLotacao} [DESTINO: ${destinoPrincipal}] [DIARIAS-PASSAGENS]`;

            const { data: solData, error } = await supabase.from('solicitations').insert({
                process_number: procNum,
                beneficiary: userName,
                unit: unitInfo,
                value: valorTotal,
                date: new Date().toISOString(),
                status: 'PENDING',
                user_id: user.id,
                event_start_date: trechos[0]?.dataIda || null,
                event_end_date: trechos[trechos.length - 1]?.dataVolta || null,
                manager_name: managerName,
                manager_email: managerEmail,
                justification: fullJustification
            }).select('id').single();

            if (error) throw error;

            // Save trechos as solicitation_items
            const itemsToSave = trechos.map((t, i) => ({
                solicitation_id: solData.id,
                category: 'TRECHO',
                item_name: `${t.origem} -> ${t.destino}`,
                element_code: t.meioTransporte,
                qty_requested: 1,
                unit_price_requested: valorDiariaUnitario,
                qty_approved: 0,
                unit_price_approved: 0
            }));

            if (participantes.length > 0) {
                participantes.forEach(p => {
                    itemsToSave.push({
                        solicitation_id: solData.id,
                        category: 'PARTICIPANTE',
                        item_name: `${p.nome} (${p.cargo})`,
                        element_code: p.matricula,
                        qty_requested: 1,
                        unit_price_requested: 0,
                        qty_approved: 0,
                        unit_price_approved: 0
                    });
                });
            }

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
                <Loader2 className="w-10 h-10 text-sky-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Carregando formulario...</p>
            </div>
        );
    }

    // ──── Step 1: Dados do Solicitante ────
    const renderStep1 = () => (
        <div className="animate-in fade-in slide-in-from-right-8 duration-300 space-y-6">
            {/* Info Banner */}
            <div className="bg-sky-50 p-6 rounded-xl border border-sky-100 flex items-start gap-4">
                <div className="p-3 bg-white rounded-full text-sky-600 shadow-sm">
                    <Plane size={24} />
                </div>
                <div>
                    <h4 className="text-lg font-bold text-sky-800">Solicitacao de Diarias e Passagens</h4>
                    <p className="text-sm text-sky-700 mt-1 leading-relaxed">
                        Utilize este formulario para solicitar diarias e/ou passagens aereas para deslocamentos a servico do TJPA.
                        Todos os campos sao obrigatorios para tramitacao.
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
                        <input
                            type="text"
                            value={userName}
                            readOnly
                            className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Matricula</label>
                        <input
                            type="text"
                            value={userMatricula}
                            readOnly
                            className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Cargo / Funcao</label>
                        <input
                            type="text"
                            value={userCargo}
                            onChange={e => setUserCargo(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none text-gray-900"
                            placeholder="Ex: Analista Judiciario"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Lotacao</label>
                        <input
                            type="text"
                            value={userLotacao}
                            onChange={e => setUserLotacao(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none text-gray-900"
                            placeholder="Ex: Secretaria de Gestao de Pessoas"
                        />
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
                            className={`w-full px-4 py-2.5 border rounded-lg text-sm outline-none transition-all ${isManagerLinked ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-gray-900'}`}
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
                            className={`w-full px-4 py-2.5 border rounded-lg text-sm outline-none transition-all ${isManagerLinked ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-gray-900'}`}
                            required
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    // ──── Step 2: Dados da Viagem ────
    const renderStep2 = () => (
        <div className="animate-in fade-in slide-in-from-right-8 duration-300 space-y-6">
            {/* Motivo e Tipo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <FileText size={16} /> Motivo do Deslocamento
                    </h3>
                    <select
                        value={motivoViagem}
                        onChange={e => setMotivoViagem(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none text-gray-900 mb-4"
                    >
                        <option value="">Selecione o motivo...</option>
                        <option value="INSPECAO_JUDICIAL">Inspecao Judicial</option>
                        <option value="AUDIENCIA">Audiencia / Sessao de Julgamento</option>
                        <option value="CAPACITACAO">Capacitacao / Treinamento</option>
                        <option value="REUNIAO_ADMINISTRATIVA">Reuniao Administrativa</option>
                        <option value="CORREICAO">Correicao</option>
                        <option value="INSTALACAO_VARA">Instalacao de Vara / Comarca</option>
                        <option value="MUTIRAO">Mutirao Judicial</option>
                        <option value="REPRESENTACAO">Representacao Institucional</option>
                        <option value="OUTRO">Outro (especificar na justificativa)</option>
                    </select>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <MapPin size={16} /> Tipo de Deslocamento
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(VALORES_DIARIA).map(([key, info]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setTipoDeslocamento(key as any)}
                                className={`p-3 rounded-lg border text-left transition-all ${tipoDeslocamento === key
                                    ? 'bg-sky-50 border-sky-300 text-sky-700 shadow-sm'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <p className="text-xs font-bold">{info.descricao}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">R$ {info.valor.toFixed(2)}/dia</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Trechos */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <MapPin size={16} /> Trechos da Viagem
                    </h3>
                    <button
                        type="button"
                        onClick={addTrecho}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 rounded-lg text-xs font-bold hover:bg-sky-100 transition-colors border border-sky-200 shadow-sm"
                    >
                        <Plus size={14} /> Adicionar Trecho
                    </button>
                </div>

                <div className="space-y-4">
                    {trechos.map((trecho, index) => (
                        <div key={trecho.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    Trecho {index + 1}
                                </span>
                                {trechos.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeTrecho(trecho.id)}
                                        className="flex items-center gap-1 px-2 py-1 text-red-500 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors"
                                    >
                                        <Trash2 size={12} /> Remover
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600">Origem</label>
                                    <input
                                        type="text"
                                        value={trecho.origem}
                                        onChange={e => updateTrecho(trecho.id, 'origem', e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none text-gray-900"
                                        placeholder="Cidade de origem"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600">Destino</label>
                                    <input
                                        type="text"
                                        value={trecho.destino}
                                        onChange={e => updateTrecho(trecho.id, 'destino', e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none text-gray-900"
                                        placeholder="Cidade de destino"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600">Data Ida</label>
                                    <input
                                        type="date"
                                        value={trecho.dataIda}
                                        onChange={e => updateTrecho(trecho.id, 'dataIda', e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none text-gray-900"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600">Data Volta</label>
                                    <input
                                        type="date"
                                        value={trecho.dataVolta}
                                        min={trecho.dataIda}
                                        onChange={e => updateTrecho(trecho.id, 'dataVolta', e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none text-gray-900"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600">Transporte</label>
                                    <select
                                        value={trecho.meioTransporte}
                                        onChange={e => updateTrecho(trecho.id, 'meioTransporte', e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none text-gray-900"
                                    >
                                        <option value="TERRESTRE">Terrestre</option>
                                        <option value="AEREO">Aereo</option>
                                        <option value="FLUVIAL">Fluvial</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600">Passagem?</label>
                                    <button
                                        type="button"
                                        onClick={() => updateTrecho(trecho.id, 'necessitaPassagem', !trecho.necessitaPassagem)}
                                        className={`w-full px-3 py-2 rounded-lg text-sm font-bold border transition-all ${trecho.necessitaPassagem
                                            ? 'bg-sky-50 border-sky-300 text-sky-700'
                                            : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                        }`}
                                    >
                                        {trecho.necessitaPassagem ? 'Sim' : 'Nao'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Participantes */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Users size={16} /> Participantes Adicionais
                    </h3>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={incluirParticipantes}
                                onChange={e => setIncluirParticipantes(e.target.checked)}
                                className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                            />
                            Incluir acompanhantes
                        </label>
                        {incluirParticipantes && (
                            <button
                                type="button"
                                onClick={addParticipante}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 rounded-lg text-xs font-bold hover:bg-sky-100 transition-colors border border-sky-200"
                            >
                                <Plus size={14} /> Adicionar
                            </button>
                        )}
                    </div>
                </div>

                {incluirParticipantes && participantes.length > 0 && (
                    <div className="space-y-3">
                        {participantes.map((p, index) => (
                            <div key={p.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_150px_auto] gap-3 items-end">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600">Nome</label>
                                    <input
                                        type="text"
                                        value={p.nome}
                                        onChange={e => updateParticipante(p.id, 'nome', e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none text-gray-900"
                                        placeholder="Nome completo"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600">Cargo</label>
                                    <input
                                        type="text"
                                        value={p.cargo}
                                        onChange={e => updateParticipante(p.id, 'cargo', e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none text-gray-900"
                                        placeholder="Cargo"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600">Matricula</label>
                                    <input
                                        type="text"
                                        value={p.matricula}
                                        onChange={e => updateParticipante(p.id, 'matricula', e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none text-gray-900"
                                        placeholder="000000"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeParticipante(p.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {(!incluirParticipantes || participantes.length === 0) && (
                    <p className="text-sm text-gray-400 italic text-center py-4">
                        {incluirParticipantes ? 'Clique em "Adicionar" para incluir participantes.' : 'Marque a opcao acima para incluir acompanhantes na viagem.'}
                    </p>
                )}
            </div>

            {/* Resumo de Valores */}
            <div className="bg-sky-50 p-6 rounded-xl border border-sky-100">
                <h3 className="text-sm font-bold text-sky-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <DollarSign size={16} /> Resumo Financeiro da Viagem
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-sky-200 text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Dias</p>
                        <p className="text-2xl font-black text-sky-700">{totalDiasViagem}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-sky-200 text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Participantes</p>
                        <p className="text-2xl font-black text-sky-700">{totalParticipantes}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-sky-200 text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Diarias</p>
                        <p className="text-lg font-black text-sky-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotalDiarias)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-sky-200 text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Passagens</p>
                        <p className="text-lg font-black text-sky-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorEstimadoPassagens)}</p>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-sky-200 flex justify-between items-center">
                    <span className="text-sm font-bold text-sky-700 uppercase">Total Estimado</span>
                    <span className="text-2xl font-black text-sky-800">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
                    </span>
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
                    <h3 className="font-bold text-lg">Resumo da Solicitacao</h3>
                    <p className="text-gray-400 text-xs mt-1">{totalDiasViagem} dias | {totalParticipantes} participante(s) | {trechos.length} trecho(s)</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">Total Estimado</p>
                    <p className="text-3xl font-black tracking-tight">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
                    </p>
                </div>
            </div>

            {/* Urgencia */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Urgencia da Solicitacao</h4>
                <div className="flex gap-2">
                    <button onClick={() => setUrgency('NORMAL')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all ${urgency === 'NORMAL' ? 'bg-sky-50 border-sky-200 text-sky-600 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>Normal</button>
                    <button onClick={() => setUrgency('URGENTE')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all ${urgency === 'URGENTE' ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>Urgente</button>
                </div>
            </div>

            {/* Justificativa */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
                        <Sparkles size={16} className="text-purple-600" /> Justificativa do Deslocamento
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
                    className="w-full p-4 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-100 focus:border-sky-300 outline-none resize-none bg-gray-50 focus:bg-white leading-relaxed text-gray-900 transition-all"
                    placeholder="Descreva a necessidade do deslocamento..."
                    required
                />
            </div>

            {/* Observacoes */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="text-sm font-bold text-gray-700 mb-3">Observacoes Adicionais</h4>
                <textarea
                    value={observacoes}
                    onChange={e => setObservacoes(e.target.value)}
                    rows={3}
                    className="w-full p-4 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-100 focus:border-sky-300 outline-none resize-none bg-gray-50 focus:bg-white leading-relaxed text-gray-900 transition-all"
                    placeholder="Informacoes complementares (opcional)..."
                />
            </div>

            {/* Assinatura */}
            <div className="bg-sky-50 p-6 rounded-xl border border-sky-200 shadow-sm flex flex-col items-center text-center">
                <div className="mb-4 bg-white p-4 rounded-full shadow-sm border border-sky-100">
                    <FileText size={24} className="text-sky-600" />
                </div>
                <h4 className="text-base font-bold text-sky-800 uppercase mb-1">
                    Assinatura Digital do Solicitante
                </h4>
                <p className="text-xs text-sky-700 mb-6 max-w-lg leading-relaxed">
                    Declaro, sob as penas da lei, que as informacoes prestadas sao verdadeiras e que o deslocamento solicitado
                    e indispensavel ao exercicio das atividades institucionais do TJPA.
                </p>

                <div className="w-full max-w-md bg-white p-4 rounded-lg border border-dashed border-sky-300 mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center text-sky-700 font-bold text-sm">
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
                    disabled={isSubmitting || !justification}
                    className="w-full max-w-sm py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-lg shadow-sky-200 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
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
            <div className="bg-gradient-to-r from-sky-900 to-sky-700 rounded-2xl p-8 mb-8 text-white relative overflow-hidden shadow-xl">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-sky-500/20 rounded-full blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <button
                                onClick={() => onNavigate('suprido_dashboard')}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10"><Plane size={24} /></div>
                            <h1 className="text-2xl font-bold tracking-tight">Solicitacao de Diarias e Passagens</h1>
                        </div>
                        <p className="text-sky-200 text-sm max-w-lg ml-12">Formulario para solicitacao de diarias e passagens aereas do TJPA.</p>
                    </div>

                    {/* Steps Indicator */}
                    <div className="flex gap-1 bg-sky-800/50 p-1 rounded-xl border border-sky-600/50">
                        {[
                            { id: 1, label: 'DADOS', icon: Briefcase },
                            { id: 2, label: 'VIAGEM', icon: MapPin },
                            { id: 3, label: 'ASSINATURA', icon: FileText },
                        ].map(s => (
                            <button
                                key={s.id}
                                onClick={() => step > s.id ? setStep(s.id) : null}
                                disabled={step < s.id}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${step === s.id ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/50' : step > s.id ? 'text-sky-300 hover:bg-sky-700' : 'text-sky-500 opacity-50 cursor-not-allowed'}`}
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
                            className="px-8 py-3 bg-sky-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-sky-200 hover:bg-sky-700 transition-all flex items-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            Proximo <ChevronRight size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
