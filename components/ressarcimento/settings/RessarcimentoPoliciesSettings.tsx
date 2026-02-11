import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
    Settings, Save, ShieldCheck, AlertCircle, 
    DollarSign, Calendar, CheckCircle2, RefreshCw,
    Info, Trash2, Plus
} from 'lucide-react';

interface Policy {
    id: string;
    categoria: string;
    limite_valor: number;
    prazo_dias_validade: number;
    requer_aprovacao_gestor: boolean;
    ativo: boolean;
}

export const RessarcimentoPoliciesSettings: React.FC = () => {
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    useEffect(() => {
        fetchPolicies();
    }, []);

    const fetchPolicies = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('ressarcimento_policies')
                .select('*')
                .order('categoria');
            
            if (error) throw error;
            setPolicies(data || []);
        } catch (err: any) {
            console.error('Erro ao carregar políticas:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePolicy = (id: string, field: keyof Policy, value: any) => {
        setPolicies(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const savePolicies = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const { error } = await supabase
                .from('ressarcimento_policies')
                .upsert(policies);

            if (error) throw error;
            setMessage({ type: 'success', text: 'Políticas atualizadas com sucesso!' });
            fetchPolicies();
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Erro ao salvar: ' + err.message });
        } finally {
            setSaving(false);
        }
    };

    const addNewPolicy = () => {
        const newPol: Policy = {
            id: crypto.randomUUID(),
            categoria: 'NOVA_CATEGORIA',
            limite_valor: 0,
            prazo_dias_validade: 90,
            requer_aprovacao_gestor: true,
            ativo: true
        };
        setPolicies([...policies, newPol]);
    };

    if (loading) return (
        <div className="flex justify-center p-12">
            <RefreshCw className="animate-spin text-teal-600" size={32} />
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Settings className="text-teal-600" size={24} />
                        Parametrização de Políticas
                    </h2>
                    <p className="text-sm text-slate-500">Configure limites e regras de negócio para o módulo de Ressarcimento.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={addNewPolicy}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-200 transition-colors"
                    >
                        <Plus size={18} /> Nova Política
                    </button>
                    <button 
                        onClick={savePolicies}
                        disabled={saving}
                        className="px-6 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-teal-700 shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                        {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                        Salvar Alterações
                    </button>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 ${
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="text-sm font-medium">{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {policies.map(policy => (
                    <div key={policy.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-teal-200 transition-all group">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categoria</label>
                                <input 
                                    className="w-full text-sm font-bold text-slate-700 border-none p-0 focus:ring-0 uppercase"
                                    value={policy.categoria}
                                    onChange={e => handleUpdatePolicy(policy.id, 'categoria', e.target.value.toUpperCase())}
                                />
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <DollarSign size={10} /> Limite de Valor
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 text-sm">R$</span>
                                    <input 
                                        type="number"
                                        className="w-full text-sm font-bold text-slate-700 border-b border-slate-100 focus:border-teal-500 focus:ring-0 p-0"
                                        value={policy.limite_valor}
                                        onChange={e => handleUpdatePolicy(policy.id, 'limite_valor', parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <Calendar size={10} /> Validade (Dias)
                                </label>
                                <input 
                                    type="number"
                                    className="w-full text-sm font-bold text-slate-700 border-b border-slate-100 focus:border-teal-500 focus:ring-0 p-0"
                                    value={policy.prazo_dias_validade}
                                    onChange={e => handleUpdatePolicy(policy.id, 'prazo_dias_validade', parseInt(e.target.value))}
                                />
                            </div>

                            <div className="flex items-center justify-end gap-6 text-sm">
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={policy.requer_aprovacao_gestor} 
                                            onChange={e => handleUpdatePolicy(policy.id, 'requer_aprovacao_gestor', e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                        />
                                        <span className="text-slate-600 font-medium">Aprovação Gestor</span>
                                    </label>
                                </div>
                                <div className="flex items-center gap-2 border-l pl-6">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={policy.ativo} 
                                            onChange={e => handleUpdatePolicy(policy.id, 'ativo', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                                        <span className="ml-2 text-slate-600 font-medium">{policy.ativo ? 'Ativo' : 'Inativo'}</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start gap-3">
                <Info size={20} className="text-amber-600 mt-0.5" />
                <div className="text-xs text-amber-800 leading-relaxed">
                    <p className="font-bold mb-1">Nota importante:</p>
                    As alterações nas políticas afetam apenas novas solicitações. Solicitações já enviadas mantêm as regras vigentes no momento do envio para garantir a integridade dos processos históricos.
                </div>
            </div>
        </div>
    );
};
