import React, { useState, useEffect } from 'react';
import { Save, DollarSign, Users, Utensils, Zap, Loader2, AlertCircle, Database, Copy, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const ParametersSettings: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error' | 'warning', text: string} | null>(null);
    const [missingTable, setMissingTable] = useState(false);
    const [copied, setCopied] = useState(false);
    
    const [config, setConfig] = useState({
        id: '',
        max_value_extraordinary: 15000,
        price_lunch: 30,
        price_dinner: 30,
        price_snack: 11,
        limit_servidor: 7,
        limit_defensor: 2,
        limit_promotor: 2,
        limit_policia: 5,
        maintenance_mode: false,
        version: 'v3.1.0'
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        setLoading(true);
        setMessage(null);
        setMissingTable(false);
        try {
            const { data, error } = await supabase
                .from('app_config')
                .select('*')
                .limit(1)
                .maybeSingle();
            
            if (error) {
                // Detecta se a tabela não existe
                if (error.code === '42P01' || error.message.includes('404') || error.message.includes('Could not find the table')) {
                    setMissingTable(true);
                    return;
                }
                throw error;
            }
            if (data) {
                setConfig(prev => ({
                    ...prev,
                    ...data // Sobrescreve com dados do banco, ignorando campos que removemos localmente
                }));
            }
        } catch (error: any) {
            console.error('Erro ao buscar configs:', error);
            setMessage({ type: 'error', text: 'Falha ao carregar parâmetros: ' + (error.message || 'Erro desconhecido') });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (missingTable) {
            setMessage({ type: 'error', text: 'Não é possível salvar: A tabela "app_config" não existe.' });
            return;
        }

        setSaving(true);
        setMessage(null);
        try {
            // Get current user for audit
            const { data: { user } } = await supabase.auth.getUser();
            const payload = {
                max_value_extraordinary: config.max_value_extraordinary,
                price_lunch: config.price_lunch,
                price_dinner: config.price_dinner,
                price_snack: config.price_snack,
                limit_servidor: config.limit_servidor,
                limit_defensor: config.limit_defensor,
                limit_promotor: config.limit_promotor,
                limit_policia: config.limit_policia,
                maintenance_mode: config.maintenance_mode,
                updated_at: new Date().toISOString(),
                updated_by: user?.id || null,
            };

            // Verifica se temos um ID para atualizar, se não, tenta criar
            if (!config.id) {
                 const { data, error: insertError } = await supabase
                    .from('app_config')
                    .insert([payload])
                    .select()
                    .single();
                 
                 if (insertError) throw insertError;
                 if (data) setConfig(data);
            } else {
                const { error } = await supabase
                    .from('app_config')
                    .update(payload)
                    .eq('id', config.id);

                if (error) throw error;
            }
            setMessage({ type: 'success', text: 'Parâmetros atualizados com sucesso!' });
        } catch (error: any) {
            console.error('Erro ao salvar:', error);
            setMessage({ type: 'error', text: 'Erro ao salvar: ' + (error.message || 'Verifique se a tabela app_config existe.') });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const copySQL = () => {
        const sql = `CREATE TABLE IF NOT EXISTS public.app_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id),
  max_value_extraordinary NUMERIC(10,2) DEFAULT 15000.00,
  price_lunch NUMERIC(10,2) DEFAULT 30.00,
  price_dinner NUMERIC(10,2) DEFAULT 30.00,
  price_snack NUMERIC(10,2) DEFAULT 11.00,
  limit_servidor INTEGER DEFAULT 7,
  limit_defensor INTEGER DEFAULT 2,
  limit_promotor INTEGER DEFAULT 2,
  limit_policia INTEGER DEFAULT 5,
  maintenance_mode BOOLEAN DEFAULT FALSE,
  version TEXT DEFAULT 'v3.1.0-beta'
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Configurações visíveis para todos" ON public.app_config FOR SELECT USING (true);
CREATE POLICY "SOSFU atualiza configurações" ON public.app_config FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles p JOIN public.dperfil dp ON p.perfil_id = dp.id WHERE p.id = auth.uid() AND dp.slug IN ('ADMIN', 'SOSFU')));
INSERT INTO public.app_config (max_value_extraordinary) SELECT 15000.00 WHERE NOT EXISTS (SELECT 1 FROM public.app_config);`;
        
        navigator.clipboard.writeText(sql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

    return (
        <div className="animate-in fade-in duration-300 pb-10">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h3 className="text-xl font-bold text-gray-800">Parâmetros Globais</h3>
                    <p className="text-sm text-gray-500 mt-1">Defina os limites e regras de negócio do sistema</p>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={saving || missingTable}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Salvar Alterações
                </button>
            </div>

            {/* Painel de Correção de Erro de Tabela */}
            {missingTable && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8 animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="text-red-600" size={24} />
                        <h4 className="text-lg font-bold text-red-800">Banco de Dados Não Inicializado</h4>
                    </div>
                    <p className="text-sm text-red-700 mb-4">
                        A tabela de configurações <code>public.app_config</code> não foi encontrada no seu projeto Supabase. 
                        Para corrigir, copie o código SQL abaixo e execute no <strong>SQL Editor</strong> do painel do Supabase.
                    </p>
                    <div className="relative bg-gray-900 rounded-lg p-4 font-mono text-xs text-gray-300 overflow-x-auto border border-gray-700">
                        <button 
                            onClick={copySQL}
                            className="absolute top-3 right-3 p-2 bg-gray-800 hover:bg-gray-700 rounded-md text-white transition-colors flex items-center gap-2"
                        >
                            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                            {copied ? 'Copiado!' : 'Copiar SQL'}
                        </button>
                        <pre className="whitespace-pre-wrap">
{`CREATE TABLE IF NOT EXISTS public.app_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id),
  max_value_extraordinary NUMERIC(10,2) DEFAULT 15000.00,
  -- ... outros campos ...
  version TEXT DEFAULT 'v3.1.0'
);
-- Permissões
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Configurações visíveis para todos" ON public.app_config FOR SELECT USING (true);
-- Seed Inicial
INSERT INTO public.app_config (max_value_extraordinary) SELECT 15000.00 WHERE NOT EXISTS (SELECT 1 FROM public.app_config);`}
                        </pre>
                    </div>
                </div>
            )}

            {message && (
                <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 text-sm font-medium border ${
                    message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 
                    message.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border-yellow-100' :
                    'bg-red-50 text-red-700 border-red-100'
                }`}>
                    {message.type === 'warning' ? <Database size={20} className="flex-shrink-0" /> : <AlertCircle size={20} className="flex-shrink-0" />}
                    <span>{message.text}</span>
                </div>
            )}

            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${missingTable ? 'opacity-50 pointer-events-none' : ''}`}>
                
                {/* 1. Limites Financeiros */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                            <DollarSign size={20} />
                        </div>
                        <h4 className="font-bold text-gray-800">Limites Financeiros</h4>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Limite Máximo (Extraordinário)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                                <input 
                                    type="number" 
                                    value={config.max_value_extraordinary}
                                    onChange={(e) => handleChange('max_value_extraordinary', parseFloat(e.target.value))}
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">Conforme Resolução nº 169/2013 CNJ</p>
                        </div>
                    </div>
                </div>

                {/* 2. Limites de Alimentação */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                            <Utensils size={20} />
                        </div>
                        <h4 className="font-bold text-gray-800">Limites de Alimentação (Unitário)</h4>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Almoço</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
                                <input 
                                    type="number" 
                                    value={config.price_lunch}
                                    onChange={(e) => handleChange('price_lunch', parseFloat(e.target.value))}
                                    className="w-full pl-8 pr-2 py-2 bg-white border border-gray-200 rounded-lg font-bold text-gray-900 focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Jantar</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
                                <input 
                                    type="number" 
                                    value={config.price_dinner}
                                    onChange={(e) => handleChange('price_dinner', parseFloat(e.target.value))}
                                    className="w-full pl-8 pr-2 py-2 bg-white border border-gray-200 rounded-lg font-bold text-gray-900 focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Lanche</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
                                <input 
                                    type="number" 
                                    value={config.price_snack}
                                    onChange={(e) => handleChange('price_snack', parseFloat(e.target.value))}
                                    className="w-full pl-8 pr-2 py-2 bg-white border border-gray-200 rounded-lg font-bold text-gray-900 focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Limites de Pessoal */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center">
                            <Users size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800">Limites de Pessoal (Júri)</h4>
                            <p className="text-xs text-gray-500">Defina os tetos máximos por categoria</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Servidores</label>
                            <input 
                                type="number" 
                                value={config.limit_servidor}
                                onChange={(e) => handleChange('limit_servidor', parseInt(e.target.value))}
                                className="w-full py-2 bg-white border border-gray-200 rounded-lg font-bold text-gray-900 text-center focus:border-blue-500 outline-none"
                            />
                            <p className="text-[9px] text-gray-400 mt-1">Servidor do Fórum</p>
                        </div>
                        <div className="text-center">
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Defensor</label>
                            <input 
                                type="number" 
                                value={config.limit_defensor}
                                onChange={(e) => handleChange('limit_defensor', parseInt(e.target.value))}
                                className="w-full py-2 bg-white border border-gray-200 rounded-lg font-bold text-gray-900 text-center focus:border-blue-500 outline-none"
                            />
                            <p className="text-[9px] text-gray-400 mt-1">Defensor Público</p>
                        </div>
                        <div className="text-center">
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Promotor</label>
                            <input 
                                type="number" 
                                value={config.limit_promotor}
                                onChange={(e) => handleChange('limit_promotor', parseInt(e.target.value))}
                                className="w-full py-2 bg-white border border-gray-200 rounded-lg font-bold text-gray-900 text-center focus:border-blue-500 outline-none"
                            />
                            <p className="text-[9px] text-gray-400 mt-1">Ministério Público</p>
                        </div>
                        <div className="text-center">
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Policiais</label>
                            <input 
                                type="number" 
                                value={config.limit_policia}
                                onChange={(e) => handleChange('limit_policia', parseInt(e.target.value))}
                                className="w-full py-2 bg-white border border-gray-200 rounded-lg font-bold text-gray-900 text-center focus:border-blue-500 outline-none"
                            />
                            <p className="text-[9px] text-gray-400 mt-1">Escolta e Segurança</p>
                        </div>
                    </div>
                </div>

                {/* 4. Controle do Sistema */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center">
                            <Zap size={20} />
                        </div>
                        <h4 className="font-bold text-gray-800">Controle do Sistema</h4>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div>
                                <p className="text-sm font-bold text-gray-800">Modo de Manutenção</p>
                                <p className="text-xs text-gray-500">Bloqueia acesso para usuários não-admin</p>
                            </div>
                            <button 
                                onClick={() => handleChange('maintenance_mode', !config.maintenance_mode)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${config.maintenance_mode ? 'bg-blue-600' : 'bg-gray-300'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${config.maintenance_mode ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div className="p-4 bg-teal-50 rounded-lg border border-teal-100">
                            <p className="text-[10px] font-bold text-teal-600 uppercase mb-1">BUILD INFO</p>
                            <div className="flex justify-between text-xs text-teal-800">
                                <span>Versão:</span>
                                <span className="font-mono">{config.version}</span>
                            </div>
                            <div className="flex justify-between text-xs text-teal-800 mt-1">
                                <span>Environment:</span>
                                <span className="font-mono">{process.env.SUPABASE_URL ? 'Custom Environment' : 'Production (Demo)'}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
