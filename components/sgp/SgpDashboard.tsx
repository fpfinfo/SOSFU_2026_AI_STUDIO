import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    Briefcase, FileText, CheckCircle2, Search, DollarSign,
    Loader2, XCircle, FileCheck, CreditCard, Send,
    Inbox, CheckSquare, Square, X, FileSignature, Users, Eye, UserPlus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Tooltip } from '../ui/Tooltip';
import { usePriorityScore, PRIORITY_STYLES } from '../../hooks/usePriorityScore';
import { useStaleProcesses } from '../../hooks/useStaleProcesses';
import { StaleProcessBanner } from '../ui/StaleProcessBanner';
import { useRealtimeInbox } from '../../hooks/useRealtimeInbox';
import { AssignModal } from '../AssignModal';

// ==================== TYPES ====================
interface SgpDashboardProps {
    onNavigate: (page: string, processId?: string) => void;
    darkMode?: boolean;
    userProfile?: any;
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
    process_number: string;
    beneficiary: string;
    sgp_analyst_id?: string | null;
    sgp_analyst_name?: string | null;
}

type ListFilter = 'PENDING' | 'SIGNED';
type QueueTab = 'inbox' | 'minha_fila' | 'processados';

// ==================== UTILITIES ====================
const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const getDocIcon = (type: string) => {
    switch (type) {
        case 'PORTARIA_SF': return <FileText size={16} />;
        case 'NOTA_EMPENHO': return <CreditCard size={16} />;
        case 'CERTIDAO_REGULARIDADE': return <FileCheck size={16} />;
        case 'DOCUMENTO_LIQUIDACAO': return <DollarSign size={16} />;
        default: return <FileText size={16} />;
    }
};

const getDocLabel = (type: string) => {
    switch (type) {
        case 'PORTARIA_SF': return 'Portaria';
        case 'NOTA_EMPENHO': return 'Nota de Empenho';
        case 'CERTIDAO_REGULARIDADE': return 'Certidão';
        case 'DOCUMENTO_LIQUIDACAO': return 'Doc. Liquidação';
        default: return type;
    }
};

const getDocColor = (type: string) => {
    switch (type) {
        case 'PORTARIA_SF': return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' };
        case 'NOTA_EMPENHO': return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' };
        case 'CERTIDAO_REGULARIDADE': return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' };
        default: return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
    }
};

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
    const [pin, setPin] = useState(['', '', '', '']);
    const [error, setError] = useState('');
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (isOpen) { setPin(['', '', '', '']); setError(''); setTimeout(() => inputsRef.current[0]?.focus(), 100); }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleChange = (index: number, value: string) => {
        if (!/^\d?$/.test(value)) return;
        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);
        setError('');
        if (value && index < 3) inputsRef.current[index + 1]?.focus();
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    const handleSubmit = async () => {
        const fullPin = pin.join('');
        if (fullPin.length < 4) return;
        try {
            await onConfirm(fullPin);
            onClose();
        } catch (err: any) {
            setError(err?.message || 'PIN inválido. Tente novamente.');
            setPin(['', '', '', '']);
            setTimeout(() => inputsRef.current[0]?.focus(), 100);
        }
    };

    const isFilled = pin.every(d => d !== '');

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileSignature className="text-emerald-600" size={28} />
                    </div>
                    <h2 className="text-xl font-black text-slate-800">Confirmar Assinatura</h2>
                    <p className="text-sm text-slate-500 mt-2">
                        {documentsCount} documento{documentsCount > 1 ? 's' : ''} • {formatCurrency(totalValue)}
                    </p>
                </div>

                {/* PIN Input */}
                <div className="mb-2">
                    <div className="flex items-center justify-center gap-3 mb-3">
                        {pin.map((digit, i) => (
                            <input key={i} ref={el => { inputsRef.current[i] = el; }}
                                type="password" inputMode="numeric" maxLength={1} value={digit}
                                onChange={e => handleChange(i, e.target.value)}
                                onKeyDown={e => handleKeyDown(i, e)}
                                className={`w-14 h-16 text-center text-2xl font-black border-2 rounded-xl
                                    focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all
                                    ${error ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                            />
                        ))}
                    </div>
                    {error && (
                        <p className="text-center text-sm text-red-500 font-medium">{error}</p>
                    )}
                    <p className="text-center text-[10px] text-slate-400 mt-2">PIN padrão de teste: 1234</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button onClick={onClose}
                        className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl
                            hover:bg-slate-50 transition-all text-sm">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={!isFilled || isProcessing}
                        className="flex-1 px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl
                            hover:bg-emerald-700 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                        {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <FileSignature size={16} />}
                        {isProcessing ? 'Assinando...' : 'Assinar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==================== TASK ROW ====================
interface TaskRowProps {
    task: SigningTask;
    isSelected: boolean;
    onToggleSelect: () => void;
    onSign: () => void;
    onReject: () => void;
    onView: () => void;
}

const TaskRow: React.FC<TaskRowProps> = ({ task, isSelected, onToggleSelect, onSign, onReject, onView }) => {
    const docColor = getDocColor(task.document_type);
    const hours = (Date.now() - new Date(task.created_at).getTime()) / (1000 * 60 * 60);
    const isUrgent = hours > 24;

    return (
        <div className={`flex items-center gap-4 px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50/70 transition-all group ${
            isSelected ? 'bg-emerald-50/50' : ''
        }`}>
            {/* Checkbox */}
            <button onClick={onToggleSelect} className="shrink-0">
                {isSelected 
                    ? <CheckSquare size={18} className="text-emerald-600" />
                    : <Square size={18} className="text-slate-300 group-hover:text-slate-400" />
                }
            </button>

            {/* Doc Type Icon */}
            <div className={`w-9 h-9 rounded-lg ${docColor.bg} ${docColor.text} flex items-center justify-center shrink-0`}>
                {getDocIcon(task.document_type)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{task.solicitation?.process_number || task.title}</p>
                <p className="text-xs text-slate-500 truncate">
                    {task.solicitation?.beneficiary} • {getDocLabel(task.document_type)}
                </p>
            </div>

            {/* Value */}
            <div className="text-right shrink-0 hidden md:block">
                <p className="text-sm font-bold text-slate-700">{formatCurrency(task.value || 0)}</p>
            </div>

            {/* Urgency Badge */}
            {(() => {
                const priorityLevel = isUrgent ? 'ALTO' : (hours > 48 ? 'CRITICO' : undefined);
                const style = priorityLevel ? PRIORITY_STYLES[priorityLevel as keyof typeof PRIORITY_STYLES] : null;
                return style ? (
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${style.bg} ${style.text} shrink-0 flex items-center gap-1`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {style.label}
                    </span>
                ) : isUrgent ? (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-100 text-red-600 shrink-0">
                        +24h
                    </span>
                ) : null;
            })()}

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Tooltip content="Examinar processo" position="top">
                    <button onClick={onView} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                        <Eye size={15} className="text-slate-400" />
                    </button>
                </Tooltip>
                <Tooltip content="Assinar" position="top">
                    <button onClick={onSign} className="p-1.5 hover:bg-emerald-50 rounded-lg transition-colors">
                        <FileSignature size={15} className="text-emerald-500" />
                    </button>
                </Tooltip>
                <Tooltip content="Devolver" position="top">
                    <button onClick={onReject} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                        <XCircle size={15} className="text-red-400" />
                    </button>
                </Tooltip>
            </div>
        </div>
    );
};

// ==================== MAIN COMPONENT ====================
export const SgpDashboard: React.FC<SgpDashboardProps> = ({ onNavigate, darkMode = false, userProfile }) => {
    const isGestor = userProfile?.dperfil?.slug === 'SGP_GESTOR';
    const [loading, setLoading] = useState(true);
    const [pendingTasks, setPendingTasks] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [signingTasks, setSigningTasks] = useState<SigningTask[]>([]); // SGP might sign too? Assuming yes
    const [signedTasks, setSignedTasks] = useState<SigningTask[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [userName, setUserName] = useState('');
    const [listFilter, setListFilter] = useState<ListFilter>('PENDING');
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [showSignModal, setShowSignModal] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [queueTab, setQueueTab] = useState<QueueTab>('inbox');
    
    // Assignment Modal State
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const MODULE_NAME = 'SGP';
    const WAITING_STATUS = 'WAITING_SGP_ANALYSIS'; // Adjusted for SGP

    useEffect(() => { fetchData(); }, []);

    const refetch = useCallback(() => { fetchData(); }, []);

    // ⚡ Realtime
    useRealtimeInbox({
        module: MODULE_NAME,
        onAnyChange: refetch,
    });

    // ⏳ Stale process detection
    const { staleProcesses } = useStaleProcesses({
        statuses: [WAITING_STATUS],
        thresholdDays: 3,
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id);
                const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
                setUserName(profile?.full_name || 'Servidor SGP');
            }

            // Fetch solicitations with analyst info
            const { data: solicitations } = await supabase.from('solicitations')
                .select('*, sgp_analyst:profiles!solicitations_sgp_analyst_id_fkey(id, full_name)')
                .eq('status', WAITING_STATUS)
                .order('created_at', { ascending: false });
            
            if (solicitations) {
                 const tasks: SigningTask[] = solicitations.map((s: any) => ({
                     id: s.id,
                     solicitation_id: s.id,
                     document_type: 'GENERIC',
                     title: `Processo ${s.process_number}`,
                     origin: s.unit || 'Desconhecido',
                     value: s.value || 0,
                     status: 'PENDING',
                     created_at: s.created_at,
                     solicitation: s,
                     process_number: s.process_number,
                     beneficiary: s.beneficiary,
                     sgp_analyst_id: s.sgp_analyst_id,
                     sgp_analyst_name: s.sgp_analyst?.full_name || null
                 }));

                setSigningTasks(tasks);
                setPendingTasks(tasks);
            }
            
            // Fetch history
             const { data: hist } = await supabase.from('solicitations').select('*')
                .neq('status', WAITING_STATUS)
                .order('created_at', { ascending: false })
                .limit(20);
            if (hist) setHistory(hist);

        } catch (error) {
            console.error(`Erro ${MODULE_NAME}:`, error);
        } finally { setLoading(false); }
    };

    // Computed properties
    const prioritizedTasks = usePriorityScore<SigningTask>(signingTasks);

    // Filter tasks by queue tab and search term
    const filteredTasks = useMemo(() => {
        let tasks = prioritizedTasks.map(p => p.task);
        
        // Filter by queue tab
        if (queueTab === 'minha_fila') {
            tasks = tasks.filter(t => t.sgp_analyst_id === currentUserId);
        } else if (queueTab === 'inbox') {
            // Inbox shows unassigned or all pending
            tasks = tasks.filter(t => !t.sgp_analyst_id);
        }
        
        // Apply search
        if (!searchTerm) return tasks;
        const q = searchTerm.toLowerCase();
        return tasks.filter(t =>
            t.title.toLowerCase().includes(q) ||
            t.solicitation?.process_number?.toLowerCase().includes(q) ||
            t.solicitation?.beneficiary?.toLowerCase().includes(q)
        );
    }, [prioritizedTasks, searchTerm, queueTab, currentUserId]);

    // Counts for tabs
    const myQueueCount = useMemo(() => 
        signingTasks.filter(t => t.sgp_analyst_id === currentUserId).length
    , [signingTasks, currentUserId]);
    
    const unassignedCount = useMemo(() => 
        signingTasks.filter(t => !t.sgp_analyst_id).length
    , [signingTasks]);

    // Handler to open assignment modal
    const handleOpenAssign = (processId: string) => {
        setSelectedProcessId(processId);
        setShowAssignModal(true);
    };

    // Handler for assignment
    const handleAssign = async (analystId: string) => {
        if (!selectedProcessId) return;
        try {
            const { error } = await supabase
                .from('solicitations')
                .update({ sgp_analyst_id: analystId })
                .eq('id', selectedProcessId);

            if (error) throw error;

            // Refresh data
            await fetchData();
        } catch (err) {
            console.error('Erro ao atribuir analista SGP:', err);
        }
    };

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

    const handleBatchSign = async (enteredPin: string) => {
        // Implementation for batch action in SGP
        // Using generic approve logic for now
         setProcessing(true);
        try {
             // ... Logic to update status from WAITING_SGP_ANALYSIS to next step ...
             // For each selected task...
             alert('Simulação: Lote SGP processado com sucesso');
             setSelectedTaskIds(new Set());
             fetchData();
        } catch (err) {
            console.error(err);
        } finally { setProcessing(false); }
    };
    
     const handleSingleSign = async (taskId: string) => {
        setSelectedTaskIds(new Set([taskId]));
        setShowSignModal(true);
    };

    const handleRejectDocument = async (task: SigningTask) => {
         // Logic to reject/return
         if (!rejectReason.trim()) { alert('Informe o motivo.'); return; }
          setProcessing(true);
        try {
             // ... Update DB to return process ...
            alert(`Simulação: Processo SGP devolvido. Motivo: ${rejectReason}`);
            setRejectingId(null);
            setRejectReason('');
            fetchData();
        } catch (err) {
             console.error(err);
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
                <p className="text-slate-500 font-medium">Carregando painel SGP...</p>
            </div>
        );
    }

    // ==================== RENDER ====================
    return (
        <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* ===== WELCOME BANNER ===== */}
            <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 rounded-2xl p-6 shadow-lg">
                <h2 className="text-xl font-black text-white">Painel SGP</h2>
                <p className="text-sm text-emerald-100 mt-1.5">
                    Olá, <span className="font-bold text-white">{userName}</span>. Gerencie aqui os processos sob responsabilidade da SGP.
                </p>
            </div>

            {/* ===== STALE PROCESS ALERT ===== */}
            <StaleProcessBanner
                staleProcesses={staleProcesses}
                onViewProcess={(id) => onNavigate('process_detail', id)}
                accent="red"
            />
            
             {/* ACTIONS TOOLBAR */}
            <div className="flex gap-4">
                 <button onClick={() => alert('Novo Documento SGP - Modal')} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-sm hover:bg-emerald-700 transition-colors flex items-center gap-2">
                    <FileText size={18} /> Novo Doc
                </button>
                 <button onClick={() => alert('Tramitar SGP - Modal')} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2">
                    <Send size={18} /> Tramitar
                </button>
            </div>


            {/* ===== SECTION C: DOCUMENT QUEUE ===== */}
            <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden">
                {/* Queue Tabs */}
                <div className="flex items-center gap-1 px-4 pt-4 pb-0">
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                        {([
                            { id: 'inbox' as QueueTab, label: 'Inbox', icon: <Inbox size={14} />, count: unassignedCount },
                            { id: 'minha_fila' as QueueTab, label: 'Minha Fila', icon: <Users size={14} />, count: myQueueCount },
                            { id: 'processados' as QueueTab, label: 'Processados', icon: <CheckCircle2 size={14} />, count: signedTasks.length },
                        ]).map(tab => (
                            <button key={tab.id} onClick={() => {
                                setQueueTab(tab.id);
                                if (tab.id === 'processados') setListFilter('SIGNED');
                                else setListFilter('PENDING');
                            }}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    queueTab === tab.id
                                        ? 'bg-emerald-500 text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-white'
                                }`}>
                                {tab.icon}
                                {tab.label}
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span className={`ml-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                                        queueTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                        {tab.count > 99 ? '99+' : tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Search */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Buscar..." value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300" />
                    </div>
                </div>

                {/* Batch Actions Toolbar */}
                {listFilter === 'PENDING' && signingTasks.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-2.5 mt-2 mx-4 bg-emerald-50 rounded-xl border border-emerald-100">
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
                        {selectedTaskIds.size > 0 && isGestor && (
                            <button onClick={() => setShowSignModal(true)} disabled={processing}
                                className="flex items-center gap-2 px-5 py-2 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 shadow-sm transition-all disabled:opacity-50">
                                <FileSignature size={16} />
                                Processar {selectedTaskIds.size} Itens
                            </button>
                        )}
                    </div>
                )}

                {/* Tasks List */}
                <div className="mt-2 max-h-[500px] overflow-y-auto">
                    {filteredTasks.length > 0 ? (
                        filteredTasks.map(task => {
                            if (rejectingId === task.id) {
                                return (
                                    <div key={task.id} className="mx-4 my-2 bg-red-50 border-2 border-red-200 rounded-2xl p-5">
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
                                <div key={task.id} className="relative">
                                    <TaskRow task={task}
                                        isSelected={selectedTaskIds.has(task.id)}
                                        onToggleSelect={() => handleToggleSelect(task.id)}
                                        onSign={isGestor ? () => handleSingleSign(task.id) : () => {}}
                                        onReject={isGestor ? () => setRejectingId(task.id) : () => {}}
                                        onView={() => onNavigate('process_detail', task.solicitation_id)}
                                    />
                                    {/* Assign Button - overlaid on the row */}
                                    <div className="absolute right-24 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Tooltip content="Atribuir Analista" position="top">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleOpenAssign(task.id); }}
                                                className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <UserPlus size={15} className="text-blue-500" />
                                            </button>
                                        </Tooltip>
                                    </div>
                                    {/* Show assigned analyst badge */}
                                    {task.sgp_analyst_name && (
                                        <div className="absolute right-44 top-1/2 -translate-y-1/2">
                                            <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold">
                                                {task.sgp_analyst_name.split(' ')[0]}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={32} className="text-emerald-400" />
                            </div>
                            <p className="text-slate-600 font-bold">Nenhum processo nesta fila</p>
                            <p className="text-sm text-slate-400 mt-1">Tudo em dia para o SGP.</p>
                        </div>
                    )}
                </div>
            </div>


            {/* ===== HISTORY ===== */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Histórico SGP</h3>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="divide-y divide-slate-100">
                        {history.length === 0 ? (
                            <div className="p-10 text-center text-slate-400 text-sm">Nenhum histórico.</div>
                        ) : (
                            history.slice(0, 8).map(proc => (
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
                                        <span className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">{proc.status}</span>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{formatCurrency(proc.value || 0)}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ===== SIGNATURE/ACTION MODAL ===== */}
            <SignatureConfirmModal
                isOpen={showSignModal}
                onClose={() => { setShowSignModal(false); setSelectedTaskIds(new Set()); }}
                onConfirm={handleBatchSign}
                documentsCount={selectedTaskIds.size}
                totalValue={0}
                isProcessing={processing}
            />

            {/* ===== ASSIGNMENT MODAL ===== */}
            <AssignModal
                isOpen={showAssignModal}
                onClose={() => { setShowAssignModal(false); setSelectedProcessId(null); }}
                onAssign={handleAssign}
                module="SGP"
                processNumber={signingTasks.find(t => t.id === selectedProcessId)?.process_number}
            />
        </div>
    );
};
