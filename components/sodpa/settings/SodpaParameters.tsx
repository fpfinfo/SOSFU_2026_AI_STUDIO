
import React, { useState } from 'react';
import {
    DollarSign,
    Settings,
    MapPin,
    Calendar,
    Plane,
    Plus,
    Trash2,
    Building,
    Check,
    AlertCircle,
    Loader2,
    Save,
    Info
} from 'lucide-react';

interface SodpaParametersProps {
    darkMode?: boolean;
}

// ════════════════════════════════════════════════════════════════════════════════
// TYPES & DEFAULTS
// ════════════════════════════════════════════════════════════════════════════════

interface DiariasRate {
    cargo: string;
    cargoLabel: string;
    nacional: number;
    internacional: number;
}

interface LimitesConfig {
    max_dias_viagem: number;
    antecedencia_minima_dias: number;
    prazo_prestacao_contas_dias: number;
    valor_maximo_passagem: number;
    requer_aprovacao_acima: number;
    permite_classe_executiva_acima_horas: number;
}

interface DestinoFrequente {
    id: string;
    cidade: string;
    uf: string;
    aeroporto?: string;
    codigo_iata?: string;
}

const DEFAULT_DIARIAS_RATES: DiariasRate[] = [
    { cargo: 'DESEMBARGADOR', cargoLabel: 'Desembargador', nacional: 680.00, internacional: 450.00 },
    { cargo: 'JUIZ_TITULAR', cargoLabel: 'Juiz Titular', nacional: 578.00, internacional: 382.50 },
    { cargo: 'JUIZ_SUBSTITUTO', cargoLabel: 'Juiz Substituto', nacional: 510.00, internacional: 337.00 },
    { cargo: 'SERVIDOR_EFETIVO', cargoLabel: 'Servidor Efetivo', nacional: 247.00, internacional: 163.00 },
    { cargo: 'SERVIDOR_COMISSIONADO', cargoLabel: 'Servidor Comissionado', nacional: 247.00, internacional: 163.00 },
    { cargo: 'ESTAGIARIO', cargoLabel: 'Estagiário', nacional: 123.50, internacional: 81.50 },
];

const DEFAULT_LIMITES: LimitesConfig = {
    max_dias_viagem: 30,
    antecedencia_minima_dias: 5,
    prazo_prestacao_contas_dias: 10,
    valor_maximo_passagem: 5000.00,
    requer_aprovacao_acima: 10000.00,
    permite_classe_executiva_acima_horas: 8,
};

const DEFAULT_DESTINOS: DestinoFrequente[] = [
    { id: '1', cidade: 'Brasília', uf: 'DF', aeroporto: 'Aeroporto Internacional de Brasília', codigo_iata: 'BSB' },
    { id: '2', cidade: 'São Paulo', uf: 'SP', aeroporto: 'Aeroporto de Congonhas', codigo_iata: 'CGH' },
    { id: '3', cidade: 'São Paulo', uf: 'SP', aeroporto: 'Aeroporto de Guarulhos', codigo_iata: 'GRU' },
    { id: '4', cidade: 'Rio de Janeiro', uf: 'RJ', aeroporto: 'Santos Dumont', codigo_iata: 'SDU' },
    { id: '5', cidade: 'Rio de Janeiro', uf: 'RJ', aeroporto: 'Galeão', codigo_iata: 'GIG' },
    { id: '6', cidade: 'Manaus', uf: 'AM', aeroporto: 'Eduardo Gomes', codigo_iata: 'MAO' },
];

export const SodpaParameters: React.FC<SodpaParametersProps> = ({ darkMode = false }) => {
    const [activeTab, setActiveTab] = useState<'diarias' | 'limites' | 'destinos'>('diarias');
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // State
    const [diariasRates, setDiariasRates] = useState<DiariasRate[]>(DEFAULT_DIARIAS_RATES);
    const [limites, setLimites] = useState<LimitesConfig>(DEFAULT_LIMITES);
    const [destinos, setDestinos] = useState<DestinoFrequente[]>(DEFAULT_DESTINOS);
    const [newDestino, setNewDestino] = useState<Partial<DestinoFrequente>>({});

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

    const updateDiariasRate = (cargo: string, field: 'nacional' | 'internacional', value: number) => {
        setDiariasRates(prev => prev.map(r => r.cargo === cargo ? { ...r, [field]: value } : r));
    };

    const updateLimite = (key: keyof LimitesConfig, value: number) => {
        setLimites(prev => ({ ...prev, [key]: value }));
    };

    const addDestino = () => {
        if (!newDestino.cidade || !newDestino.uf) return;
        setDestinos(prev => [...prev, {
            id: Date.now().toString(),
            cidade: newDestino.cidade!,
            uf: newDestino.uf!,
            aeroporto: newDestino.aeroporto,
            codigo_iata: newDestino.codigo_iata,
        }]);
        setNewDestino({});
    };

    const removeDestino = (id: string) => {
        setDestinos(prev => prev.filter(d => d.id !== id));
    };

    return (
        <div className="space-y-6">
            {/* SUB-HEADER & TABS */}
            <div className={`p-1 rounded-xl flex gap-1 ${darkMode ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                {[
                    { id: 'diarias', label: 'Tabela de Diárias', icon: <DollarSign size={16} /> },
                    { id: 'limites', label: 'Limites e Regras', icon: <Settings size={16} /> },
                    { id: 'destinos', label: 'Destinos Frequentes', icon: <MapPin size={16} /> }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            activeTab === tab.id
                                ? 'bg-white shadow-sm text-sky-700'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-black/5'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* SAVE BAR */}
            <div className="flex justify-end mb-2">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white text-sm font-bold rounded-lg hover:bg-sky-700 transition-colors shadow-sm disabled:opacity-50"
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
                
                {/* DIARIAS */}
                {activeTab === 'diarias' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Info size={18} className="text-sky-500" />
                            <p className="text-sm text-slate-500">Valores base definidos pela Resolução CNJ nº 73/2009.</p>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-slate-400 uppercase text-xs tracking-wider text-left border-b border-slate-100">
                                    <th className="pb-3 pl-2">Cargo / Função</th>
                                    <th className="pb-3 text-right">Nacional (R$)</th>
                                    <th className="pb-3 text-right pr-2">Internacional (USD)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {diariasRates.map(rate => (
                                    <tr key={rate.cargo} className="hover:bg-slate-50/50">
                                        <td className="py-3 pl-2 font-medium">{rate.cargoLabel}</td>
                                        <td className="py-3 text-right">
                                            <input
                                                id={`nacional-${rate.cargo}`}
                                                type="number"
                                                value={rate.nacional}
                                                onChange={e => updateDiariasRate(rate.cargo, 'nacional', parseFloat(e.target.value))}
                                                className={`w-28 text-right px-2 py-1.5 rounded border text-sm ${inputClass}`}
                                                aria-label={`Valor nacional para ${rate.cargoLabel}`}
                                            />
                                        </td>
                                        <td className="py-3 text-right pr-2">
                                            <input
                                                id={`internacional-${rate.cargo}`}
                                                type="number"
                                                value={rate.internacional}
                                                onChange={e => updateDiariasRate(rate.cargo, 'internacional', parseFloat(e.target.value))}
                                                className={`w-28 text-right px-2 py-1.5 rounded border text-sm ${inputClass}`}
                                                aria-label={`Valor internacional para ${rate.cargoLabel}`}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* LIMITES */}
                {activeTab === 'limites' && (
                    <div className="space-y-8">
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                                <Calendar size={14} /> Prazos e Períodos
                            </h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="max_dias_viagem" className="block text-xs font-bold text-slate-500 mb-1.5">Max. Dias / Viagem</label>
                                    <input id="max_dias_viagem" type="number" value={limites.max_dias_viagem} onChange={e => updateLimite('max_dias_viagem', parseInt(e.target.value))} className={`w-full px-3 py-2 rounded-lg border ${inputClass}`} />
                                </div>
                                <div>
                                    <label htmlFor="antecedencia_minima_dias" className="block text-xs font-bold text-slate-500 mb-1.5">Antecedência Mín. (Dias)</label>
                                    <input id="antecedencia_minima_dias" type="number" value={limites.antecedencia_minima_dias} onChange={e => updateLimite('antecedencia_minima_dias', parseInt(e.target.value))} className={`w-full px-3 py-2 rounded-lg border ${inputClass}`} />
                                </div>
                                <div>
                                    <label htmlFor="prazo_prestacao_contas_dias" className="block text-xs font-bold text-slate-500 mb-1.5">Prazo Prest. Contas</label>
                                    <input id="prazo_prestacao_contas_dias" type="number" value={limites.prazo_prestacao_contas_dias} onChange={e => updateLimite('prazo_prestacao_contas_dias', parseInt(e.target.value))} className={`w-full px-3 py-2 rounded-lg border ${inputClass}`} />
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                                <DollarSign size={14} /> Tectos Financeiros
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="valor_maximo_passagem" className="block text-xs font-bold text-slate-500 mb-1.5">Valor Máx. Passagem (R$)</label>
                                    <input id="valor_maximo_passagem" type="number" step="0.01" value={limites.valor_maximo_passagem} onChange={e => updateLimite('valor_maximo_passagem', parseFloat(e.target.value))} className={`w-full px-3 py-2 rounded-lg border ${inputClass}`} />
                                </div>
                                <div>
                                    <label htmlFor="requer_aprovacao_acima" className="block text-xs font-bold text-slate-500 mb-1.5">Aprovação Especial Acima De (R$)</label>
                                    <input id="requer_aprovacao_acima" type="number" step="0.01" value={limites.requer_aprovacao_acima} onChange={e => updateLimite('requer_aprovacao_acima', parseFloat(e.target.value))} className={`w-full px-3 py-2 rounded-lg border ${inputClass}`} />
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                                <Plane size={14} /> Política de Viagem
                            </h4>
                            <div>
                                <label htmlFor="permite_classe_executiva_acima_horas" className="block text-xs font-bold text-slate-500 mb-1.5">Permite Classe Executiva (Voos acima de X horas)</label>
                                <input id="permite_classe_executiva_acima_horas" type="number" value={limites.permite_classe_executiva_acima_horas} onChange={e => updateLimite('permite_classe_executiva_acima_horas', parseInt(e.target.value))} className={`w-full px-3 py-2 rounded-lg border ${inputClass}`} />
                            </div>
                        </div>
                    </div>
                )}

                {/* DESTINOS */}
                {activeTab === 'destinos' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-12 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="col-span-3">
                                <input id="new-destino-cidade" placeholder="Cidade" aria-label="Cidade do destino" value={newDestino.cidade || ''} onChange={e => setNewDestino({...newDestino, city: e.target.value})} className={`w-full px-3 py-2 rounded border text-sm ${inputClass}`} />
                            </div>
                            <div className="col-span-2">
                                <input id="new-destino-uf" placeholder="UF" aria-label="UF do destino" maxLength={2} value={newDestino.uf || ''} onChange={e => setNewDestino({...newDestino, uf: e.target.value.toUpperCase()})} className={`w-full px-3 py-2 rounded border text-sm ${inputClass}`} />
                            </div>
                            <div className="col-span-3">
                                <input id="new-destino-aeroporto" placeholder="Aeroporto" aria-label="Nome do aeroporto" value={newDestino.aeroporto || ''} onChange={e => setNewDestino({...newDestino, aeroporto: e.target.value})} className={`w-full px-3 py-2 rounded border text-sm ${inputClass}`} />
                            </div>
                            <div className="col-span-2">
                                <input id="new-destino-iata" placeholder="IATA" aria-label="Código IATA" maxLength={3} value={newDestino.codigo_iata || ''} onChange={e => setNewDestino({...newDestino, codigo_iata: e.target.value.toUpperCase()})} className={`w-full px-3 py-2 rounded border text-sm ${inputClass}`} />
                            </div>
                            <div className="col-span-2">
                                <button onClick={addDestino} disabled={!newDestino.cidade} className="w-full h-full bg-sky-600 text-white rounded font-bold text-xs hover:bg-sky-700 disabled:opacity-50">Adicionar</button>
                            </div>
                        </div>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {destinos.map(dest => (
                                <div key={dest.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-sky-100 text-sky-600 flex items-center justify-center">
                                            <MapPin size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{dest.cidade}/{dest.uf}</p>
                                            <p className="text-xs text-slate-500">{dest.aeroporto} {dest.codigo_iata && `(${dest.codigo_iata})`}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => removeDestino(dest.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
