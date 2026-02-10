import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    FileText, 
    Download, 
    Search, 
    Filter, 
    Calendar, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    ArrowUpRight,
    ExternalLink,
    RefreshCw,
    Loader2
} from 'lucide-react';

export const GdrManagement: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    useEffect(() => {
        fetchGdrData();
    }, []);

    const fetchGdrData = async () => {
        setLoading(true);
        try {
            const { data: results, error } = await supabase
                .from('gestao_devolucoes')
                .select(`
                    *,
                    solicitation:solicitacao_id (nup, unit, granted_value)
                `)
                .order('data_referencia', { ascending: false });

            if (error) throw error;
            setData(results || []);
        } catch (error) {
            console.error('Erro ao buscar GDRs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('gestao_devolucoes')
                .update({ status_gdr: newStatus })
                .eq('id', id);
            
            if (error) throw error;
            fetchGdrData(); // Refresh
        } catch (err) {
            console.error('Erro ao atualizar status:', err);
        }
    };

    const filteredData = data.filter(item => {
        const matchesSearch = 
            (item.numero_gdr?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.nup?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.suprido_nome?.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesStatus = statusFilter === 'ALL' || item.status_gdr === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    const totalDevolvido = data
        .filter(i => i.status_gdr === 'PAGO')
        .reduce((acc, i) => acc + (i.valor_devolvucao || 0), 0);
    
    const pendenteDevolucao = data
        .filter(i => i.status_gdr === 'PENDENTE')
        .reduce((acc, i) => acc + (i.valor_devolvucao || 0), 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Recuperado</p>
                        <p className="text-xl font-black text-slate-800">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDevolvido)}
                        </p>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aguardando Baixa</p>
                        <p className="text-xl font-black text-slate-800">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendenteDevolucao)}
                        </p>
                    </div>
                </div>

                <div className="bg-indigo-600 p-6 rounded-3xl shadow-xl shadow-indigo-600/20 flex items-center gap-4 text-white">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <ArrowUpRight size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">Eficiência de Saldo</p>
                        <p className="text-xl font-black">
                            {data.length > 0 ? Math.round((totalDevolvido / (totalDevolvido + pendenteDevolucao || 1)) * 100) : 0}%
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters & Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Buscar NUP ou GDR..."
                                className="pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-2xl text-sm w-64 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
                            {['ALL', 'PENDENTE', 'PAGO'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${statusFilter === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {s === 'ALL' ? 'Todos' : s}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button 
                        onClick={fetchGdrData}
                        className="p-2.5 bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all"
                        title="Atualizar dados"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                                <th className="px-6 py-4">NUP / Unidade</th>
                                <th className="px-6 py-4">Suprido</th>
                                <th className="px-6 py-4">Dados da GDR</th>
                                <th className="px-6 py-4">Valores</th>
                                <th className="px-6 py-4 text-center">Documento</th>
                                <th className="px-6 py-4 text-right">Status / Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="animate-spin text-indigo-600" size={32} />
                                            <p className="text-sm font-bold text-slate-400 uppercase">Carregando Auditoria...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <FileText size={48} className="opacity-10 mb-2" />
                                            <p className="text-sm font-bold uppercase">Nenhuma GDR encontrada</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-800">{item.solicitation?.nup || 'N/A'}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{item.solicitation?.unit || '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-bold text-slate-700">{item.suprido_nome || 'Sistema SOSFU'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full w-fit mb-1">{item.numero_gdr}</span>
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <Calendar size={10} />
                                                {item.data_referencia ? new Date(item.data_referencia).toLocaleDateString() : '-'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_devolvucao)}</span>
                                            <span className="text-[9px] text-slate-400 font-bold">Saldo do Suprimento</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <a 
                                            href={item.comprovante_url || '#'} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex p-2 bg-slate-100 text-slate-400 hover:bg-indigo-600 hover:text-white rounded-xl transition-all"
                                        >
                                            <Download size={16} />
                                        </a>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider ${
                                                item.status_gdr === 'PAGO' 
                                                    ? 'bg-emerald-100 text-emerald-700' 
                                                    : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {item.status_gdr}
                                            </span>
                                            {item.status_gdr === 'PENDENTE' && (
                                                <button 
                                                    onClick={() => handleStatusUpdate(item.id, 'PAGO')}
                                                    className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 rounded-lg transition-all"
                                                    title="Dar Baixa"
                                                >
                                                    <CheckCircle2 size={14} />
                                                </button>
                                            )}
                                        </div>
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
