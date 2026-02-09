import React, { useState, useEffect, useMemo } from 'react';
import {
    FileCheck,
    Search,
    Calendar,
    DollarSign,
    Clock,
    Eye,
    CheckCircle2,
    AlertCircle,
    Loader2,
    User,
    Plane,
    Receipt,
    AlertTriangle,
    FileText,
    MapPin,
    RotateCcw,
    ThumbsUp,
    ThumbsDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SodpaAccountabilityProps {
    darkMode?: boolean;
    onNavigate: (page: string, processId?: string) => void;
}

interface AccountabilityRecord {
    id: string;
    process_number: string;
    solicitation_id: string;
    beneficiary: string;
    destination?: string;
    trip_start?: string;
    trip_end?: string;
    days_granted: number;
    days_used: number;
    amount_granted: number;
    amount_spent: number;
    amount_to_return?: number;
    status: 'PENDING' | 'UNDER_ANALYSIS' | 'APPROVED' | 'REJECTED' | 'PARTIAL_RETURN';
    submitted_at: string;
    documents_count: number;
    has_receipts: boolean;
    has_boarding_pass: boolean;
    has_trip_report: boolean;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    'PENDING': { label: 'Pendente', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock size={12} /> },
    'UNDER_ANALYSIS': { label: 'Em Análise', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Eye size={12} /> },
    'APPROVED': { label: 'Aprovada', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={12} /> },
    'REJECTED': { label: 'Devolvida', color: 'bg-red-100 text-red-700 border-red-200', icon: <RotateCcw size={12} /> },
    'PARTIAL_RETURN': { label: 'Restituição Parcial', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <DollarSign size={12} /> },
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

export const SodpaAccountability: React.FC<SodpaAccountabilityProps> = ({ darkMode = false, onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<AccountabilityRecord[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Fetch accountability records
    useEffect(() => {
        const fetchRecords = async () => {
            setLoading(true);
            try {
                // TODO: Quando a tabela sodpa_accountabilities existir, usar ela
                // Por enquanto, simular dados mockados
                const mockRecords: AccountabilityRecord[] = [
                    {
                        id: '1',
                        process_number: 'NUP 2026/00123',
                        solicitation_id: 'sol-1',
                        beneficiary: 'João da Silva',
                        destination: 'Brasília/DF',
                        trip_start: '2026-01-15',
                        trip_end: '2026-01-18',
                        days_granted: 4,
                        days_used: 3,
                        amount_granted: 1156.00,
                        amount_spent: 867.00,
                        amount_to_return: 289.00,
                        status: 'PENDING',
                        submitted_at: '2026-01-20T10:30:00Z',
                        documents_count: 5,
                        has_receipts: true,
                        has_boarding_pass: true,
                        has_trip_report: false,
                    },
                    {
                        id: '2',
                        process_number: 'NUP 2026/00089',
                        solicitation_id: 'sol-2',
                        beneficiary: 'Maria Santos',
                        destination: 'São Paulo/SP',
                        trip_start: '2026-01-10',
                        trip_end: '2026-01-12',
                        days_granted: 3,
                        days_used: 3,
                        amount_granted: 741.00,
                        amount_spent: 741.00,
                        status: 'UNDER_ANALYSIS',
                        submitted_at: '2026-01-14T14:20:00Z',
                        documents_count: 8,
                        has_receipts: true,
                        has_boarding_pass: true,
                        has_trip_report: true,
                    },
                    {
                        id: '3',
                        process_number: 'NUP 2026/00045',
                        solicitation_id: 'sol-3',
                        beneficiary: 'Carlos Oliveira',
                        destination: 'Rio de Janeiro/RJ',
                        trip_start: '2026-01-05',
                        trip_end: '2026-01-07',
                        days_granted: 3,
                        days_used: 3,
                        amount_granted: 741.00,
                        amount_spent: 741.00,
                        status: 'APPROVED',
                        submitted_at: '2026-01-08T09:00:00Z',
                        documents_count: 6,
                        has_receipts: true,
                        has_boarding_pass: true,
                        has_trip_report: true,
                    },
                ];

                setRecords(mockRecords);
            } catch (err) {
                console.error('Erro ao carregar prestações de contas:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRecords();
    }, []);

    // Filtered records
    const filteredRecords = useMemo(() => {
        let result = [...records];

        // Filter by status
        if (statusFilter !== 'all') {
            result = result.filter(r => r.status === statusFilter);
        }

        // Search
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            result = result.filter(r =>
                r.process_number.toLowerCase().includes(q) ||
                r.beneficiary.toLowerCase().includes(q) ||
                r.destination?.toLowerCase().includes(q)
            );
        }

        return result;
    }, [records, statusFilter, searchTerm]);

    // Stats
    const stats = useMemo(() => ({
        total: records.length,
        pending: records.filter(r => r.status === 'PENDING').length,
        underAnalysis: records.filter(r => r.status === 'UNDER_ANALYSIS').length,
        approved: records.filter(r => r.status === 'APPROVED').length,
        totalToReturn: records.reduce((sum, r) => sum + (r.amount_to_return || 0), 0),
    }), [records]);

    // Document completeness check
    const getCompletenessColor = (record: AccountabilityRecord) => {
        const docs = [record.has_receipts, record.has_boarding_pass, record.has_trip_report];
        const complete = docs.filter(Boolean).length;
        if (complete === 3) return 'text-emerald-500';
        if (complete >= 2) return 'text-amber-500';
        return 'text-red-500';
    };

    if (loading) {
        return (
            <div className={`flex flex-col items-center justify-center h-96 gap-4 ${darkMode ? 'text-white' : ''}`}>
                <Loader2 className="w-10 h-10 text-sky-600 animate-spin" />
                <p className="text-slate-500 font-medium">Carregando prestações de contas...</p>
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
                            <FileCheck size={20} className="text-sky-600" />
                        </div>
                        <div>
                            <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{stats.total}</p>
                            <p className="text-xs text-slate-500">Total de PC</p>
                        </div>
                    </div>
                </div>
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <Clock size={20} className="text-amber-600" />
                        </div>
                        <div>
                            <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{stats.pending}</p>
                            <p className="text-xs text-slate-500">Pendentes</p>
                        </div>
                    </div>
                </div>
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Eye size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{stats.underAnalysis}</p>
                            <p className="text-xs text-slate-500">Em Análise</p>
                        </div>
                    </div>
                </div>
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <DollarSign size={20} className="text-purple-600" />
                        </div>
                        <div>
                            <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{formatCurrency(stats.totalToReturn)}</p>
                            <p className="text-xs text-slate-500">A Restituir</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ FILTERS BAR ═══ */}
            <div className={`rounded-xl border p-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-wrap items-center gap-4">
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

            {/* ═══ RECORDS LIST ═══ */}
            <div className="space-y-4">
                {filteredRecords.length === 0 ? (
                    <div className={`text-center py-16 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileCheck size={32} className="text-sky-400" />
                        </div>
                        <p className={`font-bold ${darkMode ? 'text-white' : 'text-slate-600'}`}>
                            Nenhuma prestação de contas encontrada
                        </p>
                        <p className="text-sm text-slate-400 mt-1">
                            Ajuste os filtros ou aguarde novas prestações.
                        </p>
                    </div>
                ) : (
                    filteredRecords.map(record => {
                        const statusInfo = STATUS_MAP[record.status] || {
                            label: record.status,
                            color: 'bg-slate-100 text-slate-600 border-slate-200',
                            icon: <AlertCircle size={12} />
                        };
                        const needsReturn = (record.amount_to_return || 0) > 0;

                        return (
                            <div
                                key={record.id}
                                className={`rounded-xl border overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${
                                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                                }`}
                                onClick={() => onNavigate('process_detail', record.solicitation_id)}
                            >
                                <div className="p-5">
                                    <div className="flex items-start justify-between">
                                        {/* Left: Main Info */}
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center">
                                                <FileCheck size={24} className="text-white" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                                        {record.process_number}
                                                    </p>
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${statusInfo.color}`}>
                                                        {statusInfo.icon}
                                                        {statusInfo.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 mt-2 text-sm">
                                                    <span className={`flex items-center gap-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        <User size={14} />
                                                        {record.beneficiary}
                                                    </span>
                                                    <span className={`flex items-center gap-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        <MapPin size={14} />
                                                        {record.destination}
                                                    </span>
                                                    <span className={`flex items-center gap-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        <Calendar size={14} />
                                                        {record.trip_start ? formatDate(record.trip_start) : '-'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Values */}
                                        <div className="text-right">
                                            <div className="flex items-center gap-4">
                                                <div>
                                                    <p className="text-xs text-slate-400 uppercase">Concedido</p>
                                                    <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-700'}`}>
                                                        {formatCurrency(record.amount_granted)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400 uppercase">Utilizado</p>
                                                    <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-700'}`}>
                                                        {formatCurrency(record.amount_spent)}
                                                    </p>
                                                </div>
                                                {needsReturn && (
                                                    <div className="pl-4 border-l border-slate-200">
                                                        <p className="text-xs text-red-400 uppercase">A Restituir</p>
                                                        <p className="text-sm font-bold text-red-600">
                                                            {formatCurrency(record.amount_to_return || 0)}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Document Checklist */}
                                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100">
                                        <span className="text-xs text-slate-400 uppercase font-bold">Documentos:</span>
                                        <div className="flex items-center gap-4">
                                            <span className={`flex items-center gap-1 text-xs font-medium ${
                                                record.has_boarding_pass ? 'text-emerald-600' : 'text-slate-400'
                                            }`}>
                                                {record.has_boarding_pass ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                                Cartão de Embarque
                                            </span>
                                            <span className={`flex items-center gap-1 text-xs font-medium ${
                                                record.has_receipts ? 'text-emerald-600' : 'text-slate-400'
                                            }`}>
                                                {record.has_receipts ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                                Comprovantes
                                            </span>
                                            <span className={`flex items-center gap-1 text-xs font-medium ${
                                                record.has_trip_report ? 'text-emerald-600' : 'text-slate-400'
                                            }`}>
                                                {record.has_trip_report ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                                Relatório de Viagem
                                            </span>
                                        </div>
                                        <div className="flex-1" />
                                        <span className="text-xs text-slate-400">
                                            {record.documents_count} documento(s) anexados
                                        </span>
                                    </div>
                                </div>

                                {/* Action Bar (for pending items) */}
                                {record.status === 'PENDING' && (
                                    <div className={`flex items-center justify-end gap-2 px-5 py-3 border-t ${
                                        darkMode ? 'bg-slate-700/50 border-slate-700' : 'bg-slate-50 border-slate-100'
                                    }`}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); alert('Iniciar Análise'); }}
                                            className="px-4 py-2 bg-sky-600 text-white text-sm font-bold rounded-lg hover:bg-sky-700 transition-colors flex items-center gap-2"
                                        >
                                            <Eye size={14} />
                                            Iniciar Análise
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Results Count */}
            <div className="text-center">
                <p className="text-xs text-slate-400">
                    Exibindo {filteredRecords.length} de {records.length} prestações de contas
                </p>
            </div>
        </div>
    );
};
