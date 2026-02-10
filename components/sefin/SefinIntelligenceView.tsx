import React, { useState, useMemo, useEffect } from 'react';
import {
    DollarSign, FileText, Wallet, TrendingUp, CheckCircle2,
    MapPin, Users, AlertTriangle, Target, ArrowRight,
    BarChart3, PieChart, Loader2, Building2, Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SefinIntelligenceViewProps {
    darkMode?: boolean;
}

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface BudgetMetrics {
    totalAllocated: number;
    totalCommitted: number;
    available: number;
    percentageUsed: number;
    projectedUsage: number;
    isOverBudgetRisk: boolean;
}

interface DistributionItem {
    name: string;
    value: number;
    count: number;
    percent: number;
}

export const SefinIntelligenceView: React.FC<SefinIntelligenceViewProps> = ({ darkMode = false }) => {
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState<any[]>([]);
    const [solicitationData, setSolicitationData] = useState<any[]>([]);

    useEffect(() => {
        fetchIntelligenceData();
    }, []);

    const fetchIntelligenceData = async () => {
        setLoading(true);
        try {
            const [tasksRes, solRes] = await Promise.all([
                supabase.from('sefin_signing_tasks').select('*'),
                supabase.from('solicitations').select('id, process_number, beneficiary, value, origin, created_at, status, element')
            ]);
            setTasks(tasksRes.data || []);
            setSolicitationData(solRes.data || []);
        } catch (err) {
            console.error('Intelligence fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Budget metrics using solicitation data
    const budgetMetrics: BudgetMetrics = useMemo(() => {
        const totalCommitted = solicitationData
            .filter(s => ['WAITING_SEFIN_SIGNATURE', 'WAITING_SOSFU_PAYMENT', 'PAID'].includes(s.status))
            .reduce((acc, s) => acc + (s.value || 0), 0);

        // Estimated annual allocation (can be configured)
        const totalAllocated = 5000000; // R$ 5M default
        const available = totalAllocated - totalCommitted;
        const percentageUsed = totalAllocated > 0 ? (totalCommitted / totalAllocated) * 100 : 0;
        const currentMonth = new Date().getMonth() + 1;
        const projectedUsage = (totalCommitted / currentMonth) * 12;
        const isOverBudgetRisk = projectedUsage > totalAllocated;

        return { totalAllocated, totalCommitted, available, percentageUsed, projectedUsage, isOverBudgetRisk };
    }, [solicitationData]);

    // Distribution by document type
    const byDocType: DistributionItem[] = useMemo(() => {
        const map: Record<string, { value: number; count: number }> = {};
        tasks.forEach(t => {
            const key = t.document_type || 'OUTROS';
            if (!map[key]) map[key] = { value: 0, count: 0 };
            map[key].value += t.value || 0;
            map[key].count++;
        });
        const total = Object.values(map).reduce((s, v) => s + v.value, 0);
        return Object.entries(map)
            .map(([name, data]) => ({
                name: getDocTypeName(name),
                value: data.value,
                count: data.count,
                percent: total > 0 ? (data.value / total) * 100 : 0
            }))
            .sort((a, b) => b.value - a.value);
    }, [tasks]);

    // Distribution by status
    const byStatus: DistributionItem[] = useMemo(() => {
        const map: Record<string, { value: number; count: number }> = {};
        tasks.forEach(t => {
            const key = t.status || 'UNKNOWN';
            if (!map[key]) map[key] = { value: 0, count: 0 };
            map[key].value += t.value || 0;
            map[key].count++;
        });
        const total = Object.values(map).reduce((s, v) => s + v.count, 0);
        return Object.entries(map)
            .map(([name, data]) => ({
                name: getStatusName(name),
                value: data.value,
                count: data.count,
                percent: total > 0 ? (data.count / total) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count);
    }, [tasks]);

    // Top beneficiaries
    const topBeneficiaries = useMemo(() => {
        const map: Record<string, { value: number; count: number }> = {};
        // Deduplicate by solicitation_id
        const seenSol = new Set<string>();
        solicitationData.forEach(s => {
            if (seenSol.has(s.id)) return;
            seenSol.add(s.id);
            const name = s.beneficiary || 'Não Informado';
            if (!map[name]) map[name] = { value: 0, count: 0 };
            map[name].value += s.value || 0;
            map[name].count++;
        });
        return Object.entries(map)
            .map(([name, data]) => ({ name, value: data.value, count: data.count }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
    }, [solicitationData]);

    // Monthly trend
    const monthlyTrend = useMemo(() => {
        const months: Record<string, number> = {};
        solicitationData.forEach(s => {
            const d = new Date(s.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            months[key] = (months[key] || 0) + (s.value || 0);
        });
        return Object.entries(months)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([month, value]) => ({
                month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                value
            }));
    }, [solicitationData]);

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        );
    }

    const cardBase = darkMode
        ? 'bg-slate-800 border-slate-700 text-white'
        : 'bg-white border-slate-200';

    return (
        <div className="p-6 space-y-8 pb-16 animate-in fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className={`text-xl font-black tracking-tight flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        <Target className="text-emerald-600" size={24} />
                        Inteligência Financeira
                    </h3>
                    <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Análise orçamentária e distribuição de gastos • Exercício 2026
                    </p>
                </div>
            </div>

            {/* Budget Alert */}
            {budgetMetrics.isOverBudgetRisk && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><AlertTriangle size={20} /></div>
                        <div>
                            <h4 className="font-bold text-amber-800 text-sm">Alerta de Previsão Orçamentária</h4>
                            <p className="text-xs text-amber-700">
                                Projeção anual: <span className="font-bold">{formatCurrency(budgetMetrics.projectedUsage)}</span> excederá a dotação.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Budget Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className={`p-6 rounded-2xl border shadow-sm relative overflow-hidden group ${cardBase}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><DollarSign size={64} className="text-blue-600" /></div>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Dotação 2026</p>
                    <h3 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{formatCurrency(budgetMetrics.totalAllocated)}</h3>
                    <p className={`text-[10px] font-bold mt-3 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Limite Aprovado LOA</p>
                </div>

                <div className={`p-6 rounded-2xl border shadow-sm relative overflow-hidden group ${cardBase}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><FileText size={64} className="text-amber-600" /></div>
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Valor Empenhado</p>
                    <h3 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{formatCurrency(budgetMetrics.totalCommitted)}</h3>
                    <div className="mt-3">
                        <div className="flex justify-between text-[10px] font-bold mb-1">
                            <span className="text-amber-600">{budgetMetrics.percentageUsed.toFixed(1)}% do Total</span>
                        </div>
                        <div className="w-full h-1.5 bg-amber-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${budgetMetrics.percentageUsed}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden group hover:shadow-2xl transition-shadow">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Wallet size={64} /></div>
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Saldo Disponível</p>
                    <h3 className="text-3xl font-black">{formatCurrency(budgetMetrics.available)}</h3>
                    <div className="mt-3 text-[10px] font-bold text-slate-400 flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-emerald-500" /> Livre para Execução
                    </div>
                </div>

                <div className={`p-6 rounded-2xl border shadow-sm relative overflow-hidden group ${cardBase}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><TrendingUp size={64} /></div>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Total de Documentos</p>
                    <h3 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{tasks.length}</h3>
                    <p className={`text-[10px] font-bold mt-3 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Assinaturas processadas</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Distribution by Type */}
                <div className={`p-6 rounded-2xl border shadow-sm ${cardBase}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <PieChart size={14} /> Por Tipo de Documento
                    </p>
                    <div className="space-y-3">
                        {byDocType.map((item, i) => (
                            <div key={i} className="group">
                                <div className="flex justify-between text-xs font-bold mb-1">
                                    <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>{item.name} ({item.count})</span>
                                    <span className={darkMode ? 'text-white' : 'text-slate-800'}>{formatCurrency(item.value)}</span>
                                </div>
                                <div className={`h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500 group-hover:bg-emerald-600" style={{ width: `${item.percent}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Distribution by Status */}
                <div className={`p-6 rounded-2xl border shadow-sm ${cardBase}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <BarChart3 size={14} /> Por Status
                    </p>
                    <div className="space-y-4">
                        {byStatus.map((item, i) => {
                            const statusColor = item.name === 'Assinado' ? 'bg-emerald-500' : item.name === 'Pendente' ? 'bg-amber-500' : 'bg-red-500';
                            return (
                                <div key={i}>
                                    <div className="flex justify-between items-center text-xs font-bold mb-1">
                                        <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>{item.name}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-white text-[10px] ${statusColor}`}>{item.count}</span>
                                    </div>
                                    <div className={`h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                        <div className={`h-full rounded-full transition-all duration-500 ${statusColor}`} style={{ width: `${item.percent}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Monthly Trend */}
                <div className={`p-6 rounded-2xl border shadow-sm ${cardBase}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Calendar size={14} /> Evolução Mensal
                    </p>
                    <div className="space-y-2">
                        {monthlyTrend.length > 0 ? (
                            monthlyTrend.slice(-6).map((m, i) => {
                                const maxVal = Math.max(...monthlyTrend.map(x => x.value));
                                const pct = maxVal > 0 ? (m.value / maxVal) * 100 : 0;
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className={`text-xs w-16 text-right ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{m.month}</span>
                                        <div className={`flex-1 h-5 rounded-lg overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                            <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-lg transition-all duration-500 flex items-center justify-end px-2"
                                                style={{ width: `${Math.max(pct, 5)}%` }}>
                                                <span className="text-[9px] font-bold text-white">{formatCurrency(m.value)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className={`text-sm text-center py-8 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Sem dados mensais</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Beneficiaries */}
            <div className={`p-6 rounded-2xl border shadow-sm ${cardBase}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <Users size={14} /> Ranking de Beneficiários (Maior Volume)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {topBeneficiaries.map((sup, i) => (
                        <div key={i} className={`flex items-center gap-3 p-3 rounded-xl transition-colors border border-transparent ${
                            darkMode ? 'hover:bg-slate-700 hover:border-slate-600' : 'hover:bg-slate-50 hover:border-slate-100'
                        }`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${
                                i < 3 ? 'bg-amber-100 text-amber-600' : darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
                            }`}>{i + 1}</div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-xs font-bold truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>{sup.name}</p>
                                <p className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{sup.count} processo(s)</p>
                            </div>
                            <span className="text-xs font-black text-emerald-600 whitespace-nowrap">{formatCurrency(sup.value)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

function getDocTypeName(type: string): string {
    switch (type) {
        case 'PORTARIA_SF': return 'Portaria SF';
        case 'CERTIDAO_REGULARIDADE': return 'Certidão';
        case 'NOTA_EMPENHO': return 'Nota de Empenho';
        case 'LIQUIDACAO': return 'Doc. Liquidação';
        case 'ORDEM_BANCARIA': return 'Ordem Bancária';
        default: return type;
    }
}

function getStatusName(status: string): string {
    switch (status) {
        case 'PENDING': return 'Pendente';
        case 'SIGNED': return 'Assinado';
        case 'REJECTED': return 'Devolvido';
        default: return status;
    }
}
