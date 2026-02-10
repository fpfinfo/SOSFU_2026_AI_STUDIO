import React, { useEffect, useState, useCallback } from 'react';
import { Search, Inbox, Users, CheckCircle2, Loader2, ArrowRight, UserPlus, Sparkles, Receipt, Wallet } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AssignModal } from '../AssignModal';

interface RessarcimentoInboxProps {
    onNavigate: (page: string, processId?: string) => void;
    userProfile: any;
}

type TabType = 'NEW' | 'ANALYSIS' | 'DONE';

interface InboxItem {
    id: string;
    process_number: string;
    beneficiary: string;
    value: number;
    created_at: string;
    status: string;
    analyst_id?: string;
    analyst?: { full_name: string; avatar_url?: string };
    details?: string;
    sentinela_risk?: string;
}

export const RessarcimentoInbox: React.FC<RessarcimentoInboxProps> = ({ onNavigate, userProfile }) => {
    const [activeTab, setActiveTab] = useState<TabType>('NEW');
    const [items, setItems] = useState<InboxItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [counts, setCounts] = useState({ new: 0, analysis: 0, done: 0 });

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch Reimbursement Solicitations
            // Using a generic filter for now, assuming they might have a specific type or status prefix
            // If DB schema has type column use it, otherwise rely on status 'WAITING_RESSARCIMENTO...'
            const { data } = await supabase
                .from('solicitations')
                .select(`*, analyst:analyst_id(full_name, avatar_url), accountabilities(sentinela_risk)`)
                .or('status.eq.WAITING_RESSARCIMENTO_ANALYSIS,status.eq.WAITING_RESSARCIMENTO_EXECUTION,status.eq.PAID,status.eq.APPROVED') 
                .order('created_at', { ascending: false })
                .limit(100);

            if (data) {
                const map: InboxItem[] = data.map(s => ({
                    id: s.id,
                    process_number: s.process_number,
                    beneficiary: s.beneficiary,
                    value: s.value,
                    created_at: s.created_at,
                    status: s.status,
                    analyst_id: s.analyst_id,
                    analyst: s.analyst,
                    details: s.unit,
                    sentinela_risk: s.accountabilities?.[0]?.sentinela_risk
                }));
                
                setItems(map);

                const currentUserId = userProfile?.id;
                
                const newItems = map.filter(i => ['WAITING_RESSARCIMENTO_ANALYSIS'].includes(i.status) && !i.analyst_id);
                const analysisItems = map.filter(i => 
                    (currentUserId && i.analyst_id === currentUserId) ||
                    ['WAITING_RESSARCIMENTO_EXECUTION'].includes(i.status) // Execution phase
                );
                const doneItems = map.filter(i => ['PAID', 'APPROVED', 'REJECTED'].includes(i.status));

                setCounts({
                    new: newItems.length,
                    analysis: analysisItems.length,
                    done: doneItems.length
                });
            }
        } catch (err) {
            console.error('Error fetching Reimb inbox:', err);
        } finally {
            setLoading(false);
        }
    }, [userProfile]);

    useEffect(() => {
        fetchData();
        const channel = supabase.channel('ressarcimento-inbox')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitations' }, fetchData)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchData]);

    const getFilteredItems = () => {
        let list: InboxItem[] = [];
        const currentUserId = userProfile?.id;

        switch (activeTab) {
            case 'NEW':
                // Unassigned requests
                list = items.filter(i => ['WAITING_RESSARCIMENTO_ANALYSIS'].includes(i.status) && !i.analyst_id);
                break;
            case 'ANALYSIS':
                // Assigned to me OR In Execution
                list = items.filter(i => 
                    (currentUserId && i.analyst_id === currentUserId) ||
                    ['WAITING_RESSARCIMENTO_EXECUTION'].includes(i.status)
                );
                break;
            case 'DONE':
                list = items.filter(i => ['PAID', 'APPROVED', 'REJECTED'].includes(i.status));
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
            await supabase.from('solicitations').update({ analyst_id: analystId }).eq('id', selectedItem.id);
            fetchData();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm mt-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
             {/* Header Section */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 pt-4 pb-0 bg-white">
                
                {/* Tabs */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-full md:w-auto overflow-x-auto">
                    {([
                        { id: 'NEW' as TabType, label: 'Entrada', icon: <Inbox size={14} />, count: counts.new },
                        { id: 'ANALYSIS' as TabType, label: 'Minha Mesa', icon: <Users size={14} />, count: counts.analysis },
                        { id: 'DONE' as TabType, label: 'Concluídos', icon: <CheckCircle2 size={14} />, count: counts.done },
                    ]).map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                                activeTab === tab.id 
                                ? 'bg-emerald-500 text-white shadow-sm' 
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
                        placeholder="Buscar reembolsos..." 
                        value={filter} 
                        onChange={e => setFilter(e.target.value)} 
                        className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-all" 
                    />
                </div>
            </div>

            {/* Context Bar */}
            <div className="px-6 py-2 bg-emerald-50/50 border-b border-emerald-100/50 flex items-center gap-2 mt-4">
                <Sparkles size={12} className="text-emerald-400" />
                <span className="text-xs font-medium text-emerald-700">
                    {activeTab === 'NEW' ? 'Solicitações de ressarcimento aguardando triagem.' : 
                     activeTab === 'ANALYSIS' ? 'Processos sob análise ou em fase de pagamento.' :
                     'Histórico de ressarcimentos pagos.'}
                </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4">Processo</th>
                            <th className="px-6 py-4">Solicitante / Unidade</th>
                            <th className="px-6 py-4">Valor</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Responsável</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                             <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <Loader2 className="animate-spin text-emerald-600" size={24} /> 
                                        <p className="font-medium text-sm">Carregando...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredList.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                                          <CheckCircle2 size={24} className="text-emerald-400" />
                                        </div>
                                        <p className="text-slate-600 font-bold">Nenhum registro encontrado</p>
                                        <p className="text-xs text-slate-400 mt-1">Fila limpa.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredList.map((item) => (
                                <tr 
                                    key={item.id} 
                                    className="hover:bg-emerald-50/30 transition-colors cursor-pointer group"
                                    onClick={() => onNavigate('process_detail', item.id)}
                                >
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-600">
                                                <Receipt size={16} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-sm">{item.process_number}</div>
                                                <div className="text-[10px] text-slate-400 font-medium">
                                                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                                                </div>
                                                {item.sentinela_risk && (
                                                    <div className={`mt-1 flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded border inline-flex ${
                                                        item.sentinela_risk === 'LOW' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        item.sentinela_risk === 'MEDIUM' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        'bg-red-50 text-red-600 border-red-100'
                                                    }`}>
                                                        <Sparkles size={8} /> {item.sentinela_risk}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <div className="text-sm font-medium text-slate-700">{item.beneficiary}</div>
                                        {item.details && <div className="text-[10px] text-slate-400">{item.details}</div>}
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <span className="text-sm font-mono font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
                                            ${item.status.includes('WAITING') ? 'bg-amber-100 text-amber-700' : ''}
                                            ${item.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : ''}
                                            ${item.status.includes('EXECUTION') ? 'bg-blue-100 text-blue-700' : ''}
                                        `}>
                                            {item.status.replace(/WAITING_|RESSARCIMENTO_/g, '').replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setIsAssignModalOpen(true); }}
                                            className={`flex items-center gap-2 px-2 py-1 rounded-full border text-[10px] transition-all bg-white hover:border-emerald-300 ${item.analyst ? 'text-slate-700 border-slate-200' : 'text-slate-400 border-dashed border-slate-300'}`}
                                        >
                                            {item.analyst ? (
                                                <>
                                                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[9px] font-bold">
                                                        {item.analyst.full_name.charAt(0)}
                                                    </div>
                                                    <span className="max-w-[80px] truncate">{item.analyst.full_name.split(' ')[0]}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus size={12} /> Atribuir
                                                </>
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-6 py-3.5 text-right">
                                        <button onClick={(e) => { e.stopPropagation(); onNavigate('process_detail', item.id); }} className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors">
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
                title="Atribuir Ressarcimento"
                // Assuming RESSARCIMENTO uses SEFIN or specific role
                module="SEFIN" // or create dedicated RESSARCIMENTO module in AssignModal logic if needed
            />
        </div>
    );
};
