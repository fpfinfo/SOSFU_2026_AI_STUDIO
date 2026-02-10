import React, { useEffect, useState, useMemo } from 'react';
import {
    ScrollText, User, Clock, FileText, ArrowRightLeft,
    DollarSign, CreditCard, FileCheck2, Trash2, Plus,
    Pencil, ShieldCheck, AlertTriangle, Loader2, ChevronDown,
    ChevronUp, Filter, Search
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
interface AuditEntry {
    id: string;
    source: 'audit_log' | 'tramitacao' | 'document';
    action: string;
    actorName: string;
    description: string;
    fieldName?: string;
    oldValue?: string;
    newValue?: string;
    timestamp: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
}

interface AuditLogTabProps {
    solicitationId: string;
    processDocuments?: any[];
}

// ─────────────────────────────────────────
// Constants
// ─────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
    'PENDING': 'Pendente',
    'DRAFT': 'Rascunho',
    'WAITING_MANAGER': 'Aguardando Atesto',
    'WAITING_SOSFU': 'Em Análise SOSFU',
    'WAITING_SOSFU_ANALYSIS': 'Em Análise SOSFU',
    'WAITING_CORRECTION': 'Devolvida p/ Correção',
    'WAITING_SOSFU_EXECUTION': 'Em Execução (SOSFU)',
    'WAITING_SEFIN_SIGNATURE': 'Aguardando SEFIN',
    'WAITING_SOSFU_PAYMENT': 'Aguardando Pagamento',
    'WAITING_SUPRIDO_CONFIRMATION': 'Pagamento Comunicado',
    'PAID': 'Pago',
    'REJECTED': 'Rejeitado',
    'ARCHIVED': 'Arquivado',
    'PC_PENDING': 'PC Pendente',
    'PC_ANALYSIS': 'PC em Análise',
    'PC_APPROVED': 'PC Aprovada',
};

const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
    'STATUS_CHANGED': { icon: ArrowRightLeft, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', label: 'Tramitação' },
    'VALUE_CHANGED': { icon: DollarSign, color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', label: 'Valor Alterado' },
    'DOCUMENT_CREATED': { icon: Plus, color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200', label: 'Doc. Criado' },
    'DOCUMENT_UPDATED': { icon: Pencil, color: 'text-sky-600', bgColor: 'bg-sky-50 border-sky-200', label: 'Doc. Editado' },
    'DOCUMENT_DELETED': { icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', label: 'Doc. Excluído' },
    'DOCUMENT_SIGNED': { icon: FileCheck2, color: 'text-violet-600', bgColor: 'bg-violet-50 border-violet-200', label: 'Assinatura' },
    'PAYMENT_CONFIRMED': { icon: CreditCard, color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', label: 'Pagamento' },
    'ITEM_ADDED': { icon: Plus, color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200', label: 'Item Adicionado' },
    'ITEM_REMOVED': { icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', label: 'Item Removido' },
    'ANALYSIS_COMPLETED': { icon: ShieldCheck, color: 'text-indigo-600', bgColor: 'bg-indigo-50 border-indigo-200', label: 'Análise' },
    'PROCESS_CREATED': { icon: FileText, color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200', label: 'Processo Criado' },
    'REJECTION': { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', label: 'Rejeição' },
};

const DEFAULT_CONFIG = { icon: ScrollText, color: 'text-gray-600', bgColor: 'bg-gray-50 border-gray-200', label: 'Ação' };

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
function formatDateTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
        ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatRelativeTime(dateStr: string) {
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now.getTime() - then.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `${diffMin}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return then.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getStatusLabel(status: string): string {
    return STATUS_LABELS[status] || status;
}

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────
export const AuditLogTab: React.FC<AuditLogTabProps> = ({ solicitationId, processDocuments = [] }) => {
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [filterSource, setFilterSource] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        if (solicitationId) fetchAllSources();
    }, [solicitationId]);

    const fetchAllSources = async () => {
        setLoading(true);
        try {
            const [auditRes, tramitRes] = await Promise.all([
                // Source 1: audit_logs table
                supabase
                    .from('audit_logs')
                    .select('*')
                    .eq('solicitation_id', solicitationId)
                    .order('created_at', { ascending: false }),
                // Source 2: historico_tramitacao table
                supabase
                    .from('historico_tramitacao')
                    .select('*')
                    .eq('solicitation_id', solicitationId)
                    .order('created_at', { ascending: false }),
            ]);

            const unified: AuditEntry[] = [];

            // Process audit_logs
            if (auditRes.data) {
                for (const log of auditRes.data) {
                    const cfg = ACTION_CONFIG[log.action] || DEFAULT_CONFIG;
                    unified.push({
                        id: `audit-${log.id}`,
                        source: 'audit_log',
                        action: log.action,
                        actorName: log.actor_name || 'Sistema',
                        description: log.description || `${cfg.label}`,
                        fieldName: log.field_name,
                        oldValue: log.old_value,
                        newValue: log.new_value,
                        timestamp: log.created_at,
                        icon: cfg.icon,
                        color: cfg.color,
                        bgColor: cfg.bgColor,
                    });
                }
            }

            // Process historico_tramitacao
            if (tramitRes.data) {
                for (const h of tramitRes.data) {
                    const isRejection = h.status_to === 'REJECTED' || h.status_to === 'WAITING_CORRECTION';
                    const cfg = isRejection ? ACTION_CONFIG['REJECTION'] : ACTION_CONFIG['STATUS_CHANGED'];
                    const desc = h.description || `Tramitou de "${getStatusLabel(h.status_from || '—')}" → "${getStatusLabel(h.status_to)}"`;
                    unified.push({
                        id: `tram-${h.id}`,
                        source: 'tramitacao',
                        action: isRejection ? 'REJECTION' : 'STATUS_CHANGED',
                        actorName: h.actor_name || 'Sistema',
                        description: desc,
                        fieldName: 'status',
                        oldValue: h.status_from,
                        newValue: h.status_to,
                        timestamp: h.created_at,
                        icon: cfg.icon,
                        color: cfg.color,
                        bgColor: cfg.bgColor,
                    });
                }
            }

            // Source 3: Document-level audit from metadata
            if (processDocuments && processDocuments.length > 0) {
                for (const doc of processDocuments) {
                    const auditLog = doc.metadata?.audit_log || [];
                    for (const entry of auditLog) {
                        const actionKey = entry.action === 'CREATE' ? 'DOCUMENT_CREATED'
                            : entry.action === 'UPDATE' ? 'DOCUMENT_UPDATED'
                            : entry.action === 'DELETE' ? 'DOCUMENT_DELETED'
                            : entry.action === 'SIGN' ? 'DOCUMENT_SIGNED'
                            : 'DOCUMENT_UPDATED';
                        const cfg = ACTION_CONFIG[actionKey] || DEFAULT_CONFIG;
                        unified.push({
                            id: `doc-${doc.id}-${entry.timestamp}`,
                            source: 'document',
                            action: actionKey,
                            actorName: entry.user_name || 'Usuário',
                            description: `${cfg.label}: "${doc.title}"`,
                            timestamp: entry.timestamp,
                            icon: cfg.icon,
                            color: cfg.color,
                            bgColor: cfg.bgColor,
                        });
                    }
                }
            }

            // Sort by timestamp descending (most recent first)
            unified.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setEntries(unified);
        } catch (err) {
            console.error('Erro ao buscar logs de auditoria:', err);
        } finally {
            setLoading(false);
        }
    };

    // Filtered entries
    const filteredEntries = useMemo(() => {
        let result = entries;
        if (filterSource !== 'all') {
            result = result.filter(e => e.source === filterSource);
        }
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(e =>
                e.description.toLowerCase().includes(term) ||
                e.actorName.toLowerCase().includes(term) ||
                e.action.toLowerCase().includes(term)
            );
        }
        return result;
    }, [entries, filterSource, searchTerm]);

    const visibleEntries = showAll ? filteredEntries : filteredEntries.slice(0, 20);

    // Stats
    const stats = useMemo(() => ({
        total: entries.length,
        tramitacoes: entries.filter(e => e.source === 'tramitacao').length,
        documentos: entries.filter(e => e.source === 'document').length,
        alteracoes: entries.filter(e => e.source === 'audit_log').length,
    }), [entries]);

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                {/* Stats skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-200/60 space-y-2">
                            <div className="h-3 w-16 bg-gray-200 rounded" />
                            <div className="h-7 w-12 bg-gray-200 rounded" />
                        </div>
                    ))}
                </div>
                {/* Search skeleton */}
                <div className="h-10 w-full bg-gray-100 rounded-xl" />
                {/* Timeline skeleton */}
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 pl-14 pr-4 py-3" style={{ opacity: 1 - i * 0.15 }}>
                            <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
                            <div className="space-y-2 flex-1">
                                <div className="h-4 bg-gray-200 rounded w-3/4" />
                                <div className="h-3 bg-gray-100 rounded w-32" />
                            </div>
                            <div className="h-3 bg-gray-100 rounded w-24 hidden sm:block" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px]">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
                    <ScrollText size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-700">Nenhuma atividade registrada</h3>
                <p className="text-sm text-gray-500 mt-1">Ações neste processo aparecerão aqui.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total', value: stats.total, icon: ScrollText, color: 'text-gray-700', bg: 'bg-gray-50' },
                    { label: 'Tramitações', value: stats.tramitacoes, icon: ArrowRightLeft, color: 'text-blue-700', bg: 'bg-blue-50' },
                    { label: 'Documentos', value: stats.documentos, icon: FileText, color: 'text-violet-700', bg: 'bg-violet-50' },
                    { label: 'Alterações', value: stats.alteracoes, icon: Pencil, color: 'text-amber-700', bg: 'bg-amber-50' },
                ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-gray-200/60`}>
                        <div className="flex items-center gap-2 mb-1">
                            <s.icon size={14} className={s.color} />
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{s.label}</span>
                        </div>
                        <p className={`text-2xl font-black ${s.color} tabular-nums`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar atividade, usuário..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-gray-400" />
                    {[
                        { value: 'all', label: 'Todos' },
                        { value: 'tramitacao', label: 'Tramitações' },
                        { value: 'document', label: 'Documentos' },
                        { value: 'audit_log', label: 'Alterações' },
                    ].map(f => (
                        <button
                            key={f.value}
                            onClick={() => setFilterSource(f.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                filterSource === f.value
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Timeline */}
            <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-gray-200 to-transparent" />

                <div className="space-y-1">
                    {visibleEntries.map((entry, idx) => {
                        const Icon = entry.icon;
                        const isExpanded = expandedId === entry.id;
                        const hasDetails = entry.oldValue || entry.newValue || entry.fieldName;

                        return (
                            <div
                                key={entry.id}
                                className={`relative pl-14 pr-4 py-3 rounded-xl transition-all cursor-pointer group
                                    ${isExpanded ? 'bg-white shadow-md border border-gray-200' : 'hover:bg-gray-50'}
                                `}
                                onClick={() => hasDetails && setExpandedId(isExpanded ? null : entry.id)}
                            >
                                {/* Icon bubble */}
                                <div className={`absolute left-2 top-3 w-10 h-10 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${entry.bgColor}`}>
                                    <Icon size={16} className={entry.color} />
                                </div>

                                {/* Content */}
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-800 leading-snug">
                                            <span className="font-bold">{entry.actorName}</span>
                                            {' '}
                                            <span className="text-gray-600">{entry.description}</span>
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                                <Clock size={10} />
                                                {formatRelativeTime(entry.timestamp)}
                                            </span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${entry.bgColor} ${entry.color}`}>
                                                {entry.source === 'tramitacao' ? 'Tramitação' : entry.source === 'document' ? 'Documento' : 'Alteração'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[11px] text-gray-400 hidden sm:inline" title={formatDateTime(entry.timestamp)}>
                                            {formatDateTime(entry.timestamp)}
                                        </span>
                                        {hasDetails && (
                                            isExpanded
                                                ? <ChevronUp size={14} className="text-gray-400" />
                                                : <ChevronDown size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        )}
                                    </div>
                                </div>

                                {/* Expanded details */}
                                {isExpanded && hasDetails && (
                                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                        {entry.fieldName && (
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="font-bold text-gray-500">Campo:</span>
                                                <span className="px-2 py-0.5 bg-gray-100 rounded font-mono text-gray-700">{entry.fieldName}</span>
                                            </div>
                                        )}
                                        {entry.oldValue && (
                                            <div className="flex items-start gap-2 text-xs">
                                                <span className="font-bold text-red-500 shrink-0 mt-0.5">Anterior:</span>
                                                <span className="text-red-700 bg-red-50 px-2 py-1 rounded break-all">
                                                    {entry.fieldName === 'status' ? getStatusLabel(entry.oldValue) : entry.oldValue}
                                                </span>
                                            </div>
                                        )}
                                        {entry.newValue && (
                                            <div className="flex items-start gap-2 text-xs">
                                                <span className="font-bold text-green-500 shrink-0 mt-0.5">Novo:</span>
                                                <span className="text-green-700 bg-green-50 px-2 py-1 rounded break-all">
                                                    {entry.fieldName === 'status' ? getStatusLabel(entry.newValue) : entry.newValue}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Show More */}
            {filteredEntries.length > 20 && !showAll && (
                <button
                    onClick={() => setShowAll(true)}
                    className="w-full py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                    <ChevronDown size={16} />
                    Ver todas as {filteredEntries.length} atividades
                </button>
            )}

            {/* Footer */}
            <div className="text-center pt-2">
                <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1">
                    <ShieldCheck size={10} />
                    Registro de auditoria conforme Resolução CNJ nº 396/2021 — Política de Gestão Documental
                </p>
            </div>
        </div>
    );
};
