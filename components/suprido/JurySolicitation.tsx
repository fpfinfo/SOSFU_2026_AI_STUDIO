
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Users, Calendar, DollarSign, FileText, CheckCircle2, ChevronRight, ChevronLeft, Minus, Plus, AlertCircle, AlertTriangle, ShieldAlert, Save, Sparkles, Loader2, UserCheck, Scale, Utensils, Coffee, Droplets } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generateText } from '../../lib/gemini';

interface JurySolicitationProps {
    onNavigate: (page: string, processId?: string) => void;
}

// Interfaces para Configurações Dinâmicas
interface AppConfig {
    price_lunch: number;
    price_dinner: number;
    price_snack: number;
    limit_servidor: number;
    limit_defensor: number;
    limit_promotor: number;
    limit_policia: number;
}

interface CategoriaPessoa {
    id: string;
    label: string;
    max: number | null;
}

interface ItemData {
    element: string; // Código do elemento (ex: 3.3.90.30.01)
    description?: string; // Para itens editáveis como "Outros"
    price: number;
    qty: number;
    qty_approved: number; 
    total: number;
}

interface ElementoDespesa {
    id: string;
    codigo: string;
    descricao: string;
}

export const JurySolicitation: React.FC<JurySolicitationProps> = ({ onNavigate }) => {
    // Estado Geral do Wizard
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true); 
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    // Configurações Dinâmicas (Valores padrão locais como Fallback)
    const [config, setConfig] = useState<AppConfig>({
        price_lunch: 40.00, 
        price_dinner: 40.00, 
        price_snack: 15.00,
        limit_servidor: 7, 
        limit_defensor: 2, 
        limit_promotor: 2, 
        limit_policia: 5
    });

    // Dados de Apoio
    const [elementosOptions, setElementosOptions] = useState<ElementoDespesa[]>([]);

    // Etapa 1: Pessoas
    const [peopleCounts, setPeopleCounts] = useState<Record<string, number>>({});
    
    // Etapa 2: Dados e Projeção
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [daysCount, setDaysCount] = useState(1);
    const [comarca, setComarca] = useState('');
    const [processNumber, setProcessNumber] = useState('');
    
    // Painel de Frequência (Vezes por pessoa durante todo o evento)
    const [freqLunch, setFreqLunch] = useState(1);
    const [freqDinner, setFreqDinner] = useState(0);
    const [freqSnack, setFreqSnack] = useState(1);

    const [itemsData, setItemsData] = useState<Record<string, ItemData>>({});

    // Etapa 3: Justificativa e Gestor
    const [urgency, setUrgency] = useState('NORMAL');
    const [managerName, setManagerName] = useState('');
    const [managerEmail, setManagerEmail] = useState('');
    const [justification, setJustification] = useState('');
    const [userName, setUserName] = useState('');
    const [userMatricula, setUserMatricula] = useState('');

    // Definição das Categorias com base no Config
    const categoriasPessoas: CategoriaPessoa[] = useMemo(() => [
        { id: 'servidor', label: 'Servidor do Fórum', max: config.limit_servidor },
        { id: 'reu', label: 'Réus', max: null },
        { id: 'jurado', label: 'Jurados', max: null }, 
        { id: 'testemunha', label: 'Testemunhas', max: null },
        { id: 'defensor', label: 'Defensor Público', max: config.limit_defensor },
        { id: 'promotor', label: 'Promotor', max: config.limit_promotor },
        { id: 'policia', label: 'Polícias (Escolta/Segurança)', max: config.limit_policia }
    ], [config]);

    // Flag: contingente policial acima do limite normativo SEFIN
    const policeExceedsLimit = (peopleCounts['policia'] || 0) > config.limit_policia;

    // Flag: valor unitário de refeição acima do limite normativo SEFIN
    const mealLimits: Record<string, { label: string; limit: number }> = useMemo(() => ({
        almoco: { label: 'Refeição - Almoço', limit: config.price_lunch },
        jantar: { label: 'Refeição - Jantar', limit: config.price_dinner },
        lanche: { label: 'Lanches', limit: config.price_snack },
    }), [config]);

    const mealsExceeding = useMemo(() => {
        return Object.entries(mealLimits).filter(([id, { limit }]) => {
            const price = itemsData[id]?.price || 0;
            return price > limit;
        }).map(([id, { label, limit }]) => ({ id, label, limit, actual: itemsData[id]?.price || 0 }));
    }, [itemsData, mealLimits]);

    const mealExceedsLimit = mealsExceeding.length > 0;

    // Definição Base dos Itens (Estrutura Completa conforme vídeo)
    // type: 'AUTO' (Calculado: Pessoas * Freq * Preço) | 'MANUAL' (Qtd Manual * Preço)
    const itensBaseEstrutura = useMemo(() => [
        { id: 'almoco', label: 'Refeição - Almoço', type: 'AUTO', defaultElement: '3.3.90.30.01', defaultPrice: 0 },
        { id: 'jantar', label: 'Refeição - Jantar', type: 'AUTO', defaultElement: '3.3.90.30.01', defaultPrice: 0 },
        { id: 'lanche', label: 'Lanches', type: 'AUTO', defaultElement: '3.3.90.30.01', defaultPrice: 0 },
        { id: 'agua', label: 'Água Mineral 20L', type: 'MANUAL', defaultElement: '3.3.90.30.01', defaultPrice: 15.00 },
        { id: 'biscoito', label: 'Biscoito / Bolacha', type: 'MANUAL', defaultElement: '3.3.90.30.01', defaultPrice: 7.50 },
        { id: 'cafe', label: 'Café (Pó/Grão)', type: 'MANUAL', defaultElement: '3.3.90.30.01', defaultPrice: 22.00 },
        { id: 'acucar', label: 'Açúcar', type: 'MANUAL', defaultElement: '3.3.90.30.01', defaultPrice: 5.00 },
        { id: 'descartavel', label: 'Material Descartável (Copos/Pratos)', type: 'MANUAL', defaultElement: '3.3.90.30.21', defaultPrice: 50.00 },
        { id: 'expediente', label: 'Material de Expediente', type: 'MANUAL', defaultElement: '3.3.90.30.16', defaultPrice: 100.00 },
        { id: 'combustivel', label: 'Combustível', type: 'MANUAL', defaultElement: '3.3.90.30.02', defaultPrice: 0.00 },
        { id: 'fotocopia', label: 'Foto Cópia (Xerox)', type: 'MANUAL', defaultElement: '3.3.90.39.00', defaultPrice: 0.00 },
        { id: 'som', label: 'Serviço de Som', type: 'MANUAL', defaultElement: '3.3.90.39.00', defaultPrice: 0.00 },
        { id: 'locacao', label: 'Locação de Equipamentos Diversos', type: 'MANUAL', defaultElement: '3.3.90.39.00', defaultPrice: 0.00 },
        { id: 'outros', label: 'Outros (Especificar)', type: 'MANUAL_EDIT', defaultElement: '3.3.90.30.01', defaultPrice: 0.00 },
    ], []);

    // Inicialização
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await fetchElementos();
            await fetchConfigAndInitItems();
            await fetchUserData();
            setLoading(false);
        };
        init();
    }, []);

    const fetchElementos = async () => {
        try {
            const { data, error } = await supabase
                .from('delemento')
                .select('*')
                .eq('is_active', true)
                .order('codigo');
            
            if (error) throw error;
            setElementosOptions(data || []);
        } catch (error) {
            console.error("Erro ao buscar elementos:", error);
        }
    };

    const fetchConfigAndInitItems = async () => {
        let activeConfig = { ...config }; 

        try {
            const { data, error } = await supabase.from('app_config').select('*').limit(1).maybeSingle();
            if (!error && data) {
                activeConfig = { ...activeConfig, ...data };
                setConfig(activeConfig);
            }
        } catch (err) {
            console.warn("Erro config:", err);
        }

        // Inicializa itens com base nos preços configurados
        const initialItems: Record<string, ItemData> = {};
        itensBaseEstrutura.forEach(item => {
            let price = item.defaultPrice || 0;
            if (item.id === 'almoco') price = activeConfig.price_lunch;
            if (item.id === 'jantar') price = activeConfig.price_dinner;
            if (item.id === 'lanche') price = activeConfig.price_snack;

            initialItems[item.id] = { 
                element: item.defaultElement, 
                description: item.type === 'MANUAL_EDIT' ? '' : undefined,
                price: price, 
                qty: 0, 
                qty_approved: 0, 
                total: 0 
            };
        });
        
        setItemsData(initialItems);
    };

    // Cálculo de Dias
    useEffect(() => {
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
            setDaysCount(diffDays > 0 ? diffDays : 1);
        } else {
            setDaysCount(1);
        }
    }, [startDate, endDate]);

    const totalPeople = useMemo(() => {
        return Object.values(peopleCounts).reduce((a: number, b: number) => a + b, 0);
    }, [peopleCounts]);

    // Recálculo Automático da Tabela (Itens AUTO: Qtd = Pessoas * Frequencia)
    useEffect(() => {
        setItemsData((prev: Record<string, ItemData>) => {
            const next = { ...prev };
            
            if (next.almoco) {
                next.almoco.qty = totalPeople * freqLunch;
                next.almoco.total = next.almoco.qty * next.almoco.price;
            }
            if (next.jantar) {
                next.jantar.qty = totalPeople * freqDinner;
                next.jantar.total = next.jantar.qty * next.jantar.price;
            }
            if (next.lanche) {
                next.lanche.qty = totalPeople * freqSnack;
                next.lanche.total = next.lanche.qty * next.lanche.price;
            }

            return next;
        });
    }, [peopleCounts, freqLunch, freqDinner, freqSnack, totalPeople]);

    // Total Geral
    const totalGeneral = useMemo(() => {
        return Object.values(itemsData).reduce((acc: number, item: ItemData) => acc + item.total, 0);
    }, [itemsData]);

    const fetchUserData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (data) {
                setUserName(data.full_name);
                setUserMatricula(data.matricula);
                setManagerName(data.gestor_nome || '');
                setManagerEmail(data.gestor_email || '');
                if (data.municipio) setComarca(data.municipio);
            }
        }
    };

    const handleUpdateItem = (id: string, field: keyof ItemData, value: string) => {
        setItemsData(prev => {
            const item = { ...prev[id] };
            
            if (field === 'description') {
                item.description = value;
            } else if (field === 'element') {
                item.element = value;
            } else {
                const numVal = parseFloat(value) || 0;
                // @ts-ignore
                item[field] = numVal;
                // Recalcula total se mudar preço ou quantidade
                if (field === 'price' || field === 'qty') {
                    item.total = item.price * item.qty;
                }
            }
            return { ...prev, [id]: item };
        });
    };

    const handleGenerateAI = async () => {
        setIsGeneratingAI(true);
        try {
            let itemsSummary = '';
            itensBaseEstrutura.forEach(item => {
                const data = itemsData[item.id];
                if (data && data.total > 0) {
                    const desc = item.type === 'MANUAL_EDIT' ? `Outros (${data.description})` : item.label;
                    const elInfo = data.element ? `[ND: ${data.element}]` : '[ND n/i]';
                    itemsSummary += `- ${desc} ${elInfo}: ${data.qty} unid. x R$ ${data.price.toFixed(2)} = R$ ${data.total.toFixed(2)}\n`;
                }
            });

            const prompt = `
                Atue como um servidor do Tribunal de Justiça do Estado do Pará. 
                Escreva uma justificativa formal, técnica e sucinta para solicitação de Suprimento de Fundos - Modalidade Extra-Júri.
                
                Contexto:
                - Processo Judicial nº ${processNumber}
                - Comarca: ${comarca}
                - Período: ${startDate ? startDate.split('-').reverse().join('/') : 'A definir'} a ${endDate ? endDate.split('-').reverse().join('/') : 'A definir'}
                - Público Alvo: ${totalPeople} participantes (Jurados, Réus, Servidores, etc.)
                - Valor Total Global: R$ ${totalGeneral.toFixed(2)}
                
                Detalhamento dos Itens Solicitados:
                ${itemsSummary}
                
                Instruções:
                1. A justificativa deve mencionar a necessidade de custeio de despesas com alimentação e apoio logístico para realização de sessão do Tribunal do Júri.
                2. Mencione que os valores atendem às necessidades do serviço e observam a razoabilidade.
                3. Texto corrido, sem saudações (apenas o corpo).
            `;

            const text = await generateText(prompt);

            if (text) setJustification(text);
        } catch (error) {
            console.error(error);
            alert('Erro ao gerar justificativa com IA.');
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não logado');

            const year = new Date().getFullYear();
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            const procNum = `TJPA-JUR-${year}/${randomNum}`;

            // Prepara items para salvar
            const itemsToSave: any[] = [];
            let participantsText = `PARTICIPANTES DO JÚRI:\n`;

            categoriasPessoas.forEach(cat => {
                const qty = peopleCounts[cat.id] || 0;
                if (qty > 0) {
                    participantsText += `- ${cat.label}: ${qty}\n`;
                    itemsToSave.push({ category: 'PARTICIPANT', item_name: cat.label, qty_requested: qty, qty_approved: 0 });
                }
            });

            let detailedItems = `PROJEÇÃO DE GASTOS (JÚRI):\n`;
            itensBaseEstrutura.forEach(item => {
                const d = itemsData[item.id];
                if (d && d.total > 0) {
                    const label = item.type === 'MANUAL_EDIT' && d.description ? d.description : item.label;
                    detailedItems += `${label} [ND: ${d.element}]: ${d.qty} x R$ ${d.price.toFixed(2)} = R$ ${d.total.toFixed(2)}\n`;
                    itemsToSave.push({
                        category: 'EXPENSE', item_name: label, element_code: d.element,
                        qty_requested: d.qty, unit_price_requested: d.price, qty_approved: 0, unit_price_approved: d.price
                    });
                }
            });
            
            const finalJustification = `${justification}\n\n${participantsText}\n${detailedItems}`;
            const unitInfo = `${comarca} [Processo: ${processNumber}] [EXTRA-JÚRI]`;

            // A. Insere a Solicitação Principal
            const { data: solData, error } = await supabase.from('solicitations').insert({
                process_number: procNum,
                beneficiary: userName,
                unit: unitInfo,
                value: totalGeneral,
                date: new Date().toISOString(),
                status: 'PENDING',
                user_id: user.id,
                event_start_date: startDate,
                event_end_date: endDate,
                manager_name: managerName,
                manager_email: managerEmail,
                justification: finalJustification
            }).select('id').single();

            if (error) throw error;

            // B. Insere os Itens
            if (itemsToSave.length > 0) {
                const itemsWithId = itemsToSave.map(i => ({ ...i, solicitation_id: solData.id }));
                await supabase.from('solicitation_items').insert(itemsWithId);
            }

            // Documentos iniciais (COVER, REQUEST, ATTESTATION) são criados
            // automaticamente pelo trigger trg_generate_docs no banco de dados.
            // NÃO inserir manualmente aqui para evitar duplicidade.

            onNavigate('process_detail', solData.id);

        } catch (error: any) {
            alert('Erro ao enviar: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Carregando formulário...</p>
            </div>
        );
    }

    const renderStep1 = () => (
        <div className="animate-in fade-in slide-in-from-right-8 duration-300">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={24}/></div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Pessoas Envolvidas</h3>
                        <p className="text-sm text-gray-500">Informe a quantidade de participantes por categoria para cálculo das refeições.</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {categoriasPessoas.map(cat => {
                        const count = peopleCounts[cat.id] || 0;
                        const isPolice = cat.id === 'policia';
                        const exceeds = isPolice && count > (cat.max || 0);
                        // Para polícia: permite ultrapassar o limite. Demais: trava rígida.
                        const isMaxed = !isPolice && cat.max !== null && count >= cat.max;

                        return (
                            <div key={cat.id}>
                                <div className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                                    exceeds 
                                    ? 'border-amber-300 bg-amber-50/50' 
                                    : 'border-gray-100 hover:border-blue-100 bg-white'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        {exceeds && <ShieldAlert size={16} className="text-amber-600" />}
                                        <span className="text-sm font-bold text-gray-700">{cat.label}</span>
                                        {cat.max !== null && (
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                                                exceeds 
                                                ? 'bg-amber-100 text-amber-700 border-amber-200' 
                                                : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                                            }`}>
                                                {exceeds ? `⚠ Acima do Máx: ${cat.max}` : `Máx: ${cat.max}`}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => setPeopleCounts(p => ({ ...p, [cat.id]: Math.max(0, (p[cat.id] || 0) - 1) }))}
                                                className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-blue-600 border border-gray-200 flex items-center justify-center transition-all"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className={`w-10 text-center font-bold text-lg ${exceeds ? 'text-amber-700' : 'text-gray-800'}`}>{count}</span>
                                            <button 
                                                onClick={() => {
                                                    if (isPolice) {
                                                        // Polícia: sempre permite incrementar
                                                        setPeopleCounts(p => ({ ...p, [cat.id]: (p[cat.id] || 0) + 1 }));
                                                    } else {
                                                        setPeopleCounts(p => ({ ...p, [cat.id]: (cat.max && (p[cat.id] || 0) >= cat.max) ? (p[cat.id] || 0) : (p[cat.id] || 0) + 1 }));
                                                    }
                                                }}
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border ${
                                                    isMaxed
                                                    ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed' 
                                                    : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50 shadow-sm'
                                                }`}
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Users className="text-blue-600" />
                    <div>
                        <p className="text-xs font-bold text-blue-500 uppercase">Total de Pessoas</p>
                        <p className="text-xs text-blue-400">Base de cálculo para refeições</p>
                    </div>
                </div>
                <p className="text-3xl font-bold text-blue-700">{totalPeople} <span className="text-sm font-medium opacity-70">participantes</span></p>
            </div>

            {/* Alerta de Exceção Normativa — Contingente Policial */}
            {policeExceedsLimit && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                            <AlertTriangle size={22} className="text-amber-700" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-black text-amber-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                                ⚠ Exceção Normativa — Contingente Policial
                            </h4>
                            <p className="text-xs text-amber-900 leading-relaxed mb-3">
                                O limite máximo permitido pelas <strong>normas da SEFIN</strong> é de <strong>{config.limit_policia} policiais</strong> por sessão de Júri. 
                                Você está solicitando <strong>{peopleCounts['policia'] || 0} policiais</strong>, o que constitui uma <strong>exceção normativa.</strong>
                            </p>
                            <div className="bg-white rounded-lg border border-amber-200 p-4 space-y-3">
                                <div className="flex items-start gap-2">
                                    <FileText size={14} className="text-amber-700 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-gray-700 leading-relaxed">
                                        É <strong>obrigatório</strong> anexar no <strong>Dossiê Digital</strong> um documento de justificativa explicando 
                                        a necessidade do contingente policial acima do estabelecido.
                                    </p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <UserCheck size={14} className="text-amber-700 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-gray-700 leading-relaxed">
                                        Essa justificativa deve ser <strong>atestada e assinada pelo magistrado responsável pela comarca</strong>.
                                    </p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Sparkles size={14} className="text-amber-700 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-gray-700 leading-relaxed">
                                        O suprido ou o magistrado pode elaborar essa justificativa através do botão 
                                        <strong className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 text-[10px] font-bold">
                                            <FileText size={10} /> Novo Documento
                                        </strong>
                                        disponível na tela do processo.
                                    </p>
                                </div>
                                <hr className="border-amber-100" />
                                <p className="text-[10px] text-amber-600 font-medium leading-relaxed">
                                    ⚡ Essa justificativa é <strong>fundamental</strong> para que o ordenador de despesa possa analisar a situação 
                                    e autorizar o que foi solicitado fora das regras estabelecidas pela SEFIN.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderStep2 = () => (
        <div className="animate-in fade-in slide-in-from-right-8 duration-300 space-y-6">
            
            {/* Linha 1: Dados do Processo e Datas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-gray-600">
                        <Scale size={18} />
                        <h3 className="font-bold text-xs uppercase tracking-wider">Dados do Processo</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Comarca / Mão de Rio</label>
                            <input type="text" value={comarca} onChange={e => setComarca(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none text-gray-900 font-medium" placeholder="Ex: Belém" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Processo Judicial nº</label>
                            <input type="text" value={processNumber} onChange={e => setProcessNumber(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none text-gray-900 font-medium" placeholder="0000000-00.0000.8.14.0000" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-blue-600">
                        <Calendar size={18} />
                        <h3 className="font-bold text-xs uppercase tracking-wider">Período da Sessão</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Início</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-100 outline-none text-gray-900 font-medium" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Fim</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-100 outline-none text-gray-900 font-medium" />
                            </div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2 flex justify-between items-center text-blue-700">
                            <span className="text-xs font-bold uppercase">Duração Total</span>
                            <span className="text-lg font-black">{daysCount} dia(s)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Painel de Frequência Alimentação */}
            <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-100">
                <div className="flex items-center gap-2 mb-4 text-yellow-800">
                    <Utensils size={18} />
                    <h3 className="font-bold text-xs uppercase tracking-wider">Painel de Frequência de Alimentação</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { label: 'Almoços', val: freqLunch, set: setFreqLunch, icon: Utensils },
                        { label: 'Jantares', val: freqDinner, set: setFreqDinner, icon: Utensils },
                        { label: 'Lanches', val: freqSnack, set: setFreqSnack, icon: Coffee },
                    ].map((item, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-yellow-200 shadow-sm flex flex-col items-center">
                            <span className="text-[10px] font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                                <item.icon size={12}/> {item.label} (Por Pessoa)
                            </span>
                            <div className="flex items-center gap-4">
                                <button onClick={() => item.set(Math.max(0, item.val - 1))} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-yellow-100 flex items-center justify-center font-bold text-gray-500 hover:text-yellow-700 transition-colors">-</button>
                                <span className="text-2xl font-black text-gray-800 w-8 text-center">{item.val}</span>
                                <button onClick={() => item.set(item.val + 1)} className="w-8 h-8 rounded-full bg-white border border-gray-200 hover:border-yellow-300 hover:text-yellow-700 flex items-center justify-center font-bold text-gray-500 transition-colors shadow-sm">+</button>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-50 w-full text-center">
                                <span className="text-xs text-gray-500 font-medium">Total: <strong>{item.val * totalPeople}</strong> refeições</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabela de Itens Detalhada */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-gray-800 text-sm uppercase flex items-center gap-2">
                            <DollarSign size={16} /> Itens da Projeção
                        </h3>
                        <p className="text-[10px] text-gray-500 mt-0.5">Quantidades calculadas automaticamente ou inserção manual</p>
                    </div>
                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-lg text-xs font-bold border border-green-200 shadow-sm">
                        Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeneral)}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Descrição</th>
                                <th className="px-4 py-3 w-64">Elemento de Despesa</th>
                                <th className="px-4 py-3 w-28">Vl. Unit</th>
                                <th className="px-4 py-3 w-24 text-center">Qtd Solic.</th>
                                <th className="px-4 py-3 w-32 text-right">Total Solic.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs">
                            {itensBaseEstrutura.map(item => {
                                const data = itemsData[item.id] || { element: '', price: 0, qty: 0, qty_approved: 0, total: 0 };
                                const isAuto = item.type === 'AUTO';
                                const isEditDesc = item.type === 'MANUAL_EDIT';
                                const isActive = data.total > 0;

                                return (
                                    <tr key={item.id} className={`transition-colors ${isActive ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}>
                                        <td className="px-4 py-3 font-medium text-gray-700">
                                            <div className="flex items-center gap-2">
                                                {isEditDesc ? (
                                                    <div className="flex items-center gap-2 w-full">
                                                        <span className="whitespace-nowrap">{item.label}</span>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Especificar item..." 
                                                            value={data.description || ''}
                                                            onChange={e => handleUpdateItem(item.id, 'description', e.target.value)}
                                                            className="flex-1 p-1 border border-gray-200 rounded text-xs bg-white text-gray-900 outline-none focus:border-blue-400"
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className={isActive ? 'text-gray-900 font-bold' : ''}>{item.label}</span>
                                                )}
                                                
                                                {isAuto && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">AUTO</span>}
                                                {isAuto && mealLimits[item.id] && (
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border whitespace-nowrap ${
                                                        data.price > mealLimits[item.id].limit 
                                                        ? 'bg-amber-100 text-amber-700 border-amber-200' 
                                                        : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                                    }`}>
                                                        {data.price > mealLimits[item.id].limit ? '⚠ Acima do ' : ''}Máx R${mealLimits[item.id].limit.toFixed(0)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <select 
                                                value={data.element}
                                                onChange={e => handleUpdateItem(item.id, 'element', e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-700 focus:border-blue-500 outline-none cursor-pointer hover:border-gray-300 transition-colors"
                                            >
                                                <option value="">Selecione...</option>
                                                {elementosOptions.map(el => (
                                                    <option key={el.id} value={el.codigo}>
                                                        {el.codigo} {el.descricao.replace('Material de Consumo - ', '').replace('Outros Serviços de Terceiros - ', '')}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="relative">
                                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">R$</span>
                                                <input 
                                                    type="number" step="0.01"
                                                    value={data.price}
                                                    onChange={e => handleUpdateItem(item.id, 'price', e.target.value)}
                                                    className={`w-full bg-white border rounded pl-6 pr-2 py-1.5 text-right focus:border-blue-500 outline-none text-xs font-medium ${
                                                        isAuto && mealLimits[item.id] && data.price > mealLimits[item.id].limit
                                                        ? 'border-amber-400 bg-amber-50 text-amber-800 font-bold'
                                                        : isAuto 
                                                        ? 'border-gray-200 bg-gray-50 text-gray-500 font-bold' 
                                                        : 'border-gray-200 bg-white text-gray-900'
                                                    }`}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {isAuto ? (
                                                <div className="w-full py-1 bg-blue-50 border border-blue-100 rounded text-blue-700 font-bold text-center">
                                                    {data.qty}
                                                </div>
                                            ) : (
                                                <input 
                                                    type="number"
                                                    value={data.qty}
                                                    onChange={e => handleUpdateItem(item.id, 'qty', e.target.value)}
                                                    className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 text-center focus:border-blue-500 outline-none text-gray-900 font-bold"
                                                />
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-black text-gray-800">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.total)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-green-50 border-t border-green-100">
                            <tr>
                                <td colSpan={4} className="px-4 py-4 text-right text-sm font-bold text-green-700 uppercase">Total Geral Solicitado</td>
                                <td className="px-4 py-4 text-right text-lg font-black text-green-700">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeneral)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Alerta de Exceção Normativa — Valor Unitário de Refeição */}
            {mealExceedsLimit && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                            <AlertTriangle size={22} className="text-amber-700" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-black text-amber-800 uppercase tracking-wide mb-2">
                                ⚠ Exceção Normativa — Valor Unitário de Refeição
                            </h4>
                            <p className="text-xs text-amber-900 leading-relaxed mb-3">
                                O(s) valor(es) unitário(s) informado(s) excedem os limites estabelecidos pelas <strong>normas da SEFIN</strong>:
                            </p>
                            <div className="space-y-1.5 mb-3">
                                {mealsExceeding.map(m => (
                                    <div key={m.id} className="flex items-center gap-2 text-xs bg-amber-100/60 px-3 py-1.5 rounded border border-amber-200">
                                        <Utensils size={12} className="text-amber-700" />
                                        <span className="font-bold text-amber-800">{m.label}:</span>
                                        <span className="text-amber-700">
                                            R$ {m.actual.toFixed(2)} <span className="text-amber-500 font-normal">(máx permitido: R$ {m.limit.toFixed(2)})</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-white rounded-lg border border-amber-200 p-4 space-y-3">
                                <div className="flex items-start gap-2">
                                    <FileText size={14} className="text-amber-700 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-gray-700 leading-relaxed">
                                        É <strong>obrigatório</strong> anexar no <strong>Dossiê Digital</strong> um documento de justificativa explicando 
                                        a necessidade do valor unitário acima do estabelecido.
                                    </p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <UserCheck size={14} className="text-amber-700 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-gray-700 leading-relaxed">
                                        Essa justificativa deve ser <strong>atestada e assinada pelo magistrado responsável pela comarca</strong>.
                                    </p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Sparkles size={14} className="text-amber-700 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-gray-700 leading-relaxed">
                                        O suprido ou o magistrado pode elaborar essa justificativa através do botão 
                                        <strong className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 text-[10px] font-bold">
                                            <FileText size={10} /> Novo Documento
                                        </strong>
                                        disponível na tela do processo.
                                    </p>
                                </div>
                                <hr className="border-amber-100" />
                                <p className="text-[10px] text-amber-600 font-medium leading-relaxed">
                                    ⚡ Essa justificativa é <strong>fundamental</strong> para que o ordenador de despesa possa analisar a situação 
                                    e autorizar o que foi solicitado fora das regras estabelecidas pela SEFIN.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderStep3 = () => (
        <div className="animate-in fade-in slide-in-from-right-8 duration-300 space-y-6">
            
            {/* Resumo Financeiro Topo */}
            <div className="bg-[#1e293b] text-white p-6 rounded-xl shadow-lg border border-slate-700 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg">Resumo da Solicitação</h3>
                    <p className="text-gray-400 text-xs mt-1">Verifique os valores antes de assinar.</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Total Geral</p>
                    <p className={`text-3xl font-black tracking-tight ${totalGeneral > 15000 ? 'text-red-400' : ''}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeneral)}</p>
                </div>
            </div>

            {/* CNJ Limit Warning */}
            {totalGeneral > 15000 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-3">
                    <AlertTriangle size={20} className="text-red-500 shrink-0" />
                    <div>
                        <strong>Limite excedido!</strong> O valor total (R$ {totalGeneral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) ultrapassa o teto de R$ 15.000,00 estabelecido pela Resolução CNJ 169/2013.
                        Reduza os itens ou quantidades para prosseguir.
                    </div>
                </div>
            )}

            {/* Urgência e Gestor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Urgência da Solicitação</h4>
                    <div className="flex gap-2">
                        <button onClick={() => setUrgency('NORMAL')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all ${urgency === 'NORMAL' ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>Normal</button>
                        <button onClick={() => setUrgency('URGENTE')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all ${urgency === 'URGENTE' ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>Urgente</button>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Dados do Gestor (Aprovador)</h4>
                    <div className="space-y-3">
                        <div className="relative">
                            <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input type="text" value={managerName} onChange={e => setManagerName(e.target.value)} placeholder="Nome do Gestor" className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none" />
                        </div>
                        <input type="email" value={managerEmail} onChange={e => setManagerEmail(e.target.value)} placeholder="Email do Gestor" className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none" />
                    </div>
                </div>
            </div>

            {/* Justificativa */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
                        <Sparkles size={16} className="text-purple-600" /> Justificativa do Pedido
                    </h4>
                    <button 
                        onClick={handleGenerateAI}
                        disabled={isGeneratingAI}
                        className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-100 text-xs font-bold rounded-lg hover:bg-purple-100 flex items-center gap-2 transition-all shadow-sm"
                    >
                        {isGeneratingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        Gerar com IA
                    </button>
                </div>
                <textarea 
                    value={justification}
                    onChange={e => setJustification(e.target.value)}
                    rows={6}
                    className="w-full p-4 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-100 focus:border-purple-300 outline-none resize-none bg-gray-50 focus:bg-white leading-relaxed text-gray-900 transition-all"
                    placeholder="Descreva a necessidade da despesa..."
                />
            </div>

            {/* Assinatura */}
            <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 shadow-sm flex flex-col items-center text-center">
                <div className="mb-4 bg-white p-4 rounded-full shadow-sm border border-yellow-100">
                    <FileText size={24} className="text-yellow-600" />
                </div>
                <h4 className="text-base font-bold text-yellow-800 uppercase mb-1">
                    Assinatura Digital do Solicitante
                </h4>
                <p className="text-xs text-yellow-700 mb-6 max-w-lg leading-relaxed">
                    Declaro, sob as penas da lei, que as informações prestadas são verdadeiras e que os recursos serão utilizados exclusivamente para custeio das despesas de Júri listadas.
                </p>
                
                <div className="w-full max-w-md bg-white p-4 rounded-lg border border-dashed border-yellow-300 mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-700 font-bold text-sm">
                        {userName.charAt(0)}
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-gray-800 text-sm">{userName}</p>
                        <p className="text-xs text-gray-500">Matrícula: {userMatricula}</p>
                    </div>
                    <div className="ml-auto text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-100 flex items-center gap-1">
                        <CheckCircle2 size={10} /> Validado
                    </div>
                </div>

                <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting || !justification || totalGeneral > 15000}
                    className="w-full max-w-sm py-3.5 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl shadow-lg shadow-yellow-200 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                    Assinar e Enviar Solicitação
                </button>
            </div>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
            {/* Header Dark */}
            <div className="bg-[#0f172a] rounded-2xl p-8 mb-8 text-white relative overflow-hidden shadow-xl border border-slate-700">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10"><Scale size={24} /></div>
                            <h1 className="text-2xl font-bold tracking-tight">Nova Solicitação Extra-Júri</h1>
                        </div>
                        <p className="text-slate-400 text-sm max-w-lg">Wizard para solicitação de custeio de alimentação e logística de Júri.</p>
                    </div>
                    
                    {/* Steps Indicator */}
                    <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
                        {[
                            { id: 1, label: 'PESSOAS', icon: Users },
                            { id: 2, label: 'PROJEÇÃO', icon: DollarSign },
                            { id: 3, label: 'ASSINATURA', icon: FileText },
                        ].map(s => (
                            <button 
                                key={s.id} 
                                onClick={() => step > s.id ? setStep(s.id) : null}
                                disabled={step < s.id}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${step === s.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : step > s.id ? 'text-blue-400 hover:bg-slate-700' : 'text-slate-500 opacity-50 cursor-not-allowed'}`}
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
                            className="px-8 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            Próximo <ChevronRight size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
