import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
    Search, Inbox, Users, CheckCircle2, FileText, CheckSquare, 
    Loader2, ArrowRight, UserPlus, Sparkles, Filter, Download,
    Clock, AlertTriangle, TrendingUp, BarChart3, Archive, ShieldCheck,
    Calendar, DollarSign, Activity, PlayCircle, PauseCircle, CheckCircle, XCircle,
    Building2, MapPin, Briefcase, Gavel, Siren, Scale, Stamp, FileCheck, Receipt
} from 'lucide-react';

import { supabase } from '../../lib/supabase';
import { AssignModal } from '../AssignModal';
import { SosfuStatCard } from '../sosfu/SosfuStatCard'; 
import { StatusBadge } from '../StatusBadge';
import { RessarcimentoTeamTable } from './RessarcimentoTeamTable';
import { X, Users as UsersIcon } from 'lucide-react';
import { LocationModal } from '../ui/LocationModal';

interface RessarcimentoWorkstationProps {
    onNavigate: (page: string, processId?: string, accountabilityId?: string) => void;
    userProfile: any;
    darkMode?: boolean;
}

export type RessarcimentoTabType = 'INBOX' | 'ANALYSIS' | 'PAYMENTS' | 'HISTORY';

interface InboxItem {
    id: string;
    type: 'SOLICITATION' | 'ACCOUNTABILITY';
    process_number: string;
    beneficiary: string;
    requester?: { 
        full_name: string; 
        avatar_url?: string; 
        cargo?: string; 
        lotacao?: string;
        municipio?: string;
    };
    value: number;
    created_at: string;
    status: string;
    analyst_id?: string;
    analyst?: { full_name: string; avatar_url?: string };
    solicitation_id?: string;
    solicitation_analyst_id?: string;
    unit?: string;
    solicitation_type?: string;
}

export const RessarcimentoWorkstation: React.FC<RessarcimentoWorkstationProps> = ({ onNavigate, userProfile, darkMode = false }) => {
    const [activeTab, setActiveTab] = useState<RessarcimentoTabType>('INBOX');
    const [items, setItems] = useState<InboxItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    
    // Assign logic
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);

    // Team Management Logic
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

    // Location Modal Logic
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<any>(null);

    // Toast Feedback
    const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    }, []);

    // Fetch data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch Solicitations (Ressarcimento Specific)
            // Assuming Ressarcimento leverages the 'solicitations' table and has specific statuses
            const { data: solicitations, error: solError } = await supabase
                .from('solicitations')
                .select(`*, analyst:analyst_id(full_name, avatar_url), requester:user_id(full_name, avatar_url, cargo, lotacao, municipio)`)
                .or('status.eq.WAITING_RESSARCIMENTO_ANALYSIS,status.eq.WAITING_RESSARCIMENTO_EXECUTION,status.eq.WAITING_PAYMENT,status.eq.PAID,status.eq.APPROVED,status.eq.REJECTED')
                .order('created_at', { ascending: false });

            // Accountabilities - Might not be as relevant for pure reimbursement flow if they are just requests, but keeping for consistency if used
            // If Ressarcimento is purely "Requesters ask -> We pay", then accountabilities might be zero. 
            // Checking table logic: if type='RESSARCIMENTO', it's a solicitation.
            
            const combined: InboxItem[] = [];

            if (solicitations) {
                solicitations.forEach((s: any) => {
                    combined.push({
                        id: s.id,
                        type: 'SOLICITATION', // Ressarcimento is primarily a solicitation flow
                        process_number: s.process_number || 'S/N',
                        beneficiary: s.beneficiary,
                        requester: {
                            full_name: s.requester?.full_name,
                            avatar_url: s.requester?.avatar_url,
                            cargo: s.requester?.cargo,
                            lotacao: s.requester?.lotacao,
                            municipio: s.requester?.municipio
                        },
                        value: s.value,
                        created_at: s.created_at,
                        status: s.status,
                        analyst_id: s.analyst_id,
                        analyst: s.analyst,
                        unit: s.unit || s.requester?.lotacao || s.requester?.municipio || '---',
                        solicitation_type: 'RESSARCIMENTO' // Hardcoded or s.type
                    });
                });
            }

            combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setItems(combined);
        } catch (err) {
            console.error('Error fetching Ressarcimento workstation data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const channel = supabase.channel('ressarcimento-workstation')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitations' }, fetchData)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchData]);

    // Derived stats for cards
    const tabStats = useMemo(() => {
        const newRequests = items.filter(i => ['WAITING_RESSARCIMENTO_ANALYSIS'].includes(i.status)).length;
        const inExecution = items.filter(i => ['WAITING_RESSARCIMENTO_EXECUTION', 'WAITING_PAYMENT'].includes(i.status)).length;
        const paid = items.filter(i => i.status === 'PAID').length;
        const completed = items.filter(i => ['APPROVED', 'PAID', 'ARCHIVED'].includes(i.status)).length;

        return [
            { 
                title: 'Novos Pedidos', 
                value: newRequests, 
                subtitle: 'Caixa de Entrada', 
                icon: Inbox, 
                color: 'emerald', 
                badge: newRequests > 0 ? 'Ação Necessária' : undefined 
            },
            { 
                title: 'Em Execução', 
                value: inExecution, 
                subtitle: 'Processando Pagamento', 
                icon: Activity, 
                color: 'emerald' 
            },
            { 
                title: 'Pagos (Mês)', 
                value: paid, 
                subtitle: 'Efetivados', 
                icon: DollarSign, 
                color: 'blue'
            },
            { 
                title: 'Finalizados', 
                value: completed, 
                subtitle: 'Total Concluído', 
                icon: CheckCircle2, 
                color: 'slate' 
            }
        ];
    }, [items]);

    const filteredItems = useMemo(() => {
        let list = [...items];
        const currentUserId = userProfile?.id;

        switch (activeTab) {
            case 'INBOX':
                list = list.filter(i => !i.analyst_id || ['WAITING_RESSARCIMENTO_ANALYSIS'].includes(i.status));
                break;
            case 'ANALYSIS':
                // My assigned items or general analysis pool if needed
                list = list.filter(i => i.analyst_id === currentUserId || ['WAITING_RESSARCIMENTO_EXECUTION'].includes(i.status));
                break;
            case 'PAYMENTS':
                 list = list.filter(i => ['WAITING_PAYMENT', 'WAITING_RESSARCIMENTO_EXECUTION'].includes(i.status));
                break;
            case 'HISTORY':
                list = list.filter(i => ['PAID', 'APPROVED', 'REJECTED', 'ARCHIVED'].includes(i.status));
                break;
        }

        return list.filter(i => 
            i.process_number.toLowerCase().includes(filter.toLowerCase()) || 
            i.beneficiary.toLowerCase().includes(filter.toLowerCase())
        );
    }, [activeTab, items, filter, userProfile]);

    const handleAssign = async (analystId: string) => {
        if (!selectedItem) return;
        try {
            await supabase.from('solicitations').update({ analyst_id: analystId }).eq('id', selectedItem.id);
            fetchData();
        } catch (e) { console.error(e); }
    };

    const handleView = (item: InboxItem) => {
         onNavigate('process_detail', item.id);
    };

    const handleOpenLocation = async (unitName: string) => {
        if (!unitName || unitName === '---') return;

        showToast('info', `Buscando localização de "${unitName}"...`);

        // Try comarcas first
        let { data: comarca } = await supabase.from('dcomarcas').select('*').ilike('comarca', unitName).maybeSingle();
        if (!comarca) {
            const { data: comarcaContains } = await supabase.from('dcomarcas').select('*').ilike('comarca', `%${unitName}%`).limit(1).maybeSingle();
             comarca = comarcaContains;
        }

        if (comarca) {
            setSelectedLocation({
                title: comarca.comarca,
                type: 'COMARCA',
                coordinates: { lat: comarca.latitude || -1.45502, lng: comarca.longitude || -48.5024 },
                details: {
                    entrancia: comarca.entrancia,
                    polo: comarca.polo,
                    regiao: comarca.regiao,
                    address: comarca.endereco ? comarca.endereco : `Pólo ${comarca.polo}, Região ${comarca.regiao}`
                }
            });
            setIsLocationModalOpen(true);
            return;
        }

        // Try Unidades Administrativas
        let { data: unidade } = await supabase.from('dUnidadesAdmin').select('*').or(`nome.ilike.${unitName},sigla.ilike.${unitName}`).maybeSingle();
        if (!unidade) {
            const { data: unidadeContains } = await supabase.from('dUnidadesAdmin').select('*').or(`nome.ilike.%${unitName}%,sigla.ilike.%${unitName}%`).limit(1).maybeSingle();
            unidade = unidadeContains;
        }

        if (unidade) {
             setSelectedLocation({
                title: unidade.nome,
                type: 'UNIDADE',
                coordinates: { lat: unidade.latitude || -1.45502, lng: unidade.longitude || -48.5024 },
                details: {
                    address: unidade.endereco,
                    phone: unidade.telefone,
                    email: unidade.email
                }
            });
            setIsLocationModalOpen(true);
            return;
        }
        
        showToast('error', `Localização não cadastrada para: "${unitName}"`);
    };

    // Helper to get status config
    const getStatusConfig = (status: string) => {
        if (status.includes('WAITING_RESSARCIMENTO_ANALYSIS')) return { 
            color: 'emerald', icon: Clock, label: 'NOVO PEDIDO', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100',
            darkBg: 'bg-emerald-500/10', darkText: 'text-emerald-400', darkBorder: 'border-emerald-500/20'
        };
        if (status.includes('EXECUTION') || status.includes('PAYMENT')) return { 
            color: 'amber', icon: DollarSign, label: 'PAGAMENTO', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100',
            darkBg: 'bg-amber-500/10', darkText: 'text-amber-400', darkBorder: 'border-amber-500/20'
        };
        if (status === 'PAID') return { 
            color: 'blue', icon: CheckCircle, label: 'PAGO', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100',
            darkBg: 'bg-blue-500/10', darkText: 'text-blue-400', darkBorder: 'border-blue-500/20'
        };
        if (status === 'APPROVED') return { 
            color: 'emerald', icon: CheckCircle, label: 'APROVADO', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100',
            darkBg: 'bg-emerald-500/10', darkText: 'text-emerald-400', darkBorder: 'border-emerald-500/20'
        };
        if (status === 'REJECTED') return { 
            color: 'rose', icon: XCircle, label: 'INDEFERIDO', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100',
            darkBg: 'bg-rose-500/10', darkText: 'text-rose-400', darkBorder: 'border-rose-500/20'
        };
       
        return { 
            color: 'slate', icon: Activity, label: status.substring(0, 4), bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100',
            darkBg: 'bg-slate-800', darkText: 'text-slate-400', darkBorder: 'border-slate-700'
        };
    };

    // Helper to get type config
    const getTypeConfig = (type?: string) => {
        return { icon: Receipt, color: 'emerald', label: 'Reembolso' };
    };

    return (
        <div className={`min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} p-6 transition-colors duration-500`}>
            {/* Contextual Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-2">
                {tabStats.map((stat, idx) => (
                    <SosfuStatCard
                        key={idx}
                        title={stat.title}
                        value={stat.value as any}
                        subtitle={stat.subtitle as any}
                        icon={stat.icon as any}
                        color={stat.color as any}
                        badge={stat.badge as any}
                        progress={stat.progress as any}
                        progressLabel={stat.progressLabel as any}
                        darkMode={darkMode}
                    />
                ))}
            </div>

            {/* Main Action Bar */}
            <div className={`
                flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl border mb-6 shadow-sm
                ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}
            `}>
                {/* Tabs */}
                <div className={`flex items-center gap-1 p-1 rounded-xl overflow-x-auto no-scrollbar max-w-full ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
                    {[
                        { id: 'INBOX', label: 'Pedidos', icon: <Inbox size={16} /> },
                        { id: 'ANALYSIS', label: 'Análise Técnica', icon: <FileCheck size={16} /> },
                        { id: 'PAYMENTS', label: 'Pagamentos', icon: <DollarSign size={16} /> },
                        { id: 'HISTORY', label: 'Arquivo', icon: <Archive size={16} /> },
                    ].map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id as RessarcimentoTabType)}
                            className={`
                                flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex-shrink-0
                                ${activeTab === tab.id 
                                    ? (darkMode ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'bg-white text-emerald-600 shadow-sm') 
                                    : (darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')
                                }
                            `}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search & Actions */}
                <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                        <input 
                            type="text" 
                            placeholder="Buscar Processo, Beneficiário..." 
                            value={filter} 
                            onChange={e => setFilter(e.target.value)} 
                            className={`
                                pl-11 pr-4 py-2.5 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all
                                ${darkMode ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-100 text-slate-900'}
                            `}
                        />
                    </div>
                    
                    <button 
                        onClick={() => setIsTeamModalOpen(true)}
                        className={`
                            flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all
                            ${darkMode 
                                ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700' 
                                : 'bg-white border-slate-100 text-emerald-600 hover:bg-emerald-50'}
                        `}
                    >
                        <Users size={18} />
                        Equipe
                    </button>

                    <button className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
                        <Download size={18} />
                        Exportar
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className={`
                rounded-3xl border overflow-hidden shadow-sm transition-colors
                ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}
            `}>
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left">
                        <thead className={`text-[11px] font-black uppercase tracking-[0.1em] border-b ${darkMode ? 'bg-slate-900/50 border-slate-700 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                            <tr>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-6 py-5">Processo</th>
                                <th className="px-6 py-5">Data</th>
                                <th className="px-6 py-5">Beneficiário</th>
                                <th className="px-6 py-5">Unidade</th>
                                <th className="px-6 py-5">Tipo</th>
                                <th className="px-6 py-5">Valor</th>
                                <th className="px-6 py-5">Prazo</th>
                                <th className="px-6 py-5">Responsável</th>
                                <th className="px-8 py-5 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-50'}`}>
                            {loading ? (
                                <tr>
                                    <td colSpan={10} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                                            <p className={`text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Carregando ressarcimentos...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-8 py-24 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 ${darkMode ? 'bg-slate-900 text-slate-700' : 'bg-slate-50 text-slate-200'}`}>
                                                <DollarSign size={40} />
                                            </div>
                                            <p className={`text-lg font-black ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Tudo em ordem!</p>
                                            <p className={`text-sm mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Nenhum processo nesta fila.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => (
                                    <tr 
                                        key={item.id} 
                                        className={`transition-all hover:translate-x-1 cursor-pointer group ${darkMode ? 'hover:bg-slate-700/30' : 'hover:bg-emerald-50/30'}`}
                                        onClick={() => handleView(item)}
                                    >
                                        <td className="px-8 py-5">
                                            {(() => {
                                                const config = getStatusConfig(item.status);
                                                const StatusIcon = config.icon;
                                                return (
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest border transition-all ${
                                                        darkMode ? `${config.darkBg} ${config.darkText} ${config.darkBorder}` : `${config.bg} ${config.text} ${config.border}`
                                                    }`}>
                                                        <StatusIcon size={12} />
                                                        {config.label}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-lg ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                                                    <FileText size={14} />
                                                </div>
                                                <div className={`font-mono font-black text-sm transition-colors ${darkMode ? 'text-emerald-400 group-hover:text-emerald-300' : 'text-emerald-600'}`}>
                                                    {item.process_number}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className={darkMode ? 'text-slate-600' : 'text-slate-400'} />
                                                <div className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black border-2 shrink-0 overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-700 text-emerald-400' : 'bg-emerald-50 border-white text-emerald-600'}`}>
                                                    {item.requester?.avatar_url ? (
                                                        <img src={item.requester.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        item.beneficiary?.charAt(0)
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className={`text-sm font-black truncate ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.beneficiary}</div>
                                                    <div className={`text-[10px] font-bold truncate ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                        {item.requester?.cargo || 'Requerente'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div 
                                                className={`flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1.5 -ml-2 transition-colors ${darkMode ? 'hover:bg-slate-800/80' : 'hover:bg-emerald-50'}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenLocation(item.unit || '');
                                                }}
                                                title="Ver localização"
                                            >
                                                <div className={`p-1.5 rounded-full shrink-0 ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                                                    <MapPin size={12} />
                                                </div>
                                                <div className={`text-xs font-bold truncate max-w-[150px] hover:underline ${darkMode ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-500 hover:text-emerald-700'}`}>
                                                    {item.unit}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            {(() => {
                                                const typeConfig = getTypeConfig(item.solicitation_type);
                                                const TypeIcon = typeConfig.icon;
                                                return (
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                                        darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        <TypeIcon size={12} className={typeConfig.color === 'rose' ? 'text-rose-500' : ''} />
                                                        {typeConfig.label}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-1.5">
                                                <DollarSign size={14} className={darkMode ? 'text-emerald-500' : 'text-emerald-600'} />
                                                <div className={`font-mono font-bold text-sm ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                                                    {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(item.value)}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className={new Date(item.created_at).getTime() < Date.now() - 5 * 24 * 60 * 60 * 1000 ? 'text-rose-500' : 'text-emerald-500'} />
                                                <span className={`text-[11px] font-black whitespace-nowrap ${new Date(item.created_at).getTime() < Date.now() - 5 * 24 * 60 * 60 * 1000 ? (darkMode ? 'text-rose-400' : 'text-rose-600') : (darkMode ? 'text-emerald-400' : 'text-emerald-600')}`}>
                                                    {(() => {
                                                        const created = new Date(item.created_at).getTime();
                                                        const now = Date.now();
                                                        const diff = (created + 7 * 24 * 60 * 60 * 1000) - now; 
                                                        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
                                                        if (days < 0) return 'Atrasado';
                                                        if (days === 0) return 'Hoje';
                                                        return `${days} dias`;
                                                    })()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setIsAssignModalOpen(true); }}
                                                className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold transition-all ${
                                                    item.analyst 
                                                    ? (darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200 text-slate-700') 
                                                    : 'border-dashed border-emerald-300 text-emerald-600 hover:bg-emerald-50'
                                                }`}
                                            >
                                                {item.analyst ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] text-white overflow-hidden">
                                                            {item.analyst.avatar_url ? (
                                                                <img src={item.analyst.avatar_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                item.analyst.full_name?.charAt(0)
                                                            )}
                                                        </div>
                                                        <span className="max-w-[80px] truncate">{item.analyst.full_name?.split(' ')[0]}</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <UserPlus size={12} />
                                                        Atribuir
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleView(item); }} 
                                                className={`
                                                    inline-flex items-center gap-2 px-1 text-xs font-black transition-all
                                                    ${darkMode ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-800'}
                                                `}
                                            >
                                                Detalhes
                                                <ArrowRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Footer */}
                <div className={`px-8 py-5 border-t flex items-center justify-between transition-colors ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        Mostrando {filteredItems.length} de {items.length} processos
                    </p>
                    <div className="flex items-center gap-2">
                        <button disabled className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${darkMode ? 'border-slate-700 text-slate-700' : 'border-slate-200 text-slate-300'}`}>Anterior</button>
                        <button className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Próximo</button>
                    </div>
                </div>
            </div>

            <AssignModal 
                isOpen={isAssignModalOpen} 
                onClose={() => setIsAssignModalOpen(false)}
                onAssign={handleAssign}
                currentAnalystId={selectedItem?.analyst_id}
                title="Atribuir Ressarcimento"
                module="RESSARCIMENTO"
                conflictAnalystId={selectedItem?.solicitation_analyst_id}
            />

            {/* Team Management Modal */}
            {isTeamModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={`
                        w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative
                        ${darkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'}
                    `}>
                        <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${darkMode ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-slate-100'} backdrop-blur-md`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                                    <UsersIcon size={24} />
                                </div>
                                <div>
                                    <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>Equipe Ressarcimento</h2>
                                    <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Célula de Pagamentos</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsTeamModalOpen(false)}
                                className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6">
                            <RessarcimentoTeamTable isGestor={true} /> 
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Overlay */}
            {toast && (
                <div className={`fixed top-4 right-4 z-[70] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-bold animate-in slide-in-from-top-2 duration-300 ${
                  toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 
                  toast.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                  'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                }`}>
                  {toast.type === 'success' ? <CheckCircle2 size={16} /> : 
                   toast.type === 'error' ? <AlertTriangle size={16} /> :
                   <Loader2 size={16} className="animate-spin" />}
                  {toast.message}
                </div>
            )}

            {/* Location Modal */}
            {isLocationModalOpen && selectedLocation && (
                <LocationModal
                    isOpen={isLocationModalOpen}
                    onClose={() => setIsLocationModalOpen(false)}
                    data={selectedLocation}
                    darkMode={darkMode}
                />
            )}
        </div>
    );
};
