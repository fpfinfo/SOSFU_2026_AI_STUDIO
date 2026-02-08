import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle2, FileText, Filter, Search, Clock, ChevronRight, ChevronDown, ChevronUp, ChevronLeft, UserCheck, Loader2, Plus, Wallet, TrendingUp, AlertCircle, Stamp, FileCheck, FileSignature, Send, Users, BarChart3, Eye, X, UserPlus, MoreVertical, Trash2, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StatusBadge } from '../StatusBadge';
import { Tooltip } from '../ui/Tooltip';
import { SlaCountdown } from '../ui/SlaCountdown';
import { useRealtimeInbox } from '../../hooks/useRealtimeInbox';
import { useStaleProcesses } from '../../hooks/useStaleProcesses';
import { StaleProcessBanner } from '../ui/StaleProcessBanner';

interface GestorDashboardProps {
    onNavigate: (page: string, processId?: string, accountabilityId?: string) => void;
}

// ==================== GESTÃO DE EQUIPE (GESTOR) ====================
interface GestorTeamMember {
    id: string;
    full_name: string;
    email: string;
    matricula: string;
    avatar_url: string | null;
    funcao: string;
}

const GESTOR_FUNCOES_FALLBACK = ['Magistrado', 'Assessor', 'Analista Judiciário', 'Técnico Judiciário', 'Estagiário'];
const MEMBERS_PER_PAGE = 8;
const GESTOR_MODULE = 'GESTOR';

const GestorTeamSection: React.FC<{ userName: string; pendingCount: number; minutasCount: number; onNavigate: (page: string, processId?: string, accountabilityId?: string) => void }> = ({ userName, pendingCount, minutasCount, onNavigate }) => {
    const [members, setMembers] = useState<GestorTeamMember[]>([]);
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
    const [memberPCs, setMemberPCs] = useState<any[]>([]);
    const [loadingMemberData, setLoadingMemberData] = useState(false);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load team members from Supabase (two-step: team_members → profiles)
    useEffect(() => {
        (async () => {
            try {
                const { data: teamRows } = await supabase
                    .from('team_members')
                    .select('user_id, funcao')
                    .eq('module', GESTOR_MODULE);

                if (!teamRows || teamRows.length === 0) { setMembers([]); return; }

                const userIds = teamRows.map(r => r.user_id);
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, matricula, avatar_url')
                    .in('id', userIds);

                const profileMap = new Map((profiles || []).map(p => [p.id, p]));

                const mapped: GestorTeamMember[] = teamRows
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
            } catch (err) { console.error('Error loading GESTOR team:', err); }
        })();
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
                    setCargosFromDB(unique.length > 0 ? unique : GESTOR_FUNCOES_FALLBACK);
                }
            } catch { setCargosFromDB(GESTOR_FUNCOES_FALLBACK); }
        })();
    }, [showAddModal]);

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
            } catch (err) { console.error('Gestor search error:', err); }
            finally { setSearching(false); }
        }, 350);

        return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
    }, [searchQuery, members]);

    const handleAddMember = async () => {
        if (!selectedUser) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase.from('team_members').upsert({
                module: GESTOR_MODULE,
                user_id: selectedUser.id,
                added_by: user.id,
                funcao: selectedFuncao,
            }, { onConflict: 'module,user_id' });

            if (error) {
                console.error('Error saving GESTOR team member:', error);
                alert(`Erro ao adicionar membro: ${error.message}`);
                return;
            }

            const newMember: GestorTeamMember = {
                id: selectedUser.id, full_name: selectedUser.full_name,
                email: selectedUser.email || '', matricula: selectedUser.matricula || '',
                avatar_url: selectedUser.avatar_url, funcao: selectedFuncao,
            };
            setMembers(prev => [...prev, newMember]);
        } catch (err) { console.error('Error adding GESTOR team member:', err); }
        setShowAddModal(false); setSelectedUser(null); setSearchQuery(''); setSearchResults([]);
        setSelectedFuncao('');
    };

    const handleRemoveMember = async (id: string) => {
        try {
            await supabase.from('team_members')
                .delete()
                .eq('module', GESTOR_MODULE)
                .eq('user_id', id);
            setMembers(prev => prev.filter(m => m.id !== id));
        } catch (err) { console.error('Error removing GESTOR team member:', err); }
        setRemovingId(null);
        if (expandedMemberId === id) setExpandedMemberId(null);
    };

    const getInitials = (name: string) => name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

    // Expand member → fetch their processes & PCs
    const handleExpandMember = async (memberId: string) => {
        if (expandedMemberId === memberId) { setExpandedMemberId(null); return; }
        setExpandedMemberId(memberId);
        setLoadingMemberData(true);
        setMemberProcesses([]);
        setMemberPCs([]);

        try {
            const [{ data: sols }, { data: pcs }] = await Promise.all([
                supabase.from('solicitations')
                    .select('id, process_number, status, value, created_at, unit, beneficiary')
                    .eq('user_id', memberId)
                    .order('created_at', { ascending: false })
                    .limit(6),
                supabase.from('accountabilities')
                    .select('id, status, total_spent, value, created_at, solicitation_id, solicitation:solicitation_id(process_number, beneficiary)')
                    .eq('requester_id', memberId)
                    .order('created_at', { ascending: false })
                    .limit(6),
            ]);
            setMemberProcesses(sols || []);
            setMemberPCs(pcs || []);
        } catch (err) { console.error('Error fetching member data:', err); }
        finally { setLoadingMemberData(false); }
    };

    // Filtered + paginated members
    const filteredMembers = tableFilter
        ? members.filter(m => m.full_name.toLowerCase().includes(tableFilter.toLowerCase()) || m.funcao.toLowerCase().includes(tableFilter.toLowerCase()))
        : members;
    const totalPages = Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE);
    const paginatedMembers = filteredMembers.slice((currentPage - 1) * MEMBERS_PER_PAGE, currentPage * MEMBERS_PER_PAGE);

    // PC status badge config
    const pcStatusConfig: Record<string, { label: string; color: string; textColor: string }> = {
        'DRAFT': { label: 'Rascunho', color: 'bg-gray-100', textColor: 'text-gray-600' },
        'WAITING_MANAGER': { label: 'Aguard. Atesto', color: 'bg-amber-100', textColor: 'text-amber-700' },
        'WAITING_SOSFU': { label: 'Análise SOSFU', color: 'bg-blue-100', textColor: 'text-blue-700' },
        'CORRECTION': { label: 'Em Correção', color: 'bg-orange-100', textColor: 'text-orange-700' },
        'APPROVED': { label: 'Aprovada', color: 'bg-green-100', textColor: 'text-green-700' },
    };

    return (
        <div className="mb-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Users size={18} className="text-indigo-600" />
                    </div>
                    <h2 className="text-lg font-black text-slate-800">Gestão de Equipe</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">{members.length}</span>
                </div>
                <div className="flex items-center gap-3">
                    {/* Table search filter */}
                    {members.length > 3 && (
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text" placeholder="Filtrar..."
                                value={tableFilter} onChange={e => { setTableFilter(e.target.value); setCurrentPage(1); }}
                                className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 w-44"
                            />
                        </div>
                    )}
                    <button onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white text-xs font-bold rounded-xl hover:bg-indigo-600 transition-all shadow-sm">
                        <UserPlus size={14} /> Adicionar Membro
                    </button>
                </div>
            </div>

            {/* Banner: Co-responsabilidade amigável */}
            {members.length > 0 && (
                <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl">
                    <div className="mt-0.5 p-1.5 bg-amber-100 rounded-lg shrink-0">
                        <ShieldCheck size={16} className="text-amber-600" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-amber-800">Você é co-responsável! 🤝</p>
                        <p className="text-[11px] text-amber-700/80 mt-0.5 leading-relaxed">
                            Como Gestor, acompanhe os <strong>prazos de prestação de contas</strong> dos membros da sua equipe.
                            Clique em cada servidor para ver seus processos e PCs em andamento.
                        </p>
                    </div>
                </div>
            )}

            {members.length > 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Table */}
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/80">
                                <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Servidor / Cargo</th>
                                <th className="text-center px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Processos</th>
                                <th className="text-center px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">Status</th>
                                <th className="text-right px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedMembers.map(member => {
                                const isExpanded = expandedMemberId === member.id;
                                const isYou = userName.toLowerCase().includes(member.full_name.split(' ')[0].toLowerCase());

                                return (
                                    <React.Fragment key={member.id}>
                                        {/* Member Row */}
                                        <tr
                                            onClick={() => handleExpandMember(member.id)}
                                            className={`cursor-pointer transition-all group ${isExpanded ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                                        >
                                            {/* Col 1: Servidor */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    {member.avatar_url ? (
                                                        <img src={member.avatar_url} alt={member.full_name}
                                                            className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm shrink-0" />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                                                            {getInitials(member.full_name)}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-bold text-slate-800 truncate uppercase">{member.full_name}</p>
                                                            {isYou && (
                                                                <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[8px] font-bold uppercase shrink-0">Você</span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-slate-500">{member.funcao}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Col 2: Processos count */}
                                            <td className="text-center px-4 py-3.5 hidden md:table-cell">
                                                {isExpanded ? (
                                                    <span className="text-sm font-bold text-indigo-600">
                                                        {memberProcesses.length} Processo{memberProcesses.length !== 1 ? 's' : ''}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-slate-400">—</span>
                                                )}
                                            </td>

                                            {/* Col 3: Status badges */}
                                            <td className="text-center px-4 py-3.5 hidden lg:table-cell">
                                                {isExpanded && memberPCs.length > 0 ? (
                                                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                        {Object.entries(
                                                            memberPCs.reduce((acc: Record<string, number>, pc) => {
                                                                acc[pc.status] = (acc[pc.status] || 0) + 1; return acc;
                                                            }, {})
                                                        ).map(([status, count]) => {
                                                            const sc = pcStatusConfig[status] || { label: status, color: 'bg-gray-100', textColor: 'text-gray-600' };
                                                            return (
                                                                <span key={status} className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${sc.color} ${sc.textColor}`}>
                                                                    {count as number} {sc.label}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-slate-400">—</span>
                                                )}
                                            </td>

                                            {/* Col 4: Ações */}
                                            <td className="text-right px-5 py-3.5">
                                                <div className="flex items-center justify-end gap-1">
                                                    {removingId === member.id ? (
                                                        <div className="flex items-center gap-1.5 animate-in fade-in">
                                                            <button onClick={(e) => { e.stopPropagation(); handleRemoveMember(member.id); }}
                                                                className="px-2.5 py-1 bg-red-500 text-white text-[10px] font-bold rounded-lg hover:bg-red-600">Sim</button>
                                                            <button onClick={(e) => { e.stopPropagation(); setRemovingId(null); }}
                                                                className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-lg hover:bg-slate-200">Não</button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <button onClick={(e) => { e.stopPropagation(); setRemovingId(member.id); }}
                                                                className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                                                title="Remover membro">
                                                                <Trash2 size={14} />
                                                            </button>
                                                            <div className={`p-1 rounded-lg transition-colors ${isExpanded ? 'text-indigo-600' : 'text-slate-400'}`}>
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
                                                <td colSpan={4} className="px-0 py-0 bg-indigo-50/30">
                                                    <div className="px-6 py-4 border-t border-indigo-100 animate-in slide-in-from-top-2 duration-200">
                                                        {loadingMemberData ? (
                                                            <div className="flex items-center justify-center gap-2 py-6 text-slate-400 text-sm">
                                                                <Loader2 size={16} className="animate-spin" /> Carregando processos...
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                                {/* Solicitações */}
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <FileText size={14} className="text-indigo-600" />
                                                                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                                                            Solicitações ({memberProcesses.length})
                                                                        </h4>
                                                                    </div>
                                                                    {memberProcesses.length === 0 ? (
                                                                        <p className="text-xs text-slate-400 italic py-3">Nenhuma solicitação encontrada</p>
                                                                    ) : (
                                                                        <div className="space-y-1.5">
                                                                            {memberProcesses.map(proc => (
                                                                                <div
                                                                                    key={proc.id}
                                                                                    onClick={(e) => { e.stopPropagation(); onNavigate('process_detail', proc.id); }}
                                                                                    className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer transition-all group/proc"
                                                                                >
                                                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                                                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                                                                            <FileText size={13} className="text-slate-500" />
                                                                                        </div>
                                                                                        <div className="min-w-0">
                                                                                            <p className="text-xs font-bold text-slate-800 truncate">{proc.process_number}</p>
                                                                                            <p className="text-[10px] text-slate-400 truncate">{proc.beneficiary || proc.unit}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                                        <span className="font-mono text-[10px] font-bold text-slate-600">
                                                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.value || 0)}
                                                                                        </span>
                                                                                        <StatusBadge status={proc.status} size="sm" />
                                                                                        <ChevronRight size={12} className="text-slate-300 group-hover/proc:text-indigo-500 transition-colors" />
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Prestações de Contas */}
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <FileCheck size={14} className="text-cyan-600" />
                                                                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                                                            Prestações de Contas ({memberPCs.length})
                                                                        </h4>
                                                                    </div>
                                                                    {memberPCs.length === 0 ? (
                                                                        <p className="text-xs text-slate-400 italic py-3">Nenhuma PC encontrada</p>
                                                                    ) : (
                                                                        <div className="space-y-1.5">
                                                                            {memberPCs.map(pc => {
                                                                                const sc = pcStatusConfig[pc.status] || { label: pc.status, color: 'bg-gray-100', textColor: 'text-gray-600' };
                                                                                return (
                                                                                    <div
                                                                                        key={pc.id}
                                                                                        onClick={(e) => { e.stopPropagation(); onNavigate('process_accountability', pc.solicitation_id, pc.id); }}
                                                                                        className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white rounded-xl border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/50 cursor-pointer transition-all group/pc"
                                                                                    >
                                                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${sc.color}`}>
                                                                                                <FileCheck size={13} className={sc.textColor} />
                                                                                            </div>
                                                                                            <div className="min-w-0">
                                                                                                <p className="text-xs font-bold text-slate-800 truncate">
                                                                                                    {pc.solicitation?.process_number || `PC #${pc.id.slice(0, 8)}`}
                                                                                                </p>
                                                                                                <p className="text-[10px] text-slate-400">{pc.solicitation?.beneficiary}</p>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                                            <span className="font-mono text-[10px] font-bold text-slate-600">
                                                                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pc.total_spent || 0)}
                                                                                            </span>
                                                                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${sc.color} ${sc.textColor}`}>
                                                                                                {sc.label}
                                                                                            </span>
                                                                                            <ChevronRight size={12} className="text-slate-300 group-hover/pc:text-cyan-500 transition-colors" />
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
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
                        <div className="flex items-center justify-between px-5 py-3 bg-slate-50/80 border-t border-slate-200">
                            <p className="text-[11px] text-slate-500">
                                Exibindo <span className="font-bold text-slate-700">{(currentPage - 1) * MEMBERS_PER_PAGE + 1}–{Math.min(currentPage * MEMBERS_PER_PAGE, filteredMembers.length)}</span> de <span className="font-bold text-slate-700">{filteredMembers.length}</span> membros
                            </p>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronLeft size={14} /> Anterior
                                </button>
                                <span className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-100 rounded-lg">{currentPage}/{totalPages}</span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    Próxima <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
                    <Users size={32} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Nenhum membro na equipe ainda</p>
                    <button onClick={() => setShowAddModal(true)}
                        className="text-indigo-600 text-sm font-bold mt-2 hover:underline">+ Adicionar primeiro membro</button>
                </div>
            )}

            {/* ADD MEMBER MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
                    onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-black text-slate-800">Adicionar Membro à Equipe</h3>
                            <button onClick={() => { setShowAddModal(false); setSelectedUser(null); setSearchQuery(''); setSearchResults([]); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mb-4">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Buscar Servidor</label>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="text" placeholder="Digite nome, matrícula, CPF ou email..."
                                    value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setSelectedUser(null); }}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                                    autoFocus />
                            </div>

                            {(searchResults.length > 0 || searching) && !selectedUser && (
                                <div className="mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                    {searching ? (
                                        <div className="p-4 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                                            <Loader2 size={14} className="animate-spin" /> Buscando...
                                        </div>
                                    ) : (
                                        searchResults.map(user => (
                                            <button key={user.id}
                                                onClick={() => { setSelectedUser(user); setSearchQuery(user.full_name); setSearchResults([]); if (user.cargo) setSelectedFuncao(user.cargo); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors text-left border-b border-slate-50 last:border-0">
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
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Cargo / Função</label>
                            <select value={selectedFuncao} onChange={e => setSelectedFuncao(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 appearance-none cursor-pointer">
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
                                className="flex-1 px-4 py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export const GestorDashboard: React.FC<GestorDashboardProps> = ({ onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [pendingApproval, setPendingApproval] = useState<any[]>([]); // Solicitações
    const [pendingAccountability, setPendingAccountability] = useState<any[]>([]); // PCs WAITING_MANAGER
    const [teamAccountability, setTeamAccountability] = useState<any[]>([]); // ALL team PCs
    const [pendingMinutas, setPendingMinutas] = useState<any[]>([]); // Minutas para assinar
    const [myRequests, setMyRequests] = useState<any[]>([]);
    const [stats, setStats] = useState({ 
        pendingCount: 0, 
        pendingPcCount: 0,
        pendingMinutasCount: 0,
        signedMinutasCount: 0,
        myActiveCount: 0,
        myCompletedCount: 0, 
        totalManagedValue: 0,
        approvedValue: 0
    });
    const [userName, setUserName] = useState('');
    const [gestorLocationName, setGestorLocationName] = useState<string | null>(null);

    const refetchGestor = useCallback(() => {
        fetchGestorData();
    }, []);

    // ⚡ Realtime: auto-refresh when processes arrive for GESTOR
    useRealtimeInbox({
        module: 'GESTOR',
        onNewProcess: (payload) => {
            console.log('[Realtime] Novo processo para Gestor:', payload.new?.process_number);
            refetchGestor();
        },
        onAnyChange: refetchGestor,
    });

    // ⏳ Stale process detection (stuck > 5 days)
    const { staleProcesses: staleGestor } = useStaleProcesses({
        statuses: ['PENDING', 'WAITING_GESTOR_APPROVAL'],
        thresholdDays: 5,
    });

    useEffect(() => {
        fetchGestorData();
    }, []);

    const fetchGestorData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            
            // Pega nome do usuário
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
            setUserName(profile?.full_name?.split(' ')[0] || 'Gestor');

            // ===== Busca Comarca/Unidade do Gestor =====
            const EXCLUDED_SIGLAS = ['SOSFU', 'AJSEFIN', 'SEFIN', 'SGP', 'SEAD', 'SODPA', 'GABPRES', 'GABVICE', 'GABCOR'];
            let locationName: string | null = null;

            // 1) Tenta dcomarcas.gestor_id
            const { data: comarcaData } = await supabase
                .from('dcomarcas')
                .select('comarca')
                .eq('gestor_id', user.id)
                .limit(1)
                .maybeSingle();

            if (comarcaData?.comarca) {
                locationName = `Comarca de ${comarcaData.comarca}`;
            } else {
                // 2) Tenta dUnidadesAdmin.responsavel_id
                const { data: unidadeData } = await supabase
                    .from('dUnidadesAdmin')
                    .select('nome, sigla')
                    .eq('responsavel_id', user.id)
                    .limit(1)
                    .maybeSingle();

                if (unidadeData?.nome && !EXCLUDED_SIGLAS.includes(unidadeData.sigla || '')) {
                    locationName = unidadeData.nome;
                }
            }

            setGestorLocationName(locationName);

            // 1. Solicitações para APROVAR (WAITING_MANAGER) — Solicitações iniciais
            const { data: approvals, error: appError } = await supabase
                .from('solicitations')
                .select('*')
                .ilike('manager_email', user.email || '')
                .eq('status', 'WAITING_MANAGER')
                .order('created_at', { ascending: false });

            if (appError) throw appError;

            // 2. Prestações de Contas para ATESTAR (WAITING_MANAGER)
            const { data: pcApprovals, error: pcError } = await supabase
                .from('accountabilities')
                .select(`
                    *,
                    solicitation:solicitation_id!inner(manager_email, process_number, beneficiary, unit),
                    requester:requester_id(full_name)
                `)
                .eq('status', 'WAITING_MANAGER')
                .ilike('solicitation.manager_email', user.email || '');

            if (pcError) console.error("Erro ao buscar PCs:", pcError);

            // 2b. TODAS as PCs da equipe (para tracker de acompanhamento)
            const { data: allTeamPCs } = await supabase
                .from('accountabilities')
                .select(`
                    id,
                    status,
                    total_spent,
                    value,
                    deadline,
                    created_at,
                    solicitation:solicitation_id!inner(manager_email, process_number, beneficiary, unit),
                    requester:requester_id(full_name)
                `)
                .neq('status', 'WAITING_MANAGER')
                .ilike('solicitation.manager_email', user.email || '');

            // 3. Minutas pendentes de assinatura — Processos com status WAITING_MANAGER
            //    que possuem documentos is_draft: true no metadata
            const pendingList = approvals || [];
            
            // Para cada solicitação WAITING_MANAGER, buscar docs com is_draft
            const minutasData: any[] = [];
            if (pendingList.length > 0) {
                const solIds = pendingList.map(s => s.id);
                const { data: draftDocs } = await supabase
                    .from('process_documents')
                    .select('*')
                    .in('solicitation_id', solIds)
                    .eq('metadata->>is_draft', 'true');
                
                if (draftDocs && draftDocs.length > 0) {
                    // Agrupar por solicitation_id
                    const grouped: Record<string, any[]> = {};
                    draftDocs.forEach(doc => {
                        if (!grouped[doc.solicitation_id]) grouped[doc.solicitation_id] = [];
                        grouped[doc.solicitation_id].push(doc);
                    });
                    
                    // Montar lista para exibição
                    Object.entries(grouped).forEach(([solId, docs]) => {
                        const sol = pendingList.find(s => s.id === solId);
                        if (sol) {
                            minutasData.push({
                                solicitation: sol,
                                drafts: docs,
                                count: docs.length,
                            });
                        }
                    });
                }
            }
            
            // 3b. Minutas já assinadas (concluídas) — busca em TODAS as solicitações geridas
            let signedCount = 0;
            {
                // Buscar todos os IDs de solicitações geridas por este gestor
                const { data: allManaged } = await supabase
                    .from('solicitations')
                    .select('id')
                    .ilike('manager_email', user.email || '');
                
                if (allManaged && allManaged.length > 0) {
                    const allIds = allManaged.map(s => s.id);
                    const { data: signedDocs } = await supabase
                        .from('process_documents')
                        .select('id')
                        .in('solicitation_id', allIds)
                        .eq('metadata->>signed', 'true');
                    signedCount = signedDocs?.length || 0;
                }
            }
            
            // 4. Processos SOLICITADOS PELO GESTOR (Auto-suprimento)
            const { data: requests, error: reqError } = await supabase
                .from('solicitations')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (reqError) throw reqError;

            // Stats
            const pcList = pcApprovals || [];
            const myList = requests || [];
            const myActive = myList.filter(p => p.status !== 'PAID' && p.status !== 'REJECTED' && p.status !== 'ARCHIVED');
            const myCompleted = myList.filter(p => p.status === 'PAID' || p.status === 'ARCHIVED');
            const pendingValue = pendingList.reduce((acc, curr) => acc + Number(curr.value), 0);
            const approvedValue = myList.filter(p => ['PAID','ARCHIVED','WAITING_SOSFU','WAITING_SEFIN'].includes(p.status)).reduce((acc, curr) => acc + Number(curr.value), 0);
            const totalMinutas = minutasData.reduce((acc, m) => acc + m.count, 0);

            setPendingApproval(pendingList);
            setPendingAccountability(pcList);
            setTeamAccountability(allTeamPCs || []);
            setPendingMinutas(minutasData);
            setMyRequests(myList);
            setStats({
                pendingCount: pendingList.length,
                pendingPcCount: pcList.length,
                pendingMinutasCount: totalMinutas,
                signedMinutasCount: signedCount,
                myActiveCount: myActive.length,
                myCompletedCount: myCompleted.length,
                totalManagedValue: pendingValue,
                approvedValue
            });

        } catch (error) {
            console.error("Erro ao carregar painel do gestor:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <Loader2 className="w-10 h-10 text-indigo-800 animate-spin" />
                <p className="text-gray-500 font-medium">Carregando gabinete...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 font-sans">
             
             {/* Header Section */}
             <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
                        {gestorLocationName || 'Gabinete Virtual'}
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Bem-vindo, <strong>{userName}</strong>. {gestorLocationName
                            ? `Aqui você gerencia a ${gestorLocationName} e seus processos.`
                            : 'Aqui você gerencia sua equipe e seus próprios processos.'}
                    </p>
                </div>
                <button 
                    onClick={() => onNavigate('solicitation_emergency')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-200 transform hover:-translate-y-0.5"
                >
                    <Plus size={18} /> Novo Suprimento Próprio
                </button>
             </div>

             {/* Stats Overview */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                {/* Card 1: Aprovações (Solicitações + PCs) */}
                <div className={`p-5 rounded-2xl border shadow-sm transition-all ${stats.pendingCount + stats.pendingPcCount > 0 ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-100' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${stats.pendingCount > 0 ? 'text-amber-700' : 'text-gray-400'}`}>Pendências de Equipe</p>
                        <div className={`p-2.5 rounded-lg ${stats.pendingCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-50 text-gray-300'}`}>
                            <Stamp size={18} />
                        </div>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-800 mb-2">{stats.pendingCount + stats.pendingPcCount}</h3>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                            <span className="text-amber-600 font-semibold flex items-center gap-1"><Clock size={10}/> {stats.pendingCount} Solicitações</span>
                            <span className="text-purple-600 font-semibold flex items-center gap-1"><FileCheck size={10}/> {stats.pendingPcCount} PCs</span>
                        </div>
                        {(stats.pendingCount + stats.pendingPcCount) > 0 && (
                            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden flex">
                                <div className="bg-amber-400 h-full transition-all" style={{ width: `${stats.pendingCount / (stats.pendingCount + stats.pendingPcCount) * 100}%` }} />
                                <div className="bg-purple-400 h-full transition-all" style={{ width: `${stats.pendingPcCount / (stats.pendingCount + stats.pendingPcCount) * 100}%` }} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Card 2: Minutas — Pendentes vs Concluídas */}
                {(() => {
                    const totalMin = stats.pendingMinutasCount + stats.signedMinutasCount;
                    const pctDone = totalMin > 0 ? Math.round((stats.signedMinutasCount / totalMin) * 100) : 0;
                    return (
                        <div className={`p-5 rounded-2xl border shadow-sm transition-all ${stats.pendingMinutasCount > 0 ? 'bg-orange-50 border-orange-200 ring-1 ring-orange-100' : 'bg-white border-gray-200'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${stats.pendingMinutasCount > 0 ? 'text-orange-700' : 'text-gray-400'}`}>Minutas</p>
                                <div className={`p-2.5 rounded-lg ${stats.pendingMinutasCount > 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-300'}`}>
                                    <FileSignature size={18} />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-800 mb-2">{totalMin}</h3>
                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-orange-600 font-semibold flex items-center gap-1"><Clock size={10}/> {stats.pendingMinutasCount} Pendentes</span>
                                    <span className="text-green-600 font-semibold flex items-center gap-1"><CheckCircle2 size={10}/> {stats.signedMinutasCount} Assinadas</span>
                                </div>
                                {totalMin > 0 && (
                                    <div className="w-full h-1.5 bg-orange-200 rounded-full overflow-hidden">
                                        <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${pctDone}%` }} />
                                    </div>
                                )}
                                {totalMin > 0 && (
                                    <p className="text-[9px] text-gray-400 text-right font-bold">{pctDone}% concluído</p>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* Card 3: Meus Processos — Ativos vs Concluídos */}
                {(() => {
                    const totalMy = stats.myActiveCount + stats.myCompletedCount;
                    return (
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Meus Processos</p>
                                <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                                    <Wallet size={18} />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-indigo-600 mb-2">{totalMy}</h3>
                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-indigo-600 font-semibold flex items-center gap-1"><Clock size={10}/> {stats.myActiveCount} Ativos</span>
                                    <span className="text-green-600 font-semibold flex items-center gap-1"><CheckCircle2 size={10}/> {stats.myCompletedCount} Concluídos</span>
                                </div>
                                {totalMy > 0 && (
                                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${(stats.myCompletedCount / totalMy) * 100}%` }} />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* Card 4: Valor Gerido — Em análise vs Aprovado */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Valores</p>
                        <div className="p-2.5 rounded-lg bg-green-50 text-green-600">
                            <TrendingUp size={18} />
                        </div>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-800 mb-2">
                        <span className="text-sm text-gray-400 font-normal align-top mr-1">R$</span>
                        {new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(stats.totalManagedValue + stats.approvedValue)}
                    </h3>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                            <span className="text-amber-600 font-semibold">R$ {new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(stats.totalManagedValue)} em análise</span>
                            <span className="text-green-600 font-semibold">R$ {new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(stats.approvedValue)} aprovado</span>
                        </div>
                        {(stats.totalManagedValue + stats.approvedValue) > 0 && (
                            <div className="w-full h-1.5 bg-amber-200 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${(stats.approvedValue / (stats.totalManagedValue + stats.approvedValue)) * 100}%` }} />
                            </div>
                        )}
                    </div>
                </div>
             </div>

            {/* ===== STALE PROCESS ALERT ===== */}
            <StaleProcessBanner
                staleProcesses={staleGestor}
                onViewProcess={(id) => onNavigate('process_detail', id)}
                accent="orange"
            />

            {/* ===== GESTÃO DE EQUIPE ===== */}
            <GestorTeamSection
                userName={userName}
                pendingCount={stats.pendingCount + stats.pendingPcCount}
                minutasCount={stats.pendingMinutasCount}
                onNavigate={onNavigate}
            />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                
                {/* PAINEL 1: MESA DE DECISÃO (APROVAÇÕES) */}
                <div className="flex flex-col h-full space-y-6">
                    
                    {/* Seção A: MINUTAS PENDENTES DE ASSINATURA (Prioridade Máxima) */}
                    {pendingMinutas.length > 0 && (
                        <div className="space-y-3 animate-in slide-in-from-left-4">
                            <div className="flex items-center gap-2 px-1 text-orange-700">
                                <FileSignature size={20} />
                                <h3 className="text-sm font-bold uppercase">Minutas Pendentes de Assinatura</h3>
                                <span className="text-[10px] font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                    {stats.pendingMinutasCount}
                                </span>
                            </div>
                            
                            {pendingMinutas.map((item: any) => (
                                <div 
                                    key={item.solicitation.id} 
                                    onClick={() => onNavigate('process_detail', item.solicitation.id)}
                                    className="bg-white p-5 rounded-2xl border border-orange-200 border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="text-base font-bold text-gray-800 group-hover:text-orange-600 transition-colors flex items-center gap-2">
                                                {item.solicitation.process_number}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Solicitante: {item.solicitation.beneficiary}
                                            </p>
                                        </div>
                                        <span className="bg-orange-50 text-orange-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide flex items-center gap-1">
                                            <FileSignature size={12}/> {item.count} minuta(s)
                                        </span>
                                    </div>
                                    
                                    {/* Lista compacta de minutas */}
                                    <div className="space-y-1.5 mb-3">
                                        {item.drafts.slice(0, 3).map((doc: any) => (
                                            <div key={doc.id} className="flex items-center gap-2 text-xs text-gray-600">
                                                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                                                <span className="truncate">{doc.title}</span>
                                                <span className="text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-bold shrink-0 uppercase">
                                                    {doc.metadata?.subType || doc.document_type}
                                                </span>
                                            </div>
                                        ))}
                                        {item.count > 3 && (
                                            <p className="text-[10px] text-orange-500 font-bold pl-3.5">
                                                + {item.count - 3} mais...
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                        <span className="font-mono font-bold text-gray-800 text-sm">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.solicitation.value)}
                                        </span>
                                        <Tooltip content="Abrir processo para analisar minutas e assinar como gestor" position="top">
                                        <button className="text-xs font-bold text-orange-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                                            Analisar e Assinar <ChevronRight size={14}/>
                                        </button>
                                        </Tooltip>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Seção B: Prestação de Contas */}
                    {pendingAccountability.length > 0 && (
                        <div className="space-y-3 animate-in slide-in-from-left-4">
                            <div className="flex items-center gap-2 px-1 text-purple-700">
                                <FileCheck size={20} />
                                <h3 className="text-sm font-bold uppercase">Prestações de Contas para Atesto</h3>
                            </div>
                            
                            {pendingAccountability.map(pc => (
                                <div 
                                    key={pc.id} 
                                    onClick={() => onNavigate('process_accountability', pc.solicitation_id, pc.id)}
                                    className="bg-white p-5 rounded-2xl border border-purple-200 border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="text-base font-bold text-gray-800 group-hover:text-purple-600 transition-colors flex items-center gap-2">
                                                {pc.solicitation.process_number}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-1">Enviado por: {pc.requester?.full_name}</p>
                                        </div>
                                        <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide flex items-center gap-1">
                                            <Clock size={12}/> Aguardando Atesto
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-2">
                                        <span className="font-mono font-bold text-gray-800 text-sm">
                                            Total Gasto: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pc.total_spent)}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <SlaCountdown
                                                createdAt={pc.solicitation?.created_at || pc.created_at}
                                                daysLimit={30}
                                                label="Prazo Atesto"
                                                compact
                                            />
                                            <button className="text-xs font-bold text-purple-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                                                Revisar Contas <ChevronRight size={14}/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Seção C: Solicitações Iniciais */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1 text-amber-700">
                            <Stamp size={20} />
                            <h3 className="text-sm font-bold uppercase">Solicitações de Suprimento</h3>
                        </div>

                        {pendingApproval.filter(p => !pendingMinutas.find(m => m.solicitation.id === p.id)).length === 0 ? (
                            <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-300 text-center">
                                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-300">
                                    <CheckCircle2 size={24} />
                                </div>
                                <p className="text-sm text-gray-500">Nenhuma solicitação pendente.</p>
                            </div>
                        ) : (
                            pendingApproval.filter(p => !pendingMinutas.find(m => m.solicitation.id === p.id)).map(proc => (
                                <div 
                                    key={proc.id} 
                                    onClick={() => onNavigate('process_detail', proc.id)}
                                    className="bg-white p-5 rounded-2xl border border-gray-200 border-l-4 border-l-amber-400 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="text-base font-bold text-gray-800 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                                                {proc.process_number}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-1">{new Date(proc.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
                                            Aguardando Autorização
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">
                                            {proc.beneficiary.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-700">{proc.beneficiary}</p>
                                            <p className="text-xs text-gray-400 truncate max-w-[200px]">{proc.unit}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                        <span className="font-mono font-bold text-gray-800">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.value)}
                                        </span>
                                        <button className="text-sm font-bold text-indigo-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                                            Analisar <ChevronRight size={16}/>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* PAINEL 2: TRACKER DE EQUIPE + MEUS PROCESSOS */}
                <div className="flex flex-col h-full space-y-6">
                    
                    {/* PC tracking agora integrado na tabela de equipe acima */}
                    <div className="flex items-center gap-3 mb-4 px-1">
                        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shadow-sm">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Meus Processos</h3>
                            <p className="text-xs text-gray-500">Histórico de suas solicitações pessoais</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-1">
                        <div className="divide-y divide-gray-100">
                            {myRequests.length === 0 ? (
                                 <div className="p-12 text-center flex flex-col items-center justify-center h-full">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-3 text-indigo-200">
                                        <Plus size={24} />
                                    </div>
                                    <p className="text-sm text-gray-500">Você ainda não criou nenhuma solicitação.</p>
                                    <button 
                                        onClick={() => onNavigate('solicitation_emergency')}
                                        className="mt-4 text-indigo-600 text-sm font-bold hover:underline"
                                    >
                                        Criar primeira solicitação
                                    </button>
                                </div>
                            ) : (
                                myRequests.map(proc => (
                                    <div key={proc.id} onClick={() => onNavigate('process_detail', proc.id)} className="p-5 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${proc.status === 'PAID' || proc.status === 'ARCHIVED' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                                                {(proc.status === 'PAID' || proc.status === 'ARCHIVED') ? <Wallet size={20} /> : <FileText size={20} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">{proc.process_number}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">{new Date(proc.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <StatusBadge status={proc.status} size="sm" />
                                            <p className="text-[11px] text-gray-400 mt-1 font-mono font-medium">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.value)}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
