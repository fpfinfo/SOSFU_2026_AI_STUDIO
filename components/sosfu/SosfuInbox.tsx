import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Search, Inbox, Users, CheckCircle2, FileText, CheckSquare, Loader2, ArrowRight, UserPlus, Sparkles, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AssignModal } from '../AssignModal';

interface SosfuInboxProps {
    onNavigate: (page: string, processId?: string, accountabilityId?: string) => void;
    userProfile: any;
}

type TabType = 'NEW' | 'ANALYSIS' | 'DONE';

interface InboxItem {
    id: string;
    type: 'SOLICITATION' | 'ACCOUNTABILITY';
    process_number: string;
    beneficiary: string;
    value: number;
    created_at: string;
    status: string;
    analyst_id?: string;
    analyst?: { full_name: string; avatar_url?: string };
    solicitation_id?: string; // For Accountabilities to link back
}

export const SosfuInbox: React.FC<SosfuInboxProps> = ({ onNavigate, userProfile }) => {
    const [activeTab, setActiveTab] = useState<TabType>('NEW');
    const [items, setItems] = useState<InboxItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [counts, setCounts] = useState({ new: 0, analysis: 0, done: 0 });

    // Assign logic
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);

    // Fetch data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Solicitations (Inclusive of all relevant lifecycle statuses)
            const { data: sols } = await supabase
                .from('solicitations')
                .select(`*, analyst:analyst_id(full_name, avatar_url)`)
                .or('status.eq.WAITING_SOSFU_ANALYSIS,status.eq.WAITING_SOSFU_EXECUTION,status.eq.WAITING_SEFIN_SIGNATURE,status.eq.WAITING_CORRECTION,status.eq.PAID,status.eq.APPROVED,status.eq.REJECTED,status.eq.ARCHIVED')
                .order('created_at', { ascending: false })
                .limit(200);

            // 2. Fetch Accountabilities
            const { data: pcs } = await supabase
                .from('accountabilities')
                .select(`*, analyst:analyst_id(full_name, avatar_url), profiles:requester_id(full_name)`)
                .or('status.eq.WAITING_SOSFU,status.eq.CORRECTION,status.eq.LATE,status.eq.APPROVED,status.eq.REJECTED,status.eq.ARCHIVED')
                .order('created_at', { ascending: false })
                .limit(200);

            const combined: InboxItem[] = [];

            if (sols) {
                sols.forEach(s => {
                    combined.push({
                        id: s.id,
                        type: 'SOLICITATION',
                        process_number: s.process_number,
                        beneficiary: s.beneficiary,
                        value: s.value,
                        created_at: s.created_at,
                        status: s.status,
                        analyst_id: s.analyst_id,
                        analyst: s.analyst,
                    });
                });
            }

            if (pcs) {
                pcs.forEach(p => {
                    combined.push({
                        id: p.id,
                        type: 'ACCOUNTABILITY',
                        process_number: p.process_number,
                        beneficiary: p.profiles?.full_name || 'Desconhecido',
                        value: p.value,
                        created_at: p.created_at,
                        status: p.status,
                        analyst_id: p.analyst_id,
                        analyst: p.analyst,
                        solicitation_id: p.solicitation_id
                    });
                });
            }

            // Sort by date desc
            combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            setItems(combined);

            // Calculate counts
            const currentUserId = userProfile?.id;
            
            const newItems = combined.filter(i => 
                (i.type === 'SOLICITATION' && ['WAITING_SOSFU_ANALYSIS', 'WAITING_SOSFU_EXECUTION'].includes(i.status)) ||
                (i.type === 'ACCOUNTABILITY' && i.status === 'WAITING_SOSFU')
            );
            
            const analysisItems = combined.filter(i => 
                // Either assigned to me OR in intermediate state
                (currentUserId && i.analyst_id === currentUserId) ||
                (i.type === 'SOLICITATION' && ['WAITING_SEFIN_SIGNATURE', 'WAITING_CORRECTION'].includes(i.status)) ||
                (i.type === 'ACCOUNTABILITY' && ['CORRECTION', 'LATE'].includes(i.status))
            );

            const doneItems = combined.filter(i => 
                ['PAID', 'APPROVED', 'REJECTED', 'ARCHIVED'].includes(i.status)
            );

            setCounts({
                new: newItems.length,
                analysis: analysisItems.length,
                done: doneItems.length
            });

        } catch (err) {
            console.error('Error fetching inbox:', err);
        } finally {
            setLoading(false);
        }
    }, [userProfile]);

    useEffect(() => {
        fetchData();
        
        // Realtime subscription could be added here similar to AccountabilityView
        const channel = supabase.channel('sosfu-inbox')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitations' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'accountabilities' }, fetchData)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchData]);

    // Filtering logic
    const getFilteredItems = () => {
        let list: InboxItem[] = [];
        const currentUserId = userProfile?.id;

        switch (activeTab) {
            case 'NEW':
                list = items.filter(i => 
                    (i.type === 'SOLICITATION' && ['WAITING_SOSFU_ANALYSIS', 'WAITING_SOSFU_EXECUTION'].includes(i.status)) ||
                    (i.type === 'ACCOUNTABILITY' && i.status === 'WAITING_SOSFU')
                );
                break;
            case 'ANALYSIS':
                list = items.filter(i => 
                    (currentUserId && i.analyst_id === currentUserId) ||
                    (i.type === 'SOLICITATION' && ['WAITING_SEFIN_SIGNATURE', 'WAITING_CORRECTION'].includes(i.status) && i.status !== 'WAITING_SOSFU_ANALYSIS') ||
                    (i.type === 'ACCOUNTABILITY' && ['CORRECTION', 'LATE'].includes(i.status) && i.status !== 'WAITING_SOSFU')
                );
                break;
            case 'DONE':
                list = items.filter(i => ['PAID', 'APPROVED', 'REJECTED', 'ARCHIVED'].includes(i.status));
                break;
        }

        return list.filter(i => 
            i.process_number.toLowerCase().includes(filter.toLowerCase()) || 
            i.beneficiary.toLowerCase().includes(filter.toLowerCase())
        );
    };

    const filteredList = getFilteredItems();

    const handleAssign = async (analystId: string) => {
        if (!selectedItem) return;
        try {
            const table = selectedItem.type === 'SOLICITATION' ? 'solicitations' : 'accountabilities';
            await supabase.from(table).update({ analyst_id: analystId }).eq('id', selectedItem.id);
            fetchData();
        } catch (e) { console.error(e); }
    };

    const handleView = (item: InboxItem) => {
        if (item.type === 'SOLICITATION') {
            onNavigate('process_detail', item.id);
        } else {
            // Accountability needs solicitation_id for ProcessDetailView
            if (item.solicitation_id) {
                onNavigate('process_accountability', item.solicitation_id, item.id);
            }
        }
    };

    return (
        <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm mt-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
             {/* Header Section */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 pt-4 pb-0 bg-white">
                
                {/* Tabs */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-full md:w-auto overflow-x-auto">
                    {([
                        { id: 'NEW' as TabType, label: 'Inbox', icon: <Inbox size={14} />, count: counts.new },
                        { id: 'ANALYSIS' as TabType, label: 'Minha Fila', icon: <Users size={14} />, count: counts.analysis },
                        { id: 'DONE' as TabType, label: 'Processados', icon: <CheckCircle2 size={14} />, count: counts.done },
                    ]).map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                                activeTab === tab.id 
                                ? 'bg-teal-600 text-white shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700 hover:bg-white'
                            }`}
                        >
                            {tab.icon} {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className={`ml-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                                }`}>
                                    {tab.count > 99 ? '99+' : tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                
                {/* Search */}
                <div className="relative w-full md:w-auto">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar processos..." 
                        value={filter} 
                        onChange={e => setFilter(e.target.value)} 
                        className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 transition-all" 
                    />
                </div>
            </div>

            {/* Context Bar */}
            <div className="px-6 py-2 bg-teal-50/50 border-b border-teal-100/50 flex items-center gap-2 mt-4">
                <Sparkles size={12} className="text-teal-400" />
                <span className="text-xs font-medium text-teal-700">
                    {activeTab === 'NEW' ? 'Processos aguardando triagem ou análise SOSFU.' : 
                     activeTab === 'ANALYSIS' ? 'Processos sob sua responsabilidade ou em trâmite.' :
                     'Histórico de processos concluídos.'}
                </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4">Tipo / Processo</th>
                            <th className="px-6 py-4">Beneficiário</th>
                            <th className="px-6 py-4">Valor</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Analista</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                             <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <Loader2 className="animate-spin text-teal-600" size={24} /> 
                                        <p className="font-medium text-sm">Carregando processos...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredList.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="w-14 h-14 bg-teal-50 rounded-full flex items-center justify-center mb-3">
                                          <CheckCircle2 size={24} className="text-teal-400" />
                                        </div>
                                        <p className="text-slate-600 font-bold">Nenhum processo nesta fila</p>
                                        <p className="text-xs text-slate-400 mt-1">Tudo em dia para a SOSFU.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredList.map((item) => (
                                <tr 
                                    key={item.id} 
                                    className="hover:bg-teal-50/30 transition-colors cursor-pointer group"
                                    onClick={() => handleView(item)}
                                >
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                item.type === 'SOLICITATION' ? 'bg-blue-100 text-blue-600' : 'bg-teal-100 text-teal-600'
                                            }`}>
                                                {item.type === 'SOLICITATION' ? <FileText size={16} /> : <CheckSquare size={16} />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-sm">{item.process_number}</div>
                                                <div className="text-[10px] text-slate-400 font-medium">
                                                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <div className="text-sm font-medium text-slate-700">{item.beneficiary}</div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <span className="text-sm font-mono font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
                                            ${item.status.includes('WAITING') ? 'bg-yellow-100 text-yellow-700' : ''}
                                            ${item.status === 'APPROVED' || item.status === 'PAID' ? 'bg-green-100 text-green-700' : ''}
                                            ${item.status === 'CORRECTION' ? 'bg-orange-100 text-orange-700' : ''}
                                        `}>
                                            {item.status.replace(/WAITING_|SOSFU_|SEFIN_/g, '').replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setIsAssignModalOpen(true); }}
                                            className={`flex items-center gap-2 px-2 py-1 rounded-full border text-[10px] transition-all bg-white hover:border-teal-300 ${item.analyst ? 'text-slate-700 border-slate-200' : 'text-slate-400 border-dashed border-slate-300'}`}
                                        >
                                            {item.analyst ? (
                                                <>
                                                    <div className="w-4 h-4 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-[9px] font-bold">
                                                        {(item.analyst.full_name || '?').charAt(0)}
                                                    </div>
                                                    <span className="max-w-[80px] truncate">{(item.analyst.full_name || 'Usuário').split(' ')[0]}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus size={12} /> Atribuir
                                                </>
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-6 py-3.5 text-right">
                                        <button onClick={(e) => { e.stopPropagation(); handleView(item); }} className="p-1.5 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors">
                                            <ArrowRight size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <AssignModal 
                isOpen={isAssignModalOpen} 
                onClose={() => setIsAssignModalOpen(false)}
                onAssign={handleAssign}
                currentAnalystId={selectedItem?.analyst_id}
                title="Atribuir Processo"
                module="SOSFU"
            />
        </div>
    );
};
