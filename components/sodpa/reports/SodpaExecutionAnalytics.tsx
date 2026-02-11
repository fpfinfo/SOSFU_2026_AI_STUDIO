import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
    BarChart3, 
    Calendar, 
    ChevronRight, 
    FileSpreadsheet, 
    Filter, 
    Search,
    TrendingUp,
    ArrowUpRight,
    Loader2,
    Building,
    User,
    Tag,
    RefreshCw,
    CheckCircle2,
    Timer,
    Plane,
    MapPin,
    Clock
} from 'lucide-react';

interface SodpaExecutionAnalyticsProps {
    darkMode?: boolean;
}

export const SodpaExecutionAnalytics: React.FC<SodpaExecutionAnalyticsProps> = ({ darkMode = false }) => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            // SODPA statuses: WAITING_SODPA_ANALYSIS, WAITING_SODPA_REVISION, APPROVED, PAID, etc.
            const { data, error } = await supabase
                .from('solicitations')
                .select(`
                    *,
                    profile:user_id (
                        full_name,
                        matricula
                    )
                `)
                .or('status.ilike.%SODPA%,status.eq.PAID,status.eq.APPROVED')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setStats(data || []);
        } catch (err) {
            console.error('Erro ao buscar analítico SODPA:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredStats = stats.filter(s => {
        return (
            (s.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (s.nup?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (s.unit?.toLowerCase().includes(searchTerm.toLowerCase())) ||
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
                <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} p-6 rounded-3xl border shadow-sm relative overflow-hidden group`}>
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <TrendingUp size={80} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Concedido</p>
                    <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValor)}
                    </p>
                    <div className="mt-4 flex items-center gap-1.5 text-sky-600 font-bold text-[10px] bg-sky-50 w-fit px-2 py-0.5 rounded-full">
                        <Plane size={12} />
                        Execução de Viagens
                    </div>
                </div>

                <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} p-6 rounded-3xl border shadow-sm relative overflow-hidden group`}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Custo Médio/Viagem</p>
                    <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avgValue)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-4 font-bold uppercase">Média Por Processo</p>
                </div>

                <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} p-6 rounded-3xl border shadow-sm relative overflow-hidden group`}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume de Diárias</p>
                    <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{countItems}</p>
                    <div className="mt-4 flex items-center gap-1.5 text-teal-600 font-bold text-[10px] bg-teal-50 w-fit px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={12} />
                        Processos Autorizados
                    </div>
                </div>

                <div className="bg-sky-600 p-6 rounded-3xl shadow-xl shadow-sky-600/20 text-white flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <MapPin size={24} className="text-sky-200" />
                        <span className="text-[10px] font-black bg-white/20 px-2.5 py-1 rounded-full uppercase">Meta Integridade</span>
                    </div>
                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-xs font-bold opacity-70">Prazo Médio</span>
                            <span className="text-lg font-black tracking-tighter">4.2 dias</span>
                        </div>
                        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: '85%' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} rounded-3xl border shadow-xl shadow-slate-200/50 overflow-hidden`}>
                <div className={`p-6 border-b ${darkMode ? 'border-slate-700' : 'border-slate-50'} flex flex-col md:flex-row justify-between items-center gap-4`}>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Filtrar por beneficiário, NUP ou comarca..."
                                className={`pl-10 pr-4 py-2.5 ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'} border-none rounded-2xl text-sm w-80 focus:ring-2 focus:ring-sky-500/20 transition-all font-medium`}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className={`p-2.5 ${darkMode ? 'bg-slate-900 text-slate-500 hover:text-slate-300' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'} rounded-xl transition-all border border-transparent`}>
                            <Filter size={18} />
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={fetchAnalytics}
                            className={`p-2.5 ${darkMode ? 'bg-slate-900 text-slate-500 hover:text-sky-400' : 'bg-slate-50 text-slate-400 hover:bg-sky-50 hover:text-sky-600'} rounded-xl transition-all ${loading ? 'animate-spin' : ''}`}
                        >
                            <RefreshCw size={18} />
                        </button>
                        <button className={`flex items-center gap-2 px-5 py-2.5 ${darkMode ? 'bg-slate-900 text-white border-slate-700' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 transition-all hover:shadow-md`}>
                            <FileSpreadsheet size={16} className="text-emerald-600" />
                            Planilha de Diárias
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`${darkMode ? 'bg-slate-900/50 text-slate-500' : 'bg-slate-50/50 text-slate-400'} text-[10px] font-black uppercase tracking-[0.15em]`}>
                                <th className="px-6 py-4">Beneficiário / Matrícula</th>
                                <th className="px-6 py-4">NUP / Processo</th>
                                <th className="px-6 py-4">Origem / Destino</th>
                                <th className="px-6 py-4">Tipo de Viagem</th>
                                <th className="px-6 py-4 text-right">Valor Concedido</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="animate-spin text-sky-600" size={32} />
                                            <p className="text-sm font-bold text-slate-400 uppercase">Auditando Fluxo SODPA...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredStats.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center text-slate-400 italic">
                                        Nenhum registro encontrado no período.
                                    </td>
                                </tr>
                            ) : filteredStats.map((item) => (
                                <tr key={item.id} className={`${darkMode ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50/50'} transition-colors group`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center shrink-0 border border-white shadow-sm">
                                                <User size={14} className="text-sky-600" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`text-xs font-black ${darkMode ? 'text-slate-200' : 'text-slate-900'} truncate max-w-[180px]`}>
                                                    {item.profile?.full_name || 'Servidor'}
                                                </span>
                                                <p className="text-[9px] text-slate-400 font-mono">MAT: {item.profile?.matricula || '---'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'} flex items-center gap-1.5`}>
                                                <FileSpreadsheet size={12} className="text-sky-500" />
                                                {item.nup || 'Sem NUP'}
                                            </span>
                                            <span className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                                                <Calendar size={10} /> {new Date(item.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 rounded bg-slate-100 flex items-center justify-center">
                                                <MapPin size={10} className="text-slate-400" />
                                            </div>
                                            <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'} uppercase tracking-tight truncate max-w-[150px]`}>
                                                {item.unit || 'BELÉM'} ➔ {item.destination || 'INTERIOR'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Plane size={12} className="text-slate-400" />
                                            <span className={`text-[10px] font-black ${darkMode ? 'text-slate-300' : 'text-slate-700'} uppercase font-mono tracking-tighter`}>
                                                {item.type === 'EMERGENCY' ? 'DIÁRIA URGENTE' : 'FLUXO PADRÃO'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`text-xs font-black ${darkMode ? 'text-white' : 'text-slate-900'} font-mono`}>
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className={`inline-flex items-center gap-2 px-2.5 py-1 ${item.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'} rounded-full border border-emerald-100`}>
                                            <CheckCircle2 size={10} />
                                            <span className="text-[9px] font-black uppercase">{item.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all">
                                            <ChevronRight size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                <div className={`px-6 py-4 ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50/50 border-slate-100'} border-t flex justify-between items-center text-[10px]`}>
                    <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest">
                        <Clock size={12} />
                        Sincronizado com o sistema legado às {new Date().toLocaleTimeString()}
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-slate-500 font-medium">Mostrando <span className={`font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{filteredStats.length}</span> registros</span>
                        <div className="flex gap-1">
                            <button className={`px-3 py-1 ${darkMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-white border-slate-200'} border rounded-md shadow-sm disabled:opacity-50`} disabled>Ant</button>
                            <button className={`px-3 py-1 ${darkMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-white border-slate-200'} border rounded-md shadow-sm hover:border-sky-400 hover:text-sky-600 transition-all`}>Próx</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
