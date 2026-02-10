
import React, { useState } from 'react';
import {
    DollarSign,
    Settings,
    Calendar,
    Loader2,
    Save,
    Check,
    AlertCircle,
    Info
} from 'lucide-react';

interface RessarcimentoParametersProps {
    darkMode?: boolean;
}

interface LimitesConfig {
    limite_compra_pequeno_vulte: number;
    limite_compra_obras: number;
    prazo_prestacao_contas_dias: number;
    antecedencia_minima_dias: number;
}

const DEFAULT_LIMITES: LimitesConfig = {
    limite_compra_pequeno_vulte: 17600.00,
    limite_compra_obras: 33000.00,
    prazo_prestacao_contas_dias: 30,
    antecedencia_minima_dias: 5,
};

export const RessarcimentoParameters: React.FC<RessarcimentoParametersProps> = ({ darkMode = false }) => {
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // State
    const [limites, setLimites] = useState<LimitesConfig>(DEFAULT_LIMITES);

    const cardClass = darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200';
    const inputClass = darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-200 text-slate-800';

    const handleSave = async () => {
        setSaving(true);
        setSaveMessage(null);
        try {
            await new Promise(resolve => setTimeout(resolve, 800));
            setSaveMessage({ type: 'success', text: 'Parâmetros atualizados com sucesso!' });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (err) {
            setSaveMessage({ type: 'error', text: 'Erro ao salvar.' });
        } finally {
            setSaving(false);
        }
    };

    const updateLimite = (key: keyof LimitesConfig, value: number) => {
        setLimites(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="space-y-6">
            {/* SAVE BAR */}
            <div className="flex justify-between items-center mb-2">
                 <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Info size={16} className="text-emerald-500" />
                    <span>Valores baseados na Lei de Licitações</span>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? 'Salvando...' : 'Salvar Parâmetros'}
                </button>
            </div>
            
            {saveMessage && (
                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                    saveMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700'
                }`}>
                    {saveMessage.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                    {saveMessage.text}
                </div>
            )}

            {/* CONTENT */}
            <div className={`rounded-xl border p-6 ${cardClass}`}>
                <div className="space-y-8">
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                            <DollarSign size={14} /> Tectos Financeiros (Suprimento de Fundos)
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">Limite Compras/Serviços (R$)</label>
                                <input type="number" step="0.01" value={limites.limite_compra_pequeno_vulte} onChange={e => updateLimite('limite_compra_pequeno_vulte', parseFloat(e.target.value))} className={`w-full px-3 py-2 rounded-lg border ${inputClass}`} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">Limite Obras/Engenharia (R$)</label>
                                <input type="number" step="0.01" value={limites.limite_compra_obras} onChange={e => updateLimite('limite_compra_obras', parseFloat(e.target.value))} className={`w-full px-3 py-2 rounded-lg border ${inputClass}`} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                            <Calendar size={14} /> Prazos e Períodos
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">Prazo Prest. Contas (Dias)</label>
                                <input type="number" value={limites.prazo_prestacao_contas_dias} onChange={e => updateLimite('prazo_prestacao_contas_dias', parseInt(e.target.value))} className={`w-full px-3 py-2 rounded-lg border ${inputClass}`} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">Antecedência Mín. Pedido (Dias)</label>
                                <input type="number" value={limites.antecedencia_minima_dias} onChange={e => updateLimite('antecedencia_minima_dias', parseInt(e.target.value))} className={`w-full px-3 py-2 rounded-lg border ${inputClass}`} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
