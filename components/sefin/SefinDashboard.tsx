import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    Briefcase, FileText, CheckCircle2, Search, DollarSign, ChevronRight,
    Scale, Loader2, XCircle, Award, FileCheck, CreditCard, Send, AlertTriangle,
    Pen, Clock, Users, ArrowRight, BarChart3, Filter, Inbox, User, X,
    CheckSquare, Square, FileSignature, Eye, Lock, KeyRound, AlertCircle,
    Zap, TrendingUp, Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Tooltip } from '../ui/Tooltip';

// ==================== TYPES ====================
interface SefinDashboardProps {
    onNavigate: (page: string, processId?: string) => void;
    darkMode?: boolean;
}

interface SigningTask {
    id: string;
    solicitation_id: string;
    document_type: string;
    title: string;
    origin: string;
    value: number;
    status: string;
    created_at: string;
    solicitation?: { process_number: string; beneficiary: string; value: number };
}

type ListFilter = 'ALL' | 'PENDING' | 'SIGNED';

// ==================== UTILITIES ====================
const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const getDocIcon = (type: string) => {
    switch (type) {
        case 'PORTARIA_SF': return <FileText size={18} />;
        case 'CERTIDAO_REGULARIDADE': return <Award size={18} />;
        case 'NOTA_EMPENHO': return <DollarSign size={18} />;
        case 'LIQUIDACAO': return <FileCheck size={18} />;
        case 'ORDEM_BANCARIA': return <CreditCard size={18} />;
        default: return <FileText size={18} />;
    }
};

const getDocLabel = (type: string) => {
    switch (type) {
        case 'PORTARIA_SF': return 'Portaria SF';
        case 'CERTIDAO_REGULARIDADE': return 'Certidão';
        case 'NOTA_EMPENHO': return 'NE';
        case 'LIQUIDACAO': return 'DL';
        case 'ORDEM_BANCARIA': return 'OB';
        default: return type;
    }
};

const getDocColor = (type: string) => {
    switch (type) {
        case 'PORTARIA_SF': return { bg: 'bg-sky-100', text: 'text-sky-700' };
        case 'CERTIDAO_REGULARIDADE': return { bg: 'bg-teal-100', text: 'text-teal-700' };
        case 'NOTA_EMPENHO': return { bg: 'bg-amber-100', text: 'text-amber-700' };
        case 'LIQUIDACAO': return { bg: 'bg-violet-100', text: 'text-violet-700' };
        case 'ORDEM_BANCARIA': return { bg: 'bg-rose-100', text: 'text-rose-700' };
        default: return { bg: 'bg-slate-100', text: 'text-slate-700' };
    }
};

// ==================== KPI CARD ====================
interface KPICardProps {
    label: string;
    value: number;
    sublabel: string;
    icon: React.ReactNode;
    gradient: string;
    onClick?: () => void;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, sublabel, icon, gradient, onClick }) => (
    <div
        onClick={onClick}
        className={`rounded-2xl overflow-hidden transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-xl hover:scale-[1.03]' : ''}`}
    >
        <div className={`bg-gradient-to-br ${gradient} p-5 text-white`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</p>
                    <p className="text-4xl font-black mt-1">{value}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">{icon}</div>
            </div>
        </div>
        <div className="px-5 py-2.5 bg-white border border-slate-100 border-t-0 rounded-b-2xl">
            <p className="text-[11px] text-slate-500 font-medium">{sublabel}</p>
        </div>
    </div>
);

// ==================== SIGNATURE CONFIRM MODAL ====================
interface SignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (pin: string) => Promise<void>;
    documentsCount: number;
    totalValue: number;
    isProcessing: boolean;
}

const SignatureConfirmModal: React.FC<SignatureModalProps> = ({
    isOpen, onClose, onConfirm, documentsCount, totalValue, isProcessing
}) => {
    const [pin, setPin] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (isOpen) {
            setPin(['', '', '', '', '', '']);
            setError(null);
            setSuccess(false);
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
    }, [isOpen]);

    const handleChange = (index: number, value: string) => {
        if (value.length > 1) {
            const digits = value.replace(/\D/g, '').slice(0, 6).split('');
            const newPin = [...pin];
            digits.forEach((d, i) => { if (index + i < 6) newPin[index + i] = d; });
            setPin(newPin);
            inputRefs.current[Math.min(index + digits.length, 5)]?.focus();
            return;
        }
        if (!/^\d*$/.test(value)) return;
        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);
        if (value && index < 5) inputRefs.current[index + 1]?.focus();
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) inputRefs.current[index - 1]?.focus();
        if (e.key === 'Enter') handleSubmit();
        if (e.key === 'Escape') onClose();
    };

    const handleSubmit = async () => {
        const pinStr = pin.join('');
        if (pinStr.length !== 6) { setError('Digite todos os 6 dígitos.'); return; }
        setError(null);
        try {
            await onConfirm(pinStr);
            setSuccess(true);
            setTimeout(onClose, 1500);
        } catch {
            setError('Erro ao assinar. Tente novamente.');
            setPin(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm"><Lock size={20} /></div>
                            <div>
                                <h2 className="font-bold text-lg">Confirmar Assinatura</h2>
                                <p className="text-sm text-emerald-100">{documentsCount} {documentsCount === 1 ? 'documento' : 'documentos'}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X size={20} /></button>
                    </div>
                </div>

                <div className="p-6">
                    {/* Summary */}
                    <div className="bg-slate-50 rounded-2xl p-4 mb-6 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-400">Documentos</p>
                            <p className="text-2xl font-black text-slate-800">{documentsCount}</p>
                        </div>
                        {totalValue > 0 && (
                            <div className="text-right">
                                <p className="text-xs text-slate-400">Valor Total</p>
                                <p className="text-xl font-black text-emerald-600">{formatCurrency(totalValue)}</p>
                            </div>
                        )}
                    </div>

                    {success ? (
                        <div className="text-center py-8">
                            <CheckCircle2 size={64} className="mx-auto text-emerald-500 mb-4 animate-bounce" />
                            <h3 className="text-xl font-bold text-slate-800">Assinatura Confirmada!</h3>
                            <p className="text-slate-500 mt-1">Documentos assinados com sucesso.</p>
                        </div>
                    ) : (
                        <>
                            <label className="block text-sm font-medium text-slate-700 mb-3 text-center">
                                Digite seu PIN de 6 dígitos
                            </label>
                            <div className="flex justify-center gap-2.5 mb-6">
                                {pin.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={el => { inputRefs.current[index] = el; }}
                                        type="password" inputMode="numeric" maxLength={6}
                                        value={digit}
                                        onChange={e => handleChange(index, e.target.value)}
                                        onKeyDown={e => handleKeyDown(index, e)}
                                        disabled={isProcessing}
                                        className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                                            error ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50 focus:border-emerald-400'
                                        }`}
                                    />
                                ))}
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-3 mb-4">
                                    <AlertCircle size={16} /><span className="text-sm">{error}</span>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button onClick={onClose} disabled={isProcessing}
                                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors">
                                    Cancelar
                                </button>
                                <button onClick={handleSubmit} disabled={isProcessing || pin.join('').length !== 6}
                                    className={`flex-1 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                        pin.join('').length === 6 ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}>
                                    {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Assinando...</> : <><KeyRound size={16} /> Assinar</>}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <div className="bg-slate-50 px-6 py-3 text-center border-t border-slate-100">
                    <p className="text-[10px] text-slate-400">Assinatura digital com validade jurídica</p>
                </div>
            </div>
        </div>
    );
};

// ==================== TASK CARD ====================
interface TaskCardProps {
    task: SigningTask;
    isSelected: boolean;
    onToggleSelect: () => void;
    onSign: () => void;
    onReject: () => void;
    onView: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, isSelected, onToggleSelect, onSign, onReject, onView }) => {
    const created = new Date(task.created_at);
    const hoursAgo = Math.round((Date.now() - created.getTime()) / (1000 * 60 * 60));
    const isUrgent = hoursAgo > 24;
    const SLA_HOURS = 48;
    const hoursRemaining = SLA_HOURS - hoursAgo;
    const slaPercent = Math.max(0, Math.min(100, (hoursRemaining / SLA_HOURS) * 100));
    const slaColor = hoursRemaining > 24 ? 'bg-emerald-400' : hoursRemaining > 12 ? 'bg-amber-400' : 'bg-red-500';
    const docColor = getDocColor(task.document_type);

    return (
        <div className={`bg-white rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
            isSelected ? 'border-emerald-400 ring-2 ring-emerald-100 shadow-lg' : 'border-slate-200 hover:border-sky-300 hover:shadow-md'
        }`}>
            {/* SLA Progress */}
            <div className="h-1 bg-slate-100 w-full">
                <div className={`h-full ${slaColor} transition-all duration-500`} style={{ width: `${slaPercent}%` }} />
            </div>

            <div className="p-4">
                <div className="flex items-center gap-4">
                    {/* Checkbox */}
                    <button onClick={onToggleSelect}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-400 text-transparent hover:text-emerald-300'
                        }`}>
                        <CheckCircle2 size={14} />
                    </button>

                    {/* Type Badge */}
                    <div className={`w-11 h-11 rounded-xl ${docColor.bg} ${docColor.text} flex items-center justify-center shrink-0`}>
                        {getDocIcon(task.document_type)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 text-sm truncate">
                                {task.solicitation?.process_number || 'N/A'}
                            </span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold ${docColor.bg} ${docColor.text} rounded-full`}>
                                {getDocLabel(task.document_type)}
                            </span>
                            {isUrgent && (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full animate-pulse">
                                    URGENTE
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                            {task.solicitation?.beneficiary || task.title}
                        </p>
                    </div>

                    {/* Value + Time */}
                    <div className="text-right shrink-0">
                        <p className="font-bold text-slate-800 text-sm">{formatCurrency(task.value)}</p>
                        <p className="text-[10px] text-slate-400">Valor do Processo</p>
                        <p className={`text-[11px] ${isUrgent ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                            {hoursAgo < 1 ? 'Agora' : `${hoursAgo}h atrás`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50/80 border-t border-slate-100">
                <Tooltip content="Examinar o documento antes de assinar" position="top">
                <button onClick={onView}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-sky-50 hover:border-sky-200 hover:text-sky-700 transition-all">
                    <Eye size={13} /> Examinar
                </button>
                </Tooltip>
                <div className="flex-1" />
                <Tooltip content="Devolver o documento para correção do solicitante" position="top">
                <button onClick={onReject}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 transition-all">
                    <XCircle size={13} /> Devolver
                </button>
                </Tooltip>
                <Tooltip content="Assinar digitalmente como Ordenador de Despesa" position="top">
                <button onClick={onSign}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 shadow-sm transition-all">
                    <Pen size={13} /> Assinar
                </button>
                </Tooltip>
            </div>
        </div>
    );
};

// ==================== MAIN COMPONENT ====================
export const SefinDashboard: React.FC<SefinDashboardProps> = ({ onNavigate, darkMode = false }) => {
    const [loading, setLoading] = useState(true);
    const [pendingAuth, setPendingAuth] = useState<any[]>([]);
    const [approvedHistory, setApprovedHistory] = useState<any[]>([]);
    const [signingTasks, setSigningTasks] = useState<SigningTask[]>([]);
    const [signedTasks, setSignedTasks] = useState<SigningTask[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [userName, setUserName] = useState('');
    const [listFilter, setListFilter] = useState<ListFilter>('PENDING');
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [showSignModal, setShowSignModal] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => { fetchSefinData(); }, []);

    const fetchSefinData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
                setUserName(profile?.full_name || 'Ordenador');
            }

            const { data: solicitations } = await supabase.from('solicitations').select('*')
                .in('status', ['WAITING_SEFIN_SIGNATURE', 'WAITING_SOSFU_PAYMENT', 'WAITING_SUPRIDO_CONFIRMATION', 'PAID'])
                .order('created_at', { ascending: false });

            if (solicitations) {
                setPendingAuth(solicitations.filter(s => s.status === 'WAITING_SEFIN_SIGNATURE'));
                setApprovedHistory(solicitations.filter(s => s.status !== 'WAITING_SEFIN_SIGNATURE'));
            }

            // Fetch ALL signing tasks
            const { data: allTasks } = await supabase.from('sefin_signing_tasks').select('*').order('created_at', { ascending: false });

            if (allTasks) {
                const enriched: SigningTask[] = [];
                // Batch enrich with solicitation data
                const solIds = [...new Set(allTasks.map(t => t.solicitation_id))];
                const solMap: Record<string, any> = {};
                if (solIds.length > 0) {
                    const { data: sols } = await supabase.from('solicitations')
                        .select('id, process_number, beneficiary, value').in('id', solIds);
                    if (sols) sols.forEach(s => { solMap[s.id] = s; });
                }
                for (const task of allTasks) {
                    enriched.push({ ...task, solicitation: solMap[task.solicitation_id] });
                }
                setSigningTasks(enriched.filter(t => t.status === 'PENDING'));
                setSignedTasks(enriched.filter(t => t.status === 'SIGNED'));
            }
        } catch (error) {
            console.error("Erro SEFIN:", error);
        } finally { setLoading(false); }
    };

    // ==================== COMPUTED ====================
    const totalPendingValue = useMemo(() => {
        const seen = new Set<string>();
        return signingTasks.reduce((s, t) => {
            if (t.solicitation_id && !seen.has(t.solicitation_id)) {
                seen.add(t.solicitation_id);
                return s + (t.value || 0);
            }
            return s;
        }, 0);
    }, [signingTasks]);
    const urgentCount = useMemo(() => {
        return signingTasks.filter(t => {
            const h = (Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
            return h > 24;
        }).length;
    }, [signingTasks]);

    const filteredTasks = useMemo(() => {
        const base = listFilter === 'SIGNED' ? signedTasks : signingTasks;
        if (!searchTerm) return base;
        const q = searchTerm.toLowerCase();
        return base.filter(t =>
            t.title.toLowerCase().includes(q) ||
            t.solicitation?.process_number?.toLowerCase().includes(q) ||
            t.solicitation?.beneficiary?.toLowerCase().includes(q)
        );
    }, [signingTasks, signedTasks, listFilter, searchTerm]);

    // ==================== HANDLERS ====================
    const handleToggleSelect = useCallback((id: string) => {
        setSelectedTaskIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        if (selectedTaskIds.size === signingTasks.length) {
            setSelectedTaskIds(new Set());
        } else {
            setSelectedTaskIds(new Set(signingTasks.map(t => t.id)));
        }
    }, [signingTasks, selectedTaskIds.size]);

    const handleBatchSign = async (_pin: string) => {
        if (selectedTaskIds.size === 0) return;
        setProcessing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const now = new Date().toISOString();

            // ─── PHASE 1: Sign ALL selected tasks FIRST ───
            const affectedSolicitationIds = new Set<string>();
            for (const taskId of selectedTaskIds) {
                const task = signingTasks.find(t => t.id === taskId);
                if (!task) continue;

                await supabase.from('sefin_signing_tasks').update({
                    status: 'SIGNED', signed_by: user?.id, signed_at: now
                }).eq('id', taskId);

                await supabase.from('process_documents').update({ status: 'SIGNED' })
                    .eq('solicitation_id', task.solicitation_id).eq('document_type', task.document_type);

                affectedSolicitationIds.add(task.solicitation_id);
            }

            // ─── PHASE 2: Check each solicitation AFTER all tasks signed ───
            for (const solId of affectedSolicitationIds) {
                const { data: remaining } = await supabase.from('sefin_signing_tasks')
                    .select('id').eq('solicitation_id', solId).eq('status', 'PENDING');

                if (!remaining || remaining.length === 0) {
                    // All SEFIN tasks for this process are signed → advance status
                    await supabase.from('solicitations').update({
                        status: 'WAITING_SOSFU_PAYMENT'
                    }).eq('id', solId);

                    await supabase.from('historico_tramitacao').insert({
                        solicitation_id: solId,
                        status_from: 'WAITING_SEFIN_SIGNATURE',
                        status_to: 'WAITING_SOSFU_PAYMENT',
                        actor_name: user?.email,
                        description: 'Todos os documentos assinados pelo Ordenador de Despesa.',
                        created_at: now
                    });
                }
            }

            setSelectedTaskIds(new Set());
            fetchSefinData();
        } catch (err) {
            console.error(err);
            throw err;
        } finally { setProcessing(false); }
    };

    const handleSingleSign = async (taskId: string) => {
        setSelectedTaskIds(new Set([taskId]));
        setShowSignModal(true);
    };

    const handleRejectDocument = async (task: SigningTask) => {
        if (!rejectReason.trim()) { alert('Informe o motivo.'); return; }
        setProcessing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const now = new Date().toISOString();

            await supabase.from('sefin_signing_tasks').update({
                status: 'REJECTED', rejection_reason: rejectReason, signed_by: user?.id, signed_at: now
            }).eq('id', task.id);

            await supabase.from('solicitations').update({ status: 'WAITING_SOSFU' })
                .eq('id', task.solicitation_id);

            await supabase.from('historico_tramitacao').insert({
                solicitation_id: task.solicitation_id,
                status_from: 'WAITING_SEFIN_SIGNATURE',
                status_to: 'WAITING_SOSFU',
                actor_name: user?.email,
                description: `Documento devolvido: ${rejectReason}`,
                created_at: now
            });

            setRejectingId(null);
            setRejectReason('');
            fetchSefinData();
        } catch (err) {
            console.error(err);
            alert('Erro ao devolver.');
        } finally { setProcessing(false); }
    };

    // ==================== LOADING ====================
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-400 animate-ping opacity-30" />
                    <Loader2 className="w-10 h-10 text-emerald-600 animate-spin absolute top-3 left-3" />
                </div>
                <p className="text-slate-500 font-medium">Carregando gabinete...</p>
            </div>
        );
    }

    // ==================== RENDER ====================
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 font-sans space-y-8">

            {/* ===== HEADER ===== */}
            <div className="bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-900 rounded-3xl p-8 shadow-2xl relative overflow-hidden text-white">
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-1">Secretaria de Finanças</p>
                        <h1 className="text-3xl font-black tracking-tight">
                            Gabinete do Ordenador
                        </h1>
                        <p className="text-emerald-200 text-sm mt-2 max-w-xl leading-relaxed">
                            Bom dia, <strong>{userName}</strong>. Gerencie assinaturas de despesa, portarias e atos de concessão.
                        </p>
                    </div>
                    <div className="hidden lg:flex items-center gap-4">
                        <div className="text-center p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                            <p className="text-3xl font-black text-amber-300">{signingTasks.length}</p>
                            <p className="text-[10px] text-emerald-200 uppercase tracking-widest">Pendentes</p>
                        </div>
                        <div className="text-center p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                            <p className="text-3xl font-black text-emerald-300">{signedTasks.length}</p>
                            <p className="text-[10px] text-emerald-200 uppercase tracking-widest">Assinados</p>
                        </div>
                    </div>
                </div>
                {/* Decorative elements */}
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-600/20 rounded-full blur-3xl" />
                <div className="absolute right-20 -bottom-20 w-60 h-60 bg-teal-500/15 rounded-full blur-3xl" />
                <div className="absolute left-1/2 top-0 w-96 h-96 bg-emerald-400/5 rounded-full blur-3xl" />
            </div>

            {/* ===== KPI CARDS ===== */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <KPICard
                    label="Pendentes" value={signingTasks.length}
                    sublabel="Aguardando assinatura"
                    icon={<FileText size={24} />}
                    gradient="from-amber-400 to-orange-500"
                    onClick={() => setListFilter('PENDING')}
                />
                <KPICard
                    label="Assinados" value={signedTasks.length}
                    sublabel="Documentos processados"
                    icon={<CheckCircle2 size={24} />}
                    gradient="from-emerald-400 to-teal-500"
                    onClick={() => setListFilter('SIGNED')}
                />
                <KPICard
                    label="Urgentes" value={urgentCount}
                    sublabel="+24h sem assinatura"
                    icon={<AlertTriangle size={24} />}
                    gradient="from-red-400 to-rose-500"
                />
                <KPICard
                    label="Valor Total" value={0}
                    sublabel={formatCurrency(totalPendingValue)}
                    icon={<DollarSign size={24} />}
                    gradient="from-blue-400 to-indigo-500"
                />
            </div>

            {/* ===== FINANCIAL SUMMARY BAR ===== */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-5 flex items-center justify-between text-white shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-xl"><BarChart3 size={22} className="text-amber-400" /></div>
                    <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">Volume Financeiro Pendente</p>
                        <p className="text-2xl font-black text-white">{formatCurrency(totalPendingValue)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-8">
                    <div className="text-center">
                        <p className="text-2xl font-black text-amber-400">{signingTasks.filter(t => t.document_type === 'PORTARIA_SF').length}</p>
                        <p className="text-[10px] text-slate-400 uppercase">Portarias</p>
                    </div>
                    <div className="w-px h-10 bg-slate-600" />
                    <div className="text-center">
                        <p className="text-2xl font-black text-sky-400">{signingTasks.filter(t => t.document_type === 'CERTIDAO_REGULARIDADE').length}</p>
                        <p className="text-[10px] text-slate-400 uppercase">Certidões</p>
                    </div>
                    <div className="w-px h-10 bg-slate-600" />
                    <div className="text-center">
                        <p className="text-2xl font-black text-emerald-400">{signingTasks.filter(t => t.document_type === 'NOTA_EMPENHO').length}</p>
                        <p className="text-[10px] text-slate-400 uppercase">NEs</p>
                    </div>
                </div>
            </div>

            {/* ===== DOCUMENT LIST ===== */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Filter Toolbar */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/70">
                    <div className="flex items-center gap-2">
                        <Filter size={15} className="text-slate-400" />
                        {(['PENDING', 'SIGNED'] as ListFilter[]).map(f => (
                            <button key={f} onClick={() => setListFilter(f)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                    listFilter === f ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'
                                }`}>
                                {f === 'PENDING' && <><Inbox size={14} className="inline mr-1.5" />Pendentes</>}
                                {f === 'SIGNED' && <><CheckCircle2 size={14} className="inline mr-1.5" />Assinados</>}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Buscar..." value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300" />
                        </div>
                    </div>
                </div>

                {/* Batch Actions Toolbar */}
                {listFilter === 'PENDING' && signingTasks.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                        <div className="flex items-center gap-3">
                            <button onClick={handleSelectAll}
                                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-emerald-600 transition-colors font-medium">
                                {selectedTaskIds.size > 0 ? <CheckSquare size={16} className="text-emerald-600" /> : <Square size={16} />}
                                {selectedTaskIds.size > 0 ? 'Desselecionar' : 'Selecionar Todos'}
                            </button>
                            {selectedTaskIds.size > 0 && (
                                <>
                                    <span className="text-sm font-bold text-emerald-600">{selectedTaskIds.size} selecionado(s)</span>
                                    <button onClick={() => setSelectedTaskIds(new Set())} className="text-slate-400 hover:text-slate-600">
                                        <X size={14} />
                                    </button>
                                </>
                            )}
                        </div>
                        {selectedTaskIds.size > 0 && (
                            <button onClick={() => setShowSignModal(true)} disabled={processing}
                                className="flex items-center gap-2 px-5 py-2 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 shadow-md transition-all disabled:opacity-50">
                                <FileSignature size={16} />
                                Assinar {selectedTaskIds.size} Doc{selectedTaskIds.size > 1 ? 's' : ''} em Lote
                            </button>
                        )}
                    </div>
                )}

                {/* Tasks List */}
                <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                    {filteredTasks.length > 0 ? (
                        filteredTasks.map(task => {
                            if (listFilter === 'SIGNED') {
                                // Signed items — compact view
                                const docColor = getDocColor(task.document_type);
                                return (
                                    <div key={task.id}
                                        onClick={() => onNavigate('process_detail', task.solicitation_id)}
                                        className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-all cursor-pointer">
                                        <div className={`w-10 h-10 rounded-xl ${docColor.bg} ${docColor.text} flex items-center justify-center`}>
                                            <CheckCircle2 size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate">{task.solicitation?.process_number}</p>
                                            <p className="text-xs text-slate-500 truncate">{task.solicitation?.beneficiary} • {getDocLabel(task.document_type)}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">Assinado</span>
                                        </div>
                                    </div>
                                );
                            }

                            // Pending: handle reject inline
                            if (rejectingId === task.id) {
                                return (
                                    <div key={task.id} className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
                                        <p className="text-sm font-bold text-red-800 mb-3">Devolver: {task.title}</p>
                                        <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                                            placeholder="Motivo da devolução..."
                                            className="w-full p-3 border border-red-200 rounded-xl text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-red-300" autoFocus />
                                        <div className="flex gap-2 mt-3">
                                            <button onClick={() => handleRejectDocument(task)} disabled={processing}
                                                className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-50">
                                                Confirmar Devolução
                                            </button>
                                            <button onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                                className="px-4 py-2 text-slate-500 text-xs font-medium hover:bg-slate-100 rounded-lg">
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <TaskCard key={task.id} task={task}
                                    isSelected={selectedTaskIds.has(task.id)}
                                    onToggleSelect={() => handleToggleSelect(task.id)}
                                    onSign={() => handleSingleSign(task.id)}
                                    onReject={() => setRejectingId(task.id)}
                                    onView={() => onNavigate('process_detail', task.solicitation_id)}
                                />
                            );
                        })
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={40} className="text-emerald-400" />
                            </div>
                            <p className="text-slate-600 font-bold">Nenhum documento {listFilter === 'SIGNED' ? 'assinado' : 'pendente'}</p>
                            <p className="text-sm text-slate-400 mt-1">
                                {listFilter === 'SIGNED' ? 'Os documentos assinados aparecerão aqui.' : 'Todos os documentos foram tratados.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ===== PROCESSES TABLE ===== */}
            {pendingAuth.length > 0 && (
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg"><Scale size={18} /></div>
                        <h3 className="text-lg font-bold text-gray-800">Processos em Andamento</h3>
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{pendingAuth.length}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {pendingAuth.map(proc => (
                            <div key={proc.id} onClick={() => onNavigate('process_detail', proc.id)}
                                className="bg-white p-5 rounded-2xl border-2 border-transparent hover:border-emerald-300 shadow-sm hover:shadow-lg transition-all cursor-pointer group">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">Assinatura Pendente</span>
                                    <span className="text-[10px] text-slate-400">{new Date(proc.created_at).toLocaleDateString()}</span>
                                </div>
                                <h4 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-emerald-700 transition-colors">{proc.process_number}</h4>
                                <p className="text-sm text-gray-500 line-clamp-1">{proc.beneficiary}</p>
                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                                    <span className="font-bold text-gray-700">{formatCurrency(proc.value || 0)}</span>
                                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                        Examinar <ChevronRight size={14} />
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ===== HISTORY ===== */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Histórico de Autorizações</h3>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="divide-y divide-slate-100">
                        {approvedHistory.length === 0 ? (
                            <div className="p-10 text-center text-slate-400 text-sm">Nenhum histórico.</div>
                        ) : (
                            approvedHistory.slice(0, 8).map(proc => (
                                <div key={proc.id} onClick={() => onNavigate('process_detail', proc.id)}
                                    className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                            <Briefcase size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800 group-hover:text-emerald-700 transition-colors">{proc.process_number}</p>
                                            <p className="text-xs text-gray-500">{proc.beneficiary}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700">Autorizado</span>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{formatCurrency(proc.value || 0)}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ===== SIGNATURE MODAL ===== */}
            <SignatureConfirmModal
                isOpen={showSignModal}
                onClose={() => { setShowSignModal(false); setSelectedTaskIds(new Set()); }}
                onConfirm={handleBatchSign}
                documentsCount={selectedTaskIds.size}
                totalValue={(() => {
                    const seen = new Set<string>();
                    return [...selectedTaskIds].reduce((s, id) => {
                        const t = signingTasks.find(x => x.id === id);
                        if (t?.solicitation_id && !seen.has(t.solicitation_id)) {
                            seen.add(t.solicitation_id);
                            return s + (t?.value || 0);
                        }
                        return s;
                    }, 0);
                })()}
                isProcessing={processing}
            />
        </div>
    );
};