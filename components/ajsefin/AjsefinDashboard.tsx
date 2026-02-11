import React, { useState, useEffect } from 'react';
import {
    Inbox, Briefcase, FileSignature, Send, Users, Search, Loader2,
    CheckCircle2, FileText, ChevronRight, ChevronLeft,
    ChevronDown, ChevronUp, Scale, UserPlus, ShieldCheck, Mail, Shield, AlertCircle, Package
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StatusBadge } from '../StatusBadge';
import { AssignModal } from '../AssignModal';
import { Tooltip } from '../ui/Tooltip';

interface AjsefinDashboardProps {
    onNavigate: (page: string, processId?: string) => void;
    darkMode?: boolean;
    showTeamOnly?: boolean;
    isGestor?: boolean;
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

const MEMBERS_PER_PAGE = 8;
const AJSEFIN_MODULE = 'AJSEFIN';

// ====================== STAT CARD PREMIUM ======================
const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    title: string;
    value: number;
    detail: string;
    gradient: string;
    iconColor: string;
    darkMode?: boolean;
}> = ({ icon, label, title, value, detail, gradient, iconColor, darkMode }) => (
    <div className={`relative overflow-hidden rounded-2xl border transition-all hover:shadow-lg group ${
        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
    }`}>
        {/* Top Gradient Border */}
        <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${gradient}`} />
        
        <div className="p-5">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-2 rounded-xl border flex items-center justify-center ${
                    darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-100'
                }`}>
                    <div className={iconColor}>{icon}</div>
                </div>
                <div className="text-right">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {label}
                    </p>
                </div>
            </div>

            <div className="flex items-baseline justify-between">
                <div>
                    <p className={`text-4xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        {value}
                    </p>
                    <p className={`text-[11px] font-bold mt-1 uppercase tracking-wide ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {title}
                    </p>
                </div>
            </div>

            <div className={`mt-4 pt-3 border-t flex items-center gap-1.5 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${iconColor.replace('text-', 'bg-')}`} />
                <p className={`text-[10px] font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {detail}
                </p>
            </div>
        </div>
    </div>
);

// ====================== AJSEFIN TEAM SECTION ======================
const AjsefinTeamSection: React.FC<{
    onNavigate: (page: string, processId?: string) => void;
    darkMode?: boolean;
    isGestor?: boolean;
}> = ({ onNavigate, darkMode = false, isGestor = false }) => {
    const [members, setMembers] = useState<(AjsefinTeamMember & { sol_count: number; pc_count: number })[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [tableFilter, setTableFilter] = useState('');
    const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
    const [memberProcesses, setMemberProcesses] = useState<any[]>([]);
    const [loadingMemberData, setLoadingMemberData] = useState(false);

    // Load team members and their load counts
    useEffect(() => {
        (async () => {
            try {
                // 1. Get team members
                const { data: teamRows } = await supabase
                    .from('team_members')
                    .select('user_id, funcao')
                    .eq('module', AJSEFIN_MODULE);

                if (!teamRows || teamRows.length === 0) { setMembers([]); return; }

                const userIds = teamRows.map(r => r.user_id);
                
                // 2. Get profiles
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, matricula, avatar_url')
                    .in('id', userIds);

                // 3. Get Load Counts
                const { data: counts } = await supabase
                    .from('solicitations')
                    .select('ajsefin_analyst_id, status')
                    .in('ajsefin_analyst_id', userIds);

                const profileMap = new Map((profiles || []).map(p => [p.id, p]));

                const mapped = teamRows
                    .filter(r => profileMap.has(r.user_id))
                    .map(r => {
                        const p = profileMap.get(r.user_id)!;
                        const userSols = counts?.filter(c => c.ajsefin_analyst_id === p.id) || [];
                        return {
                            id: p.id,
                            full_name: p.full_name || '',
                            email: p.email || '',
                            matricula: p.matricula || '',
                            avatar_url: p.avatar_url,
                            funcao: r.funcao || 'Assessor Jurídico',
                            sol_count: userSols.length,
                            pc_count: 0
                        };
                    });
                setMembers(mapped);
            } catch (err) { console.error('Error loading AJSEFIN team:', err); }
        })();
    }, []);

    const getInitials = (name: string) => name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

    const handleExpandMember = async (memberId: string) => {
        if (expandedMemberId === memberId) { setExpandedMemberId(null); return; }
        setExpandedMemberId(memberId);
        setLoadingMemberData(true);
        setMemberProcesses([]);

        try {
            const { data: sols } = await supabase.from('solicitations')
                .select('id, process_number, status, value, estimated_value, created_at, unit, beneficiary')
                .eq('ajsefin_analyst_id', memberId)
                .order('created_at', { ascending: false })
                .limit(6);

            setMemberProcesses(sols || []);
        } catch (err) { console.error('Error fetching member data:', err); }
        finally { setLoadingMemberData(false); }
    };

    const filteredMembers = tableFilter
        ? members.filter(m => m.full_name.toLowerCase().includes(tableFilter.toLowerCase()) || m.funcao.toLowerCase().includes(tableFilter.toLowerCase()))
        : members;
    const totalPages = Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE);
    const paginatedMembers = filteredMembers.slice((currentPage - 1) * MEMBERS_PER_PAGE, currentPage * MEMBERS_PER_PAGE);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            {/* Team Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Users size={18} className="text-blue-500" />
                    <h2 className={`text-sm font-bold tracking-tight uppercase ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        Gestão de Equipe
                    </h2>
                    <span className="bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center justify-center min-w-[20px]">
                        {members.length}
                    </span>
                </div>
                <div className="relative">
                    <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                        type="text" placeholder="Filtrar..."
                        value={tableFilter} onChange={e => { setTableFilter(e.target.value); setCurrentPage(1); }}
                        className={`pl-9 pr-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 w-48 ${
                            darkMode
                                ? 'bg-slate-800 border-slate-700 text-white focus:ring-blue-500/30'
                                : 'bg-white border-slate-200 focus:ring-blue-200 focus:border-blue-300'
                        }`}
                    />
                </div>
            </div>

            {/* Team Info Banner */}
            <div className={`mb-4 flex items-center gap-3 px-4 py-2.5 rounded-xl border ${
                darkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'
            }`}>
                <div className={`p-1.5 rounded-lg shrink-0 ${darkMode ? 'bg-blue-500/20' : 'bg-white shadow-sm'}`}>
                    <ShieldCheck size={16} className="text-blue-600" />
                </div>
                <div className="flex-1">
                    <p className={`text-[11px] font-bold ${darkMode ? 'text-blue-300' : 'text-blue-900'}`}>Assessoria Jurídica AJSEFIN 📜</p>
                    <p className={`text-[10px] ${darkMode ? 'text-blue-400/80' : 'text-blue-700/80'}`}>
                        Acompanhe a distribuição de solicitações e o desempenho da equipe jurídica.
                    </p>
                </div>
            </div>

            <div className={`rounded-2xl border shadow-sm overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <table className="w-full">
                    <thead>
                        <tr className={`border-b ${darkMode ? 'bg-slate-700/50 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`}>
                            <th className={`text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Servidor / Cargo</th>
                            <th className={`text-center px-4 py-3 text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Distribuição</th>
                            <th className={`text-right px-5 py-3 text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Ações</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-50'}`}>
                        {paginatedMembers.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-5 py-10 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Nenhum membro encontrado
                                </td>
                            </tr>
                        ) : (
                            paginatedMembers.map(member => (
                                <React.Fragment key={member.id}>
                                    <tr className={`transition-all ${expandedMemberId === member.id ? (darkMode ? 'bg-blue-500/5' : 'bg-blue-50/30') : ''}`}>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                {member.avatar_url ? (
                                                    <img src={member.avatar_url} alt={member.full_name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 border-2 border-white shadow-sm">
                                                        {getInitials(member.full_name)}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className={`text-sm font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>{member.full_name}</p>
                                                    <p className={`text-[11px] font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{member.funcao}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col gap-1 mx-auto max-w-[150px]">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                        <span className={`text-[10px] font-bold ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>Análise / Parecer</span>
                                                    </div>
                                                    <span className={`text-[11px] font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{member.sol_count}</span>
                                                </div>
                                                <div className="flex items-center justify-between gap-4 border-t pt-1 border-dotted">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                                                        <span className={`text-[10px] font-bold ${darkMode ? 'text-teal-400' : 'text-teal-700'}`}>Minutas / Trâmite</span>
                                                    </div>
                                                    <span className={`text-[11px] font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{member.pc_count}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button 
                                                onClick={() => handleExpandMember(member.id)}
                                                className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${
                                                    darkMode
                                                        ? 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                                }`}
                                            >
                                                Ver Carga
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedMemberId === member.id && (
                                        <tr>
                                            <td colSpan={3} className={`px-6 py-4 animate-in slide-in-from-top-2 duration-300 border-t ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                                {loadingMemberData ? (
                                                    <div className="flex items-center justify-center py-6 gap-2">
                                                        <Loader2 size={16} className="animate-spin text-blue-500" />
                                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando...</span>
                                                    </div>
                                                ) : memberProcesses.length === 0 ? (
                                                    <div className="text-center py-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                                        Nenhum processo sob responsabilidade
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {memberProcesses.map(proc => (
                                                            <div 
                                                                key={proc.id} 
                                                                onClick={() => onNavigate('process_detail', proc.id)}
                                                                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                                                                    darkMode ? 'bg-slate-800 border-slate-700 hover:border-blue-500/50' : 'bg-white border-slate-200 hover:border-blue-300'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`p-1.5 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                                                                        <FileText size={14} className="text-blue-500" />
                                                                    </div>
                                                                    <div>
                                                                        <p className={`text-[11px] font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{proc.process_number}</p>
                                                                        <p className={`text-[10px] font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'} truncate max-w-[150px]`}>{proc.beneficiary}</p>
                                                                    </div>
                                                                </div>
                                                                <StatusBadge status={proc.status} size="sm" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination Footer */}
                {totalPages > 1 && (
                    <div className={`flex items-center justify-between px-5 py-3 border-t ${
                        darkMode ? 'bg-slate-700/30 border-slate-700' : 'bg-slate-50/80 border-slate-100'
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
        </div>
    );
};

// ====================== MAIN AJSEFIN DASHBOARD ======================
export const AjsefinDashboard: React.FC<AjsefinDashboardProps> = ({ onNavigate, darkMode = false, showTeamOnly = false, isGestor = false }) => {
    const [stats, setStats] = useState({
        inbox: 0,
        my_tasks: 0,
        my_pcs: 0,
        sefin_signing: 0
    });
    const [activeTab, setActiveTab] = useState<'inbox' | 'my' | 'processed'>('inbox');
    const [searchQuery, setSearchQuery] = useState('');
    const [processes, setProcesses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch dashboard data
    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // 1. Fetch Stats
                const { data: allSols } = await supabase.from('solicitations').select('id, status, ajsefin_analyst_id');
                
                if (allSols) {
                    setStats({
                        inbox: allSols.filter(s => ['WAITING_AJSEFIN_ANALYSIS', 'WAITING_SOSFU_ANALYSIS'].includes(s.status)).length,
                        my_tasks: allSols.filter(s => s.ajsefin_analyst_id === user.id && !['PAID', 'REJECTED', 'ARCHIVED'].includes(s.status)).length,
                        my_pcs: 0, 
                        sefin_signing: allSols.filter(s => s.status === 'WAITING_SEFIN_SIGNATURE').length
                    });
                }

                // 2. Fetch Processes for current tab
                let query = supabase.from('solicitations').select('*').order('created_at', { ascending: false });
                
                if (activeTab === 'inbox') {
                    query = query.in('status', ['WAITING_AJSEFIN_ANALYSIS', 'WAITING_SOSFU_ANALYSIS']);
                } else if (activeTab === 'my') {
                    query = query.eq('ajsefin_analyst_id', user.id).not('status', 'in', '("PAID","REJECTED","ARCHIVED")');
                } else {
                    query = query.in('status', ['PAID', 'REJECTED', 'ARCHIVED']);
                }

                const { data } = await query.limit(100);
                setProcesses(data || []);
            } catch (err) {
                console.error('AJSEFIN dashboard error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [activeTab]);

    if (showTeamOnly) {
        return (
            <div className="p-6">
                <AjsefinTeamSection onNavigate={onNavigate} darkMode={darkMode} isGestor={isGestor} />
            </div>
        );
    }

    return (
        <div className={`p-6 max-w-[1600px] mx-auto space-y-8 ${darkMode ? 'text-white' : ''}`}>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <StatCard 
                    icon={<Mail size={20} />}
                    label="Caixa de Entrada"
                    title="Novos Recebidos"
                    value={stats.inbox}
                    detail="Aguardando atualização"
                    gradient="from-blue-500 to-teal-500"
                    iconColor="text-blue-500"
                    darkMode={darkMode}
                />
                <StatCard 
                    icon={<FileText size={20} />}
                    label="Minha Mesa"
                    title="Solicitações"
                    value={stats.my_tasks}
                    detail="Concessões atribuídas a mim"
                    gradient="from-teal-500 to-teal-500"
                    iconColor="text-teal-500"
                    darkMode={darkMode}
                />
                <StatCard 
                    icon={<Users size={20} />}
                    label="Minha Mesa"
                    title="Prestações de Contas"
                    value={stats.my_pcs}
                    detail="PCs atribuídas a mim"
                    gradient="from-orange-500 to-amber-500"
                    iconColor="text-orange-500"
                    darkMode={darkMode}
                />
                <StatCard 
                    icon={<Shield size={20} />}
                    label="Fluxo SEFIN"
                    title="Aguard. Assinatura"
                    value={stats.sefin_signing}
                    detail="Aguardando Ordenador"
                    gradient="from-amber-400 to-yellow-500"
                    iconColor="text-amber-500"
                    darkMode={darkMode}
                />
            </div>

            <div className="space-y-8">
                {/* Main Content Areas (Tabs + Table) */}
                <div className="space-y-6">
                    {/* Tabs & Search */}
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className={`flex p-1 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                            <button 
                                onClick={() => setActiveTab('inbox')}
                                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                                    activeTab === 'inbox' 
                                        ? (darkMode ? 'bg-slate-700 text-white shadow-lg' : 'bg-white text-slate-800 shadow-sm')
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Inbox
                            </button>
                            <button 
                                onClick={() => setActiveTab('my')}
                                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 ${
                                    activeTab === 'my' 
                                        ? (darkMode ? 'bg-slate-700 text-white shadow-lg' : 'bg-white text-slate-800 shadow-sm')
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Minha Fila
                                {stats.my_tasks > 0 && (
                                    <span className="bg-teal-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{stats.my_tasks}</span>
                                )}
                            </button>
                            <button 
                                onClick={() => setActiveTab('processed')}
                                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                                    activeTab === 'processed' 
                                        ? (darkMode ? 'bg-slate-700 text-white shadow-lg' : 'bg-white text-slate-800 shadow-sm')
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Processados
                            </button>
                        </div>

                        <div className="relative">
                            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                            <input
                                type="text"
                                placeholder="Buscar processos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`pl-9 pr-4 py-2 rounded-xl text-xs border w-64 transition-all focus:ring-2 focus:ring-blue-500/20 ${
                                    darkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-800 focus:border-blue-400'
                                } outline-none`}
                            />
                        </div>
                    </div>

                    {/* Table Info Banner */}
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${
                        darkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'
                    }`}>
                        <div className={`p-2 rounded-xl ${darkMode ? 'bg-blue-500/20' : 'bg-white shadow-sm'}`}>
                            <AlertCircle size={16} className="text-blue-600" />
                        </div>
                        <p className={`text-[11px] font-bold ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                            Processos aguardando triagem ou análise jurídica da AJSEFIN
                        </p>
                    </div>

                    {/* Main Table */}
                    <div className={`rounded-2xl border shadow-sm overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <table className="w-full">
                            <thead>
                                <tr className={`border-b ${darkMode ? 'bg-slate-700/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                    <th className={`text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Tipo / Processo</th>
                                    <th className={`text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Beneficiário</th>
                                    <th className={`text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Valor</th>
                                    <th className={`text-center px-5 py-3 text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Status</th>
                                    <th className={`text-right px-5 py-3 text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Ações</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-50'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center">
                                            <Loader2 size={24} className="mx-auto animate-spin text-blue-500 mb-2" />
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Carregando...</p>
                                        </td>
                                    </tr>
                                ) : processes.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-16 text-center">
                                            <Package size={40} className={`mx-auto mb-4 ${darkMode ? 'text-slate-700' : 'text-slate-200'}`} />
                                            <p className={`text-xs font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest`}>
                                                Nenhum processo nesta fila. Tudo em dia para a AJSEFIN.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    processes.map(proc => (
                                        <tr key={proc.id} className={`transition-colors cursor-pointer group ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-blue-50/20'}`} onClick={() => onNavigate('process_detail', proc.id)}>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-xl border ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-100'}`}>
                                                        <FileText size={16} className="text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className={`text-xs font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>{proc.process_number}</p>
                                                        <p className={`text-[10px] font-bold opacity-60 uppercase tracking-tighter ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>ORDINÁRIO</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className={`text-xs font-bold uppercase ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{proc.beneficiary}</p>
                                                <p className={`text-[10px] opacity-60 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{proc.unit}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className={`text-xs font-black font-mono ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.value || proc.estimated_value || 0)}
                                                </p>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <StatusBadge status={proc.status} size="sm" />
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <button className={`p-2 rounded-lg border transition-all ${
                                                    darkMode ? 'bg-slate-700 border-slate-600 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200'
                                                }`}>
                                                    <ChevronRight size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Team Section - Repositioned to Bottom Full Width */}
                <div className="pt-4">
                    <AjsefinTeamSection onNavigate={onNavigate} darkMode={darkMode} isGestor={isGestor} />
                </div>
            </div>
        </div>
    );
};
