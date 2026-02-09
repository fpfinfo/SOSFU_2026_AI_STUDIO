import React, { useEffect, useState, useRef } from 'react';
import {
    Users, Search, Loader2, UserPlus, Trash2,
    ChevronRight, ChevronLeft, ChevronUp, ChevronDown,
    FileText, X, ShieldCheck, CheckSquare, Eye,
    BarChart, Plane, Receipt
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ==================== TYPES ====================
interface SodpaTeamMember {
    id: string;
    full_name: string;
    email: string;
    matricula: string;
    avatar_url: string | null;
    funcao: string;
    solicitationCount?: number;
    accountabilityCount?: number;
}

// ==================== CONSTANTS ====================
const SODPA_FUNCOES_FALLBACK = ['Analista SODPA', 'Chefe SODPA', 'Técnico de Diárias', 'Estagiário'];
const TEAM_MEMBERS_PER_PAGE = 8;
const TEAM_MODULE = 'SODPA';

// ==================== COMPONENT ====================
export const SodpaTeamTable: React.FC<{ isGestor?: boolean }> = ({ isGestor = false }) => {
    const [members, setMembers] = useState<SodpaTeamMember[]>([]);
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

    // Load team members
    useEffect(() => {
        (async () => {
            try {
                // 1) Get team membership
                const { data: teamRows } = await supabase
                    .from('team_members')
                    .select('user_id, funcao')
                    .eq('module', TEAM_MODULE);

                if (!teamRows || teamRows.length === 0) { setMembers([]); return; }

                // 2) Fetch profiles
                const userIds = teamRows.map(r => r.user_id);
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, matricula, avatar_url')
                    .in('id', userIds);

                const profileMap = new Map<string, any>((profiles || []).map(p => [p.id, p]));
                
                // 3) Fetch Counts
                const mappedMembers: SodpaTeamMember[] = await Promise.all(
                    teamRows
                        .filter(r => profileMap.has(r.user_id))
                        .map(async (r) => {
                            const p = profileMap.get(r.user_id)!;
                            
                            // Count Solicitations (Active)
                            const { count: solCount } = await supabase
                                .from('solicitations')
                                .select('*', { count: 'exact', head: true })
                                .eq('analyst_id', p.id)
                                .neq('status', 'PAID')
                                .neq('status', 'APPROVED'); // Assuming APPROVED/PAID are done

                             // Count Accountabilities (Active)
                             const { count: pcCount } = await supabase
                                .from('accountabilities')
                                .select('*', { count: 'exact', head: true })
                                .eq('analyst_id', p.id)
                                .neq('status', 'APPROVED')
                                .neq('status', 'REJECTED'); // Assuming these are terminal states

                            return {
                                id: p.id,
                                full_name: p.full_name || '',
                                email: p.email || '',
                                matricula: p.matricula || '',
                                avatar_url: p.avatar_url,
                                funcao: r.funcao || '',
                                solicitationCount: solCount || 0,
                                accountabilityCount: pcCount || 0
                            };
                        })
                );

                setMembers(mappedMembers);
            } catch (err) { console.error('Error loading SODPA team:', err); }
        })();
    }, []);

    // Search logic (same as Sosfu)
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
            } catch (err) { console.error('SODPA search error:', err); }
            finally { setSearching(false); }
        }, 350);

        return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
    }, [searchQuery, members]);

    // Cargos logic (same)
    useEffect(() => {
        if (!showAddModal) return;
        (async () => {
            try {
                const { data } = await supabase.from('profiles').select('cargo').not('cargo', 'is', null).order('cargo');
                if (data) {
                    const unique = [...new Set(data.map(d => d.cargo).filter(Boolean))] as string[];
                    setCargosFromDB(unique.length > 0 ? unique : SODPA_FUNCOES_FALLBACK);
                }
            } catch { setCargosFromDB(SODPA_FUNCOES_FALLBACK); }
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

            if (error) { alert(`Erro: ${error.message}`); return; }

            const newMember: SodpaTeamMember = {
                id: selectedUser.id, full_name: selectedUser.full_name,
                email: selectedUser.email || '', matricula: selectedUser.matricula || '',
                avatar_url: selectedUser.avatar_url, funcao: selectedFuncao,
                solicitationCount: 0, accountabilityCount: 0
            };
            setMembers(prev => [...prev, newMember]);
        } catch (err) { console.error(err); }
        setShowAddModal(false); setSelectedUser(null); setSearchQuery(''); setSearchResults([]); setSelectedFuncao('');
    };

    const handleRemoveMember = async (id: string) => {
        try {
            await supabase.from('team_members').delete().eq('module', TEAM_MODULE).eq('user_id', id);
            setMembers(prev => prev.filter(m => m.id !== id));
        } catch (err) { console.error(err); }
        setRemovingId(null);
    };

    const getInitials = (name: string) => name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

    // Expand member
    const handleExpandMember = async (memberId: string) => {
        if (expandedMemberId === memberId) { setExpandedMemberId(null); return; }
        setExpandedMemberId(memberId);
        setLoadingMemberData(true);
        setMemberProcesses([]);

        try {
            // 1. Fetch Solicitations
            const { data: sols } = await supabase.from('solicitations')
                .select('id, process_number, status, value, created_at, unit, beneficiary')
                .eq('analyst_id', memberId)
                .neq('status', 'PAID')
                .limit(5);

            // 2. Fetch Accountabilities
            const { data: pcs } = await supabase.from('accountabilities')
                .select('id, process_number, status, value, created_at, solicitation_id')
                .eq('analyst_id', memberId)
                .neq('status', 'APPROVED')
                .limit(5);

            const combined = [
                ...(sols || []).map(s => ({ ...s, type: 'SOLICITATION' })),
                ...(pcs || []).map(p => ({ ...p, type: 'ACCOUNTABILITY', beneficiary: 'PC' }))
            ].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setMemberProcesses(combined);
        } catch (err) { console.error(err); }
        finally { setLoadingMemberData(false); }
    };

    const filteredMembers = tableFilter
        ? members.filter(m => m.full_name.toLowerCase().includes(tableFilter.toLowerCase()) || m.funcao.toLowerCase().includes(tableFilter.toLowerCase()))
        : members;
    const totalPages = Math.ceil(filteredMembers.length / TEAM_MEMBERS_PER_PAGE);
    const paginatedMembers = filteredMembers.slice((currentPage - 1) * TEAM_MEMBERS_PER_PAGE, currentPage * TEAM_MEMBERS_PER_PAGE);

    const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    return (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 mb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
                        <Users size={18} className="text-sky-600" />
                    </div>
                    <h2 className="text-lg font-black text-slate-800">Gestão de Equipe SODPA</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-700">
                        {members.length}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    {members.length > 3 && (
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={tableFilter} onChange={e => { setTableFilter(e.target.value); setCurrentPage(1); }} type="text" placeholder="Filtrar..." className="pl-8 pr-3 py-2 border rounded-lg text-xs w-44 bg-white focus:outline-none focus:ring-2 focus:ring-sky-200" />
                        </div>
                    )}
                    {isGestor && (
                        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-sky-500 hover:bg-sky-600 text-white shadow-sm transition-all">
                            <UserPlus size={14} /> Adicionar Membro
                        </button>
                    )}
                </div>
            </div>

            {/* Banner */}
            {members.length > 0 && (
                <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl border bg-gradient-to-r from-sky-50 to-indigo-50 border-sky-200/60">
                    <div className="mt-0.5 p-1.5 rounded-lg shrink-0 bg-sky-100">
                        <ShieldCheck size={16} className="text-sky-600" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-sky-800">Seção Técnica SODPA ✈️</p>
                        <p className="text-[11px] mt-0.5 leading-relaxed text-sky-700/80">
                            Acompanhe a carga de trabalho de Diárias e Passagens da equipe técnica.
                        </p>
                    </div>
                </div>
            )}

            {members.length > 0 ? (
                <div className="rounded-2xl border shadow-sm overflow-hidden bg-white border-slate-200">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/80">
                                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Servidor / Cargo</th>
                                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest hidden md:table-cell text-slate-400 w-48">Distribuição</th>
                                <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-widest w-32 text-slate-400">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedMembers.map(member => {
                                const isExpanded = expandedMemberId === member.id;
                                return (
                                    <React.Fragment key={member.id}>
                                        <tr onClick={() => handleExpandMember(member.id)} className={`cursor-pointer transition-all group ${isExpanded ? 'bg-sky-50/50' : 'hover:bg-slate-50'}`}>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    {member.avatar_url ? (
                                                        <img src={member.avatar_url} alt={member.full_name} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm shrink-0" />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-sky-100 text-sky-600">
                                                            {getInitials(member.full_name)}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold truncate uppercase text-slate-800">{member.full_name}</p>
                                                        <p className="text-[11px] text-slate-500">{member.funcao}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 hidden md:table-cell">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-1.5 text-sky-600">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                                                            <span className="font-medium">Diárias</span>
                                                        </div>
                                                        <span className="font-bold text-slate-700 bg-sky-50 px-1.5 py-0.5 rounded-md min-w-[24px] text-center">{member.solicitationCount}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-1.5 text-amber-600">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                            <span className="font-medium">Prest. Contas</span>
                                                        </div>
                                                        <span className="font-bold text-slate-700 bg-amber-50 px-1.5 py-0.5 rounded-md min-w-[24px] text-center">{member.accountabilityCount}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-right px-5 py-3.5">
                                                <div className="flex items-center justify-end gap-2">
                                                    {isGestor && removingId === member.id ? (
                                                        <div className="flex items-center gap-1.5 animate-in fade-in">
                                                            <button onClick={(e) => { e.stopPropagation(); handleRemoveMember(member.id); }} className="px-2.5 py-1 bg-red-500 text-white text-[10px] font-bold rounded-lg hover:bg-red-600">Confirma</button>
                                                            <button onClick={(e) => { e.stopPropagation(); setRemovingId(null); }} className="px-2.5 py-1 text-[10px] font-medium rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">Cancelar</button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <button onClick={(e) => { e.stopPropagation(); handleExpandMember(member.id); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 text-slate-500 transition-all text-[10px] font-bold">
                                                                <Eye size={12} /> Ver Carga
                                                            </button>
                                                            {isGestor && (
                                                                <button onClick={(e) => { e.stopPropagation(); setRemovingId(member.id); }} className="p-1.5 rounded-lg transition-all text-slate-300 hover:text-red-500 hover:bg-red-50" title="Remover membro">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={3} className="px-0 py-0">
                                                    <div className="px-6 py-4 border-t animate-in slide-in-from-top-2 duration-200 bg-sky-50/30 border-sky-100">
                                                        {loadingMemberData ? (
                                                            <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-400">
                                                                <Loader2 size={16} className="animate-spin" /> Carregando...
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <BarChart size={14} className="text-sky-600" />
                                                                        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">Carga de Trabalho Recente ({memberProcesses.length})</h4>
                                                                    </div>
                                                                </div>
                                                                {memberProcesses.length === 0 ? (
                                                                    <p className="text-xs italic py-3 text-slate-400">Sem processos em andamento.</p>
                                                                ) : (
                                                                    <div className="space-y-1.5">
                                                                        {memberProcesses.map(proc => (
                                                                            <div key={proc.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all bg-white border-slate-200 hover:border-sky-300 hover:bg-sky-50/50">
                                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${proc.type === 'SOLICITATION' ? 'bg-sky-50 text-sky-500' : 'bg-amber-50 text-amber-500'}`}>
                                                                                        {proc.type === 'SOLICITATION' ? <Plane size={13} /> : <Receipt size={13} />}
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <p className="text-xs font-bold truncate text-slate-800">{proc.process_number}</p>
                                                                                        <p className="text-[10px] truncate text-slate-400">
                                                                                            {proc.type === 'SOLICITATION' ? (proc.beneficiary || proc.unit) : 'Prestação de Contas'}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-2 shrink-0">
                                                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${proc.type === 'SOLICITATION' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                                        {proc.type === 'SOLICITATION' ? 'DIÁRIA' : 'CONTAS'}
                                                                                    </span>
                                                                                    {proc.value && <span className="font-mono text-[10px] font-bold text-slate-600">{formatCurrency(proc.value)}</span>}
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
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-3 border-t bg-slate-50/80 border-slate-200">
                            <p className="text-[11px] text-slate-500">Exibindo {(currentPage - 1) * TEAM_MEMBERS_PER_PAGE + 1}–{Math.min(currentPage * TEAM_MEMBERS_PER_PAGE, filteredMembers.length)} de {filteredMembers.length}</p>
                            <div className="flex items-center gap-1.5">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold border rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50"><ChevronLeft size={14} /> Anterior</button>
                                <span className="px-3 py-1.5 text-xs font-bold rounded-lg text-sky-700 bg-sky-100">{currentPage}/{totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold border rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50">Próxima <ChevronRight size={14} /></button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
                    <Users size={32} className="mx-auto mb-3 text-slate-300" />
                    <p className="font-medium text-slate-500">Nenhum membro na equipe ainda</p>
                    <button onClick={() => setShowAddModal(true)} className="text-sky-600 text-sm font-bold mt-2 hover:underline">+ Adicionar primeiro membro</button>
                </div>
            )}

            {/* Same Add Modal Logic (Simplified for brevity in thought but included in code) */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-black text-slate-800">Adicionar Membro SODPA</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
                        </div>
                        <div className="mb-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block text-slate-400">Buscar Servidor</label>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input autoFocus type="text" placeholder="Nome, matrícula..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setSelectedUser(null); }} className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
                            </div>
                            {(searchResults.length > 0 || searching) && !selectedUser && (
                                <div className="mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                    {searching ? <div className="p-4 text-center text-sm text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Buscando...</div> : (
                                        searchResults.map(user => (
                                            <button key={user.id} onClick={() => { setSelectedUser(user); setSearchQuery(user.full_name); setSearchResults([]); if (user.cargo) setSelectedFuncao(user.cargo); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sky-50 text-left border-b border-slate-50">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-xs">{getInitials(user.full_name)}</div>
                                                <div><p className="text-sm font-bold text-slate-800">{user.full_name}</p><p className="text-[10px] text-slate-500">{user.matricula}</p></div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="mb-6">
                            <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block text-slate-400">Cargo / Função</label>
                            <select value={selectedFuncao} onChange={e => setSelectedFuncao(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-200">
                                <option value="">Selecione...</option>
                                {cargosFromDB.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50">Cancelar</button>
                            <button onClick={handleAddMember} disabled={!selectedUser} className="flex-1 px-4 py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 disabled:opacity-50">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
