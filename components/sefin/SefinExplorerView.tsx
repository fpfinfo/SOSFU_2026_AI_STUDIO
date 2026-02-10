import React, { useState, useMemo, useEffect } from 'react';
import {
    Search, Calendar, Download, Eye, FileText, User, DollarSign,
    ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
    Building2, Filter, CheckCircle2, Clock, XCircle, Loader2, FileDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SefinExplorerViewProps {
    darkMode?: boolean;
    onNavigate?: (page: string, processId?: string) => void;
}

interface ExplorerTask {
    id: string;
    solicitation_id: string;
    document_type: string;
    title: string;
    value: number;
    status: string;
    created_at: string;
    signed_at?: string;
    solicitation?: {
        process_number: string;
        beneficiary: string;
        value: number;
        origin: string;
    };
}

const ITEMS_PER_PAGE = 20;

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const getDocLabel = (type: string) => {
    switch (type) {
        case 'PORTARIA_SF': return 'PORTARIA';
        case 'CERTIDAO_REGULARIDADE': return 'CERTIDAO_REGULARIDADE';
        case 'NOTA_EMPENHO': return 'NOTA_EMPENHO';
        case 'LIQUIDACAO': return 'DECISAO';
        case 'ORDEM_BANCARIA': return 'ORDEM_BANCARIA';
        default: return type;
    }
};

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
        'PENDING': { label: 'Pendente', color: 'bg-amber-100 text-amber-700', icon: <Clock size={12} /> },
        'SIGNED': { label: 'Assinado', color: 'bg-blue-100 text-blue-700', icon: <CheckCircle2 size={12} /> },
        'REJECTED': { label: 'Devolvido', color: 'bg-red-100 text-red-700', icon: <XCircle size={12} /> },
    };
    const c = config[status] || { label: status, color: 'bg-slate-100 text-slate-700', icon: null };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${c.color}`}>
            {c.icon}{c.label}
        </span>
    );
}

type SortField = 'nup' | 'tipo' | 'suprido' | 'unidade' | 'valor' | 'status' | 'data';
type SortDirection = 'asc' | 'desc';

export const SefinExplorerView: React.FC<SefinExplorerViewProps> = ({ darkMode = false, onNavigate }) => {
    const [tasks, setTasks] = useState<ExplorerTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [localSearch, setLocalSearch] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortField, setSortField] = useState<SortField>('data');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    useEffect(() => { fetchAllTasks(); }, []);

    const fetchAllTasks = async () => {
        setLoading(true);
        try {
            const { data: allTasks } = await supabase
                .from('sefin_signing_tasks')
                .select('*')
                .order('created_at', { ascending: false });

            if (allTasks) {
                const solIds = [...new Set(allTasks.map(t => t.solicitation_id))];
                const solMap: Record<string, any> = {};
                if (solIds.length > 0) {
                    const { data: sols } = await supabase.from('solicitations')
                        .select('id, process_number, beneficiary, value, origin')
                        .in('id', solIds);
                    if (sols) sols.forEach(s => { solMap[s.id] = s; });
                }
                setTasks(allTasks.map(t => ({
                    ...t,
                    solicitation: solMap[t.solicitation_id]
                })));
            }
        } catch (err) {
            console.error('Explorer fetch error:', err);
        } finally { setLoading(false); }
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
        setCurrentPage(1);
    };

    const SortableHeader = ({ field, label }: { field: SortField; label: string }) => (
        <th className="text-left text-xs font-bold px-4 py-3.5 cursor-pointer select-none transition-colors text-slate-500 hover:bg-slate-100 uppercase tracking-wider"
            onClick={() => handleSort(field)}>
            <div className="flex items-center gap-1">
                {label}
                {sortField === field ? (
                    sortDirection === 'asc' ? <ArrowUp size={13} className="text-emerald-500" /> : <ArrowDown size={13} className="text-emerald-500" />
                ) : (
                    <ArrowUpDown size={13} className="text-slate-300" />
                )}
            </div>
        </th>
    );

    const filteredTasks = useMemo(() => {
        let result = tasks.filter(task => {
            if (localSearch) {
                const q = localSearch.toLowerCase();
                const nup = task.solicitation?.process_number?.toLowerCase() || '';
                const ben = task.solicitation?.beneficiary?.toLowerCase() || '';
                const tipo = task.document_type?.toLowerCase() || '';
                const origin = task.solicitation?.origin?.toLowerCase() || '';
                if (!nup.includes(q) && !ben.includes(q) && !tipo.includes(q) && !origin.includes(q)) return false;
            }
            if (statusFilter !== 'all') {
                if (statusFilter === 'pending' && task.status !== 'PENDING') return false;
                if (statusFilter === 'signed' && task.status !== 'SIGNED') return false;
                if (statusFilter === 'returned' && task.status !== 'REJECTED') return false;
            }
            if (dateRange.start || dateRange.end) {
                const d = new Date(task.created_at).toISOString().split('T')[0];
                if (dateRange.start && d < dateRange.start) return false;
                if (dateRange.end && d > dateRange.end) return false;
            }
            return true;
        });

        result.sort((a, b) => {
            let aV: any, bV: any;
            switch (sortField) {
                case 'nup': aV = a.solicitation?.process_number || ''; bV = b.solicitation?.process_number || ''; break;
                case 'tipo': aV = a.document_type; bV = b.document_type; break;
                case 'suprido': aV = a.solicitation?.beneficiary || ''; bV = b.solicitation?.beneficiary || ''; break;
                case 'unidade': aV = a.solicitation?.origin || ''; bV = b.solicitation?.origin || ''; break;
                case 'valor': aV = a.value || 0; bV = b.value || 0; break;
                case 'status': aV = a.status; bV = b.status; break;
                case 'data': aV = new Date(a.created_at).getTime(); bV = new Date(b.created_at).getTime(); break;
                default: return 0;
            }
            if (aV < bV) return sortDirection === 'asc' ? -1 : 1;
            if (aV > bV) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [tasks, localSearch, statusFilter, dateRange, sortField, sortDirection]);

    const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE);
    const paginatedTasks = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTasks.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredTasks, currentPage]);

    const handleExportCSV = () => {
        const headers = ['NUP', 'Tipo', 'Suprido', 'Unidade', 'Valor', 'Status', 'Data'];
        const rows = filteredTasks.map(t => [
            t.solicitation?.process_number || '',
            getDocLabel(t.document_type),
            t.solicitation?.beneficiary || '',
            t.solicitation?.origin || '',
            t.value?.toString() || '0',
            t.status,
            new Date(t.created_at).toLocaleDateString('pt-BR')
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sefin_relatorio_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Search Bar + Date + Export */}
            <div className="bg-white rounded-2xl border-2 border-slate-100 p-5">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text" placeholder="Buscar por NUP, suprido, unidade, tipo..."
                            value={localSearch}
                            onChange={e => { setLocalSearch(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-all"
                        />
                    </div>

                    {/* Date Range */}
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400 shrink-0" />
                        <input type="date" value={dateRange.start}
                            onChange={e => { setDateRange(p => ({ ...p, start: e.target.value })); setCurrentPage(1); }}
                            className="px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm" />
                        <span className="text-slate-400 text-sm">até</span>
                        <input type="date" value={dateRange.end}
                            onChange={e => { setDateRange(p => ({ ...p, end: e.target.value })); setCurrentPage(1); }}
                            className="px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm" />
                    </div>

                    {/* Export */}
                    <div className="flex items-center gap-2">
                        <button onClick={handleExportCSV}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-sm">
                            <Download size={15} /> CSV
                        </button>
                        <button onClick={() => window.print()}
                            className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 transition-all shadow-sm">
                            <FileDown size={15} /> PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-1">Filtros Rápidos</span>
                {[
                    { label: 'Todos', value: 'all' },
                    { label: 'Assinados', value: 'signed' },
                    { label: 'Pendentes', value: 'pending' },
                    { label: 'Devolvidos', value: 'returned' }
                ].map(f => (
                    <button key={f.value}
                        onClick={() => { setStatusFilter(f.value); setCurrentPage(1); }}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                            statusFilter === f.value
                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                                : 'bg-white border-2 border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600'
                        }`}>
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b-2 border-slate-100">
                            <tr>
                                <SortableHeader field="nup" label="NUP" />
                                <SortableHeader field="tipo" label="Tipo" />
                                <SortableHeader field="suprido" label="Suprido" />
                                <SortableHeader field="unidade" label="Unidade" />
                                <SortableHeader field="valor" label="Valor" />
                                <SortableHeader field="status" label="Status" />
                                <SortableHeader field="data" label="Data" />
                                <th className="text-center text-xs font-bold px-4 py-3.5 text-slate-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedTasks.length > 0 ? (
                                paginatedTasks.map(task => (
                                    <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-4 py-3.5">
                                            <span className="font-bold text-sm text-slate-800">{task.solicitation?.process_number || 'N/A'}</span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="text-sm text-slate-600">{getDocLabel(task.document_type)}</span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <User size={14} className="text-slate-400" />
                                                <span className="text-sm text-slate-600 truncate max-w-[200px]">
                                                    {task.solicitation?.beneficiary || 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <Building2 size={14} className="text-slate-400" />
                                                <span className="text-sm text-slate-600 truncate max-w-[180px]">
                                                    {task.solicitation?.origin || 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-1">
                                                <DollarSign size={14} className="text-slate-400" />
                                                <span className="text-sm font-bold text-slate-700">{formatCurrency(task.value || 0)}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5"><StatusBadge status={task.status} /></td>
                                        <td className="px-4 py-3.5">
                                            <span className="text-sm text-slate-500">{new Date(task.created_at).toLocaleDateString('pt-BR')}</span>
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <button onClick={() => onNavigate?.('process_detail', task.solicitation_id)}
                                                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition-colors"
                                                title="Visualizar processo">
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="px-4 py-16 text-center">
                                        <FileText size={40} className="mx-auto mb-3 text-slate-200" />
                                        <p className="text-sm text-slate-400 font-medium">Nenhum documento encontrado</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredTasks.length > 0 && (
                    <div className="px-5 py-3.5 border-t-2 border-slate-100 bg-slate-50 flex items-center justify-between">
                        <span className="text-sm text-slate-400">
                            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredTasks.length)} de {filteredTasks.length}
                        </span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                className="p-2 border-2 border-slate-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white">
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-sm min-w-[80px] text-center text-slate-600 font-medium">
                                {currentPage} de {totalPages || 1}
                            </span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                                className="p-2 border-2 border-slate-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
