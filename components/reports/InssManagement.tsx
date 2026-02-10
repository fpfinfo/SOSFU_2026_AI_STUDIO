import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Users, 
    Download, 
    Search, 
    Calculator, 
    Calendar, 
    ShieldCheck, 
    Loader2,
    TrendingUp,
    ArrowDownWideNarrow,
    Building2,
    RefreshCw,
    Tag
} from 'lucide-react';

export const InssManagement: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchInssData();
    }, []);

    const fetchInssData = async () => {
        setLoading(true);
        try {
            const { data: results, error } = await supabase
                .from('gestao_inss')
                .select('*')
                .order('data_prestacao', { ascending: false });

            if (error) throw error;
            setData(results || []);
        } catch (error) {
            console.error('Erro ao buscar dados de INSS:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = data.filter(item => {
        return (
            (item.nome?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.cpf?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.nup?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    });

    const totalRetido = data.reduce((acc, i) => acc + (i.inss_retido_11 || 0), 0);
    const totalPatronal = data.reduce((acc, i) => acc + (i.inss_patronal_20 || 0), 0);
    const totalIss = data.reduce((acc, i) => acc + (i.iss_retido_5 || 0), 0);
    const totalGeral = totalRetido + totalPatronal + totalIss;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header / Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                            <Calculator size={20} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Geral</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeral)}
                    </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                            <Users size={20} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retido (11%)</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRetido)}
                    </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                            <Building2 size={20} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patronal (20%)</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPatronal)}
                    </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                            <Tag size={20} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ISS Retido (5%)</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalIss)}
                    </p>
                </div>

                <div className="bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-900/20 flex flex-col justify-between text-white">
                    <div className="flex justify-between items-start">
                        <ShieldCheck size={28} className="text-emerald-400" />
                        <span className="text-[9px] font-black bg-white/10 px-2 py-0.5 rounded-full uppercase">Pilar Previdenciário</span>
                    </div>
                    <div>
                        <p className="text-sm font-bold opacity-60">Segurança Jurídica</p>
                        <p className="text-[10px] opacity-40 leading-tight mt-1 truncate">Compliance com Obrigações Patronais</p>
                    </div>
                </div>
            </div>

            {/* Content Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Buscar Prestador ou NUP..."
                                className="pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-2xl text-sm w-72 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                         <button 
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                            onClick={() => {/* Export CSV implementation */}}
                        >
                            <Download size={14} /> Exportar Guia
                        </button>
                        <button 
                            onClick={fetchInssData}
                            className="p-2.5 bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-all"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                                <th className="px-6 py-4">Beneficiário (PF)</th>
                                <th className="px-6 py-4">NUP / Projeto</th>
                                <th className="px-6 py-4">Data Prestação</th>
                                <th className="px-6 py-4 text-right">Valor Bruto</th>
                                <th className="px-6 py-4 text-right">INSS (11%)</th>
                                <th className="px-6 py-4 text-right">ISS (5%)</th>
                                <th className="px-6 py-4 text-right">Patronal (20%)</th>
                                <th className="px-6 py-4 text-right cursor-help" title="Soma das Retenções + Patronal">Total Tributos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="animate-spin text-emerald-600" size={32} />
                                            <p className="text-sm font-bold text-slate-400 uppercase">Sincronizando Tributos...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <TrendingUp size={48} className="opacity-10 mb-2" />
                                            <p className="text-sm font-bold uppercase">Nenhuma retenção de INSS registrada</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.map((item) => {
                                const aRecolher = (item.inss_retido_11 || 0) + (item.inss_patronal_20 || 0);
                                return (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-800">{item.nome}</span>
                                                <span className="text-[10px] font-bold text-slate-400">{item.cpf}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                             <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-600">{item.nup || 'Sem NUP'}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[150px]">{item.comarca}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                                            {item.data_prestacao ? new Date(item.data_prestacao).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-xs font-bold text-slate-700">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_bruto)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-black text-emerald-600">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.inss_retido_11)}
                                                </span>
                                                <span className="text-[8px] font-bold text-slate-300 uppercase">INSS 11%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-black text-amber-600">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.iss_retido_5)}
                                                </span>
                                                <span className="text-[8px] font-bold text-slate-300 uppercase">ISS 5%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-black text-indigo-600">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.inss_patronal_20)}
                                                </span>
                                                <span className="text-[8px] font-bold text-slate-300 uppercase">Pat. 20%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 group-hover:bg-slate-900 group-hover:border-slate-800 transition-all">
                                                    <span className="text-xs font-black text-slate-900 group-hover:text-white">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((item.inss_retido_11 || 0) + (item.iss_retido_5 || 0) + (item.inss_patronal_20 || 0))}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
