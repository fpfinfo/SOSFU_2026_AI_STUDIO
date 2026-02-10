import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
    Search, 
    Filter, 
    Download, 
    ArrowLeftRight, 
    TrendingUp, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    ChevronRight,
    Loader2,
    RefreshCw,
    Wallet,
    Plane,
    MapPin,
    FileText
} from 'lucide-react';

interface SodpaGdrManagementProps {
    darkMode?: boolean;
}

export const SodpaGdrManagement: React.FC<SodpaGdrManagementProps> = ({ darkMode = false }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('TODOS');

    useEffect(() => {
        fetchGdrData();
    }, []);

    const fetchGdrData = async () => {
        setLoading(true);
        try {
            // Buscando devoluções vinculadas a processos SODPA
            const { data: results, error } = await supabase
                .from('gestao_devolucoes')
                .select(`
                    *,
                    solicitation:solicitacao_id (
                        nup,
                        unit,
                        type,
                        destination
                    )
                `)
                .order('data_referencia', { ascending: false });

            if (error) throw error;
            
            // Filtro manual para garantir que mostramos apenas o que faz sentido para SODPA se não houver coluna de módulo
            // Normalmente Diárias/Passagens têm tipos específicos ou NUPs padronizados
            setData(results || []);
        } catch (err) {
            console.error('Erro ao buscar GDR SODPA:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = data.filter(item => {
        const matchesSearch = 
            item.solicitation?.nup?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.suprido_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.numero_gdr?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'TODOS' || item.status_gdr === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    const totalDevolvido = data.filter(i => i.status_gdr === 'PAGO').reduce((acc, i) => acc + (i.valor_devolvucao || 0), 0);
    const totalPendente = data.filter(i => i.status_gdr === 'PENDENTE').reduce((acc, i) => acc + (i.valor_devolvucao || 0), 0);
    const efficiency = data.length > 0 ? (data.filter(i => i.status_gdr === 'PAGO').length / data.length) * 100 : 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} p-6 rounded-3xl border shadow-sm relative overflow-hidden group`}>
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Wallet size={80} className="text-emerald-500" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Recuperado (Diárias)</p>
                    <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDevolvido)}
                    </p>
                    <div className="mt-4 flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
                        <TrendingUp size={12} />
                        Saldo Reintegrado ao Erário
                    </div>
                </div>

                <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} p-6 rounded-3xl border shadow-sm`}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Aguardando Guia</p>
                    <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPendente)}
                    </p>
                    <div className="mt-4 flex items-center gap-1.5 text-amber-600 font-bold text-[10px] bg-amber-50 w-fit px-2 py-0.5 rounded-full">
                        <Clock size={12} />
                        Pendências de Devolução
                    </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-900/20 flex flex-col justify-between text-white">
                    <div className="flex justify-between items-start">
                        <CheckCircle2 size={28} className="text-emerald-400" />
                        <span className="text-[10px] font-black bg-white/10 px-2.5 py-1 rounded-full uppercase tracking-widest">Compliance GDR</span>
                    </div>
                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-xs font-bold opacity-70">Taxa de Liquidação</span>
                            <span className="text-lg font-black tracking-tighter">{efficiency.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${efficiency}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters & Table */}
            <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} rounded-3xl border shadow-xl shadow-slate-200/50 overflow-hidden`}>
                <div className={`p-6 border-b ${darkMode ? 'border-slate-700' : 'border-slate-50'} flex flex-col md:flex-row justify-between items-center gap-4`}>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="NUP, beneficiário ou nº GDR..."
                                className={`pl-10 pr-4 py-2.5 ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'} border-none rounded-2xl text-sm w-72 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium`}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select 
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className={`px-4 py-2.5 ${darkMode ? 'bg-slate-900 text-white border-slate-700' : 'bg-slate-50 border-none text-slate-600'} rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none`}
                        >
                            <option value="TODOS">TODOS OS STATUS</option>
                            <option value="PENDENTE">PENDENTE</option>
                            <option value="PAGO">PAGO / CONCLUIDO</option>
                        </select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={fetchGdrData}
                            className={`p-2.5 ${darkMode ? 'bg-slate-900 text-slate-500 hover:text-sky-400' : 'bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'} rounded-xl transition-all ${loading ? 'animate-spin' : ''}`}
                        >
                            <RefreshCw size={18} />
                        </button>
                        <button className={`px-5 py-2.5 ${darkMode ? 'bg-slate-900 text-white border-slate-700' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 transition-all flex items-center gap-2`}>
                            <FileText size={16} className="text-emerald-500" />
                            Relatório de Restituição
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto text-[11px]">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`${darkMode ? 'bg-slate-900/50 text-slate-500' : 'bg-slate-50/50 text-slate-400'} text-[10px] font-black uppercase tracking-[0.15em]`}>
                                <th className="px-6 py-4">Data / Ref</th>
                                <th className="px-6 py-4">Beneficiário / Origem</th>
                                <th className="px-6 py-4">NUP / Processo</th>
                                <th className="px-6 py-4 text-right">Vr. Concedido</th>
                                <th className="px-6 py-4 text-right">Vr. Utilizado</th>
                                <th className="px-6 py-4 text-right font-black text-slate-900">Vr. Restituir</th>
                                <th className="px-6 py-4 text-center">Status GDR</th>
                                <th className="px-6 py-4 text-right">Doc</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-20 text-center">
                                        <Loader2 className="animate-spin text-emerald-600 mx-auto mb-2" size={32} />
                                        <p className="text-xs font-bold text-slate-400 uppercase">Processando Conciliação...</p>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-20 text-center text-slate-400 italic">
                                        Nenhuma devolução registrada.
                                    </td>
                                </tr>
                            ) : filteredData.map((item) => (
                                <tr key={item.id} className={`${darkMode ? 'hover:bg-slate-700/30 font-medium' : 'hover:bg-slate-50/50'} transition-colors group`}>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className={`text-xs font-black ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{new Date(item.data_referencia).toLocaleDateString()}</span>
                                            <span className="text-[9px] text-slate-400 mt-1 uppercase">Ref: {new Date(item.data_referencia).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.suprido_nome || '---'}</span>
                                            <span className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={8} /> {item.solicitation?.unit || 'Belém'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className={`text-xs font-black ${darkMode ? 'text-sky-600' : 'text-indigo-600'}`}>{item.solicitation?.nup || 'Sem NUP'}</span>
                                            <span className="text-[9px] text-slate-400 mt-1 font-mono">GDR ID: {item.numero_gdr || '---'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-500">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_concedido)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-500">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_gasto)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono">
                                        <span className={`px-2 py-1 rounded-lg ${darkMode ? 'bg-emerald-900/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700'} font-black`}>
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_devolvucao)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                                            item.status_gdr === 'PAGO' 
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                                        }`}>
                                            {item.status_gdr === 'PAGO' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                                            {item.status_gdr}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                                            <Download size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
