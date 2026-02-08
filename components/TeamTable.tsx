import React, { useEffect, useState, useRef } from 'react';
import {
    Users, Search, Loader2, UserPlus, Trash2,
    ChevronRight, ChevronLeft, ChevronUp, ChevronDown,
    FileText, X, ShieldCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ==================== TYPES ====================
interface SosfuTeamMember {
    id: string;
    full_name: string;
    email: string;
    matricula: string;
    avatar_url: string | null;
    funcao: string;
}

// ==================== CONSTANTS ====================
const SOSFU_FUNCOES_FALLBACK = ['Analista SOSFU', 'Chefe SOSFU', 'Técnico de Contas', 'Estagiário'];
const SOSFU_MEMBERS_PER_PAGE = 8;
const TEAM_MODULE = 'SOSFU';

// ==================== COMPONENT ====================
export const TeamTable: React.FC<{ isGestor?: boolean }> = ({ isGestor = false }) => {
    const [members, setMembers] = useState<SosfuTeamMember[]>([]);
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

    // Load team members from Supabase (two-step: team_members → profiles)
    useEffect(() => {
        (async () => {
            try {
                // 1) Get team membership rows
                const { data: teamRows } = await supabase
                    .from('team_members')
                    .select('user_id, funcao')
                    .eq('module', TEAM_MODULE);

                if (!teamRows || teamRows.length === 0) { setMembers([]); return; }

                // 2) Fetch profiles for those user IDs
                const userIds = teamRows.map(r => r.user_id);
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, matricula, avatar_url')
                    .in('id', userIds);

                const profileMap = new Map((profiles || []).map(p => [p.id, p]));

                const mapped: SosfuTeamMember[] = teamRows
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
            } catch (err) { console.error('Error loading SOSFU team:', err); }
        })();
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
            } catch (err) { console.error('SOSFU search error:', err); }
            finally { setSearching(false); }
        }, 350);

        return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
    }, [searchQuery, members]);

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
                    setCargosFromDB(unique.length > 0 ? unique : SOSFU_FUNCOES_FALLBACK);
                }
            } catch { setCargosFromDB(SOSFU_FUNCOES_FALLBACK); }
        })();
    }, [showAddModal]);

    const handleAddMember = async () => {
        if (!selectedUser) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase.from('team_members').upsert({
                module: TEAM_MODULE,
                user_id: selectedUser.id,
                added_by: user.id,
                funcao: selectedFuncao,
            }, { onConflict: 'module,user_id' });

            if (error) {
                console.error('Error saving SOSFU team member:', error);
                alert(`Erro ao adicionar membro: ${error.message}`);
                return;
            }

            const newMember: SosfuTeamMember = {
                id: selectedUser.id, full_name: selectedUser.full_name,
                email: selectedUser.email || '', matricula: selectedUser.matricula || '',
                avatar_url: selectedUser.avatar_url, funcao: selectedFuncao,
            };
            setMembers(prev => [...prev, newMember]);
        } catch (err) { console.error('Error adding team member:', err); }
        setShowAddModal(false); setSelectedUser(null); setSearchQuery(''); setSearchResults([]);
        setSelectedFuncao('');
    };

    const handleRemoveMember = async (id: string) => {
        try {
            await supabase.from('team_members')
                .delete()
                .eq('module', TEAM_MODULE)
                .eq('user_id', id);
            setMembers(prev => prev.filter(m => m.id !== id));
        } catch (err) { console.error('Error removing team member:', err); }
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
    const totalPages = Math.ceil(filteredMembers.length / SOSFU_MEMBERS_PER_PAGE);
    const paginatedMembers = filteredMembers.slice((currentPage - 1) * SOSFU_MEMBERS_PER_PAGE, currentPage * SOSFU_MEMBERS_PER_PAGE);

    const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    return (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Users size={18} className="text-blue-600" />
                    </div>
                    <h2 className="text-lg font-black text-slate-800">Gestão de Equipe</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                        {members.length}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    {/* Table search filter */}
                    {members.length > 3 && (
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text" placeholder="Filtrar..."
                                value={tableFilter} onChange={e => { setTableFilter(e.target.value); setCurrentPage(1); }}
                                className="pl-8 pr-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-2 w-44 bg-white border-slate-200 focus:ring-blue-200 focus:border-blue-300"
                            />
                        </div>
                    )}
                    {isGestor && (
                        <button onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-sm bg-blue-500 hover:bg-blue-600 text-white">
                            <UserPlus size={14} /> Adicionar Membro
                        </button>
                    )}
                </div>
            </div>

            {/* Co-responsability banner */}
            {members.length > 0 && (
                <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl border bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/60">
                    <div className="mt-0.5 p-1.5 rounded-lg shrink-0 bg-blue-100">
                        <ShieldCheck size={16} className="text-blue-600" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-blue-800">Seção Técnica SOSFU 📋</p>
                        <p className="text-[11px] mt-0.5 leading-relaxed text-blue-700/80">
                            Gerencie os membros da equipe técnica SOSFU. Clique em cada servidor para ver seus processos em andamento.
                        </p>
                    </div>
                </div>
            )}

            {members.length > 0 ? (
                <div className="rounded-2xl border shadow-sm overflow-hidden bg-white border-slate-200">
                    {/* Table */}
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/80">
                                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Servidor / Cargo</th>
                                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-widest hidden md:table-cell text-slate-400">Processos</th>
                                <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-widest w-24 text-slate-400">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedMembers.map(member => {
                                const isExpanded = expandedMemberId === member.id;

                                return (
                                    <React.Fragment key={member.id}>
                                        {/* Member Row */}
                                        <tr
                                            onClick={() => handleExpandMember(member.id)}
                                            className={`cursor-pointer transition-all group ${
                                                isExpanded
                                                    ? 'bg-blue-50/50'
                                                    : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            {/* Col 1: Servidor */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    {member.avatar_url ? (
                                                        <img src={member.avatar_url} alt={member.full_name}
                                                            className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm shrink-0" />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-blue-100 text-blue-600">
                                                            {getInitials(member.full_name)}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold truncate uppercase text-slate-800">
                                                            {member.full_name}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500">{member.funcao}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Col 2: Processos count */}
                                            <td className="text-center px-4 py-3.5 hidden md:table-cell">
                                                {isExpanded ? (
                                                    <span className="text-sm font-bold text-blue-600">
                                                        {memberProcesses.length} Processo{memberProcesses.length !== 1 ? 's' : ''}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-slate-400">—</span>
                                                )}
                                            </td>

                                            {/* Col 3: Ações */}
                                            <td className="text-right px-5 py-3.5">
                                                <div className="flex items-center justify-end gap-1">
                                                    {isGestor && removingId === member.id ? (
                                                        <div className="flex items-center gap-1.5 animate-in fade-in">
                                                            <button onClick={(e) => { e.stopPropagation(); handleRemoveMember(member.id); }}
                                                                className="px-2.5 py-1 bg-red-500 text-white text-[10px] font-bold rounded-lg hover:bg-red-600">Sim</button>
                                                            <button onClick={(e) => { e.stopPropagation(); setRemovingId(null); }}
                                                                className="px-2.5 py-1 text-[10px] font-medium rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">Não</button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {isGestor && (
                                                                <button onClick={(e) => { e.stopPropagation(); setRemovingId(member.id); }}
                                                                    className="p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 hover:bg-red-50"
                                                                    title="Remover membro">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                            <div className={`p-1 rounded-lg transition-colors ${isExpanded ? 'text-blue-600' : 'text-slate-400'}`}>
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
                                                    <div className="px-6 py-4 border-t animate-in slide-in-from-top-2 duration-200 bg-blue-50/30 border-blue-100">
                                                        {loadingMemberData ? (
                                                            <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-400">
                                                                <Loader2 size={16} className="animate-spin" /> Carregando processos...
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <FileText size={14} className="text-blue-600" />
                                                                    <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">
                                                                        Solicitações ({memberProcesses.length})
                                                                    </h4>
                                                                </div>
                                                                {memberProcesses.length === 0 ? (
                                                                    <p className="text-xs italic py-3 text-slate-400">Nenhuma solicitação encontrada</p>
                                                                ) : (
                                                                    <div className="space-y-1.5">
                                                                        {memberProcesses.map(proc => (
                                                                            <div
                                                                                key={proc.id}
                                                                                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all group/proc bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
                                                                            >
                                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-slate-100">
                                                                                        <FileText size={13} className="text-slate-500" />
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <p className="text-xs font-bold truncate text-slate-800">{proc.process_number}</p>
                                                                                        <p className="text-[10px] truncate text-slate-400">{proc.beneficiary || proc.unit}</p>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-2 shrink-0">
                                                                                    <span className="font-mono text-[10px] font-bold text-slate-600">
                                                                                        {formatCurrency(proc.value || 0)}
                                                                                    </span>
                                                                                    <ChevronRight size={12} className="transition-colors text-slate-300 group-hover/proc:text-blue-500" />
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
                        <div className="flex items-center justify-between px-5 py-3 border-t bg-slate-50/80 border-slate-200">
                            <p className="text-[11px] text-slate-500">
                                Exibindo <span className="font-bold text-slate-700">{(currentPage - 1) * SOSFU_MEMBERS_PER_PAGE + 1}–{Math.min(currentPage * SOSFU_MEMBERS_PER_PAGE, filteredMembers.length)}</span> de <span className="font-bold text-slate-700">{filteredMembers.length}</span> membros
                            </p>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold border rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 bg-white border-slate-200 hover:bg-slate-50"
                                >
                                    <ChevronLeft size={14} /> Anterior
                                </button>
                                <span className="px-3 py-1.5 text-xs font-bold rounded-lg text-blue-700 bg-blue-100">
                                    {currentPage}/{totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold border rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 bg-white border-slate-200 hover:bg-slate-50"
                                >
                                    Próxima <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
                    <Users size={32} className="mx-auto mb-3 text-slate-300" />
                    <p className="font-medium text-slate-500">Nenhum membro na equipe ainda</p>
                    <button onClick={() => setShowAddModal(true)}
                        className="text-blue-600 text-sm font-bold mt-2 hover:underline">+ Adicionar primeiro membro</button>
                </div>
            )}

            {/* ADD MEMBER MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
                    onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-black text-slate-800">Adicionar Membro</h3>
                            <button onClick={() => { setShowAddModal(false); setSelectedUser(null); setSearchQuery(''); setSearchResults([]); }}
                                className="p-1.5 rounded-lg transition-all text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mb-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block text-slate-400">Buscar Servidor</label>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="text" placeholder="Digite nome, matrícula, CPF ou email..."
                                    value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setSelectedUser(null); }}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                                    autoFocus />
                            </div>

                            {(searchResults.length > 0 || searching) && !selectedUser && (
                                <div className="mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                    {searching ? (
                                        <div className="p-4 text-center text-sm flex items-center justify-center gap-2 text-slate-400">
                                            <Loader2 size={14} className="animate-spin" /> Buscando...
                                        </div>
                                    ) : (
                                        searchResults.map(user => (
                                            <button key={user.id}
                                                onClick={() => { setSelectedUser(user); setSearchQuery(user.full_name); setSearchResults([]); if (user.cargo) setSelectedFuncao(user.cargo); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left border-b border-slate-50 last:border-0">
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                                                        {getInitials(user.full_name || '')}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 truncate">{user.full_name}</p>
                                                    <p className="text-[11px] text-slate-500">
                                                        {user.matricula && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold mr-1.5">Mat: {user.matricula}</span>}
                                                        {user.cpf && <span className="text-slate-400">CPF: {user.cpf}</span>}
                                                    </p>
                                                    {user.email && <p className="text-[10px] text-slate-400 truncate">{user.email}</p>}
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="mb-6">
                            <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block text-slate-400">Cargo / Função</label>
                            <select value={selectedFuncao} onChange={e => setSelectedFuncao(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 appearance-none cursor-pointer">
                                <option value="">Selecione o cargo...</option>
                                {cargosFromDB.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => { setShowAddModal(false); setSelectedUser(null); setSearchQuery(''); }}
                                className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm">
                                Cancelar
                            </button>
                            <button onClick={handleAddMember} disabled={!selectedUser || !selectedFuncao}
                                className="flex-1 px-4 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};