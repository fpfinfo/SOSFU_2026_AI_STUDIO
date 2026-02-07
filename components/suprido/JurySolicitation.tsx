
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Users, Calendar, DollarSign, FileText, CheckCircle2, ChevronRight, ChevronLeft, Minus, Plus, AlertCircle, Save, Loader2, UserCheck, Scale } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { JuriExceptionInlineAlert } from '../ui/JuriExceptionInlineAlert';

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
    qty_approved: number; // Nova coluna
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


    // Configurações Dinâmicas (Valores padrão locais como Fallback)
    const [config, setConfig] = useState<AppConfig>({
        price_lunch: 30.00, 
        price_dinner: 30.00, 
        price_snack: 11.00,
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

    // Definição das Categorias com base no Config (Memoized para atualizar quando config muda)
    const categoriasPessoas: CategoriaPessoa[] = useMemo(() => [
        { id: 'servidor', label: 'Servidor do Fórum', max: config.limit_servidor },
        { id: 'reu', label: 'Réus', max: null },
        { id: 'jurado', label: 'Jurados', max: null }, 
        { id: 'testemunha', label: 'Testemunhas', max: null },
        { id: 'defensor', label: 'Defensor Público', max: config.limit_defensor },
        { id: 'promotor', label: 'Promotor', max: config.limit_promotor },
        { id: 'policia', label: 'Polícias (Escolta/Segurança)', max: config.limit_policia }
    ], [config]);

    // Definição Base dos Itens (Estrutura Completa)
    const itensBaseEstrutura = useMemo(() => [
        { id: 'almoco', label: 'Refeição - Almoço', type: 'AUTO', defaultElement: '3.3.90.30.01', defaultPrice: 0 },
        { id: 'jantar', label: 'Refeição - Jantar', type: 'AUTO', defaultElement: '3.3.90.30.01', defaultPrice: 0 },
        { id: 'lanche', label: 'Lanches', type: 'AUTO', defaultElement: '3.3.90.30.01', defaultPrice: 0 },
        { id: 'agua', label: 'Água Mineral 20L', type: 'MANUAL', defaultElement: '3.3.90.30.01', defaultPrice: 15.00 },
        { id: 'biscoito', label: 'Biscoito / Bolacha', type: 'MANUAL', defaultElement: '3.3.90.30.01', defaultPrice: 6.50 },
        { id: 'cafe', label: 'Café (Pó/Grão)', type: 'MANUAL', defaultElement: '3.3.90.30.01', defaultPrice: 22.00 },
        { id: 'acucar', label: 'Açúcar', type: 'MANUAL', defaultElement: '3.3.90.30.01', defaultPrice: 5.00 },
        { id: 'descartavel', label: 'Descartáveis', type: 'MANUAL', defaultElement: '3.3.90.30.21', defaultPrice: 50.00 },
        { id: 'expediente', label: 'Material de Expediente', type: 'MANUAL', defaultElement: '3.3.90.30.16', defaultPrice: 100.00 },
        { id: 'combustivel', label: 'Combustível', type: 'MANUAL', defaultElement: '3.3.90.30.02', defaultPrice: 0.00 },
        { id: 'fotocopia', label: 'Foto Cópia (Xerox)', type: 'MANUAL', defaultElement: '3.3.90.39.00', defaultPrice: 0.00 },
        { id: 'som', label: 'Serviço de Som', type: 'MANUAL', defaultElement: '3.3.90.39.00', defaultPrice: 0.00 },
        { id: 'locacao', label: 'Locação de Equipamentos Diversos', type: 'MANUAL', defaultElement: '3.3.90.39.00', defaultPrice: 0.00 },
        { id: 'outros', label: 'Outros:', type: 'MANUAL_EDIT', defaultElement: '3.3.90.30.01', defaultPrice: 0.00 },
    ], []);

    // ... (Efeitos e Inicialização mantidos iguais até o handleSubmit) ...
    // Inicialização (Fetch Config, User e Elementos)
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
                activeConfig = {
                    ...activeConfig,
                    price_lunch: data.price_lunch,
                    price_dinner: data.price_dinner,
                    price_snack: data.price_snack,
                    limit_servidor: data.limit_servidor,
                    limit_defensor: data.limit_defensor,
                    limit_promotor: data.limit_promotor,
                    limit_policia: data.limit_policia
                };
                setConfig(activeConfig);
            }
        } catch (err) {
            console.warn("Erro config:", err);
        }

        // Inicializa itens com base nos elementos
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

    // Recálculo Automático da Tabela (Itens AUTO)
    useEffect(() => {
        setItemsData((prev: Record<string, ItemData>) => {
            const next = { ...prev };
            
            // Lógica: Qtd = Total Pessoas * Frequencia
            if (next.almoco) {
                const item = { ...next.almoco };
                item.qty = totalPeople * freqLunch;
                item.total = item.qty * item.price;
                next.almoco = item;
            }
            if (next.jantar) {
                const item = { ...next.jantar };
                item.qty = totalPeople * freqDinner;
                item.total = item.qty * item.price;
                next.jantar = item;
            }
            if (next.lanche) {
                const item = { ...next.lanche };
                item.qty = totalPeople * freqSnack;
                item.total = item.qty * item.price;
                next.lanche = item;
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


    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não logado');

            const year = new Date().getFullYear();
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            const procNum = `TJPA-JUR-${year}/${randomNum}`;

            // Prepara items para salvar na tabela relacional
            const itemsToSave: any[] = [];
            let participantsText = `PARTICIPANTES DO JÚRI:\n`;

            // 1. Participantes
            categoriasPessoas.forEach(cat => {
                const qty = peopleCounts[cat.id] || 0;
                if (qty > 0) {
                    participantsText += `- ${cat.label}: ${qty}\n`;
                    itemsToSave.push({
                        category: 'PARTICIPANT',
                        item_name: cat.label,
                        qty_requested: qty,
                        qty_approved: 0 // Começa com 0 para a SOSFU aprovar
                    });
                }
            });

            // 2. Despesas
            let detailedItems = `PROJEÇÃO DE GASTOS (JÚRI):\n`;
            itensBaseEstrutura.forEach(item => {
                const d = itemsData[item.id];
                if (d && d.total > 0) {
                    const label = item.type === 'MANUAL_EDIT' && d.description ? d.description : item.label;
                    detailedItems += `${label} [ND: ${d.element}]: ${d.qty} x R$ ${d.price.toFixed(2)} = R$ ${d.total.toFixed(2)}\n`;
                    
                    itemsToSave.push({
                        category: 'EXPENSE',
                        item_name: label,
                        element_code: d.element,
                        qty_requested: d.qty,
                        unit_price_requested: d.price,
                        qty_approved: 0, // Começa com 0
                        unit_price_approved: d.price // Preço tende a ser mantido
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

            // B. Insere os Itens Relacionados
            if (itemsToSave.length > 0) {
                const itemsWithId = itemsToSave.map(i => ({ ...i, solicitation_id: solData.id }));
                const { error: itemsError } = await supabase.from('solicitation_items').insert(itemsWithId);
                if (itemsError) console.error("Erro ao salvar itens detalhados:", itemsError);
            }

            onNavigate('process_detail', solData.id);

        } catch (error: any) {
            console.error('Erro ao enviar: ' + error.message);
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

    // ... (restante do código de renderização permanece inalterado) ...
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

                <div className="space-y-4">
                    {categoriasPessoas.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:border-blue-100 transition-colors bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-gray-700">{cat.label}</span>
                                {cat.max !== null && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-bold">Máx: {cat.max}</span>}
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Qtd Solicitada</p>
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => setPeopleCounts(p => ({ ...p, [cat.id]: Math.max(0, (p[cat.id] || 0) - 1) }))}
                                            className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center transition-all"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className="w-8 text-center font-bold text-lg text-gray-800">{peopleCounts[cat.id] || 0}</span>
                                        <button 
                                            onClick={() => setPeopleCounts(p => ({ ...p, [cat.id]: (cat.max && (p[cat.id] || 0) >= cat.max) ? (p[cat.id] || 0) : (p[cat.id] || 0) + 1 }))}
                                            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                                                cat.max && (peopleCounts[cat.id] || 0) >= cat.max 
                                                ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed' 
                                                : 'bg-white border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300'
                                            }`}
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="text-center hidden sm:block opacity-50">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Qtd Aprovada</p>
                                    <div className="w-16 py-1.5 bg-gray-100 rounded text-gray-400 font-bold text-sm mx-auto">0</div>
                                </div>
                            </div>
                        </div>
                    ))}
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

            {/* Exception Alert for Police limit */}
            <JuriExceptionInlineAlert
                policiais={peopleCounts['policia'] || 0}
                userRole="USER"
            />
        </div>
    );

    const renderStep2 = () => (
        <div className="animate-in fade-in slide-in-from-right-8 duration-300 space-y-6">
            
            {/* Periodo */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-blue-600">
                    <Calendar size={20} />
                    <h3 className="font-bold text-sm uppercase">Período do Evento (Sessão de Júri)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Data Início</label>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={e => setStartDate(e.target.value)} 
                            className="w-full p-2.5 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none text-gray-900" 
                            style={{ colorScheme: 'light' }}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Data Fim</label>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={e => setEndDate(e.target.value)} 
                            className="w-full p-2.5 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none text-gray-900" 
                            style={{ colorScheme: 'light' }}
                        />
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2 flex flex-col justify-center items-center text-blue-700">
                        <span className="text-xs font-bold uppercase">Dias de Júri</span>
                        <span className="text-2xl font-bold">{daysCount} dia(s)</span>
                    </div>
                </div>
            </div>

            {/* Frequência */}
            <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-100">
                <div className="flex items-center gap-2 mb-4 text-yellow-700">
                    <AlertCircle size={20} />
                    <h3 className="font-bold text-sm uppercase">Painel de Frequência de Alimentação</h3>
                </div>
                <p className="text-xs text-yellow-600 mb-4">Defina quantas vezes cada refeição será servida <strong>por pessoa</strong> durante o evento.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { label: 'Almoços', val: freqLunch, set: setFreqLunch },
                        { label: 'Jantares', val: freqDinner, set: setFreqDinner },
                        { label: 'Lanches', val: freqSnack, set: setFreqSnack },
                    ].map((item, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-lg border border-yellow-200 shadow-sm flex flex-col items-center">
                            <span className="text-xs font-bold text-gray-500 uppercase mb-2">{item.label}</span>
                            <div className="flex items-center gap-4">
                                <button onClick={() => item.set(Math.max(0, item.val - 1))} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600">-</button>
                                <span className="text-xl font-bold text-gray-800 w-6 text-center">{item.val}</span>
                                <button onClick={() => item.set(item.val + 1)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600">+</button>
                            </div>
                            <span className="text-[10px] text-gray-400 mt-2">Total: {item.val * totalPeople} unid.</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Dados Processo */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-gray-600">
                    <Scale size={20} />
                    <h3 className="font-bold text-sm uppercase">Dados do Processo</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Comarca</label>
                        <input type="text" value={comarca} onChange={e => setComarca(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-100 outline-none text-gray-900" placeholder="Ex: Belém" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Número do Processo Judicial</label>
                        <input type="text" value={processNumber} onChange={e => setProcessNumber(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-100 outline-none text-gray-900" placeholder="0000000-00.0000.8.14.0000" />
                    </div>
                </div>
            </div>

            {/* Tabela de Itens */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="font-bold text-gray-800 text-sm uppercase">Itens da Projeção</h3>
                    <p className="text-xs text-gray-500">Quantidades de refeições calculadas automaticamente com base no painel acima. Outros itens são editáveis manualmente.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Descrição</th>
                                <th className="px-4 py-3 w-64">Elemento de Despesa</th>
                                <th className="px-4 py-3 w-28">Vl. Unit</th>
                                <th className="px-4 py-3 w-24 text-center">Qtd Solic.</th>
                                <th className="px-4 py-3 w-24 text-center text-gray-300">Qtd Aprov.</th>
                                <th className="px-4 py-3 w-32 text-right">Total Solic.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs">
                            {itensBaseEstrutura.map(item => {
                                const data = itemsData[item.id] || { element: '', price: 0, qty: 0, qty_approved: 0, total: 0 };
                                const isAuto = item.type === 'AUTO';
                                const isEditDesc = item.type === 'MANUAL_EDIT';

                                return (
                                    <tr key={item.id} className={data.total > 0 ? 'bg-blue-50/30' : 'hover:bg-gray-50'}>
                                        <td className="px-4 py-3 font-medium text-gray-700">
                                            <div className="flex items-center gap-2">
                                                {isEditDesc ? (
                                                    <div className="flex items-center gap-2 w-full">
                                                        <span>{item.label}</span>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Especificar item..." 
                                                            value={data.description || ''}
                                                            onChange={e => handleUpdateItem(item.id, 'description', e.target.value)}
                                                            className="flex-1 p-1 border border-gray-200 rounded text-xs bg-white text-gray-900 outline-none focus:border-blue-400"
                                                        />
                                                    </div>
                                                ) : (
                                                    <>
                                                        {item.label}
                                                        {isAuto && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">AUTO</span>}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <select 
                                                value={data.element}
                                                onChange={e => handleUpdateItem(item.id, 'element', e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 focus:border-blue-500 outline-none appearance-none cursor-pointer"
                                                style={{ backgroundImage: 'none' }} // Remove arrow default
                                            >
                                                <option value="">Selecione...</option>
                                                {elementosOptions.map(el => (
                                                    <option key={el.id} value={el.codigo}>
                                                        {el.codigo} - {el.descricao.replace('Material de Consumo - ', '').replace('Outros Serviços de Terceiros - ', '')}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="relative">
                                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400">R$</span>
                                                <input 
                                                    type="number" step="0.01"
                                                    value={data.price}
                                                    onChange={e => handleUpdateItem(item.id, 'price', e.target.value)}
                                                    className={`w-full bg-white border border-gray-200 rounded pl-6 pr-2 py-1 text-right focus:border-blue-500 outline-none text-gray-900 ${isAuto ? 'font-bold text-gray-500 bg-gray-50' : ''}`}
                                                    disabled={isAuto} 
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
                                                    className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-center focus:border-blue-500 outline-none text-gray-900 font-bold"
                                                />
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {/* Coluna Qtd Aprovada - Apenas Visualização/Placeholder na Criação */}
                                            <input 
                                                type="number"
                                                value={data.qty_approved}
                                                disabled
                                                className="w-full bg-gray-100 border border-gray-200 rounded px-2 py-1 text-center text-gray-400 cursor-not-allowed"
                                            />
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
                                <td colSpan={5} className="px-6 py-4 text-right text-sm font-bold text-green-700 uppercase">Total Geral Solicitado</td>
                                <td className="px-6 py-4 text-right text-lg font-black text-green-700">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeneral)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Exception Alerts for values and deadlines */}
            <JuriExceptionInlineAlert
                almocoValue={itemsData['almoco']?.price || 0}
                jantarValue={itemsData['jantar']?.price || 0}
                lancheValue={itemsData['lanche']?.price || 0}
                diasAteEvento={startDate ? Math.ceil((new Date(startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null}
                userRole="USER"
            />
        </div>
    );

    const renderStep3 = () => (
        <div className="animate-in fade-in slide-in-from-right-8 duration-300 space-y-6">
            {/* Resumo Financeiro */}
            <div className="bg-[#1e293b] text-white p-6 rounded-xl shadow-lg flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg">Resumo da Solicitação</h3>
                    <p className="text-gray-400 text-sm">Verifique os valores antes de assinar.</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-green-400 font-bold uppercase tracking-wider">Total Geral</p>
                    <p className="text-3xl font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeneral)}</p>
                </div>
            </div>

            {/* Urgência e Gestor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Urgência da Solicitação</h4>
                    <div className="flex gap-2">
                        <button onClick={() => setUrgency('NORMAL')} className={`flex-1 py-2 rounded-lg text-sm font-bold border ${urgency === 'NORMAL' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-500'}`}>Normal</button>
                        <button onClick={() => setUrgency('URGENTE')} className={`flex-1 py-2 rounded-lg text-sm font-bold border ${urgency === 'URGENTE' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200 text-gray-500'}`}>Urgente</button>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Dados do Gestor (Aprovador)</h4>
                    <div className="space-y-2">
                        <input type="text" value={managerName} onChange={e => setManagerName(e.target.value)} placeholder="Nome do Gestor" className="w-full p-2 border rounded-lg text-sm bg-gray-50 text-gray-900" />
                        <input type="email" value={managerEmail} onChange={e => setManagerEmail(e.target.value)} placeholder="Email do Gestor" className="w-full p-2 border rounded-lg text-sm bg-gray-50 text-gray-900" />
                    </div>
                </div>
            </div>

            {/* Justificativa */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                    <FileText size={16} /> Justificativa do Pedido
                </h4>
                <textarea 
                    value={justification}
                    onChange={e => setJustification(e.target.value)}
                    rows={6}
                    className="w-full p-4 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none resize-none bg-gray-50 leading-relaxed text-gray-900"
                    placeholder="Descreva a necessidade da despesa para custeio da sessão de júri..."
                />
            </div>

            {/* Assinatura */}
            <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 shadow-sm">
                <h4 className="text-sm font-bold text-yellow-800 uppercase mb-2 flex items-center gap-2">
                    <UserCheck size={16} /> Assinatura do Solicitante
                </h4>
                <div className="bg-white p-4 rounded-lg border border-yellow-100 flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-bold">
                        {userName.charAt(0)}
                    </div>
                    <div>
                        <p className="font-bold text-gray-800 text-sm">{userName}</p>
                        <p className="text-xs text-gray-500">Matrícula: {userMatricula}</p>
                    </div>
                </div>
                <p className="text-xs text-yellow-700 mb-4 leading-relaxed">
                    Declaro, sob as penas da lei, que as informações prestadas são verdadeiras e que os recursos serão utilizados exclusivamente para os fins descritos.
                </p>
                <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting || !justification}
                    className="w-full py-3 bg-yellow-600 text-white font-bold rounded-xl shadow-lg shadow-yellow-200 hover:bg-yellow-700 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                    Assinar e Enviar Solicitação
                </button>
            </div>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Dark */}
            <div className="bg-[#0f172a] rounded-2xl p-8 mb-8 text-white relative overflow-hidden shadow-xl">
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white/10 rounded-lg"><Scale size={24} /></div>
                            <h1 className="text-2xl font-bold">Nova Solicitação Extra-Júri</h1>
                        </div>
                        <p className="text-slate-400 text-sm max-w-lg">Preencha o wizard passo a passo para criar a solicitação.</p>
                    </div>
                    
                    {/* Steps Indicator */}
                    <div className="flex gap-4">
                        {[
                            { id: 1, label: 'PESSOAS', icon: Users },
                            { id: 2, label: 'PROJEÇÃO', icon: FileText },
                            { id: 3, label: 'JUSTIFICATIVA', icon: FileText },
                        ].map(s => (
                            <div key={s.id} className={`flex flex-col items-center gap-2 transition-all ${step === s.id ? 'opacity-100 scale-105' : 'opacity-40'}`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${step === s.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'bg-slate-800 text-slate-400'}`}>
                                    <s.icon size={18} />
                                </div>
                                <span className="text-[10px] font-bold tracking-wider">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="min-h-[400px]">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </div>

            {/* Navigation Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <button 
                        onClick={() => step === 1 ? onNavigate('suprido_dashboard') : setStep(s => s - 1)}
                        className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors flex items-center gap-2"
                    >
                        {step === 1 ? 'Cancelar' : <><ChevronLeft size={16} /> Voltar</>}
                    </button>

                    {step < 3 && (
                        <button 
                            onClick={() => setStep(s => s + 1)}
                            className="px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                        >
                            Próximo <ChevronRight size={16} />
                        </button>
                    )}
                </div>
            </div>
            
            {/* Spacer for fixed footer */}
            <div className="h-20"></div>
        </div>
    );
};
