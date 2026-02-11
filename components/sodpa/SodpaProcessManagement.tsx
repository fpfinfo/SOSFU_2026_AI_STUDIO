import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Plane,
    Search,
    Filter,
    Calendar,
    MapPin,
    DollarSign,
    Clock,
    Eye,
    Send,
    RotateCcw,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ChevronDown,
    X,
    User,
    FileText,
    Building
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SodpaProcessManagementProps {
    darkMode?: boolean;
    onNavigate: (page: string, processId?: string) => void;
}

interface DiariasProcess {
    id: string;
    process_number: string;
    beneficiary: string;
    beneficiary_cargo?: string;
    destination?: string;
    departure_date?: string;
    return_date?: string;
    days_count?: number;
    daily_value?: number;
    total_value?: number;
    status: string;
    created_at: string;
    unit?: string;
    request_type?: string; // 'DIARIAS' | 'PASSAGEM' | 'AMBOS'
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    'WAITING_SODPA_ANALYSIS': { label: 'Aguardando Análise', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock size={12} /> },
    'WAITING_SODPA_CALC': { label: 'Cálculo Pendente', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <DollarSign size={12} /> },
    'WAITING_PASSAGE_ISSUE': { label: 'Emitir Passagem', color: 'bg-teal-100 text-teal-700 border-teal-200', icon: <Plane size={12} /> },
    'WAITING_SEFIN_SIGNATURE': { label: 'Aguardando SEFIN', color: 'bg-teal-100 text-teal-700 border-teal-200', icon: <Send size={12} /> },
    'TRIP_IN_PROGRESS': { label: 'Viagem em Curso', color: 'bg-sky-100 text-sky-700 border-sky-200', icon: <Plane size={12} /> },
    'APPROVED': { label: 'Aprovado', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={12} /> },
    'REJECTED': { label: 'Devolvido', color: 'bg-red-100 text-red-700 border-red-200', icon: <RotateCcw size={12} /> },
};

const REQUEST_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    'DIARIAS': { label: 'Diárias', icon: <DollarSign size={14} />, color: 'text-emerald-600' },
    'PASSAGEM': { label: 'Passagem Aérea', icon: <Plane size={14} />, color: 'text-sky-600' },
    'AMBOS': { label: 'Diárias + Passagem', icon: <FileText size={14} />, color: 'text-teal-600' },
};

type FilterTab = 'all' | 'diarias' | 'passagens';

const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateStr: string) => 
    new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

export const SodpaProcessManagement: React.FC<SodpaProcessManagementProps> = ({ darkMode = false, onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [processes, setProcesses] = useState<DiariasProcess[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTab, setFilterTab] = useState<FilterTab>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);

    // Fetch data
    useEffect(() => {
        const fetchProcesses = async () => {
            setLoading(true);
            try {
                // TODO: Quando a tabela sodpa_requests existir, usar ela
                // Por enquanto, simular com solicitations filtradas
                const { data, error } = await supabase
                    .from('solicitations')
                    .select('*')
                    .in('status', [
                        'WAITING_SODPA_ANALYSIS',
                        'WAITING_SODPA_CALC', 
                        'WAITING_PASSAGE_ISSUE',
                        'WAITING_SEFIN_SIGNATURE',
                        'TRIP_IN_PROGRESS'
                    ])
                    .order('created_at', { ascending: false });

                if (data) {
                    // Map to DiariasProcess format
                    const mapped: DiariasProcess[] = data.map(s => ({
                        id: s.id,
                        process_number: s.process_number || 'N/A',
                        beneficiary: s.beneficiary || 'Não informado',
                        beneficiary_cargo: s.beneficiary_cargo,
                        destination: s.destination || s.unit,
                        departure_date: s.start_date,
                        return_date: s.end_date,
                        days_count: s.days_count || 1,
                        daily_value: s.daily_value || 0,
                        total_value: s.value || 0,
                        status: s.status,
                        created_at: s.created_at,
                        unit: s.unit,
                        request_type: s.request_type || 'DIARIAS',
                    }));
                    setProcesses(mapped);
                }
            } catch (err) {
                console.error('Erro ao carregar processos SODPA:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProcesses();
    }, []);

    // Filtered processes
    const filteredProcesses = useMemo(() => {
        let result = [...processes];

        // Filter by type tab
        if (filterTab === 'diarias') {
            result = result.filter(p => p.request_type === 'DIARIAS' || p.request_type === 'AMBOS');
        } else if (filterTab === 'passagens') {
            result = result.filter(p => p.request_type === 'PASSAGEM' || p.request_type === 'AMBOS');
        }

        // Filter by status
        if (statusFilter !== 'all') {
            result = result.filter(p => p.status === statusFilter);
        }

        // Search
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            result = result.filter(p =>
                p.process_number.toLowerCase().includes(q) ||
                p.beneficiary.toLowerCase().includes(q) ||
                p.destination?.toLowerCase().includes(q)
            );
        }

        return result;
    }, [processes, filterTab, statusFilter, searchTerm]);

    // Stats
    const stats = useMemo(() => ({
        total: processes.length,
        pendingAnalysis: processes.filter(p => p.status === 'WAITING_SODPA_ANALYSIS').length,
        pendingCalc: processes.filter(p => p.status === 'WAITING_SODPA_CALC').length,
        pendingPassage: processes.filter(p => p.status === 'WAITING_PASSAGE_ISSUE').length,
        totalValue: processes.reduce((sum, p) => sum + (p.total_value || 0), 0),
    }), [processes]);

    if (loading) {
        return (
            <div className={`flex flex-col items-center justify-center h-96 gap-4 ${darkMode ? 'text-white' : ''}`}>
                <Loader2 className="w-10 h-10 text-sky-600 animate-spin" />
                <p className="text-slate-500 font-medium">Carregando processos...</p>
            </div>
        );
    }

    return (
        <div className={`max-w-[1400px] mx-auto px-6 py-8 space-y-6 animate-in fade-in ${darkMode ? 'text-white' : ''}`}>
            {/* ═══ HEADER WITH STATS ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
                            <Plane size={20} className="text-sky-600" />
                        </div>
                        <div>
                            <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{stats.total}</p>
                            <p className="text-xs text-slate-500">Processos Ativos</p>
                        </div>
                    </div>
                </div>
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <Clock size={20} className="text-amber-600" />
                        </div>
                        <div>
                            <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{stats.pendingAnalysis}</p>
                            <p className="text-xs text-slate-500">Aguardando Análise</p>
                        </div>
                    </div>
                </div>
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                            <DollarSign size={20} className="text-teal-600" />
                        </div>
                        <div>
                            <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{stats.pendingCalc}</p>
                            <p className="text-xs text-slate-500">Cálculo Pendente</p>
                        </div>
                    </div>
                </div>
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <DollarSign size={20} className="text-emerald-600" />
                        </div>
                        <div>
                            <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{formatCurrency(stats.totalValue)}</p>
                            <p className="text-xs text-slate-500">Valor Total</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ FILTERS BAR ═══ */}
            <div className={`rounded-xl border p-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-wrap items-center gap-4">
                    {/* Type Tabs */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                        {([
                            { id: 'all' as FilterTab, label: 'Todas' },
                            { id: 'diarias' as FilterTab, label: 'Diárias' },
                            { id: 'passagens' as FilterTab, label: 'Passagens' },
                        ]).map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setFilterTab(tab.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    filterTab === tab.id
                                        ? 'bg-sky-500 text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-white'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className={`px-3 py-2 rounded-lg border text-sm ${
                            darkMode 
                                ? 'bg-slate-700 border-slate-600 text-white' 
                                : 'bg-white border-slate-200 text-slate-700'
                        }`}
                    >
                        <option value="all">Todos os Status</option>
                        {Object.entries(STATUS_MAP).map(([key, { label }]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Search */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar NUP, beneficiário, destino..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className={`pl-9 pr-4 py-2 rounded-lg border text-sm w-72 focus:outline-none focus:ring-2 focus:ring-sky-200 ${
                                darkMode 
                                    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                                    : 'bg-slate-50 border-slate-200'
                            }`}
                        />
                    </div>
                </div>
            </div>

            {/* ═══ PROCESSES TABLE ═══ */}
            <div className={`rounded-xl border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                {/* Table Header */}
                <div className={`grid grid-cols-12 gap-4 px-4 py-3 text-xs font-bold uppercase tracking-wider ${
                    darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-50 text-slate-500'
                }`}>
                    <div className="col-span-2">Processo</div>
                    <div className="col-span-2">Beneficiário</div>
                    <div className="col-span-2">Destino</div>
                    <div className="col-span-2">Período</div>
                    <div className="col-span-1">Valor</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-1 text-center">Ações</div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-slate-100">
                    {filteredProcesses.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Plane size={32} className="text-sky-400" />
                            </div>
                            <p className={`font-bold ${darkMode ? 'text-white' : 'text-slate-600'}`}>
                                Nenhum processo encontrado
                            </p>
                            <p className="text-sm text-slate-400 mt-1">
                                Ajuste os filtros ou aguarde novas solicitações.
                            </p>
                        </div>
                    ) : (
                        filteredProcesses.map(process => {
                            const statusInfo = STATUS_MAP[process.status] || { 
                                label: process.status, 
                                color: 'bg-slate-100 text-slate-600 border-slate-200',
                                icon: <AlertCircle size={12} />
                            };
                            const typeInfo = REQUEST_TYPE_LABELS[process.request_type || 'DIARIAS'];

                            return (
                                <div
                                    key={process.id}
                                    className={`grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-slate-50 transition-colors cursor-pointer ${
                                        darkMode ? 'hover:bg-slate-700/50' : ''
                                    }`}
                                    onClick={() => onNavigate('process_detail', process.id)}
                                >
                                    {/* Processo */}
                                    <div className="col-span-2">
                                        <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                            {process.process_number}
                                        </p>
                                        <div className={`flex items-center gap-1 text-xs mt-0.5 ${typeInfo.color}`}>
                                            {typeInfo.icon}
                                            <span>{typeInfo.label}</span>
                                        </div>
                                    </div>

                                    {/* Beneficiário */}
                                    <div className="col-span-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                <User size={14} className="text-slate-500" />
                                            </div>
                                            <div>
                                                <p className={`text-sm font-medium truncate max-w-[150px] ${darkMode ? 'text-white' : 'text-slate-700'}`}>
                                                    {process.beneficiary}
                                                </p>
                                                {process.beneficiary_cargo && (
                                                    <p className="text-xs text-slate-400 truncate max-w-[150px]">
                                                        {process.beneficiary_cargo}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Destino */}
                                    <div className="col-span-2">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin size={14} className="text-slate-400" />
                                            <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                {process.destination || '-'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Período */}
                                    <div className="col-span-2">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={14} className="text-slate-400" />
                                            <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                {process.departure_date ? formatDate(process.departure_date) : '-'}
                                            </span>
                                        </div>
                                        {process.days_count && (
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {process.days_count} dia(s)
                                            </p>
                                        )}
                                    </div>

                                    {/* Valor */}
                                    <div className="col-span-1">
                                        <p className={`text-sm font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                            {formatCurrency(process.total_value || 0)}
                                        </p>
                                    </div>

                                    {/* Status */}
                                    <div className="col-span-2">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${statusInfo.color}`}>
                                            {statusInfo.icon}
                                            {statusInfo.label}
                                        </span>
                                    </div>

                                    {/* Ações */}
                                    <div className="col-span-1 flex items-center justify-center gap-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onNavigate('process_detail', process.id); }}
                                            className="p-2 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                                            title="Ver Detalhes"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Results Count */}
            <div className="text-center">
                <p className="text-xs text-slate-400">
                    Exibindo {filteredProcesses.length} de {processes.length} processos
                </p>
            </div>
        </div>
    );
};
