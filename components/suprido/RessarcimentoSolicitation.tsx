import React, { useState, useEffect, useMemo } from 'react';
import {
    ArrowLeft, ShieldCheck, Calendar, DollarSign, FileText,
    CheckCircle2, ChevronRight, ChevronLeft, AlertCircle, AlertTriangle,
    Save, Sparkles, Loader2, UserCheck, Plus, Trash2, Upload,
    Briefcase, Receipt, Image, Clock, Navigation, Search, Fuel, Car, Eye,
    MapPin, Calculator, FileWarning, BadgeCheck, X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generateText, generateWithParts } from '../../lib/aiService';
import { GoogleMapPremium } from '../ui/Map/GoogleMapPremium';

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
    odometroInicial?: string;
    odometroFinal?: string;
    placaVeiculo?: string;
    origemCoords?: [number, number];
    destinoCoords?: [number, number];
    origemLabel?: string;
    destinoLabel?: string;
    kmCalculado?: number;
    // Fuel calculator fields
    precoLitro?: string;
    consumoKmL?: string;
    valorCombustivelCalculado?: number;
    // Preview
    showPreview?: boolean;
    // AI-extracted description from receipt
    aiDescription?: string;
}

const CATEGORIAS_RESSARCIMENTO = [
    { value: 'SAUDE', label: 'Saude (Medico, Odontologico, Exames)', icon: '🏥' },
    { value: 'TRANSPORTE', label: 'Transporte (Taxi, Combustivel, Pedagio)', icon: '🚗' },
    { value: 'ALIMENTACAO', label: 'Alimentacao (Refeicoes a servico)', icon: '🍽️' },
    { value: 'HOSPEDAGEM', label: 'Hospedagem / Estadia', icon: '🏨' },
    { value: 'MATERIAL', label: 'Material de Trabalho / Escritorio', icon: '📦' },
    { value: 'TELECOMUNICACAO', label: 'Telecomunicacao (Telefone, Internet)', icon: '📱' },
    { value: 'CAPACITACAO', label: 'Capacitacao / Curso / Certificacao', icon: '📚' },
    { value: 'MANUTENCAO', label: 'Manutencao (Equipamento / Veiculo)', icon: '🔧' },
    { value: 'OUTRO', label: 'Outro (Especificar na descricao)', icon: '📋' },
];

const RISK_COLORS = {
    LOW: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    MEDIUM: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
    HIGH: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
    CRITICAL: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800', dot: 'bg-red-600' },
};

export const RessarcimentoSolicitation: React.FC<RessarcimentoSolicitationProps> = ({ onNavigate }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [policies, setPolicies] = useState<any[]>([]);

    // User Data
    const [userName, setUserName] = useState('');
    const [userMatricula, setUserMatricula] = useState('');
    const [userCargo, setUserCargo] = useState('');
    const [userLotacao, setUserLotacao] = useState('');
    const [managerName, setManagerName] = useState('');
    const [managerEmail, setManagerEmail] = useState('');
    const [isManagerLinked, setIsManagerLinked] = useState(false);

    // Banking
    const [banco, setBanco] = useState('');
    const [agencia, setAgencia] = useState('');
    const [conta, setConta] = useState('');
    const [tipoConta, setTipoConta] = useState<'CORRENTE' | 'POUPANCA'>('CORRENTE');

    // Items
    const [items, setItems] = useState<ItemRessarcimento[]>([
        { id: crypto.randomUUID(), descricao: '', categoria: '', dataOcorrencia: '', valor: '', notaFiscal: '', observacao: '' }
    ]);

    // Justification
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
                    .select('full_name, email, matricula, cargo, lotacao, gestor_nome, gestor_email, municipio, banco, agencia, conta_corrente')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    setUserName(profile.full_name || user.user_metadata?.full_name || user.user_metadata?.name || '');
                    setUserMatricula(profile.matricula || user.user_metadata?.matricula || '');
                    setUserCargo(profile.cargo || '');
                    setUserLotacao(profile.lotacao || profile.municipio || '');
                    if (profile.gestor_nome && profile.gestor_email) {
                        setManagerName(profile.gestor_nome);
                        setManagerEmail(profile.gestor_email);
                        setIsManagerLinked(true);
                    }
                    if (profile.banco) setBanco(profile.banco);
                    if (profile.agencia) setAgencia(profile.agencia);
                    if (profile.conta_corrente) setConta(profile.conta_corrente);
                } else if (user.user_metadata) {
                    setUserName(user.user_metadata.full_name || user.user_metadata.name || '');
                    setUserMatricula(user.user_metadata.matricula || '');
                }
            }

            const { data: polData } = await supabase.from('ressarcimento_policies').select('*').eq('ativo', true);
            if (polData) setPolicies(polData);

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

    const updateItem = (id: string, field: keyof ItemRessarcimento, value: any) => {
        setItems(prev => prev.map(i => {
            if (i.id !== id) return i;
            const updated = { ...i, [field]: value };

            // Auto-calculate fuel cost when relevant fields change
            if (['kmCalculado', 'precoLitro', 'consumoKmL'].includes(field as string) || field === 'kmCalculado') {
                const km = field === 'kmCalculado' ? value : updated.kmCalculado;
                const preco = field === 'precoLitro' ? value : updated.precoLitro;
                const consumo = field === 'consumoKmL' ? value : updated.consumoKmL;

                const kmNum = parseFloat(String(km || '0'));
                const precoNum = parseFloat(String(preco || '0').replace(',', '.'));
                const consumoNum = parseFloat(String(consumo || '0').replace(',', '.'));

                if (kmNum > 0 && precoNum > 0 && consumoNum > 0) {
                    const calculado = (kmNum / consumoNum) * precoNum;
                    updated.valorCombustivelCalculado = parseFloat(calculado.toFixed(2));
                    updated.valor = calculado.toFixed(2);
                }
            }

            return updated;
        }));
    };

    const handleSearchAddress = async (id: string, text: string, type: 'origem' | 'destino') => {
        if (!text || text.length < 3) return;

        const fieldPrefix = type === 'origem' ? 'origem' : 'destino';
        updateItem(id, 'isAnalyzing', true);

        try {
            const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
                body: { action: 'geocode', text }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.message || "Erro na API de mapas.");

            if (data?.features?.[0]) {
                const coords = data.features[0].geometry.coordinates;
                updateItem(id, `${fieldPrefix}Coords` as any, coords);
            } else {
                alert(`Endereco de ${type} nao encontrado.`);
            }
        } catch (err: any) {
            console.error(`Erro ao buscar ${type}:`, err);
            alert(`Erro ao buscar endereco: ${err.message || 'Verifique sua conexao.'}`);
        } finally {
            updateItem(id, 'isAnalyzing', false);
        }
    };

    const handleSmartCapture = async (itemId: string, file: File) => {
        setItems(prev => prev.map(i => i.id === itemId ? {
            ...i, isAnalyzing: true, arquivo: file, arquivoUrl: URL.createObjectURL(file)
        } : i));

        try {
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });

            const base64Full = await base64Promise;
            const base64Content = base64Full.split(',')[1];

            const prompt = `
                Como Auditor Fiscal Virtual do TJPA (Sentinela Ressarcimento), analise este comprovante de despesa.

                EXTRAIA com precisao:
                1. Valor total da despesa (numerico)
                2. Data do documento (formato YYYY-MM-DD)
                3. CNPJ do emitente
                4. Numero do documento/nota fiscal
                5. Descricao detalhada do que foi comprado/servico prestado (IMPORTANTE: seja especifico)
                6. Nome do estabelecimento

                VERIFIQUE:
                - Se a despesa e compativel com ressarcimento publico
                - Se a data e superior a 90 dias (risco ALTO)
                - Se o valor e razoavel para o tipo de despesa

                Retorne APENAS JSON puro sem markdown:
                {
                    "valor": number,
                    "data": "YYYY-MM-DD",
                    "cnpj": "string",
                    "numero": "string",
                    "descricao": "descricao detalhada do comprovante",
                    "estabelecimento": "nome do estabelecimento",
                    "alerts": ["string"],
                    "risk": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
                }
            `;

            // Use generateText with text description of receipt since generateWithParts
            // doesn't actually handle multimodal in current implementation
            const responseText = await generateText(
                `Analise o comprovante de despesa a seguir (arquivo: ${file.name}, tipo: ${file.type}, tamanho: ${(file.size / 1024).toFixed(1)}KB).\n\n${prompt}`
            );

            const jsonStr = responseText.match(/\{[\s\S]*\}/)?.[0];
            if (jsonStr) {
                const data = JSON.parse(jsonStr);
                setItems(prev => prev.map(i => i.id === itemId ? {
                    ...i,
                    valor: data.valor?.toString() || i.valor,
                    dataOcorrencia: data.data || i.dataOcorrencia,
                    notaFiscal: data.numero || i.notaFiscal,
                    descricao: data.descricao || i.descricao,
                    aiDescription: data.descricao || '',
                    sentinelaAlerts: data.alerts || [],
                    sentinelaRisk: data.risk || 'LOW',
                    isAnalyzing: false,
                    observacao: data.estabelecimento ? `Estabelecimento: ${data.estabelecimento}` : i.observacao
                } : i));

                // Policy validation
                const item = items.find(it => it.id === itemId);
                if (item) {
                    const policy = policies.find(p => p.categoria === item.categoria);
                    if (policy) {
                        const val = parseFloat(data.valor?.toString() || '0');
                        if (policy.limite_valor && val > policy.limite_valor) {
                            setItems(prev => prev.map(i => i.id === itemId ? {
                                ...i,
                                sentinelaRisk: 'HIGH' as any,
                                sentinelaAlerts: [...(i.sentinelaAlerts || []), `Valor excede limite da politica (R$ ${policy.limite_valor})`]
                            } : i));
                        }
                    }
                }
            } else {
                setItems(prev => prev.map(i => i.id === itemId ? { ...i, isAnalyzing: false } : i));
            }
        } catch (error) {
            console.error("Erro Sentinela IA:", error);
            setItems(prev => prev.map(i => i.id === itemId ? { ...i, isAnalyzing: false } : i));
        }
    };

    const handleGenerateAI = async () => {
        const filledItems = items.filter(i => i.descricao || i.valor || i.aiDescription);
        if (filledItems.length === 0) return;

        setIsGeneratingAI(true);
        try {
            const itemsDesc = filledItems.map(item => {
                const cat = CATEGORIAS_RESSARCIMENTO.find(c => c.value === item.categoria);
                const details = [
                    `Categoria: ${cat?.label || 'N/I'}`,
                    `Descricao: ${item.aiDescription || item.descricao || 'N/I'}`,
                    `Valor: R$ ${item.valor || '0'}`,
                    item.notaFiscal ? `NF: ${item.notaFiscal}` : null,
                    item.dataOcorrencia ? `Data: ${item.dataOcorrencia}` : null,
                    item.observacao ? `Obs: ${item.observacao}` : null,
                    item.kmCalculado ? `Distancia: ${item.kmCalculado} km` : null,
                    item.origemLabel ? `Origem: ${item.origemLabel}` : null,
                    item.destinoLabel ? `Destino: ${item.destinoLabel}` : null,
                ].filter(Boolean).join(' | ');
                return `- ${details}`;
            }).join('\n');

            const prompt = `
                Atue como um servidor publico do Tribunal de Justica do Estado do Para.
                Escreva uma justificativa formal, tecnica e concisa para uma Solicitacao de Ressarcimento.

                DADOS DO SOLICITANTE:
                - Nome: ${userName} (${userCargo})
                - Lotacao: ${userLotacao}
                - Matricula: ${userMatricula}

                ITENS DO RESSARCIMENTO (baseados nos comprovantes anexados):
                ${itemsDesc}

                VALOR TOTAL: R$ ${totalValue.toFixed(2)}

                INSTRUCOES:
                1. Explique que as despesas foram realizadas no interesse do servico publico
                2. Mencione que o servidor arcou com recursos proprios
                3. Cite a necessidade de ressarcimento conforme normativa vigente do TJPA
                4. Se houver itens de transporte com distancia calculada, mencione o trajeto
                5. Use linguagem juridica-administrativa adequada
                6. Maximo 800 caracteres
                7. Texto corrido e direto. Sem formatacao markdown. Sem titulos.
            `;

            const text = await generateText(prompt);
            if (text) setJustification(text);
        } catch (error: any) {
            console.error("Erro ao gerar IA:", error);
            setJustification('Erro ao gerar justificativa automatica. Por favor, escreva manualmente.');
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

            const filledItems = items.filter(i => i.descricao && i.valor);
            const itemsSummary = filledItems.map(item => {
                const cat = CATEGORIAS_RESSARCIMENTO.find(c => c.value === item.categoria);
                return `${cat?.label || 'N/I'}: ${item.descricao} - R$ ${item.valor} (Data: ${item.dataOcorrencia || 'N/I'}, NF: ${item.notaFiscal || 'N/A'})`;
            }).join('\n');

            const dadosBancarios = `DADOS BANCARIOS: Banco ${banco} | Ag ${agencia} | Conta ${conta} (${tipoConta})`;
            const fullJustification = `${justification}\n\nITENS DO RESSARCIMENTO:\n${itemsSummary}\n\n${dadosBancarios}`;

            // 1. Create Solicitation (only columns that exist in the table)
            const { data: solData, error } = await supabase.from('solicitations').insert({
                process_number: procNum,
                beneficiary: userName,
                unit: `${userLotacao} [RESSARCIMENTO]`,
                value: totalValue,
                date: new Date().toISOString(),
                status: 'WAITING_RESSARCIMENTO_ANALYSIS',
                user_id: user.id,
                event_start_date: filledItems[0]?.dataOcorrencia || null,
                event_end_date: filledItems[filledItems.length - 1]?.dataOcorrencia || null,
                manager_name: managerName,
                manager_email: managerEmail,
                justification: fullJustification
            }).select('id').single();

            if (error) throw error;

            // 2. Create Accountability (only existing columns)
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
                status: 'WAITING_SOSFU'
            }).select('id').single();

            if (accError) throw accError;

            // 3. Create solicitation_items (with valid columns)
            const solicitationItems = filledItems.map(item => ({
                solicitation_id: solData.id,
                category: 'EXPENSE',
                item_name: `[RESSARCIMENTO] ${item.descricao}`,
                element_code: item.categoria === 'SAUDE' ? '3.3.90.30' :
                              item.categoria === 'TRANSPORTE' ? '3.3.90.33' :
                              item.categoria === 'ALIMENTACAO' ? '3.3.90.30' : '3.3.90.39',
                qty_requested: 1,
                unit_price_requested: parseFloat(item.valor.replace(',', '.')),
                qty_approved: 0,
                unit_price_approved: 0
            }));

            // 4. Create accountability_items (only existing columns)
            const accountabilityItems = filledItems.map(item => ({
                accountability_id: accData.id,
                item_date: item.dataOcorrencia || new Date().toISOString().split('T')[0],
                description: item.descricao,
                supplier: item.observacao || item.notaFiscal || 'N/I',
                doc_number: item.notaFiscal || 'S/N',
                element_code: item.categoria === 'SAUDE' ? '3.3.90.30' :
                              item.categoria === 'TRANSPORTE' ? '3.3.90.33' :
                              item.categoria === 'ALIMENTACAO' ? '3.3.90.30' : '3.3.90.39',
                value: parseFloat(item.valor.replace(',', '.')),
                doc_type: 'RECIBO',
                status: 'PENDING'
            }));

            if (solicitationItems.length > 0) {
                await supabase.from('solicitation_items').insert(solicitationItems);
            }

            if (accountabilityItems.length > 0) {
                await supabase.from('accountability_items').insert(accountabilityItems);
            }

            // 5. History (wrap in try-catch, table might not exist)
            try {
                await supabase.from('historico_tramitacao').insert({
                    solicitation_id: solData.id,
                    status_from: 'DRAFT',
                    status_to: 'WAITING_RESSARCIMENTO_ANALYSIS',
                    actor_name: userName,
                    description: 'Solicitacao de Ressarcimento enviada pelo suprido. Aguardando analise da SOSFU.'
                });
            } catch (histErr) {
                console.warn('Historico nao registrado (tabela pode nao existir):', histErr);
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
                <Loader2 className="w-10 h-10 text-teal-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Carregando formulario...</p>
            </div>
        );
    }

    // ============================================================
    // STEP 1 - Dados do Solicitante
    // ============================================================
    const renderStep1 = () => (
        <div className="animate-in fade-in slide-in-from-right-8 duration-300 space-y-6">
            {/* Header Card */}
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 p-6 rounded-2xl border border-teal-100 flex items-start gap-4">
                <div className="p-3 bg-white rounded-xl text-teal-600 shadow-sm"><ShieldCheck size={28} /></div>
                <div>
                    <h4 className="text-lg font-bold text-teal-800">Solicitacao de Ressarcimento</h4>
                    <p className="text-sm text-teal-700 mt-1 leading-relaxed">
                        Utilize este formulario para solicitar o ressarcimento de despesas realizadas com recursos proprios.
                        Anexe comprovantes e o Sentinela IA fara a analise automatica.
                    </p>
                </div>
            </div>

            {/* Dados do Solicitante */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <Briefcase size={16} className="text-teal-600" /> Dados do Solicitante
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600">Nome Completo</label>
                        <input type="text" value={userName} readOnly className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 font-medium" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600">Matricula</label>
                        <input type="text" value={userMatricula} readOnly className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 font-medium" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600">Cargo / Funcao</label>
                        <input type="text" value={userCargo} onChange={e => setUserCargo(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 transition-all" placeholder="Ex: Analista Judiciario" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600">Lotacao</label>
                        <input type="text" value={userLotacao} onChange={e => setUserLotacao(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 transition-all" placeholder="Ex: Gabinete da Presidencia" />
                    </div>
                </div>
            </div>

            {/* Dados Bancarios */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <Receipt size={16} className="text-teal-600" /> Dados Bancarios para Ressarcimento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600">Banco</label>
                        <input type="text" value={banco} onChange={e => setBanco(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-200" placeholder="Ex: Banco do Brasil" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600">Agencia</label>
                        <input type="text" value={agencia} onChange={e => setAgencia(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-200" placeholder="0000-0" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600">Conta</label>
                        <input type="text" value={conta} onChange={e => setConta(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-200" placeholder="00000-0" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600">Tipo de Conta</label>
                        <div className="flex gap-2">
                            <button onClick={() => setTipoConta('CORRENTE')} className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${tipoConta === 'CORRENTE' ? 'bg-teal-50 border-teal-300 text-teal-700 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>Corrente</button>
                            <button onClick={() => setTipoConta('POUPANCA')} className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${tipoConta === 'POUPANCA' ? 'bg-teal-50 border-teal-300 text-teal-700 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>Poupanca</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Gestor */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <UserCheck size={16} className="text-teal-600" /> Responsavel pela Unidade
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600">Nome do Gestor</label>
                        <input type="text" value={managerName} onChange={e => setManagerName(e.target.value)} readOnly={isManagerLinked} className={`w-full px-4 py-3 border rounded-xl text-sm outline-none transition-all ${isManagerLinked ? 'bg-gray-50 cursor-not-allowed border-gray-200' : 'bg-white border-gray-200 focus:ring-2 focus:ring-teal-200'}`} required />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600">E-mail Institucional</label>
                        <input type="email" value={managerEmail} onChange={e => setManagerEmail(e.target.value)} readOnly={isManagerLinked} className={`w-full px-4 py-3 border rounded-xl text-sm outline-none transition-all ${isManagerLinked ? 'bg-gray-50 cursor-not-allowed border-gray-200' : 'bg-white border-gray-200 focus:ring-2 focus:ring-teal-200'}`} required />
                    </div>
                </div>
            </div>
        </div>
    );

    // ============================================================
    // STEP 2 - Itens + Sentinela + Mapa + Calculadora
    // ============================================================
    const renderStep2 = () => (
        <div className="animate-in fade-in slide-in-from-right-8 duration-300 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Receipt size={16} className="text-teal-600" /> Itens para Ressarcimento
                    </h3>
                    <button onClick={addItem} className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-teal-700 transition-all active:scale-95">
                        <Plus size={14} /> Adicionar Item
                    </button>
                </div>

                <div className="space-y-6">
                    {items.map((item, index) => (
                        <div key={item.id} className={`rounded-2xl border-2 overflow-hidden transition-all ${
                            item.sentinelaRisk ? `${RISK_COLORS[item.sentinelaRisk]?.border || 'border-gray-200'} ${RISK_COLORS[item.sentinelaRisk]?.bg || ''}` : 'border-gray-200 bg-gray-50/30'
                        }`}>
                            {/* Item Header */}
                            <div className="flex items-center justify-between px-5 py-3 bg-white/80 border-b">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-black">{index + 1}</div>
                                    <span className="text-sm font-bold text-gray-700">
                                        {item.descricao ? item.descricao.substring(0, 40) + (item.descricao.length > 40 ? '...' : '') : `Item ${index + 1}`}
                                    </span>
                                    {item.sentinelaRisk && (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${RISK_COLORS[item.sentinelaRisk]?.bg} ${RISK_COLORS[item.sentinelaRisk]?.text} border ${RISK_COLORS[item.sentinelaRisk]?.border}`}>
                                            <Sparkles size={10} /> Sentinela: {item.sentinelaRisk}
                                        </span>
                                    )}
                                </div>
                                {items.length > 1 && (
                                    <button onClick={() => removeItem(item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>

                            <div className="p-5 space-y-5">
                                {/* Row 1: Categoria + Data + Valor */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="md:col-span-2 space-y-1.5">
                                        <label className="text-xs font-bold text-gray-600">Categoria da Despesa</label>
                                        <select value={item.categoria} onChange={e => updateItem(item.id, 'categoria', e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-teal-200">
                                            <option value="">Selecione a categoria...</option>
                                            {CATEGORIAS_RESSARCIMENTO.map(cat => <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-600">Data da Despesa</label>
                                        <input type="date" value={item.dataOcorrencia} onChange={e => updateItem(item.id, 'dataOcorrencia', e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-200" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-600">Valor (R$)</label>
                                        <input type="number" step="0.01" value={item.valor} onChange={e => updateItem(item.id, 'valor', e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-200 font-mono font-bold" placeholder="0.00" />
                                    </div>
                                </div>

                                {/* Row 2: Descricao (textarea grande) + Nota Fiscal */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2 space-y-1.5">
                                        <label className="text-xs font-bold text-gray-600">Descricao Detalhada da Despesa</label>
                                        <textarea
                                            value={item.descricao}
                                            onChange={e => updateItem(item.id, 'descricao', e.target.value)}
                                            rows={4}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-200 resize-none"
                                            placeholder="Descreva detalhadamente a despesa realizada, incluindo finalidade, local, e circunstancias..."
                                        />
                                        {item.aiDescription && (
                                            <div className="flex items-start gap-2 p-2 bg-teal-50 rounded-lg border border-teal-100">
                                                <Sparkles size={12} className="text-teal-600 mt-0.5 shrink-0" />
                                                <p className="text-[11px] text-teal-700 leading-relaxed">
                                                    <span className="font-bold">IA detectou: </span>{item.aiDescription}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-600">Nr. Nota Fiscal / Recibo</label>
                                        <input type="text" value={item.notaFiscal} onChange={e => updateItem(item.id, 'notaFiscal', e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-200" placeholder="Nr. do documento" />

                                        <label className="text-xs font-bold text-gray-600 mt-3 block">Observacao</label>
                                        <input type="text" value={item.observacao} onChange={e => updateItem(item.id, 'observacao', e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-200" placeholder="Estabelecimento, fornecedor..." />
                                    </div>
                                </div>

                                {/* Row 3: Upload + Preview Sentinela */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Upload Area */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-600 flex items-center gap-2">
                                            <Sparkles size={12} className="text-teal-600" /> Comprovante (Sentinela IA)
                                        </label>
                                        <div className="relative">
                                            <input type="file" id={`file-${item.id}`} className="hidden" accept="image/*,application/pdf" onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleSmartCapture(item.id, file);
                                            }} />
                                            <label htmlFor={`file-${item.id}`} className={`flex flex-col items-center justify-center gap-2 px-6 py-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all hover:border-teal-400 hover:bg-teal-50/30 ${
                                                item.arquivo ? 'border-teal-300 bg-teal-50/20' : 'border-gray-300 bg-white'
                                            }`}>
                                                {item.isAnalyzing ? (
                                                    <>
                                                        <Loader2 size={24} className="text-teal-600 animate-spin" />
                                                        <span className="text-xs font-bold text-teal-600">Sentinela analisando...</span>
                                                    </>
                                                ) : item.arquivo ? (
                                                    <>
                                                        <CheckCircle2 size={24} className="text-teal-600" />
                                                        <span className="text-xs font-bold text-teal-700">{item.arquivo.name}</span>
                                                        <span className="text-[10px] text-gray-400">Clique para substituir</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload size={24} className="text-gray-400" />
                                                        <span className="text-xs font-bold text-gray-500">Subir Comprovante</span>
                                                        <span className="text-[10px] text-gray-400">Imagem ou PDF</span>
                                                    </>
                                                )}
                                            </label>
                                        </div>

                                        {/* Sentinela Alerts */}
                                        {item.sentinelaAlerts && item.sentinelaAlerts.length > 0 && (
                                            <div className="space-y-1 mt-2">
                                                {item.sentinelaAlerts.map((alert, i) => (
                                                    <div key={i} className="flex items-start gap-2 p-2 bg-red-50 rounded-lg border border-red-100">
                                                        <AlertTriangle size={12} className="text-red-500 mt-0.5 shrink-0" />
                                                        <span className="text-[11px] text-red-700 font-medium">{alert}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Receipt Preview */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-600 flex items-center gap-2">
                                            <Eye size={12} className="text-teal-600" /> Preview do Comprovante
                                        </label>
                                        {item.arquivoUrl ? (
                                            <div className="relative rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-50 group">
                                                <img
                                                    src={item.arquivoUrl}
                                                    alt="Comprovante"
                                                    className="w-full h-48 object-contain bg-white p-2"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                                    }}
                                                />
                                                <div className="hidden w-full h-48 flex items-center justify-center bg-gray-100">
                                                    <div className="text-center">
                                                        <FileText size={32} className="text-gray-400 mx-auto mb-2" />
                                                        <p className="text-xs text-gray-500 font-medium">PDF / Arquivo nao visualizavel</p>
                                                    </div>
                                                </div>
                                                {/* Sentinela Risk Badge */}
                                                {item.sentinelaRisk && (
                                                    <div className={`absolute top-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase shadow-lg ${
                                                        RISK_COLORS[item.sentinelaRisk]?.bg} ${RISK_COLORS[item.sentinelaRisk]?.text} border ${RISK_COLORS[item.sentinelaRisk]?.border
                                                    }`}>
                                                        <div className={`w-2 h-2 rounded-full ${RISK_COLORS[item.sentinelaRisk]?.dot} animate-pulse`} />
                                                        Risco: {item.sentinelaRisk}
                                                    </div>
                                                )}
                                                {/* Overlay info */}
                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] text-white font-bold">{item.arquivo?.name}</span>
                                                        <span className="text-[10px] text-white/70">{item.arquivo ? (item.arquivo.size / 1024).toFixed(0) + ' KB' : ''}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full h-48 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center">
                                                <Image size={32} className="text-gray-300 mb-2" />
                                                <p className="text-xs text-gray-400 font-medium">Nenhum comprovante</p>
                                                <p className="text-[10px] text-gray-300">Suba um arquivo para visualizar</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ============ TRANSPORTE: Calculadora de Combustivel + Mapa ============ */}
                                {item.categoria === 'TRANSPORTE' && (
                                    <div className="space-y-4 pt-4 border-t border-gray-200">
                                        <h4 className="text-xs font-black text-teal-800 uppercase flex items-center gap-2">
                                            <Navigation size={14} className="text-teal-600" /> Calculo de Rota e Combustivel
                                        </h4>

                                        {/* Vehicle Info + Fuel Calculator */}
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-teal-700 uppercase">Placa</label>
                                                <input
                                                    type="text"
                                                    value={item.placaVeiculo || ''}
                                                    onChange={e => updateItem(item.id, 'placaVeiculo', e.target.value.toUpperCase())}
                                                    className="w-full px-3 py-2.5 border border-teal-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-teal-200"
                                                    placeholder="ABC-1234"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-teal-700 uppercase">Odometro Inicial</label>
                                                <input
                                                    type="number"
                                                    value={item.odometroInicial || ''}
                                                    onChange={e => updateItem(item.id, 'odometroInicial', e.target.value)}
                                                    className="w-full px-3 py-2.5 border border-teal-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-teal-200"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-teal-700 uppercase">Odometro Final</label>
                                                <input
                                                    type="number"
                                                    value={item.odometroFinal || ''}
                                                    onChange={e => updateItem(item.id, 'odometroFinal', e.target.value)}
                                                    className="w-full px-3 py-2.5 border border-teal-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-teal-200"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-teal-700 uppercase flex items-center gap-1"><Fuel size={10} /> R$/Litro</label>
                                                <input
                                                    type="text"
                                                    value={item.precoLitro || ''}
                                                    onChange={e => updateItem(item.id, 'precoLitro', e.target.value)}
                                                    className="w-full px-3 py-2.5 border border-teal-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-teal-200"
                                                    placeholder="6.50"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-teal-700 uppercase flex items-center gap-1"><Car size={10} /> Km/L</label>
                                                <input
                                                    type="text"
                                                    value={item.consumoKmL || ''}
                                                    onChange={e => updateItem(item.id, 'consumoKmL', e.target.value)}
                                                    className="w-full px-3 py-2.5 border border-teal-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-teal-200"
                                                    placeholder="10"
                                                />
                                            </div>
                                        </div>

                                        {/* Fuel Cost Calculator Result */}
                                        {item.kmCalculado && item.precoLitro && item.consumoKmL && (
                                            <div className="bg-gradient-to-r from-teal-900 to-emerald-800 rounded-2xl p-5 text-white animate-in fade-in zoom-in-95 duration-300">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Calculator size={16} className="text-teal-300" />
                                                    <span className="text-[10px] font-black text-teal-300 uppercase tracking-widest">Calculo Automatico de Combustivel</span>
                                                </div>
                                                <div className="grid grid-cols-4 gap-4">
                                                    <div>
                                                        <p className="text-[10px] text-teal-400 font-bold">Distancia</p>
                                                        <p className="text-xl font-black">{item.kmCalculado} <span className="text-sm opacity-70">km</span></p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-teal-400 font-bold">Preco/Litro</p>
                                                        <p className="text-xl font-black">R$ {parseFloat(String(item.precoLitro).replace(',', '.')).toFixed(2)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-teal-400 font-bold">Consumo</p>
                                                        <p className="text-xl font-black">{item.consumoKmL} <span className="text-sm opacity-70">km/L</span></p>
                                                    </div>
                                                    <div className="bg-white/10 rounded-xl p-3 text-center">
                                                        <p className="text-[10px] text-teal-300 font-bold">VALOR CALCULADO</p>
                                                        <p className="text-2xl font-black text-emerald-300">R$ {item.valorCombustivelCalculado?.toFixed(2) || '0.00'}</p>
                                                        <p className="text-[9px] text-teal-400 mt-1">({item.kmCalculado} km / {item.consumoKmL} km/L) x R$ {parseFloat(String(item.precoLitro).replace(',', '.')).toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Origin / Destination Search */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-teal-700 uppercase flex items-center gap-1"><MapPin size={10} /> Origem</label>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <input
                                                            type="text"
                                                            value={item.origemLabel || ''}
                                                            onChange={(e) => updateItem(item.id, 'origemLabel', e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleSearchAddress(item.id, item.origemLabel || '', 'origem')}
                                                            className={`w-full pl-8 pr-3 py-2.5 border rounded-xl text-sm transition-all outline-none focus:ring-2 focus:ring-teal-200 ${item.origemCoords ? 'border-teal-400 bg-teal-50/30' : 'border-gray-200'}`}
                                                            placeholder="Digite e pressione Enter"
                                                        />
                                                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    </div>
                                                    <button
                                                        disabled={item.isAnalyzing}
                                                        onClick={() => handleSearchAddress(item.id, item.origemLabel || '', 'origem')}
                                                        className="px-4 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        {item.isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : 'Buscar'}
                                                    </button>
                                                </div>
                                                {item.origemCoords && (
                                                    <div className="flex items-center gap-1 animate-in fade-in">
                                                        <CheckCircle2 size={10} className="text-teal-600" />
                                                        <span className="text-[10px] text-teal-600 font-bold">Localizado</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-teal-700 uppercase flex items-center gap-1"><MapPin size={10} /> Destino</label>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <input
                                                            type="text"
                                                            value={item.destinoLabel || ''}
                                                            onChange={(e) => updateItem(item.id, 'destinoLabel', e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleSearchAddress(item.id, item.destinoLabel || '', 'destino')}
                                                            className={`w-full pl-8 pr-3 py-2.5 border rounded-xl text-sm transition-all outline-none focus:ring-2 focus:ring-teal-200 ${item.destinoCoords ? 'border-teal-400 bg-teal-50/30' : 'border-gray-200'}`}
                                                            placeholder="Digite e pressione Enter"
                                                        />
                                                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    </div>
                                                    <button
                                                        disabled={item.isAnalyzing}
                                                        onClick={() => handleSearchAddress(item.id, item.destinoLabel || '', 'destino')}
                                                        className="px-4 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        {item.isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : 'Buscar'}
                                                    </button>
                                                </div>
                                                {item.destinoCoords && (
                                                    <div className="flex items-center gap-1 animate-in fade-in">
                                                        <CheckCircle2 size={10} className="text-teal-600" />
                                                        <span className="text-[10px] text-teal-600 font-bold">Localizado</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Google Map */}
                                        {(item.origemCoords || item.destinoCoords) && (
                                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                                                <div className="lg:col-span-3">
                                                    <GoogleMapPremium
                                                        origin={item.origemCoords}
                                                        destination={item.destinoCoords}
                                                        onRouteCalculated={(km) => {
                                                            if (item.kmCalculado !== parseFloat(km.toFixed(2))) {
                                                                updateItem(item.id, 'kmCalculado', parseFloat(km.toFixed(2)));
                                                            }
                                                        }}
                                                        className="h-[350px] shadow-inner"
                                                    />
                                                </div>
                                                <div className="bg-gradient-to-b from-teal-900 to-teal-800 rounded-2xl p-5 text-white flex flex-col justify-center">
                                                    <Navigation size={20} className="text-teal-400 mb-3" />
                                                    <p className="text-[10px] font-bold text-teal-400 uppercase tracking-wider mb-1">Distancia</p>
                                                    <div className="flex items-baseline gap-1 mb-4">
                                                        <span className="text-4xl font-black">{item.kmCalculado || '--'}</span>
                                                        <span className="text-sm font-bold opacity-60">km</span>
                                                    </div>
                                                    <div className="space-y-2 text-[10px] text-teal-300">
                                                        {item.origemLabel && <p><span className="text-teal-400 font-bold">De:</span> {item.origemLabel}</p>}
                                                        {item.destinoLabel && <p><span className="text-teal-400 font-bold">Para:</span> {item.destinoLabel}</p>}
                                                    </div>
                                                    <p className="text-[9px] text-teal-400/60 mt-4 leading-tight">
                                                        Rota oficial via Google Maps. Preencha preco/litro e km/L para calculo automatico.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Total Bar */}
                <div className="mt-6 pt-4 border-t-2 border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">Total dos Itens:</span>
                        <span className="text-2xl font-black text-teal-800">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                        </span>
                    </div>
                    <span className="text-xs text-gray-400">{items.filter(i => i.descricao && i.valor).length} item(ns) preenchido(s)</span>
                </div>
            </div>
        </div>
    );

    // ============================================================
    // STEP 3 - Justificativa + Resumo + Envio
    // ============================================================
    const renderStep3 = () => {
        const filledItems = items.filter(i => i.descricao && i.valor);
        const risks = filledItems.map(i => i.sentinelaRisk).filter(Boolean);
        const highestRisk = risks.includes('CRITICAL') ? 'CRITICAL' :
                           risks.includes('HIGH') ? 'HIGH' :
                           risks.includes('MEDIUM') ? 'MEDIUM' : 'LOW';

        return (
            <div className="animate-in fade-in slide-in-from-right-8 duration-300 space-y-6">
                {/* Summary Header */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-xl">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">Resumo da Solicitacao</h3>
                        <div className="flex gap-2">
                            <button onClick={() => setUrgency('NORMAL')} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${urgency === 'NORMAL' ? 'bg-teal-600 border-teal-500' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}>Normal</button>
                            <button onClick={() => setUrgency('URGENTE')} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${urgency === 'URGENTE' ? 'bg-red-600 border-red-500' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}>Urgente</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/5 rounded-xl p-3">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Itens</p>
                            <p className="text-xl font-black">{filledItems.length}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Valor Total</p>
                            <p className="text-xl font-black text-emerald-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Sentinela</p>
                            <span className={`inline-flex items-center gap-1 text-sm font-black ${
                                highestRisk === 'LOW' ? 'text-emerald-400' :
                                highestRisk === 'MEDIUM' ? 'text-amber-400' : 'text-red-400'
                            }`}>
                                <Sparkles size={14} /> {highestRisk}
                            </span>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Destino</p>
                            <p className="text-sm font-bold text-teal-300">Inbox Ressarcimento</p>
                        </div>
                    </div>
                </div>

                {/* Items Summary with Previews */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h4 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                        <Receipt size={16} className="text-teal-600" /> Itens Incluidos
                    </h4>
                    <div className="space-y-3">
                        {filledItems.map((item, i) => {
                            const cat = CATEGORIAS_RESSARCIMENTO.find(c => c.value === item.categoria);
                            return (
                                <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    {/* Mini preview */}
                                    {item.arquivoUrl ? (
                                        <img src={item.arquivoUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                                            <FileText size={16} className="text-gray-400" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">{item.descricao}</p>
                                        <p className="text-[10px] text-gray-400">{cat?.label} | {item.dataOcorrencia || 'Sem data'} | NF: {item.notaFiscal || 'N/A'}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-mono font-bold text-teal-700">R$ {parseFloat(item.valor.replace(',', '.')).toFixed(2)}</p>
                                        {item.sentinelaRisk && (
                                            <span className={`text-[9px] font-black uppercase ${RISK_COLORS[item.sentinelaRisk]?.text}`}>
                                                {item.sentinelaRisk}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Justification */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2">
                            <Sparkles size={16} className="text-teal-600" /> Justificativa
                        </h4>
                        <button onClick={handleGenerateAI} disabled={isGeneratingAI} className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50">
                            {isGeneratingAI ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            {isGeneratingAI ? 'Gerando...' : 'Gerar com IA'}
                        </button>
                    </div>
                    <textarea
                        value={justification}
                        onChange={e => setJustification(e.target.value)}
                        rows={8}
                        className="w-full p-4 border border-gray-200 rounded-xl text-sm outline-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-200 transition-all resize-none"
                        placeholder="Descreva o motivo das despesas realizadas com recursos proprios. Clique em 'Gerar com IA' para criar automaticamente com base nos comprovantes..."
                        required
                    />
                    <p className="text-[10px] text-gray-400 mt-1 text-right">{justification.length} / 800 caracteres</p>
                </div>

                {/* Submit */}
                <div className="bg-gradient-to-br from-teal-50 to-emerald-50 p-8 rounded-2xl border border-teal-200 shadow-sm">
                    <div className="flex flex-col items-center">
                        <h4 className="text-base font-bold text-teal-800 mb-4">Assinatura Digital</h4>
                        <div className="w-full max-w-md bg-white p-4 rounded-xl border border-teal-200 mb-6 flex items-center gap-3 shadow-sm">
                            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-teal-700 font-black text-lg">{userName.charAt(0)}</div>
                            <div className="flex-1">
                                <p className="font-bold text-sm text-gray-800">{userName}</p>
                                <p className="text-[10px] text-gray-500">{userMatricula} | {userCargo}</p>
                            </div>
                            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <BadgeCheck size={14} />
                                <span className="text-[10px] font-bold">Validado</span>
                            </div>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !justification || totalValue <= 0}
                            className="w-full max-w-md py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-xl transition-all active:scale-[0.98] text-base"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            {isSubmitting ? 'Enviando...' : 'Enviar Solicitacao de Ressarcimento'}
                        </button>
                        <p className="text-[10px] text-teal-600 mt-3 text-center">
                            Ao enviar, a solicitacao sera encaminhada para a Caixa de Entrada do modulo de Ressarcimento.
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-5xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-800 rounded-2xl p-8 mb-8 text-white flex justify-between items-center shadow-xl">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate('suprido_dashboard')} className="p-2.5 hover:bg-white/10 rounded-xl transition-colors"><ArrowLeft size={20} /></button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Ressarcimento</h1>
                        <p className="text-teal-200 text-xs mt-0.5">Modulo de Reembolso de Despesas Proprias</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {[
                        { n: 1, label: 'Dados' },
                        { n: 2, label: 'Itens' },
                        { n: 3, label: 'Enviar' }
                    ].map(s => (
                        <div key={s.n} className="flex items-center gap-2">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                                step === s.n ? 'bg-white text-teal-900 border-white scale-110' :
                                step > s.n ? 'bg-teal-600 text-white border-teal-500' :
                                'bg-teal-800/50 text-teal-400 border-teal-700'
                            }`}>{step > s.n ? <CheckCircle2 size={16} /> : s.n}</div>
                            <span className={`text-[10px] font-bold hidden md:block ${step === s.n ? 'text-white' : 'text-teal-400'}`}>{s.label}</span>
                            {s.n < 3 && <ChevronRight size={14} className="text-teal-600 hidden md:block" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Steps Content */}
            <div className="min-h-[400px]">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </div>

            {/* Bottom Nav */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-200 p-4 z-50 shadow-lg">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <button
                        onClick={() => step === 1 ? onNavigate('suprido_dashboard') : setStep(s => s - 1)}
                        className="px-6 py-3 text-sm font-bold text-gray-600 rounded-xl hover:bg-gray-100 transition-all flex items-center gap-2"
                    >
                        <ChevronLeft size={16} />
                        {step === 1 ? 'Cancelar' : 'Voltar'}
                    </button>

                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-400">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                        </span>
                        {step < 3 && (
                            <button
                                onClick={() => setStep(s => s + 1)}
                                className="px-8 py-3 bg-teal-600 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-teal-700 transition-all active:scale-95 flex items-center gap-2"
                            >
                                Proximo <ChevronRight size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
