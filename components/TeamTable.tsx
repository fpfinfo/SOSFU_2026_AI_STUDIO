import React, { useEffect, useState, useRef } from 'react';
import {
    Users, Search, Loader2, UserPlus, Trash2,
    ChevronRight, ChevronLeft, ChevronUp, ChevronDown,
    FileText, X, ShieldCheck, CheckSquare, Eye,
    BarChart
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
    solicitationCount?: number;
    accountabilityCount?: number;
}

// ==================== CONSTANTS ====================
const SOSFU_FUNCOES_FALLBACK = ['Analista SOSFU', 'Chefe SOSFU', 'Técnico de Contas', 'Estagiário'];
const SOSFU_MEMBERS_PER_PAGE = 8;
const TEAM_MODULE = 'SOSFU';

// ==================== COMPONENT ====================
export const TeamTable: React.FC<{ isGestor?: boolean; hideHeader?: boolean }> = ({ isGestor = false, hideHeader = false }) => {
    const [members, setMembers] = useState<SosfuTeamMember[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [tableFilter, setTableFilter] = useState('');
    const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
    const [memberProcesses, setMemberProcesses] = useState<any[]>([]); // Generic array for both types
    const [loadingMemberData, setLoadingMemberData] = useState(false);

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

                // 3) Fetch Counts in Parallel
                const mappedMembers: SosfuTeamMember[] = await Promise.all(
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
                                .neq('status', 'ARCHIVED'); // Assuming these are 'done' states

                             // Count Accountabilities (Active)
                             const { count: pcCount } = await supabase
                                .from('accountabilities')
                                .select('*', { count: 'exact', head: true })
                                .eq('analyst_id', p.id)
                                .neq('status', 'APPROVED');

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
            } catch (err) { console.error('Error loading SOSFU team:', err); }
        })();
    }, []);





    const getInitials = (name: string) => name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

    // Expand member → fetch their processes (Both Types)
    const handleExpandMember = async (memberId: string) => {
        if (expandedMemberId === memberId) { setExpandedMemberId(null); return; }
        setExpandedMemberId(memberId);
        setLoadingMemberData(true);
        setMemberProcesses([]);

        try {
            // 1. Fetch Solicitations
            const { data: sols } = await supabase.from('solicitations')
                .select('id, process_number, status, value, created_at, unit, beneficiary')
                .eq('analyst_id', memberId) // Changed to analyst_id as likely intent is assigned work
                .neq('status', 'PAID')
                .limit(5);

            // 2. Fetch Accountabilities
            const { data: pcs } = await supabase.from('accountabilities')
                .select('id, process_number, status, value, created_at, solicitation_id') // need joins?
                .eq('analyst_id', memberId)
                .neq('status', 'APPROVED')
                .limit(5);

            const combined = [
                ...(sols || []).map(s => ({ ...s, type: 'SOLICITATION' })),
                ...(pcs || []).map(p => ({ ...p, type: 'ACCOUNTABILITY', beneficiary: 'PC' })) // PC usually doesn't have beneficiary field direct, but we can adapt
            ].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setMemberProcesses(combined);
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
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 mb-20">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
                {!hideHeader ? (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Users size={18} className="text-blue-600" />
                        </div>
                        <h2 className="text-lg font-black text-slate-800">Gestão de Equipe</h2>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                            {members.length}
                        </span>
                    </div>
                ) : <div />}
                
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
                </div>
            </div>

            {/* Co-responsability banner */}
            {members.length > 0 && (
                <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl border bg-gradient-to-r from-blue-50 to-teal-50 border-blue-200/60">
                    <div className="mt-0.5 p-1.5 rounded-lg shrink-0 bg-blue-100">
                        <ShieldCheck size={16} className="text-blue-600" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-blue-800">Seção Técnica SOSFU 📋</p>
                        <p className="text-[11px] mt-0.5 leading-relaxed text-blue-700/80">
                            Gerencie os membros da equipe técnica SOSFU. Acompanhe a distribuição de solicitações e prestações de contas em tempo real.
                        </p>
                    </div>
                </div>
            )}

            {members.length > 0 ? (
                <div className="rounded-2xl border shadow-sm overflow-hidden bg-white border-slate-200">
                    <div className="overflow-x-auto">
                    {/* Table */}
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

                                            {/* Col 2: Process Distribution (Vertical Analysis) */}
                                            <td className="px-4 py-3.5 hidden md:table-cell">
                                                <div className="flex flex-col gap-1.5">
                                                    {/* Solicitações */}
                                                    <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-1.5 text-blue-600">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                            <span className="font-medium">Solicitações</span>
                                                        </div>
                                                        <span className="font-bold text-slate-700 bg-blue-50 px-1.5 py-0.5 rounded-md min-w-[24px] text-center">
                                                            {member.solicitationCount}
                                                        </span>
                                                    </div>
                                                    {/* Accontabilities */}
                                                    <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-1.5 text-teal-600">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                                                            <span className="font-medium">Prest. Contas</span>
                                                        </div>
                                                        <span className="font-bold text-slate-700 bg-teal-50 px-1.5 py-0.5 rounded-md min-w-[24px] text-center">
                                                            {member.accountabilityCount}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Col 3: Ações Updated */}
                                            <td className="text-right px-5 py-3.5">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleExpandMember(member.id); }}
                                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 text-slate-500 transition-all text-[10px] font-bold"
                                                    >
                                                        <Eye size={12} />
                                                        Ver Carga
                                                    </button>
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
                                                                <Loader2 size={16} className="animate-spin" /> Carregando carga de trabalho...
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <BarChart size={14} className="text-blue-600" />
                                                                        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">
                                                                            Carga de Trabalho Recente ({memberProcesses.length})
                                                                        </h4>
                                                                    </div>
                                                                </div>
                                                                {memberProcesses.length === 0 ? (
                                                                    <p className="text-xs italic py-3 text-slate-400">Nenhum processo em andamento para este membro.</p>
                                                                ) : (
                                                                    <div className="space-y-1.5">
                                                                        {memberProcesses.map(proc => (
                                                                            <div
                                                                                key={proc.id}
                                                                                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all group/proc bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
                                                                            >
                                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${proc.type === 'SOLICITATION' ? 'bg-blue-50 text-blue-500' : 'bg-teal-50 text-teal-500'}`}>
                                                                                        {proc.type === 'SOLICITATION' ? <FileText size={13} /> : <CheckSquare size={13} />}
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <p className="text-xs font-bold truncate text-slate-800">{proc.process_number}</p>
                                                                                        <p className="text-[10px] truncate text-slate-400">
                                                                                            {proc.type === 'SOLICITATION' ? (proc.beneficiary || proc.unit) : 'Prestação de Contas'}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-2 shrink-0">
                                                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${proc.type === 'SOLICITATION' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'}`}>
                                                                                        {proc.type === 'SOLICITATION' ? 'SOLICITAÇÃO' : 'CONTAS'}
                                                                                    </span>
                                                                                    {proc.value && (
                                                                                        <span className="font-mono text-[10px] font-bold text-slate-600">
                                                                                            {formatCurrency(proc.value)}
                                                                                        </span>
                                                                                    )}
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
                    </div>

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
                </div>
            )}

            {/* Modal removed */}
        </div>
    );
};
