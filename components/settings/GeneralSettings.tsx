import React, { useState, useEffect } from 'react';
import { Save, Database, AlertTriangle, Copy, CheckCircle2, Settings, MapPin, Scale, Loader2 } from 'lucide-react';
import { ComarcasSettings } from './ComarcasSettings';
import { supabase } from '../../lib/supabase';

type SubTab = 'system' | 'comarcas' | 'juri';

export const GeneralSettings: React.FC = () => {
    const [autoBackup, setAutoBackup] = useState(true);
    const [copied, setCopied] = useState(false);
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('system');
    const [loadingJuri, setLoadingJuri] = useState(false);
    const [savingJuri, setSavingJuri] = useState(false);
    const [juriSaveSuccess, setJuriSaveSuccess] = useState(false);

    // Júri Config State
    const [juriConfig, setJuriConfig] = useState({
        limit_servidor: 7,
        limit_defensor: 2,
        limit_promotor: 2,
        limit_policia: 5,
        price_lunch: 30.00,
        price_dinner: 30.00,
        price_snack: 11.00,
    });

    const copySQL = () => {
        const sql = `ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dperfil DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.profiles TO anon, authenticated, service_role;
GRANT SELECT ON public.dperfil TO anon, authenticated, service_role;`;
        navigator.clipboard.writeText(sql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Fetch Júri Config from Supabase
    useEffect(() => {
        if (activeSubTab === 'juri') {
            const fetchJuriConfig = async () => {
                setLoadingJuri(true);
                try {
                    const { data, error } = await supabase
                        .from('app_config')
                        .select('*')
                        .limit(1)
                        .maybeSingle();
                    
                    if (!error && data) {
                        setJuriConfig(prev => ({
                            ...prev,
                            limit_servidor: data.limit_servidor ?? prev.limit_servidor,
                            limit_defensor: data.limit_defensor ?? prev.limit_defensor,
                            limit_promotor: data.limit_promotor ?? prev.limit_promotor,
                            limit_policia: data.limit_policia ?? prev.limit_policia,
                            price_lunch: data.price_lunch ?? prev.price_lunch,
                            price_dinner: data.price_dinner ?? prev.price_dinner,
                            price_snack: data.price_snack ?? prev.price_snack,
                        }));
                    }
                } catch (err) {
                    console.error('Erro ao buscar config do júri:', err);
                } finally {
                    setLoadingJuri(false);
                }
            };
            fetchJuriConfig();
        }
    }, [activeSubTab]);

    const handleSaveJuriConfig = async () => {
        setSavingJuri(true);
        try {
            const { error } = await supabase
                .from('app_config')
                .upsert({
                    id: 1,
                    ...juriConfig,
                    updated_at: new Date().toISOString()
                });
            
            if (error) throw error;
            setJuriSaveSuccess(true);
            setTimeout(() => setJuriSaveSuccess(false), 3000);
        } catch (err) {
            console.error('Erro ao salvar config do júri:', err);
        } finally {
            setSavingJuri(false);
        }
    };

    const subTabs: { id: SubTab; label: string; icon: React.ElementType }[] = [
        { id: 'system', label: 'Sistema', icon: Settings },
        { id: 'comarcas', label: 'Comarcas', icon: MapPin },
        { id: 'juri', label: 'Júri', icon: Scale },
    ];

    const renderJuriSettings = () => {
        if (loadingJuri) {
            return (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
            );
        }

        const limitFields = [
            { key: 'limit_servidor', label: 'Servidores do Fórum', desc: 'Quantidade máxima de servidores por sessão' },
            { key: 'limit_defensor', label: 'Defensores Públicos', desc: 'Quantidade máxima de defensores por sessão' },
            { key: 'limit_promotor', label: 'Promotores', desc: 'Quantidade máxima de promotores por sessão' },
            { key: 'limit_policia', label: 'Policiais (Escolta)', desc: 'Acima deste limite, requer autorização do Ordenador' },
        ];

        const priceFields = [
            { key: 'price_lunch', label: 'Almoço (Vl. Unit.)', desc: 'Valor unitário padrão para refeição de almoço' },
            { key: 'price_dinner', label: 'Jantar (Vl. Unit.)', desc: 'Valor unitário padrão para refeição de jantar' },
            { key: 'price_snack', label: 'Lanche (Vl. Unit.)', desc: 'Valor unitário padrão para lanches' },
        ];

        return (
            <div className="space-y-8 max-w-3xl animate-in fade-in duration-300">
                {/* Section: Limites de Participantes */}
                <div>
                    <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Scale size={16} className="text-blue-600" /> Limites de Participantes
                    </h4>
                    <p className="text-xs text-slate-500 mb-4">
                        Configure a quantidade máxima de participantes por categoria em sessões de Júri.
                        Quando o número de <strong>policiais</strong> exceder o limite, o processo segue fluxo de exceção (AJSEFIN → Ordenador).
                    </p>
                    <div className="space-y-3">
                        {limitFields.map(field => (
                            <div key={field.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-colors">
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{field.label}</p>
                                    <p className="text-xs text-gray-500">{field.desc}</p>
                                </div>
                                <input
                                    type="number"
                                    min={0}
                                    value={(juriConfig as any)[field.key]}
                                    onChange={e => setJuriConfig(prev => ({ ...prev, [field.key]: parseInt(e.target.value) || 0 }))}
                                    className="w-20 py-2 px-3 border border-gray-200 rounded-lg text-center font-bold text-gray-800 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none bg-white"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section: Valores de Refeição */}
                <div>
                    <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Database size={16} className="text-emerald-600" /> Valores Padrão de Refeições (R$)
                    </h4>
                    <p className="text-xs text-slate-500 mb-4">
                        Valores unitários que servem como referência para cálculo automático na projeção de custos.
                        Valores acima destes limites geram alerta de exceção ao suprido.
                    </p>
                    <div className="space-y-3">
                        {priceFields.map(field => (
                            <div key={field.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-emerald-200 transition-colors">
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{field.label}</p>
                                    <p className="text-xs text-gray-500">{field.desc}</p>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min={0}
                                        value={(juriConfig as any)[field.key]}
                                        onChange={e => setJuriConfig(prev => ({ ...prev, [field.key]: parseFloat(e.target.value) || 0 }))}
                                        className="w-28 py-2 pl-8 pr-3 border border-gray-200 rounded-lg text-right font-bold text-gray-800 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none bg-white"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Save */}
                <div className="pt-4 flex items-center justify-between">
                    {juriSaveSuccess && (
                        <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold animate-in fade-in">
                            <CheckCircle2 size={16} /> Configurações salvas com sucesso!
                        </div>
                    )}
                    <div className="ml-auto">
                        <button 
                            onClick={handleSaveJuriConfig}
                            disabled={savingJuri}
                            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                            {savingJuri ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Salvar Configurações do Júri
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="animate-in fade-in duration-300">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800">Configurações Gerais</h3>
                <p className="text-sm text-gray-500 mt-1">Preferências globais do sistema.</p>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
                {subTabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeSubTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all ${
                                isActive
                                    ? 'bg-white text-blue-700 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Icon size={14} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            {activeSubTab === 'comarcas' ? (
                <ComarcasSettings />
            ) : activeSubTab === 'juri' ? (
                renderJuriSettings()
            ) : (
                <div className="space-y-6 max-w-3xl">
                    {/* Diagnóstico e Reparo */}
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-2 text-orange-800 font-bold">
                            <Database size={18} />
                            <h4>Diagnóstico e Reparo de Banco de Dados</h4>
                        </div>
                        <p className="text-xs text-orange-700 mb-4">
                            Se você estiver enfrentando erros de "Recursão Infinita" ou "Erro ao carregar equipe", execute o comando abaixo no painel do Supabase.
                        </p>
                        <div className="relative">
                            <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap border border-gray-700">
{`ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dperfil DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.profiles TO anon, authenticated, service_role;
GRANT SELECT ON public.dperfil TO anon, authenticated, service_role;`}
                            </pre>
                            <button 
                                onClick={copySQL}
                                className="absolute top-2 right-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded flex items-center gap-1 transition-colors shadow-sm"
                            >
                                {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                                {copied ? 'Copiado!' : 'Copiar SQL'}
                            </button>
                        </div>
                    </div>

                    {/* Configurações Gerais do Módulo */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Nome do Módulo</label>
                            <input 
                                type="text" 
                                defaultValue="SOSFU TJPA - Suprimento de Fundos" 
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div>
                                <p className="text-sm font-bold text-gray-800">Backup Automático</p>
                                <p className="text-xs text-gray-500">Realizar backup diário às 23:00.</p>
                            </div>
                            <button 
                                onClick={() => setAutoBackup(!autoBackup)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${autoBackup ? 'bg-blue-600' : 'bg-gray-300'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${autoBackup ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end">
                        <button className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-semibold shadow-sm hover:bg-emerald-700 transition-colors">
                            <Save size={18} />
                            Salvar Alterações
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};