import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    BarChart3, 
    Calendar, 
    ChevronRight, 
    FileSpreadsheet, 
    Filter, 
    Search,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    Building,
    User,
    Tag,
    RefreshCw,
    CheckCircle2,
    Timer
} from 'lucide-react';

export const ExecutionAnalytics: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('comprovantes_despesa')
                .select(`
                    *,
                    accountability:prestacao_contas_id (
                        process_number,
                        solicitation:solicitacao_id (
                            unit,
                            user_id
                        )
                    )
                `)
                .order('item_date', { ascending: false });

            if (error) throw error;
            setStats(data || []);
        } catch (err) {
            console.error('Erro ao buscar analítico:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredStats = stats.filter(s => {
        return (
            (s.supplier?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (s.accountability?.process_number?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (s.description?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    });

    const totalValor = stats.reduce((acc, s) => acc + (s.value || 0), 0);
    const countItems = stats.length;
    const avgValue = countItems > 0 ? totalValor / countItems : 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Executive Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <TrendingUp size={80} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Processado</p>
                    <p className="text-2xl font-black text-slate-800">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValor)}
                    </p>
                    <div className="mt-4 flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
                        <ArrowUpRight size={12} />
                        Execução em Tempo Real
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ticket Médio</p>
                    <p className="text-2xl font-black text-slate-800">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avgValue)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-4 font-bold uppercase">Por Comprovante</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume de Notas</p>
                    <p className="text-2xl font-black text-slate-800">{countItems}</p>
                    <div className="mt-4 flex items-center gap-1.5 text-teal-600 font-bold text-[10px] bg-teal-50 w-fit px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={12} />
                        Documentos Auditados
                    </div>
                </div>

                <div className="bg-teal-600 p-6 rounded-3xl shadow-xl shadow-teal-600/20 text-white flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <BarChart3 size={24} className="text-teal-200" />
                        <span className="text-[10px] font-black bg-white/20 px-2.5 py-1 rounded-full uppercase">Meta Mensal</span>
                    </div>
                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-xs font-bold opacity-70">Desempenho</span>
                            <span className="text-lg font-black tracking-tighter">94%</span>
                        </div>
                        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: '94%' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Filtrar por fornecedor, processo ou item..."
                                className="pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-2xl text-sm w-80 focus:ring-2 focus:ring-teal-500/20 transition-all font-medium"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="p-2.5 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-xl transition-all border border-transparent">
                            <Filter size={18} />
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={fetchAnalytics}
                            className={`p-2.5 bg-slate-50 text-slate-400 hover:bg-teal-50 hover:text-teal-600 rounded-xl transition-all ${loading ? 'animate-spin' : ''}`}
                        >
                            <RefreshCw size={18} />
                        </button>
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 transition-all hover:shadow-md">
                            <FileSpreadsheet size={16} className="text-emerald-600" />
                            Exportar Relatório
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                                <th className="px-6 py-4">Data / Processo</th>
                                <th className="px-6 py-4">Fornecedor / Emitente</th>
                                <th className="px-6 py-4">Unidade / Comarca</th>
                                <th className="px-6 py-4">Elemento de Despesa</th>
                                <th className="px-6 py-4 text-right">Valor Bruto</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="animate-spin text-teal-600" size={32} />
                                            <p className="text-sm font-bold text-slate-400 uppercase">Processando Big Data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredStats.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center text-slate-400 italic">
                                        Nenhum dado encontrado para os filtros aplicados.
                                    </td>
                                </tr>
                            ) : filteredStats.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                                                <Calendar size={12} className="text-teal-500" />
                                                {item.item_date ? new Date(item.item_date).toLocaleDateString() : '-'}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight truncate max-w-[120px]">
                                                {item.accountability?.process_number || 'S/N'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-white shadow-sm">
                                                <User size={14} className="text-slate-500" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700 truncate max-w-[180px]">{item.supplier}</span>
                                                <p className="text-[9px] text-slate-400 italic font-medium truncate max-w-[180px]">{item.description}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Building size={12} className="text-slate-400" />
                                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight truncate max-w-[120px]">
                                                {item.accountability?.solicitation?.unit || 'Tribunal'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Tag size={12} className="text-slate-400" />
                                            <span className="text-[10px] font-black text-slate-700 font-mono tracking-tighter">
                                                {item.element_code}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-xs font-black text-slate-900 font-mono">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                                            <CheckCircle2 size={10} />
                                            <span className="text-[9px] font-black uppercase">Liquidado</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all">
                                            <ChevronRight size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* Footer Pagination Simulated */}
                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-[10px]">
                    <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest">
                        <Timer size={12} />
                        Próxima atualização em 12 minutos
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-slate-500 font-medium">Mostrando <span className="text-slate-800 font-black">{filteredStats.length}</span> de <span className="text-slate-800 font-black">{countItems}</span> registros</span>
                        <div className="flex gap-1">
                            <button className="px-3 py-1 bg-white border border-slate-200 rounded-md shadow-sm disabled:opacity-50" disabled>Ant</button>
                            <button className="px-3 py-1 bg-white border border-slate-200 rounded-md shadow-sm hover:border-teal-400 hover:text-teal-600 transition-all">Próx</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
