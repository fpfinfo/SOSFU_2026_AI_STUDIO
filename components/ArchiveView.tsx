import React, { useState, useEffect, useMemo } from 'react';
import { Archive, Search, ChevronLeft, ChevronRight, Database, Calendar, FileText, Loader2, Download, Filter, MapPin, DollarSign, ArrowUpDown, ArrowUp, ArrowDown, Eye, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ArchiveViewProps {
    onNavigate: (page: string, processId?: string) => void;
    darkMode?: boolean;
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

export const ArchiveView: React.FC<ArchiveViewProps> = ({ onNavigate, darkMode = false }) => {
    // Data
    const [processes, setProcesses] = useState<ArchivedProcess[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
    const [showFilters, setShowFilters] = useState(false);

    // Sort
    const [sortField, setSortField] = useState<SortField>('data_baixa');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    // Stats
    const [stats, setStats] = useState({ total: 0, totalValue: 0, withNL: 0, thisMonth: 0 });

    // Fetch data
    useEffect(() => {
        fetchArchivedProcesses();
    }, [currentPage, sortField, sortDir, yearFilter]);

    const fetchArchivedProcesses = async () => {
        setLoading(true);
        try {
            // Build query
            let query = supabase
                .from('solicitations')
                .select('id, process_number, beneficiary, unit, value, nl_siafe, data_baixa, created_at, status', { count: 'exact' })
                .eq('status', 'ARCHIVED');

            // Year filter
            if (yearFilter) {
                query = query.gte('created_at', `${yearFilter}-01-01T00:00:00`)
                             .lt('created_at', `${parseInt(yearFilter) + 1}-01-01T00:00:00`);
            }

            // Sort
            query = query.order(sortField, { ascending: sortDir === 'asc', nullsFirst: false });

            // Pagination
            const from = (currentPage - 1) * PAGE_SIZE;
            query = query.range(from, from + PAGE_SIZE - 1);

            const { data, error, count } = await query;

            if (error) throw error;

            setProcesses(data || []);
            setTotalCount(count || 0);

            // Fetch stats (separate lightweight query)
            const { data: statsData } = await supabase
                .from('solicitations')
                .select('value, nl_siafe, data_baixa')
                .eq('status', 'ARCHIVED');

            if (statsData) {
                const now = new Date();
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                setStats({
                    total: statsData.length,
                    totalValue: statsData.reduce((sum, p) => sum + Number(p.value || 0), 0),
                    withNL: statsData.filter(p => p.nl_siafe).length,
                    thisMonth: statsData.filter(p => p.data_baixa && new Date(p.data_baixa) >= monthStart).length,
                });
            }
        } catch (err) {
            console.error('Erro ao buscar processos arquivados:', err);
        } finally {
            setLoading(false);
        }
    };

    // Client-side search filter
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
        return sortDir === 'asc'
            ? <ArrowUp size={12} className="text-blue-600" />
            : <ArrowDown size={12} className="text-blue-600" />;
    };

    const handleRowClick = (processId: string) => {
        onNavigate('process_archive', processId);
    };

    // Generate year options
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

    return (
        <div className={`space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ${darkMode ? 'text-slate-100' : ''}`}>

            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                        <div className={`w-14 h-14 backdrop-blur rounded-xl flex items-center justify-center border ${darkMode ? 'bg-slate-700/50 border-white/5' : 'bg-white/10 border-white/10'}`}>
                            <Archive size={28} className="text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Arquivo de Processos</h1>
                            <p className={`${darkMode ? 'text-slate-500' : 'text-slate-400'} text-sm mt-0.5`}>Processos baixados no SIAFE — Consulta e rastreabilidade</p>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Arquivados</p>
                            <p className="text-2xl font-bold text-white mt-1">{stats.total.toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor Acumulado</p>
                            <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(stats.totalValue)}</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Com NL SIAFE</p>
                            <p className="text-2xl font-bold text-blue-400 mt-1">{stats.withNL.toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Baixas Este Mês</p>
                            <p className="text-2xl font-bold text-amber-400 mt-1">{stats.thisMonth}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-4`}>
                <div className="flex flex-col md:flex-row items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar por NUP, suprido, NL, comarca..."
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm outline-none transition-all ${
                                darkMode 
                                ? 'bg-slate-900 border-slate-700 text-slate-100 focus:bg-slate-900 focus:border-blue-500' 
                                : 'bg-gray-50 border-gray-200 text-gray-800 focus:bg-white focus:border-blue-500'
                            }`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Year Filter */}
                    <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        <select
                            value={yearFilter}
                            onChange={(e) => { setYearFilter(e.target.value); setCurrentPage(1); }}
                            className={`px-3 py-2.5 border rounded-lg text-sm font-medium cursor-pointer outline-none ${
                                darkMode 
                                ? 'bg-slate-900 border-slate-700 text-slate-300 focus:border-blue-500' 
                                : 'bg-gray-50 border-gray-200 text-gray-700 focus:border-blue-500'
                            }`}
                        >
                            <option value="">Todos os anos</option>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    {/* Result Count */}
                    <div className="text-xs font-medium text-gray-500 whitespace-nowrap">
                        {totalCount.toLocaleString('pt-BR')} processos
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border overflow-hidden`}>
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-96">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                        <p className="text-gray-400 font-medium">Carregando arquivo...</p>
                    </div>
                ) : filteredProcesses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Archive size={28} className="text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-medium">Nenhum processo arquivado encontrado</p>
                        <p className="text-gray-400 text-sm mt-1">Ajuste os filtros ou pesquise por outros termos</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className={`border-b ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-gray-200'}`}>
                                        <th className="text-left px-5 py-3.5">
                                            <button onClick={() => handleSort('process_number')} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors">
                                                Nº do Processo <SortIcon field="process_number" />
                                            </button>
                                        </th>
                                        <th className="text-left px-5 py-3.5">
                                            <button onClick={() => handleSort('beneficiary')} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors">
                                                Suprido <SortIcon field="beneficiary" />
                                            </button>
                                        </th>
                                        <th className="text-left px-5 py-3.5 hidden lg:table-cell">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Comarca</span>
                                        </th>
                                        <th className="text-right px-5 py-3.5">
                                            <button onClick={() => handleSort('value')} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors ml-auto">
                                                Valor <SortIcon field="value" />
                                            </button>
                                        </th>
                                        <th className="text-left px-5 py-3.5">
                                            <button onClick={() => handleSort('nl_siafe')} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors">
                                                NL SIAFE <SortIcon field="nl_siafe" />
                                            </button>
                                        </th>
                                        <th className="text-left px-5 py-3.5">
                                            <button onClick={() => handleSort('data_baixa')} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors">
                                                Data Baixa <SortIcon field="data_baixa" />
                                            </button>
                                        </th>
                                        <th className="text-left px-5 py-3.5 hidden md:table-cell">
                                            <button onClick={() => handleSort('created_at')} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors">
                                                Abertura <SortIcon field="created_at" />
                                            </button>
                                        </th>
                                        <th className="text-center px-3 py-3.5 w-12">
                                            <span className="sr-only">Ações</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-gray-100'}`}>
                                    {filteredProcesses.map((process) => (
                                        <tr
                                            key={process.id}
                                            onClick={() => handleRowClick(process.id)}
                                            className={`transition-colors cursor-pointer group ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-blue-50/50'}`}
                                        >
                                            <td className="px-5 py-4">
                                                <span className={`font-mono font-bold text-xs ${darkMode ? 'text-slate-300' : 'text-gray-800'}`}>{process.process_number}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`font-medium text-sm ${darkMode ? 'text-slate-400' : 'text-gray-700'}`}>{process.beneficiary}</span>
                                            </td>
                                            <td className="px-5 py-4 hidden lg:table-cell">
                                                <span className="text-gray-500 text-xs">{process.unit?.split('[')[0]?.trim() || '---'}</span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <span className={`font-mono font-bold text-sm ${darkMode ? 'text-slate-300' : 'text-gray-800'}`}>{formatCurrency(process.value)}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                {process.nl_siafe ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[11px] font-bold font-mono">
                                                        <Database size={10} />
                                                        {process.nl_siafe}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300 italic text-xs">Pendente</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`text-xs font-medium ${darkMode ? 'text-slate-500' : 'text-gray-600'}`}>{formatDate(process.data_baixa)}</span>
                                            </td>
                                            <td className="px-5 py-4 hidden md:table-cell">
                                                <span className="text-gray-400 text-xs">{formatDate(process.created_at)}</span>
                                            </td>
                                            <td className="px-3 py-4 text-center">
                                                <Eye size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors mx-auto" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
                            <div className="text-xs text-gray-500">
                                Mostrando <strong>{((currentPage - 1) * PAGE_SIZE) + 1}</strong> a <strong>{Math.min(currentPage * PAGE_SIZE, totalCount)}</strong> de <strong>{totalCount.toLocaleString('pt-BR')}</strong> processos
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    Início
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                {/* Page numbers */}
                                {(() => {
                                    const pages: number[] = [];
                                    const start = Math.max(1, currentPage - 2);
                                    const end = Math.min(totalPages, currentPage + 2);
                                    for (let i = start; i <= end; i++) pages.push(i);
                                    return pages.map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-8 h-8 text-xs font-bold rounded-lg transition-colors ${
                                                page === currentPage
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'text-gray-600 bg-white border border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ));
                                })()}

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-1.5 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    Fim
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
