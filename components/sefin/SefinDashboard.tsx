import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    Briefcase, FileText, CheckCircle2, Search, DollarSign, ChevronRight, ChevronLeft,
    Scale, Loader2, XCircle, Award, FileCheck, CreditCard, Send, AlertTriangle,
    Inbox, CheckSquare, Square, X, FileSignature, UserPlus, Trash2,
    Zap, TrendingUp, Calendar, Mail, Activity, Users, Eye, AlertCircle,
    ChevronUp, ChevronDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Tooltip } from '../ui/Tooltip';
import { usePriorityScore, PRIORITY_STYLES } from '../../hooks/usePriorityScore';
import { useStaleProcesses } from '../../hooks/useStaleProcesses';
import { StaleProcessBanner } from '../ui/StaleProcessBanner';
import { useRealtimeInbox } from '../../hooks/useRealtimeInbox';
import { AssignModal } from '../AssignModal';

// ==================== TYPES ====================
interface SefinDashboardProps {
    onNavigate: (page: string, processId?: string) => void;
    darkMode?: boolean;
    isGestor?: boolean;
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
    assigned_to?: string | null;
    assignee_name?: string | null;
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

// ==================== ORDENADOR CARD ====================
interface OrdenadorCardProps {
    name: string;
    role: string;
    isCurrentUser: boolean;
    pendingCount: number;
    todayCount: number;
    totalCount: number;
    workloadPercent: number;
    avatarUrl?: string;
}

const OrdenadorCard: React.FC<OrdenadorCardProps> = ({
    name, role, isCurrentUser, pendingCount, todayCount, totalCount, workloadPercent, avatarUrl
}) => {
    const initials = name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    
    return (
        <div className={`bg-white rounded-2xl border-2 p-5 transition-all hover:shadow-md ${
            isCurrentUser ? 'border-amber-300 shadow-amber-50' : 'border-slate-200'
        }`}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                {avatarUrl ? (
                    <img src={avatarUrl} alt={name}
                        className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm" />
                ) : (
                    <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                        {initials}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-800 truncate">{name}</p>
                        {isCurrentUser && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">
                                Você
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500">{role}</p>
                </div>
            </div>

            {/* Workload Bar */}
            <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400 font-medium">Carga de Trabalho</span>
                    <span className={`font-bold ${workloadPercent > 80 ? 'text-red-500' : workloadPercent > 50 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {workloadPercent}%
                    </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${
                        workloadPercent > 80 ? 'bg-red-400' : workloadPercent > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} style={{ width: `${Math.min(100, workloadPercent)}%` }} />
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                    <p className="text-2xl font-black text-slate-800">{pendingCount}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Pendentes</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-black text-amber-500">{todayCount}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Hoje</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-black text-slate-800">{totalCount}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Total</p>
                </div>
            </div>
        </div>
    );
};

// ==================== GESTÃO DE EQUIPE (DYNAMIC) ====================
interface TeamMemberLocal {
    id: string;
    full_name: string;
    email: string;
    matricula: string;
    avatar_url: string | null;
    funcao: string;
}

const SEFIN_MODULE = 'SEFIN';
const SEFIN_FUNCOES_FALLBACK = ['Ordenador de Despesa', 'Analista', 'Assessor', 'Coordenador'];
const SEFIN_MEMBERS_PER_PAGE = 8;

interface GestaoEquipeSectionProps {
    signingTasks: SigningTask[];
    signedTasks: SigningTask[];
    userName: string;
    onNavigate: (page: string, processId?: string) => void;
    darkMode?: boolean;
    isGestor?: boolean;
}

const GestaoEquipeSection: React.FC<GestaoEquipeSectionProps> = ({ signingTasks, signedTasks, userName, onNavigate, darkMode = false, isGestor = false }) => {
    const [members, setMembers] = useState<TeamMemberLocal[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [tableFilter, setTableFilter] = useState('');
    const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
    const [memberProcesses, setMemberProcesses] = useState<any[]>([]);
    const [loadingMemberData, setLoadingMemberData] = useState(false);

    // Load team members from Supabase
    useEffect(() => {
        (async () => {
            try {
                const { data: teamRows } = await supabase
                    .from('team_members')
                    .select('user_id, funcao')
                    .eq('module', SEFIN_MODULE);

                if (!teamRows || teamRows.length === 0) { setMembers([]); return; }

                const userIds = teamRows.map(r => r.user_id);
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, matricula, avatar_url')
                    .in('id', userIds);

                const profileMap = new Map((profiles || []).map(p => [p.id, p]));

                const mapped: TeamMemberLocal[] = teamRows
                    .filter(r => profileMap.has(r.user_id))
                    .map(r => {
                        const p = profileMap.get(r.user_id)!;
                        return {
                            id: p.id,
                            full_name: p.full_name || '',
                            email: p.email || '',
                            matricula: p.matricula || '',
                            avatar_url: p.avatar_url,
                            funcao: r.funcao || '',
                        };
                    });
                setMembers(mapped);
            } catch (err) { console.error('Error loading SEFIN team:', err); }
        })();
    }, []);

    const handleExpandMember = async (memberId: string) => {
        if (expandedMemberId === memberId) { setExpandedMemberId(null); return; }
        setExpandedMemberId(memberId);
        setLoadingMemberData(true);
        setMemberProcesses([]);

        try {
            const { data: sols } = await supabase.from('solicitations')
                .select('id, process_number, status, value, created_at, unit, beneficiary')
                .eq('user_id', memberId)
                .order('created_at', { ascending: false })
                .limit(6);

            setMemberProcesses(sols || []);
        } catch (err) { console.error('Error fetching member data:', err); }
        finally { setLoadingMemberData(false); }
    };

    const filteredMembers = tableFilter
        ? members.filter(m => m.full_name.toLowerCase().includes(tableFilter.toLowerCase()) || m.funcao.toLowerCase().includes(tableFilter.toLowerCase()))
        : members;
    const totalPages = Math.ceil(filteredMembers.length / SEFIN_MEMBERS_PER_PAGE);
    const paginatedMembers = filteredMembers.slice((currentPage - 1) * SEFIN_MEMBERS_PER_PAGE, currentPage * SEFIN_MEMBERS_PER_PAGE);

    const getInitials = (name: string) => name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();



    const formatCurrencyLocal = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-emerald-500/20' : 'bg-emerald-50'}`}>
                        <Users size={18} className="text-emerald-600" />
                    </div>
                    <h2 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>Gestão de Equipe</h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                        {members.length}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    {/* Table search filter */}
                    {members.length > 3 && (
                        <div className="relative">
                            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                            <input
                                type="text" placeholder="Filtrar..."
                                value={tableFilter} onChange={e => { setTableFilter(e.target.value); setCurrentPage(1); }}
                                className={`pl-8 pr-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-2 w-44 ${
                                    darkMode
                                        ? 'bg-slate-800 border-slate-700 text-white focus:ring-emerald-500/30 focus:border-emerald-500'
                                        : 'bg-white border-slate-200 focus:ring-emerald-200 focus:border-emerald-300'
                                }`}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Co-responsability banner */}
            {members.length > 0 && (
                <div className={`mb-4 flex items-start gap-3 px-4 py-3 rounded-xl border ${
                    darkMode
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200/60'
                }`}>
                    <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                        <Scale size={16} className="text-emerald-600" />
                    </div>
                    <div>
                        <p className={`text-xs font-bold ${darkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>Gabinete SEFIN 💼</p>
                        <p className={`text-[11px] mt-0.5 leading-relaxed ${darkMode ? 'text-emerald-400/80' : 'text-emerald-700/80'}`}>
                            Gerencie os membros da equipe SEFIN. Clique em cada servidor para ver seus processos em andamento.
                        </p>
                    </div>
                </div>
            )}

            {members.length > 0 ? (
                <div className={`rounded-2xl border shadow-sm overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    {/* Table */}
                    <table className="w-full">
                        <thead>
                            <tr className={`border-b ${darkMode ? 'border-slate-700 bg-slate-700/50' : 'border-slate-200 bg-slate-50/80'}`}>
                                <th className={`text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-emerald-400' : 'text-slate-400'}`}>Servidor / Cargo</th>
                                <th className={`text-center px-4 py-3 text-[10px] font-bold uppercase tracking-widest hidden md:table-cell ${darkMode ? 'text-emerald-400' : 'text-slate-400'}`}>Processos</th>
                                <th className={`text-right px-5 py-3 text-[10px] font-bold uppercase tracking-widest w-24 ${darkMode ? 'text-emerald-400' : 'text-slate-400'}`}>Ações</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                            {paginatedMembers.map(member => {
                                const isExpanded = expandedMemberId === member.id;

                                return (
                                    <React.Fragment key={member.id}>
                                        {/* Member Row */}
                                        <tr
                                            onClick={() => handleExpandMember(member.id)}
                                            className={`cursor-pointer transition-all group ${
                                                isExpanded
                                                    ? darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50/50'
                                                    : darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            {/* Col 1: Servidor */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    {member.avatar_url ? (
                                                        <img src={member.avatar_url} alt={member.full_name}
                                                            className={`w-9 h-9 rounded-full object-cover border-2 shadow-sm shrink-0 ${darkMode ? 'border-slate-600' : 'border-white'}`} />
                                                    ) : (
                                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                                            darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                                                        }`}>
                                                            {getInitials(member.full_name)}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className={`text-sm font-bold truncate uppercase ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                                                {member.full_name}
                                                            </p>
                                                            {userName.toLowerCase().includes(member.full_name.split(' ')[0].toLowerCase()) && (
                                                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>Você</span>
                                                            )}
                                                        </div>
                                                        <p className={`text-[11px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{member.funcao}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Col 2: Processos count */}
                                            <td className="text-center px-4 py-3.5 hidden md:table-cell">
                                                {isExpanded ? (
                                                    <span className={`text-sm font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                        {memberProcesses.length} Processo{memberProcesses.length !== 1 ? 's' : ''}
                                                    </span>
                                                ) : (
                                                    <span className={`text-sm ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>—</span>
                                                )}
                                            </td>

                                            {/* Col 3: Ações */}
                                            <td className="text-right px-5 py-3.5">
                                                    <div className={`p-1 rounded-lg transition-colors ${isExpanded ? 'text-emerald-600' : (darkMode ? 'text-slate-500' : 'text-slate-400')}`}>
                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </div>
                                            </td>
                                        </tr>

                                        {/* Expanded Row — Member Processes */}
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={3} className="px-0 py-0">
                                                    <div className={`px-6 py-4 border-t animate-in slide-in-from-top-2 duration-200 ${
                                                        darkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50/30 border-emerald-100'
                                                    }`}>
                                                        {loadingMemberData ? (
                                                            <div className={`flex items-center justify-center gap-2 py-6 text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                                <Loader2 size={16} className="animate-spin" /> Carregando processos...
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <FileText size={14} className="text-emerald-600" />
                                                                    <h4 className={`text-xs font-bold uppercase tracking-wide ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                                        Solicitações ({memberProcesses.length})
                                                                    </h4>
                                                                </div>
                                                                {memberProcesses.length === 0 ? (
                                                                    <p className={`text-xs italic py-3 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>Nenhuma solicitação encontrada</p>
                                                                ) : (
                                                                    <div className="space-y-1.5">
                                                                        {memberProcesses.map(proc => (
                                                                            <div
                                                                                key={proc.id}
                                                                                onClick={(e) => { e.stopPropagation(); onNavigate('process_detail', proc.id); }}
                                                                                className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all group/proc ${
                                                                                    darkMode
                                                                                        ? 'bg-slate-800 border-slate-700 hover:border-emerald-500/50 hover:bg-emerald-500/10'
                                                                                        : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                                                                                }`}
                                                                            >
                                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                                                                        darkMode ? 'bg-slate-700' : 'bg-slate-100'
                                                                                    }`}>
                                                                                        <FileText size={13} className={darkMode ? 'text-slate-400' : 'text-slate-500'} />
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <p className={`text-xs font-bold truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>{proc.process_number}</p>
                                                                                        <p className={`text-[10px] truncate ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{proc.beneficiary || proc.unit}</p>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-2 shrink-0">
                                                                                    <span className={`font-mono text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                                                        {formatCurrencyLocal(proc.value || 0)}
                                                                                    </span>
                                                                                    <ChevronRight size={12} className={`transition-colors ${
                                                                                        darkMode ? 'text-slate-600 group-hover/proc:text-emerald-400' : 'text-slate-300 group-hover/proc:text-emerald-500'
                                                                                    }`} />
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Pagination Footer */}
                    {totalPages > 1 && (
                        <div className={`flex items-center justify-between px-5 py-3 border-t ${
                            darkMode ? 'bg-slate-700/30 border-slate-700' : 'bg-slate-50/80 border-slate-200'
                        }`}>
                            <p className={`text-[11px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                Exibindo <span className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{(currentPage - 1) * SEFIN_MEMBERS_PER_PAGE + 1}–{Math.min(currentPage * SEFIN_MEMBERS_PER_PAGE, filteredMembers.length)}</span> de <span className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{filteredMembers.length}</span> membros
                            </p>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold border rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                        darkMode
                                            ? 'text-slate-300 bg-slate-800 border-slate-600 hover:bg-slate-700'
                                            : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <ChevronLeft size={14} /> Anterior
                                </button>
                                <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${darkMode ? 'text-emerald-400 bg-emerald-500/20' : 'text-emerald-700 bg-emerald-100'}`}>
                                    {currentPage}/{totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold border rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                        darkMode
                                            ? 'text-slate-300 bg-slate-800 border-slate-600 hover:bg-slate-700'
                                            : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    Próxima <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className={`rounded-2xl border-2 border-dashed p-10 text-center ${
                    darkMode ? 'border-slate-700' : 'border-slate-200'
                }`}>
                    <Users size={32} className={`mx-auto mb-3 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                    <p className={`font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Nenhum membro na equipe ainda</p>
                </div>
            )}


        </div>
    );
};

// ==================== TASK ROW ====================
interface TaskRowProps {
    task: SigningTask;
    isSelected: boolean;
    onToggleSelect: () => void;
    onSign?: (task: SigningTask) => void;
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
                    <button onClick={() => onSign?.(task)} className="p-1.5 hover:bg-emerald-50 rounded-lg transition-colors">
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
export const SefinDashboard: React.FC<SefinDashboardProps> = ({ 
    onNavigate, 
    darkMode = false,
    isGestor = false 
}) => {
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
    const [queueTab, setQueueTab] = useState<QueueTab>('inbox');
    
    // Assignment State
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignTarget, setAssignTarget] = useState<{ id: string, docType: string, solId: string } | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => { fetchSefinData(); }, []);

    const refetchSefin = useCallback(() => { fetchSefinData(); }, []);

    // ⚡ Realtime: auto-refresh when signing tasks arrive
    useRealtimeInbox({
        module: 'SEFIN',
        onAnyChange: refetchSefin,
    });

    // ⏳ Stale process detection (stuck in WAITING_SEFIN_SIGNATURE > 3 days)
    const { staleProcesses: staleSefin } = useStaleProcesses({
        statuses: ['WAITING_SEFIN_SIGNATURE'],
        thresholdDays: 3,
    });

    const fetchSefinData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
                setUserName(profile?.full_name || 'Ordenador');
                setCurrentUserId(user.id);
            }

            const { data: solicitations } = await supabase.from('solicitations').select('*')
                .in('status', ['WAITING_SEFIN_SIGNATURE', 'WAITING_SOSFU_PAYMENT', 'WAITING_SUPRIDO_CONFIRMATION', 'PAID'])
                .order('created_at', { ascending: false });

            if (solicitations) {
                setPendingAuth(solicitations.filter(s => s.status === 'WAITING_SEFIN_SIGNATURE'));
                setApprovedHistory(solicitations.filter(s => s.status !== 'WAITING_SEFIN_SIGNATURE'));
            }

            // Fetch ALL signing tasks with assignee info
            const { data: allTasks } = await supabase
                .from('sefin_signing_tasks')
                .select('*, assignee:profiles!sefin_signing_tasks_assigned_to_fkey(id, full_name)')
                .order('created_at', { ascending: false });

            if (allTasks) {
                const enriched: SigningTask[] = [];
                const solIds = [...new Set(allTasks.map((t: any) => t.solicitation_id))];
                const solMap: Record<string, any> = {};
                if (solIds.length > 0) {
                    const { data: sols } = await supabase.from('solicitations')
                        .select('id, process_number, beneficiary, value').in('id', solIds);
                    if (sols) sols.forEach(s => { solMap[s.id] = s; });
                }
                for (const task of allTasks) {
                    enriched.push({ 
                        ...task, 
                        solicitation: solMap[task.solicitation_id],
                        assignee_name: task.assignee?.full_name 
                    });
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

    // 🎯 Priority scoring for the smart queue
    const prioritizedTasks = usePriorityScore<SigningTask>(signingTasks);

    const filteredTasks = useMemo(() => {
        if (listFilter === 'SIGNED') {
            // ... filtering for SIGNED ...
            if (!searchTerm) return signedTasks;
            const q = searchTerm.toLowerCase();
            return signedTasks.filter(t =>
                t.title.toLowerCase().includes(q) ||
                t.solicitation?.process_number?.toLowerCase().includes(q) ||
                t.solicitation?.beneficiary?.toLowerCase().includes(q)
            );
        }
        
        // For PENDING
        let tasks = prioritizedTasks.map(p => p.task);

        // Filter by Queue Tab
        if (queueTab === 'minha_fila') {
            tasks = tasks.filter(t => t.assigned_to === currentUserId);
        } else if (queueTab === 'inbox') {
             // Inbox shows unassigned
             tasks = tasks.filter(t => !t.assigned_to);
        }

        if (!searchTerm) return tasks;
        const q = searchTerm.toLowerCase();
        return tasks.filter(t =>
            t.title.toLowerCase().includes(q) ||
            t.solicitation?.process_number?.toLowerCase().includes(q) ||
            t.solicitation?.beneficiary?.toLowerCase().includes(q)
        );
    }, [prioritizedTasks, signedTasks, listFilter, searchTerm, queueTab, currentUserId]);

    const myQueueCount = useMemo(() => 
        signingTasks.filter(t => t.assigned_to === currentUserId).length
    , [signingTasks, currentUserId]);
    
    const unassignedCount = useMemo(() => 
        signingTasks.filter(t => !t.assigned_to).length
    , [signingTasks]);

    // Build a quick lookup for priority info per task id
    const priorityMap = useMemo(() => {
        const map = new Map<string, { level: string; score: number; waitingHours: number }>();
        for (const p of prioritizedTasks) {
            map.set(p.task.id, { level: p.level, score: p.score, waitingHours: p.waitingHours });
        }
        return map;
    }, [prioritizedTasks]);

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

    const handleBatchSign = async (enteredPin: string) => {
        if (selectedTaskIds.size === 0) return;

        // Validate PIN against database
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado.');

        const { data: profile } = await supabase
            .from('profiles')
            .select('signature_pin')
            .eq('id', user.id)
            .single();

        const validPin = profile?.signature_pin || '1234';
        if (enteredPin !== validPin) {
            throw new Error('PIN inválido. Verifique e tente novamente.');
        }

        setProcessing(true);
        try {
            const now = new Date().toISOString();
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

            for (const solId of affectedSolicitationIds) {
                const { data: remaining } = await supabase.from('sefin_signing_tasks')
                    .select('id').eq('solicitation_id', solId).eq('status', 'PENDING');

                if (!remaining || remaining.length === 0) {
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



    const handleSingleSign = async (task: SigningTask) => {
        setSelectedTaskIds(new Set([task.id]));
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

    // Handler for task assignment
    const handleOpenAssign = (task: SigningTask) => {
        setAssignTarget({ id: task.id, docType: task.document_type, solId: task.solicitation_id });
        setShowAssignModal(true);
    };

    const handleAssign = async (analystId: string) => {
        if (!assignTarget) return;
        try {
            // Update sefin_signing_tasks
            const { error: errTask } = await supabase
                .from('sefin_signing_tasks')
                .update({ assigned_to: analystId })
                .eq('id', assignTarget.id);
            if (errTask) throw errTask;

            // Also update process_documents for consistency if needed
            const { error: errDoc } = await supabase
                .from('process_documents')
                .update({ assigned_to: analystId })
                .eq('solicitation_id', assignTarget.solId)
                .eq('document_type', assignTarget.docType);
             if (errDoc) console.warn('Could not update process_documents assignment', errDoc);

            await fetchSefinData();
        } catch (err) {
            console.error('Error assigning task:', err);
            alert('Erro ao atribuir tarefa.');
        } 
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
        <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* ===== WELCOME BANNER ===== */}
            <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 rounded-2xl p-6 shadow-lg">
                <h2 className="text-xl font-black text-white">Gabinete SEFIN</h2>
                <p className="text-sm text-emerald-100 mt-1.5">
                    Olá, <span className="font-bold text-white">{userName}</span>. Gerencie aqui as autorizações de despesa e atos de concessão pendentes de assinatura.
                </p>
            </div>

            {/* ===== STALE PROCESS ALERT ===== */}
            <StaleProcessBanner
                staleProcesses={staleSefin}
                onViewProcess={(id) => onNavigate('process_detail', id)}
                accent="red"
            />

            {/* ===== SECTION B: GESTÃO DE EQUIPE (DYNAMIC) ===== */}
            <GestaoEquipeSection
                signingTasks={signingTasks}
                signedTasks={signedTasks}
                userName={userName}
                onNavigate={onNavigate}
                darkMode={darkMode}
                isGestor={isGestor}
            />

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
                        <input type="text" placeholder="Buscar no histórico..." value={searchTerm}
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
                        {isGestor && selectedTaskIds.size > 0 && (
                            <button onClick={() => setShowSignModal(true)} disabled={processing}
                                className="flex items-center gap-2 px-5 py-2 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 shadow-sm transition-all disabled:opacity-50">
                                <FileSignature size={16} />
                                Assinar {selectedTaskIds.size} Doc{selectedTaskIds.size > 1 ? 's' : ''} em Lote
                            </button>
                        )}
                    </div>
                )}

                {/* Tasks List */}
                <div className="mt-2 max-h-[500px] overflow-y-auto">
                    {filteredTasks.length > 0 ? (
                        filteredTasks.map(task => {
                            if (listFilter === 'SIGNED') {
                                const docColor = getDocColor(task.document_type);
                                return (
                                    <div key={task.id}
                                        onClick={() => onNavigate('process_detail', task.solicitation_id)}
                                        className="flex items-center gap-4 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-all cursor-pointer">
                                        <div className={`w-9 h-9 rounded-lg ${docColor.bg} ${docColor.text} flex items-center justify-center`}>
                                            <CheckCircle2 size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate">{task.solicitation?.process_number}</p>
                                            <p className="text-xs text-slate-500 truncate">{task.solicitation?.beneficiary} • {getDocLabel(task.document_type)}</p>
                                        </div>
                                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700">Assinado</span>
                                    </div>
                                );
                            }

                            // Reject inline
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
                                <div key={task.id} className="relative group/row">
                                    <TaskRow task={task}
                                        isSelected={selectedTaskIds.has(task.id)}
                                        onToggleSelect={() => handleToggleSelect(task.id)}
                                        onSign={isGestor ? (task) => handleSingleSign(task) : undefined}
                                        onReject={() => setRejectingId(task.id)}
                                        onView={() => onNavigate('process_detail', task.solicitation_id)}
                                    />
                                    {/* Assign Button */}
                                    {listFilter === 'PENDING' && isGestor && (
                                        <div className="absolute right-36 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center gap-2">
                                            {task.assignee_name && (
                                                <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-blue-100">
                                                    {task.assignee_name.split(' ')[0]}
                                                </span>
                                            )}
                                            <Tooltip content="Atribuir Responsável" position="top">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleOpenAssign(task); }}
                                                    className="p-1.5 bg-white border hover:bg-slate-50 rounded-lg text-slate-400 hover:text-blue-500 shadow-sm transition-colors"
                                                >
                                                    <UserPlus size={14} />
                                                </button>
                                            </Tooltip>
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
                            <p className="text-slate-600 font-bold">Nenhum processo nesta categoria</p>
                            <p className="text-sm text-slate-400 mt-1">Todos os documentos foram tratados.</p>
                        </div>
                    )}
                </div>
            </div>


            {/* ===== HISTORY ===== */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Histórico de Autorizações</h3>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* History search */}
                    <div className="p-4 border-b border-slate-100">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Buscar no histórico..."
                                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                        </div>
                    </div>
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


            {/* ===== ASSIGN MODAL ===== */}
            <AssignModal
                isOpen={showAssignModal}
                onClose={() => { setShowAssignModal(false); setAssignTarget(null); }}
                onAssign={handleAssign}
                module="SEFIN"
                currentAnalystId={signingTasks.find(t => t.id === assignTarget?.id)?.assigned_to || undefined}
                title="Atribuir Documento"
            />

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