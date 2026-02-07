import React, { useState, useEffect } from 'react';
import { ArrowLeft, Siren, Calendar, DollarSign, Bookmark, AlertTriangle, User, Mail, Loader2, CheckCircle2, Link as LinkIcon, AlertCircle, ChevronDown, Sparkles, Pencil, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GoogleGenAI } from "@google/genai";

interface EmergencySolicitationProps {
    onNavigate: (page: string, processId?: string) => void;
}

interface ElementoDespesa {
    id: string;
    codigo: string;
    descricao: string;
}

export const EmergencySolicitation: React.FC<EmergencySolicitationProps> = ({ onNavigate }) => {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generatedProcessNumber, setGeneratedProcessNumber] = useState('');
    const [generatedId, setGeneratedId] = useState('');
    
    // AI State
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    
    // Data Loading
    const [elementos, setElementos] = useState<ElementoDespesa[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // Form Fields
    const [managerName, setManagerName] = useState('');
    const [managerEmail, setManagerEmail] = useState('');
    const [isManagerLinked, setIsManagerLinked] = useState(false); 
    const [isGestorSolicitante, setIsGestorSolicitante] = useState(false); // Flag para identificar se é auto-pedido

    const [selectedElemento, setSelectedElemento] = useState('');
    const [description, setDescription] = useState('');
    const [value, setValue] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoadingData(true);
        try {
            // 1. Elementos
            const { data: elData } = await supabase
                .from('delemento')
                .select('*')
                .eq('is_active', true)
                .order('codigo');
            setElementos(elData || []);

            // 2. Dados do Usuário Logado
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('full_name, email, gestor_nome, gestor_email, dperfil:perfil_id(slug)')
                    .eq('id', user.id)
                    .single();
                
                if (error) console.error("Erro ao buscar perfil:", error);

                if (profile) {
                    const dperfil = profile.dperfil as unknown as { slug: string } | null;
                    const role = dperfil?.slug;
                    
                    // Lógica para GESTOR solicitando para si mesmo
                    if (role === 'GESTOR' || role === 'ADMIN') {
                        setIsGestorSolicitante(true);
                        setManagerName(profile.full_name); // O próprio usuário é o gestor
                        setManagerEmail(profile.email);
                        setIsManagerLinked(true);
                    } else {
                        // Usuário comum (Suprido)
                        if (profile.gestor_nome && profile.gestor_email) {
                            setManagerName(profile.gestor_nome);
                            setManagerEmail(profile.gestor_email);
                            setIsManagerLinked(true);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Erro geral:", error);
        } finally {
            setLoadingData(false);
        }
    };

    const handleGenerateAI = async () => {
        if (!selectedElemento || !value || !startDate) {
            console.error("Por favor, preencha o Elemento de Despesa, Valor e Data de Início antes de gerar a justificativa.");
            return;
        }

        setIsGeneratingAI(true);
        try {
            const apiKey = process.env.API_KEY;
            if (!apiKey) {
                setDescription('⚠️ Chave da API Gemini não configurada. Adicione GEMINI_API_KEY ao arquivo .env e reinicie o servidor.');
                return;
            }

            const ai = new GoogleGenAI({ apiKey });
            
            const elementoDesc = elementos.find(e => e.codigo === selectedElemento)?.descricao || selectedElemento;
            
            const prompt = `
                Atue como um servidor público do Tribunal de Justiça do Estado do Pará.
                Escreva uma justificativa formal, técnica e concisa (máximo 400 caracteres) para uma Solicitação de Suprimento de Fundos Extra-Emergencial.
                
                Dados da Solicitação:
                - Elemento de Despesa: ${selectedElemento} - ${elementoDesc}
                - Valor Estimado: R$ ${value}
                - Período: ${startDate} a ${endDate || 'a definir'}
                
                A justificativa deve explicar a necessidade urgente da aquisição/serviço para o bom andamento das atividades jurisdicionais.
                Não use saudações. Texto corrido e direto. Sem formatação markdown.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
            });

            if (response.text) {
                setDescription(response.text.trim());
            } else {
                setDescription('⚠️ A IA não retornou texto. Tente novamente ou escreva manualmente.');
            }
        } catch (error: any) {
            console.error("Erro ao gerar IA:", error);
            setDescription(`⚠️ Erro ao gerar justificativa: ${error?.message || 'Erro desconhecido'}. Escreva manualmente.`);
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const { data: profile } = await supabase.from('profiles').select('full_name, lotacao').eq('id', user.id).single();

            const year = new Date().getFullYear();
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            
            // PADRONIZAÇÃO DE PROCESSO: EXTRA-EMERGENCIAL
            const procNum = `TJPA-EXT-${year}/${randomNum}`;
            
            const numericValue = parseFloat(value.replace(',', '.'));

            const el = elementos.find(e => e.codigo === selectedElemento);
            const elementoDesc = el ? `[ND: ${el.codigo}]` : '';
            
            // CORREÇÃO: Adicionando a tag [EXTRA-EMERGENCIAL] explicitamente
            const unitInfo = `${profile?.lotacao || 'Gabinete'} ${elementoDesc} [EXTRA-EMERGENCIAL]`;

            // DECISÃO DE STATUS:
            // ALTERAÇÃO IMPORTANTE: Mesmo se for Gestor, colocamos como WAITING_MANAGER.
            // Isso garante que ele caia na tela de "Aguardando Atesto", veja a certidão (ou emita se falhar)
            // e clique explicitamente em "Tramitar" para enviar à SOSFU.
            const initialStatus = isGestorSolicitante ? 'WAITING_MANAGER' : 'PENDING';

            const { data: solData, error } = await supabase.from('solicitations').insert({
                process_number: procNum,
                beneficiary: profile?.full_name || user.email,
                unit: unitInfo,
                value: numericValue || 0,
                date: new Date().toISOString(),
                status: initialStatus, 
                user_id: user.id,
                event_start_date: startDate,
                event_end_date: endDate,
                manager_name: managerName,
                manager_email: managerEmail,
                justification: description
            }).select('id').single();

            if (error) throw error;

            // Documentos iniciais (COVER, REQUEST, ATTESTATION) são criados
            // automaticamente pelo trigger trg_generate_docs no banco de dados.
            // NÃO inserir manualmente aqui para evitar duplicidade.
            
            setGeneratedProcessNumber(procNum);
            setGeneratedId(solData.id);
            setStep(2);
        } catch (error: any) {
            console.error("Erro: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loadingData) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <Loader2 className="animate-spin text-red-600 mb-2" />
                <p className="text-gray-500">Carregando formulário...</p>
            </div>
        );
    }

    if (step === 2) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in zoom-in-95 duration-300">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6">
                    <CheckCircle2 size={48} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Solicitação Registrada!</h2>
                <p className="text-gray-500 mt-2 text-center max-w-md">
                    {isGestorSolicitante 
                        ? "Processo criado. Acesse o dossiê para conferir o Auto-Atesto e tramitar para a SOSFU." 
                        : "Processo autuado. Acesse os detalhes para tramitar ao seu Gestor."}
                    <br/>NUP: <strong>{generatedProcessNumber}</strong>
                </p>
                <button 
                    onClick={() => onNavigate('process_detail', generatedId)}
                    className="mt-8 px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
                >
                    Visualizar Dossiê Digital
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-12 animate-in fade-in slide-in-from-right-8 duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={() => onNavigate('suprido_dashboard')}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        Nova Solicitação <span className="text-red-600">Extra-Emergencial</span>
                    </h1>
                    <p className="text-sm text-gray-500">Preencha os dados abaixo para despesas urgentes e imprevisíveis.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Alert Box */}
                <div className="bg-red-50 p-6 rounded-xl border border-red-100 flex items-start gap-4">
                    <div className="p-3 bg-white rounded-full text-red-600 shadow-sm">
                        <Siren size={24} />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-red-800">Critério de Urgência</h4>
                        <p className="text-sm text-red-700 mt-1 leading-relaxed">
                            Este formulário destina-se exclusivamente a despesas que não podem aguardar o processo ordinário de suprimento de fundos. 
                            O uso indevido pode acarretar em rejeição imediata.
                        </p>
                    </div>
                </div>

                {/* Section: Gestor */}
                <div className={`p-6 rounded-xl border shadow-sm relative overflow-hidden ${isGestorSolicitante ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'}`}>
                    
                    {/* Indicador de Auto-Gestão */}
                    {isGestorSolicitante && (
                         <div className="absolute top-0 right-0 bg-indigo-100 px-3 py-1 rounded-bl-xl border-b border-l border-indigo-200 flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                            <ShieldCheck size={14} />
                            Auto-Atesto (Gestor)
                         </div>
                    )}
                    
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <User size={16} /> Responsável pela Unidade
                    </h3>

                    {!isManagerLinked && (
                        <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 text-xs rounded-lg flex items-center gap-2">
                            <AlertCircle size={16} />
                            <span>
                                <strong>Atenção:</strong> Seus dados de gestor não estão completos no perfil. 
                                <button type="button" onClick={() => onNavigate('profile')} className="underline ml-1 font-bold">Atualize seu perfil</button> para preenchimento automático.
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
                                className={`w-full px-4 py-2.5 border rounded-lg text-sm outline-none transition-all ${
                                    isManagerLinked 
                                    ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' 
                                    : 'bg-white border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                                }`}
                                required
                                readOnly={isManagerLinked}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">E-mail Institucional</label>
                            <div className="relative">
                                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 ${isManagerLinked ? 'text-gray-400' : 'text-gray-400'}`} size={16} />
                                <input 
                                    type="email" 
                                    value={managerEmail}
                                    onChange={e => setManagerEmail(e.target.value)}
                                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm outline-none transition-all ${
                                        isManagerLinked 
                                        ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' 
                                        : 'bg-white border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                                    }`}
                                    required
                                    readOnly={isManagerLinked}
                                />
                            </div>
                        </div>
                    </div>
                    {isGestorSolicitante && (
                        <p className="text-xs text-indigo-600 mt-3 flex items-center gap-1 font-medium">
                            <CheckCircle2 size={12} />
                            Como você é Gestor, a Certidão de Atesto será gerada automaticamente.
                        </p>
                    )}
                </div>

                {/* Section: Detalhes da Despesa */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Bookmark size={16} /> Detalhamento da Solicitação
                    </h3>
                    
                    <div className="space-y-6">
                         {/* 1. Elemento de Despesa */}
                         <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Classificação da Despesa (Elemento)</label>
                            <div className="relative">
                                <select 
                                    value={selectedElemento}
                                    onChange={e => setSelectedElemento(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="">Selecione a natureza da despesa...</option>
                                    <optgroup label="Material de Consumo (3.3.90.30)">
                                        {elementos.filter(e => e.codigo.startsWith('3.3.90.30')).map(e => (
                                            <option key={e.id} value={e.codigo}>{e.codigo} - {e.descricao.replace('Material de Consumo - ', '')}</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Serviços e Outros">
                                        {elementos.filter(e => !e.codigo.startsWith('3.3.90.30')).map(e => (
                                            <option key={e.id} value={e.codigo}>{e.codigo} - {e.descricao}</option>
                                        ))}
                                    </optgroup>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        </div>

                        {/* 2. Valores e Datas */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Valor Estimado (R$)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input 
                                        type="number"
                                        step="0.01"
                                        value={value}
                                        onChange={e => setValue(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                                        placeholder="0,00"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Data Início</label>
                                <input 
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    onClick={(e) => e.currentTarget.showPicker()}
                                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none cursor-pointer"
                                    style={{ colorScheme: 'light' }}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Data Fim</label>
                                <input 
                                    type="date"
                                    value={endDate}
                                    min={startDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    onClick={(e) => e.currentTarget.showPicker()}
                                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none cursor-pointer"
                                    style={{ colorScheme: 'light' }}
                                    required
                                />
                            </div>
                        </div>

                        {/* 3. Justificativa (Agora no final + Botão IA) */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <label className="text-sm font-bold text-gray-700">Objeto da Despesa (Justificativa)</label>
                                <button
                                    type="button"
                                    onClick={handleGenerateAI}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors border border-purple-100 mb-1 shadow-sm"
                                >
                                    {isGeneratingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                    Sugerir com IA
                                </button>
                            </div>
                            <div className="relative">
                                <textarea 
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none placeholder-gray-400 leading-relaxed"
                                    placeholder="Descreva detalhadamente a necessidade urgente ou clique em 'Sugerir com IA'..."
                                    required
                                />
                                {description && (
                                    <div className="absolute bottom-3 right-3 text-xs text-gray-400 flex items-center gap-1 bg-white/80 px-2 py-1 rounded">
                                        <Pencil size={10} />
                                        Texto editável
                                    </div>
                                )}
                            </div>
                            <p className="text-[11px] text-gray-500 italic mt-1 flex items-center gap-1">
                                <AlertCircle size={10} />
                                Dica: A sugestão da IA é apenas um esboço. Revise e edite conforme a realidade da sua unidade.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-4 pt-4">
                    <button 
                        type="button"
                        onClick={() => onNavigate('suprido_dashboard')}
                        className="px-6 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit"
                        disabled={isSubmitting}
                        className={`
                            px-8 py-3 bg-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all flex items-center gap-2
                            ${isSubmitting ? 'opacity-70 cursor-wait' : ''}
                        `}
                    >
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <AlertTriangle size={18} />}
                        {isGestorSolicitante ? 'Auto-Atestar e Enviar' : 'Registrar Solicitação'}
                    </button>
                </div>

            </form>
        </div>
    );
};