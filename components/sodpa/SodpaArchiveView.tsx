import React, { useState, useEffect, useMemo } from 'react';
import { Archive, Search, ChevronLeft, ChevronRight, Database, Calendar, FileText, Loader2, Eye, X, ArrowUpDown, ArrowUp, ArrowDown, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SodpaArchiveViewProps {
    onNavigate: (page: string, processId?: string) => void;
}

interface ArchivedProcess {
    id: string;
    process_number: string;
    beneficiary: string;
    unit: string;
    value: number;
    nl_siafe: string | null;
    data_baixa: string | null;
    created_at: string;
    status: string;
    request_type: 'DIARIAS' | 'PASSAGEM' | 'AMBOS' | null;
}

const PAGE_SIZE = 25;

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '---';
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

type SortField = 'process_number' | 'beneficiary' | 'value' | 'nl_siafe' | 'data_baixa' | 'created_at';
type SortDir = 'asc' | 'desc';

export const SodpaArchiveView: React.FC<SodpaArchiveViewProps> = ({ onNavigate }) => {
    const [processes, setProcesses] = useState<ArchivedProcess[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
    const [typeFilter, setTypeFilter] = useState<string>('all');

    const [sortField, setSortField] = useState<SortField>('data_baixa');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const [stats, setStats] = useState({ total: 0, totalValue: 0, withNL: 0 });

    useEffect(() => {
        fetchArchivedProcesses();
    }, [currentPage, sortField, sortDir, yearFilter, typeFilter]);

    const fetchArchivedProcesses = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('solicitations')
                .select('id, process_number, beneficiary, unit, value, nl_siafe, data_baixa, created_at, status, request_type', { count: 'exact' })
                .eq('status', 'ARCHIVED');

            // Apply SODPA Filter (request_type IN DIARIAS, PASSAGEM, AMBOS)
            if (typeFilter === 'all') {
                query = query.in('request_type', ['DIARIAS', 'PASSAGEM', 'AMBOS']);
            } else {
                query = query.eq('request_type', typeFilter);
            }

            if (yearFilter) {
                query = query.gte('created_at', `${yearFilter}-01-01T00:00:00`)
                             .lt('created_at', `${parseInt(yearFilter) + 1}-01-01T00:00:00`);
            }

            query = query.order(sortField, { ascending: sortDir === 'asc', nullsFirst: false });

            const from = (currentPage - 1) * PAGE_SIZE;
            query = query.range(from, from + PAGE_SIZE - 1);

            const { data, error, count } = await query;

            if (error) throw error;

            setProcesses(data || []);
            setTotalCount(count || 0);

            // Fetch lightweight stats
            const { data: statsData } = await supabase
                .from('solicitations')
                .select('value, nl_siafe')
                .eq('status', 'ARCHIVED')
                .in('request_type', ['DIARIAS', 'PASSAGEM', 'AMBOS']); // Stats always reflect total SODPA archive
            
            if (statsData) {
                setStats({
                    total: statsData.length,
                    totalValue: statsData.reduce((sum, p) => sum + Number(p.value || 0), 0),
                    withNL: statsData.filter(p => p.nl_siafe).length,
                });
            }

        } catch (err) {
            console.error('SodpaArchiveView error:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredProcesses = useMemo(() => {
        if (!searchTerm.trim()) return processes;
        const term = searchTerm.toLowerCase();
        return processes.filter(p =>
            p.process_number?.toLowerCase().includes(term) ||
            p.beneficiary?.toLowerCase().includes(term) ||
            p.nl_siafe?.toLowerCase().includes(term) ||
            p.unit?.toLowerCase().includes(term)
        );
    }, [processes, searchTerm]);

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
        setCurrentPage(1);
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown size={12} className="text-gray-300" />;
        return sortDir === 'asc' ? <ArrowUp size={12} className="text-blue-600" /> : <ArrowDown size={12} className="text-blue-600" />;
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header: Clean & Minimalist */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Archive className="text-slate-400" />
                        Arquivo de Processos
                    </h1>
                    <p className="text-slate-500 text-sm">Histórico de Diárias e Passagens baixadas no SIAFE</p>
                </div>

                {/* Micro Stats */}
                <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                        <p className="text-xs text-slate-400 font-bold uppercase">Total Arquivado</p>
                        <p className="font-mono font-bold text-slate-700">{stats.total.toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="h-8 w-px bg-slate-200"></div>
                    <div className="text-right">
                        <p className="text-xs text-slate-400 font-bold uppercase">Valor Total</p>
                        <p className="font-mono font-bold text-emerald-600">{formatCurrency(stats.totalValue)}</p>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 items-center">
                {/* Search */}
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar por NUP, beneficiário, NL..."
                        className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                    <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                        <option value="all">Todos os Tipos</option>
                        <option value="DIARIAS">Apenas Diárias</option>
                        <option value="PASSAGEM">Apenas Passagens</option>
                    </select>

                    <select
                        value={yearFilter}
                        onChange={e => setYearFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                        <option value="">Todos os Anos</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                        <span className="text-sm font-medium">Carregando arquivo...</span>
                    </div>
                ) : filteredProcesses.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                        <Archive className="w-12 h-12 mb-2 opacity-20" />
                        <span className="text-sm font-medium">Nenhum processo encontrado</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort('process_number')}>
                                        <div className="flex items-center gap-1">Processo <SortIcon field="process_number" /></div>
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort('beneficiary')}>
                                        <div className="flex items-center gap-1">Beneficiário <SortIcon field="beneficiary" /></div>
                                    </th>
                                    <th className="px-6 py-3 hidden md:table-cell">Comarca/Destino</th>
                                    <th className="px-6 py-3 cursor-pointer hover:text-slate-700 text-right" onClick={() => handleSort('value')}>
                                        <div className="flex items-center justify-end gap-1">Valor <SortIcon field="value" /></div>
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort('nl_siafe')}>
                                        <div className="flex items-center gap-1">NL SIAFE <SortIcon field="nl_siafe" /></div>
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort('data_baixa')}>
                                        <div className="flex items-center gap-1">Baixa <SortIcon field="data_baixa" /></div>
                                    </th>
                                    <th className="px-4 py-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProcesses.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onNavigate('process_detail', p.id)}>
                                        <td className="px-6 py-4 font-mono font-medium text-slate-700">
                                            {p.process_number}
                                            {p.request_type && (
                                                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                                    p.request_type === 'PASSAGEM' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {p.request_type === 'PASSAGEM' ? 'PASS' : 'DIÁRIA'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-800">{p.beneficiary}</div>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell text-slate-500">
                                            {p.unit}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-medium text-slate-700">
                                            {formatCurrency(p.value)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {p.nl_siafe ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-mono border border-green-200">
                                                    <Database size={10} /> {p.nl_siafe}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-xs italic">Pendente</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">
                                            {formatDate(p.data_baixa)}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
                    <span>Exibindo {processes.length} de {totalCount} registros</span>
                    <div className="flex gap-1">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="p-1.5 border rounded hover:bg-white disabled:opacity-50"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="px-3 py-1.5 font-mono font-medium bg-white border rounded">
                            {currentPage} / {totalPages || 1}
                        </span>
                        <button
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="p-1.5 border rounded hover:bg-white disabled:opacity-50"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
