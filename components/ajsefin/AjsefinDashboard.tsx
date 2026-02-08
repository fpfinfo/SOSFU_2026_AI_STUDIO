import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Inbox, Briefcase, FileSignature, Send, Users, Search, Loader2,
    AlertCircle, CheckCircle2, Clock, FileText, ChevronRight, ChevronLeft,
    ChevronDown, ChevronUp, ArrowRightLeft, List, TrendingUp, Scale,
    UserPlus, Trash2, X, ShieldCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StatusBadge } from '../StatusBadge';

interface AjsefinDashboardProps {
    onNavigate: (page: string, processId?: string) => void;
    darkMode?: boolean;
    showTeamOnly?: boolean;
}

// ==================== GESTÃO DE EQUIPE (AJSEFIN) ====================
interface AjsefinTeamMember {
    id: string;
    full_name: string;
    email: string;
    matricula: string;
    avatar_url: string | null;
    funcao: string;
}

const AJSEFIN_TEAM_KEY = 'ajsefin_team_members';
const AJSEFIN_FUNCOES_FALLBACK = ['Assessor Jurídico', 'Analista Judiciário', 'Técnico Judiciário', 'Estagiário'];
const MEMBERS_PER_PAGE = 8;

// ====================== STAT CARD ======================
const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: number;
    detail: string;
    color: string;
    bgColor: string;
    darkMode?: boolean;
}> = ({ icon, label, value, detail, color, bgColor, darkMode }) => (
    <div className={`rounded-2xl border p-5 transition-all hover:shadow-md ${
        darkMode
            ? 'bg-slate-800 border-slate-700 hover:border-teal-500/30'
            : `bg-white border-slate-200 hover:border-teal-200`
    }`}>
        <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgColor}`}>
                {icon}
            </div>
            <div>
                <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
                <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{value}</p>
            </div>
        </div>
        <p className={`text-[11px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{detail}</p>
    </div>
);

// ====================== AJSEFIN TEAM SECTION ======================
const AjsefinTeamSection: React.FC<{
    onNavigate: (page: string, processId?: string) => void;
    darkMode?: boolean;
}> = ({ onNavigate, darkMode = false }) => {
    const [members, setMembers] = useState<AjsefinTeamMember[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [selectedFuncao, setSelectedFuncao] = useState<string>('');
    const [cargosFromDB, setCargosFromDB] = useState<string[]>([]);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [tableFilter, setTableFilter] = useState('');
    const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
    const [memberProcesses, setMemberProcesses] = useState<any[]>([]);
    const [loadingMemberData, setLoadingMemberData] = useState(false);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load saved members from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(AJSEFIN_TEAM_KEY);
        if (saved) { try { setMembers(JSON.parse(saved)); } catch { /* ignore */ } }
    }, []);

    // Fetch distinct cargos from profiles table
    useEffect(() => {
        if (!showAddModal) return;
        (async () => {
            try {
                const { data } = await supabase.from('profiles')
                    .select('cargo')
                    .not('cargo', 'is', null)
                    .not('cargo', 'eq', '')
                    .order('cargo');
                if (data) {
                    const unique = [...new Set(data.map(d => d.cargo).filter(Boolean))] as string[];
                    setCargosFromDB(unique.length > 0 ? unique : AJSEFIN_FUNCOES_FALLBACK);
                }
            } catch { setCargosFromDB(AJSEFIN_FUNCOES_FALLBACK); }
        })();
    }, [showAddModal]);

    const saveMembers = useCallback((newMembers: AjsefinTeamMember[]) => {
        setMembers(newMembers);
        localStorage.setItem(AJSEFIN_TEAM_KEY, JSON.stringify(newMembers));
    }, []);

    // Debounced search from Supabase profiles
    useEffect(() => {
        if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return; }
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        searchTimeoutRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const term = `%${searchQuery}%`;
                const { data } = await supabase.from('profiles')
                    .select('id, full_name, email, matricula, avatar_url, cpf, cargo')
                    .or(`full_name.ilike.${term},matricula.ilike.${term},email.ilike.${term},cpf.ilike.${term}`)
                    .limit(10);
                const memberIds = new Set(members.map(m => m.id));
                setSearchResults((data || []).filter(u => !memberIds.has(u.id)));
            } catch (err) { console.error('AJSEFIN search error:', err); }
            finally { setSearching(false); }
        }, 350);

        return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
    }, [searchQuery, members]);

    const handleAddMember = () => {
        if (!selectedUser) return;
        const newMember: AjsefinTeamMember = {
            id: selectedUser.id, full_name: selectedUser.full_name,
            email: selectedUser.email || '', matricula: selectedUser.matricula || '',
            avatar_url: selectedUser.avatar_url, funcao: selectedFuncao,
        };
        saveMembers([...members, newMember]);
        setShowAddModal(false); setSelectedUser(null); setSearchQuery(''); setSearchResults([]);
        setSelectedFuncao('');
    };

    const handleRemoveMember = (id: string) => {
        saveMembers(members.filter(m => m.id !== id));
        setRemovingId(null);
        if (expandedMemberId === id) setExpandedMemberId(null);
    };

    const getInitials = (name: string) => name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

    // Expand member → fetch their processes
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

    // Filtered + paginated members
    const filteredMembers = tableFilter
        ? members.filter(m => m.full_name.toLowerCase().includes(tableFilter.toLowerCase()) || m.funcao.toLowerCase().includes(tableFilter.toLowerCase()))
        : members;
    const totalPages = Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE);
    const paginatedMembers = filteredMembers.slice((currentPage - 1) * MEMBERS_PER_PAGE, currentPage * MEMBERS_PER_PAGE);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-teal-500/20' : 'bg-teal-50'}`}>
                        <Users size={18} className="text-teal-600" />
                    </div>
                    <h2 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>Gestão de Equipe</h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${darkMode ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-100 text-teal-700'}`}>
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
                                        ? 'bg-slate-800 border-slate-700 text-white focus:ring-teal-500/30 focus:border-teal-500'
                                        : 'bg-white border-slate-200 focus:ring-teal-200 focus:border-teal-300'
                                }`}
                            />
                        </div>
                    )}
                    <button onClick={() => setShowAddModal(true)}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-sm ${
                            darkMode
                                ? 'bg-teal-600 hover:bg-teal-500 text-white'
                                : 'bg-teal-500 hover:bg-teal-600 text-white'
                        }`}>
                        <UserPlus size={14} /> Adicionar Membro
                    </button>
                </div>
            </div>

            {/* Co-responsability banner */}
            {members.length > 0 && (
                <div className={`mb-4 flex items-start gap-3 px-4 py-3 rounded-xl border ${
                    darkMode
                        ? 'bg-teal-500/10 border-teal-500/20'
                        : 'bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200/60'
                }`}>
                    <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${darkMode ? 'bg-teal-500/20' : 'bg-teal-100'}`}>
                        <ShieldCheck size={16} className="text-teal-600" />
                    </div>
                    <div>
                        <p className={`text-xs font-bold ${darkMode ? 'text-teal-300' : 'text-teal-800'}`}>Acompanhamento Jurídico ⚖️</p>
                        <p className={`text-[11px] mt-0.5 leading-relaxed ${darkMode ? 'text-teal-400/80' : 'text-teal-700/80'}`}>
                            Gerencie os membros da equipe AJSEFIN. Clique em cada servidor para ver seus processos em andamento.
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
                                <th className={`text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-teal-400' : 'text-slate-400'}`}>Servidor / Cargo</th>
                                <th className={`text-center px-4 py-3 text-[10px] font-bold uppercase tracking-widest hidden md:table-cell ${darkMode ? 'text-teal-400' : 'text-slate-400'}`}>Processos</th>
                                <th className={`text-right px-5 py-3 text-[10px] font-bold uppercase tracking-widest w-24 ${darkMode ? 'text-teal-400' : 'text-slate-400'}`}>Ações</th>
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
                                                    ? darkMode ? 'bg-teal-500/10' : 'bg-teal-50/50'
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
                                                            darkMode ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-100 text-teal-600'
                                                        }`}>
                                                            {getInitials(member.full_name)}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className={`text-sm font-bold truncate uppercase ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                                            {member.full_name}
                                                        </p>
                                                        <p className={`text-[11px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{member.funcao}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Col 2: Processos count */}
                                            <td className="text-center px-4 py-3.5 hidden md:table-cell">
                                                {isExpanded ? (
                                                    <span className={`text-sm font-bold ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
                                                        {memberProcesses.length} Processo{memberProcesses.length !== 1 ? 's' : ''}
                                                    </span>
                                                ) : (
                                                    <span className={`text-sm ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>—</span>
                                                )}
                                            </td>

                                            {/* Col 3: Ações */}
                                            <td className="text-right px-5 py-3.5">
                                                <div className="flex items-center justify-end gap-1">
                                                    {removingId === member.id ? (
                                                        <div className="flex items-center gap-1.5 animate-in fade-in">
                                                            <button onClick={(e) => { e.stopPropagation(); handleRemoveMember(member.id); }}
                                                                className="px-2.5 py-1 bg-red-500 text-white text-[10px] font-bold rounded-lg hover:bg-red-600">Sim</button>
                                                            <button onClick={(e) => { e.stopPropagation(); setRemovingId(null); }}
                                                                className={`px-2.5 py-1 text-[10px] font-medium rounded-lg ${
                                                                    darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                                }`}>Não</button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <button onClick={(e) => { e.stopPropagation(); setRemovingId(member.id); }}
                                                                className={`p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                                                                    darkMode ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'
                                                                }`}
                                                                title="Remover membro">
                                                                <Trash2 size={14} />
                                                            </button>
                                                            <div className={`p-1 rounded-lg transition-colors ${isExpanded ? 'text-teal-600' : (darkMode ? 'text-slate-500' : 'text-slate-400')}`}>
                                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expanded Row — Member Processes */}
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={3} className="px-0 py-0">
                                                    <div className={`px-6 py-4 border-t animate-in slide-in-from-top-2 duration-200 ${
                                                        darkMode ? 'bg-teal-500/5 border-teal-500/20' : 'bg-teal-50/30 border-teal-100'
                                                    }`}>
                                                        {loadingMemberData ? (
                                                            <div className={`flex items-center justify-center gap-2 py-6 text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                                <Loader2 size={16} className="animate-spin" /> Carregando processos...
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <FileText size={14} className="text-teal-600" />
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
                                                                                        ? 'bg-slate-800 border-slate-700 hover:border-teal-500/50 hover:bg-teal-500/10'
                                                                                        : 'bg-white border-slate-200 hover:border-teal-300 hover:bg-teal-50/50'
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
                                                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.value || 0)}
                                                                                    </span>
                                                                                    <StatusBadge status={proc.status} size="sm" />
                                                                                    <ChevronRight size={12} className={`transition-colors ${
                                                                                        darkMode ? 'text-slate-600 group-hover/proc:text-teal-400' : 'text-slate-300 group-hover/proc:text-teal-500'
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
                                Exibindo <span className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{(currentPage - 1) * MEMBERS_PER_PAGE + 1}–{Math.min(currentPage * MEMBERS_PER_PAGE, filteredMembers.length)}</span> de <span className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{filteredMembers.length}</span> membros
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
                                <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${darkMode ? 'text-teal-400 bg-teal-500/20' : 'text-teal-700 bg-teal-100'}`}>
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
                    <button onClick={() => setShowAddModal(true)}
                        className="text-teal-600 text-sm font-bold mt-2 hover:underline">+ Adicionar primeiro membro</button>
                </div>
            )}

            {/* ADD MEMBER MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
                    onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
                    <div className={`rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200 ${
                        darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'
                    }`}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>Adicionar Membro à Equipe</h3>
                            <button onClick={() => { setShowAddModal(false); setSelectedUser(null); setSearchQuery(''); setSearchResults([]); }}
                                className={`p-1.5 rounded-lg transition-all ${darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mb-4">
                            <label className={`text-[10px] font-bold uppercase tracking-widest mb-2 block ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Buscar Servidor</label>
                            <div className="relative">
                                <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                                <input type="text" placeholder="Digite nome, matrícula, CPF ou email..."
                                    value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setSelectedUser(null); }}
                                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 ${
                                        darkMode
                                            ? 'bg-slate-900 border-slate-700 text-white focus:ring-teal-500/30 focus:border-teal-500'
                                            : 'bg-slate-50 border-slate-200 focus:ring-teal-200 focus:border-teal-300'
                                    }`}
                                    autoFocus />
                            </div>

                            {(searchResults.length > 0 || searching) && !selectedUser && (
                                <div className={`mt-1 border-2 rounded-xl shadow-lg max-h-48 overflow-y-auto ${
                                    darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                                }`}>
                                    {searching ? (
                                        <div className={`p-4 text-center text-sm flex items-center justify-center gap-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                            <Loader2 size={14} className="animate-spin" /> Buscando...
                                        </div>
                                    ) : (
                                        searchResults.map(user => (
                                            <button key={user.id}
                                                onClick={() => { setSelectedUser(user); setSearchQuery(user.full_name); setSearchResults([]); if (user.cargo) setSelectedFuncao(user.cargo); }}
                                                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left border-b last:border-0 ${
                                                    darkMode
                                                        ? 'hover:bg-teal-500/10 border-slate-800'
                                                        : 'hover:bg-teal-50 border-slate-50'
                                                }`}>
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                                                ) : (
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                                                        darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'
                                                    }`}>
                                                        {getInitials(user.full_name || '')}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>{user.full_name}</p>
                                                    <p className={`text-[11px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                                        {user.matricula && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold mr-1.5">Mat: {user.matricula}</span>}
                                                        {user.cpf && <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>CPF: {user.cpf}</span>}
                                                    </p>
                                                    {user.email && <p className={`text-[10px] truncate ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{user.email}</p>}
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="mb-6">
                            <label className={`text-[10px] font-bold uppercase tracking-widest mb-2 block ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Cargo / Função</label>
                            <select value={selectedFuncao} onChange={e => setSelectedFuncao(e.target.value)}
                                className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 appearance-none cursor-pointer ${
                                    darkMode
                                        ? 'bg-slate-900 border-slate-700 text-white focus:ring-teal-500/30 focus:border-teal-500'
                                        : 'bg-slate-50 border-slate-200 focus:ring-teal-200 focus:border-teal-300'
                                }`}>
                                <option value="">Selecione o cargo...</option>
                                {cargosFromDB.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => { setShowAddModal(false); setSelectedUser(null); setSearchQuery(''); }}
                                className={`flex-1 px-4 py-3 border-2 font-bold rounded-xl transition-all text-sm ${
                                    darkMode
                                        ? 'border-slate-700 text-slate-300 hover:bg-slate-700'
                                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}>
                                Cancelar
                            </button>
                            <button onClick={handleAddMember} disabled={!selectedUser || !selectedFuncao}
                                className={`flex-1 px-4 py-3 font-bold rounded-xl transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed ${
                                    darkMode
                                        ? 'bg-teal-600 text-white hover:bg-teal-500'
                                        : 'bg-teal-500 text-white hover:bg-teal-600'
                                }`}>
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ====================== DASHBOARD ======================
export const AjsefinDashboard: React.FC<AjsefinDashboardProps> = ({ onNavigate, darkMode = false, showTeamOnly = false }) => {
    const [loading, setLoading] = useState(true);
    const [recentProcesses, setRecentProcesses] = useState<any[]>([]);

    // Stats
    const [inboxCount, setInboxCount] = useState(0);
    const [myDeskCount, setMyDeskCount] = useState(0);
    const [minutasCount, setMinutasCount] = useState(0);
    const [tramiteCount, setTramiteCount] = useState(0);

    // Fetch dashboard data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // 1. Caixa de Entrada — Processos aguardando análise jurídica
                const { count: inbox } = await supabase
                    .from('solicitations')
                    .select('*', { count: 'exact', head: true })
                    .in('status', ['WAITING_AJSEFIN_ANALYSIS', 'WAITING_SOSFU_ANALYSIS']);

                // 2. Minha Mesa — Processos atribuídos a mim
                const { count: myDesk } = await supabase
                    .from('solicitations')
                    .select('*', { count: 'exact', head: true })
                    .eq('analyst_id', user.id)
                    .not('status', 'in', '("PAID","REJECTED")');

                // 3. Minutas — Processos com minuta pendente (aguardando assinatura SEFIN)
                const { count: minutas } = await supabase
                    .from('solicitations')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'WAITING_SEFIN_SIGNATURE');

                // 4. Em Trâmite — Processos em outros estágios
                const { count: tramite } = await supabase
                    .from('solicitations')
                    .select('*', { count: 'exact', head: true })
                    .in('status', ['WAITING_SOSFU_PAYMENT', 'WAITING_MANAGER_ATTESTATION']);

                setInboxCount(inbox || 0);
                setMyDeskCount(myDesk || 0);
                setMinutasCount(minutas || 0);
                setTramiteCount(tramite || 0);

                // Recent processes
                const { data: recent } = await supabase
                    .from('solicitations')
                    .select('id, process_number, beneficiary, status, created_at, request_type, estimated_value')
                    .order('created_at', { ascending: false })
                    .limit(6);

                setRecentProcesses(recent || []);
            } catch (err) {
                console.error('AJSEFIN dashboard error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // ====================== RENDER ======================
    return (
        <div className={`max-w-[1600px] mx-auto px-6 py-8 space-y-8 ${darkMode ? 'text-white' : ''}`}>

            {/* ===== STAT CARDS ===== */}
            {!showTeamOnly && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <StatCard
                        icon={<Inbox size={20} className="text-teal-600" />}
                        label="Caixa de Entrada"
                        value={inboxCount}
                        detail="Processos aguardando análise"
                        color="teal"
                        bgColor="bg-teal-50"
                        darkMode={darkMode}
                    />
                    <StatCard
                        icon={<Briefcase size={20} className="text-indigo-600" />}
                        label="Minha Mesa"
                        value={myDeskCount}
                        detail="Atribuídos a mim"
                        color="indigo"
                        bgColor="bg-indigo-50"
                        darkMode={darkMode}
                    />
                    <StatCard
                        icon={<FileSignature size={20} className="text-amber-600" />}
                        label="Minutas Pendentes"
                        value={minutasCount}
                        detail="Aguardando assinatura SEFIN"
                        color="amber"
                        bgColor="bg-amber-50"
                        darkMode={darkMode}
                    />
                    <StatCard
                        icon={<Send size={20} className="text-cyan-600" />}
                        label="Em Trâmite"
                        value={tramiteCount}
                        detail="Processos em outros estágios"
                        color="cyan"
                        bgColor="bg-cyan-50"
                        darkMode={darkMode}
                    />
                </div>
            )}

            {/* ===== EQUIPE TÉCNICA (AJSEFIN) — Gestão Gestor-Style ===== */}
            <AjsefinTeamSection onNavigate={onNavigate} darkMode={darkMode} />

            {/* ===== PROCESSOS RECENTES — abaixo da equipe ===== */}
            {!showTeamOnly && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                    <div className="flex items-center gap-2 mb-4">
                        <div className={`p-1.5 rounded-lg ${darkMode ? 'bg-teal-500/20' : 'bg-teal-50'}`}>
                            <FileText size={18} className="text-teal-600" />
                        </div>
                        <h3 className={`text-sm font-bold uppercase tracking-wider ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            Processos Recentes
                        </h3>
                    </div>

                    <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        {loading ? (
                            <div className="p-8 flex justify-center items-center gap-2">
                                <Loader2 size={16} className="animate-spin text-teal-500" />
                                <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Carregando...</span>
                            </div>
                        ) : recentProcesses.length === 0 ? (
                            <div className="p-12 text-center">
                                <Scale size={32} className={`mx-auto mb-3 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                                <p className={`text-sm font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Nenhum processo encontrado</p>
                            </div>
                        ) : (
                            <div className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                                {recentProcesses.map(proc => (
                                    <div
                                        key={proc.id}
                                        onClick={() => onNavigate('process_detail', proc.id)}
                                        className={`flex items-center justify-between px-5 py-3.5 cursor-pointer transition-all ${
                                            darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-teal-50/50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                                darkMode ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-50 text-teal-600'
                                            }`}>
                                                {proc.beneficiary?.charAt(0) || '?'}
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                                    {proc.process_number || 'Sem NUP'}
                                                </p>
                                                <p className={`text-[11px] truncate ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    {proc.beneficiary} • {proc.request_type === 'emergency' ? 'Emergência' : proc.request_type === 'jury' ? 'Júri' : 'Ordinário'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            {proc.estimated_value && (
                                                <span className={`font-mono text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.estimated_value)}
                                                </span>
                                            )}
                                            <StatusBadge status={proc.status} />
                                            <ChevronRight size={14} className={darkMode ? 'text-slate-600' : 'text-slate-300'} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
