import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Filter, Search, MoreHorizontal, CheckSquare, AlertCircle, Loader2, Inbox, List, UserPlus, Eye, ArrowRight, Bell, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AssignModal } from './AssignModal';

interface AccountabilityViewProps {
    onNavigate?: (page: string, processId?: string, accountabilityId?: string) => void;
}

type TabType = 'ALL' | 'NEW' | 'ANALYSIS' | 'DONE';

export const AccountabilityView: React.FC<AccountabilityViewProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<TabType>('NEW');
  const [accountabilities, setAccountabilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  // Assign Logic
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentAnalystId, setCurrentAnalystId] = useState<string | undefined>(undefined);

  // Stats
  const [counts, setCounts] = useState({ all: 0, new: 0, analysis: 0, done: 0 });

  // 🆕 Realtime & Notification State
  const [hasNewItems, setHasNewItems] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [newPCNumber, setNewPCNumber] = useState<string | null>(null);
  const lastSeenCountRef = useRef<number>(0);

  // 🔔 Realtime subscription for PC updates
  const refetchAccountabilities = useCallback(() => {
    fetchAccountabilities();
  }, []);

  useEffect(() => {
    // Subscribe to accountabilities changes
    const channel = supabase
      .channel('realtime-accountability')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accountabilities',
        },
        (payload) => {
          console.log('[PC] 🆕 Alteração detectada:', payload);
          
          if (payload.eventType === 'INSERT' || 
              (payload.eventType === 'UPDATE' && payload.new?.status === 'WAITING_SOSFU')) {
            setNewPCNumber(payload.new?.process_number || 'Nova PC');
            setShowNotification(true);
            setHasNewItems(true);
            setTimeout(() => setShowNotification(false), 5000);
          }
          
          refetchAccountabilities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchAccountabilities]);

  useEffect(() => {
    fetchAccountabilities();
  }, []);

  const fetchAccountabilities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('accountabilities')
        .select(`
            *,
            profiles:requester_id (full_name),
            analyst:analyst_id (full_name)
        `)
        .order('deadline', { ascending: true });

      if (error) throw error;
      
      const items = data || [];
      setAccountabilities(items);

      const newCount = items.filter(i => i.status === 'WAITING_SOSFU').length;
      setCounts({
          all: items.length,
          new: newCount, 
          analysis: items.filter(i => ['CORRECTION', 'LATE'].includes(i.status)).length,
          done: items.filter(i => i.status === 'APPROVED').length
      });

      // Check if new items arrived since last check
      if (newCount > lastSeenCountRef.current && lastSeenCountRef.current > 0) {
        setHasNewItems(true);
      }
      lastSeenCountRef.current = newCount;

    } catch (error) {
      console.error('Error fetching PC:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (analystId: string) => {
      if (!selectedId) return;
      try {
          const { error } = await supabase
            .from('accountabilities')
            .update({ analyst_id: analystId })
            .eq('id', selectedId);
          
          if (error) throw error;
          
          // Refresh
          await fetchAccountabilities(); 
      } catch (err) {
          console.error(err);
          console.error('Erro ao atribuir analista.');
      }
  };

  const openAssignModal = (id: string, currAnalystId?: string) => {
      setSelectedId(id);
      setCurrentAnalystId(currAnalystId);
      setIsAssignModalOpen(true);
  };

  const handleViewDetails = (pc: any) => {
      if (onNavigate) {
          // Navega para o detalhe do processo, focando na prestação de contas e abrindo o Painel de Auditoria se estiver WAITING_SOSFU
          onNavigate('process_accountability', pc.solicitation_id, pc.id);
      }
  };

  const getDaysRemaining = (deadlineStr: string) => {
      const deadline = new Date(deadlineStr);
      const today = new Date();
      const diffTime = deadline.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  };

  // Lógica de Abas
  const getFilteredItems = () => {
      let list = accountabilities;
      
      switch (activeTab) {
          case 'NEW':
              // Novas = Chegaram na SOSFU e aguardam análise
              list = list.filter(i => i.status === 'WAITING_SOSFU');
              break;
          case 'ANALYSIS':
              // Em Análise = Retornaram para Correção ou estão Atrasadas (em monitoramento)
              list = list.filter(i => ['CORRECTION', 'LATE'].includes(i.status));
              break;
          case 'DONE':
              // Concluídas
              list = list.filter(i => i.status === 'APPROVED');
              break;
          case 'ALL':
          default:
              // Todas
              break;
      }
      
      return list.filter(item => 
        item.process_number.toLowerCase().includes(filter.toLowerCase()) ||
        (item.profiles?.full_name || '').toLowerCase().includes(filter.toLowerCase())
      );
  }

  const filteredItems = getFilteredItems();

  // Handle tab click - clear "new" indicator when viewing NEW tab
  const handleTabClick = (id: TabType) => {
    setActiveTab(id);
    if (id === 'NEW') {
      setHasNewItems(false);
    }
  };

  const TabButton = ({ id, label, count, isPulsing }: { id: TabType, label: string, count: number, isPulsing?: boolean }) => (
      <button 
        onClick={() => handleTabClick(id)}
        className={`relative pb-3 px-4 text-sm font-bold transition-all ${
            activeTab === id 
            ? 'text-purple-600 border-b-2 border-purple-600' 
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-lg'
        }`}
      >
          {label}
          <span className={`ml-2 text-xs py-0.5 px-2 rounded-full relative ${
              activeTab === id ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
          } ${isPulsing ? 'animate-pulse bg-red-100 text-red-600' : ''}`}>
              {count}
              {isPulsing && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
          </span>
      </button>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 🔔 Notification Toast */}
      {showNotification && (
        <div 
          className="fixed top-20 right-6 z-50 animate-in slide-in-from-right-5 duration-300"
          onClick={() => setShowNotification(false)}
        >
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 cursor-pointer hover:shadow-xl transition-shadow">
            <div className="p-2 bg-white/20 rounded-lg">
              <Bell size={18} className="animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-bold text-purple-100">NOVA PRESTAÇÃO DE CONTAS</p>
              <p className="text-sm font-bold">{newPCNumber}</p>
            </div>
            <Sparkles size={16} className="text-yellow-300 animate-pulse" />
          </div>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 rounded-md text-purple-600">
                <CheckSquare size={20} />
            </div>
            Prestação de Contas (PC)
          </h2>
          <p className="text-gray-500 text-sm mt-1">Controle e análise de prestação de contas</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* Tabs */}
        <div className="flex items-center gap-2 px-4 pt-4 border-b border-gray-200 overflow-x-auto">
            <TabButton id="ALL" label="Todas" count={counts.all} />
            <TabButton id="NEW" label="Novas" count={counts.new} isPulsing={hasNewItems && activeTab !== 'NEW'} />
            <TabButton id="ANALYSIS" label="Em Acompanhamento" count={counts.analysis} />
            <TabButton id="DONE" label="Concluídas" count={counts.done} />
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
            <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Buscar PC ou suprido..." 
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>
            <div className="text-xs text-gray-500 font-medium hidden md:block">
                Visualizando {filteredItems.length} de {counts.all} contas
            </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Nº PC</th>
                <th className="px-6 py-4">Suprido</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Prazo Limite</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Analista</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                   <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                          <div className="flex justify-center items-center gap-2">
                              <Loader2 className="animate-spin" size={20} /> Carregando contas...
                          </div>
                      </td>
                  </tr>
              ) : filteredItems.length === 0 ? (
                  <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                          <Inbox size={32} className="mx-auto mb-2 opacity-50"/>
                          <p>Nenhuma prestação de contas nesta aba.</p>
                      </td>
                  </tr>
              ) : (
                filteredItems.map((item) => {
                    const daysRemaining = getDaysRemaining(item.deadline);
                    return (
                        <tr 
                            key={item.id} 
                            className="hover:bg-gray-50 transition-colors cursor-pointer group"
                            onClick={() => handleViewDetails(item)}
                        >
                        <td className="px-6 py-4">
                            <span className="font-bold text-gray-800 text-sm group-hover:text-purple-600 transition-colors">{item.process_number}</span>
                        </td>
                        <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-800">{item.profiles?.full_name || 'Desconhecido'}</div>
                        </td>
                        <td className="px-6 py-4">
                            <span className="text-sm font-mono text-gray-700">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-600">{new Date(item.deadline).toLocaleDateString('pt-BR')}</span>
                                <span className={`text-[10px] font-bold ${daysRemaining < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                    {daysRemaining < 0 ? `${Math.abs(daysRemaining)} dias atrasado` : `${daysRemaining} dias restantes`}
                                </span>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <span className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase
                            ${item.status === 'APPROVED' ? 'bg-green-100 text-green-700' : ''}
                            ${item.status === 'WAITING_SOSFU' ? 'bg-purple-100 text-purple-700' : ''}
                            ${item.status === 'CORRECTION' ? 'bg-orange-100 text-orange-700' : ''}
                            ${item.status === 'LATE' ? 'bg-red-100 text-red-700' : ''}
                            ${item.status === 'DRAFT' || item.status === 'WAITING_MANAGER' ? 'bg-gray-100 text-gray-600' : ''}
                            `}>
                            {item.status === 'WAITING_SOSFU' && 'Análise SOSFU'}
                            {item.status === 'APPROVED' && 'Aprovado'}
                            {item.status === 'CORRECTION' && 'Correção'}
                            {item.status === 'LATE' && 'Atrasado'}
                            {item.status === 'WAITING_MANAGER' && 'No Gestor'}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            <button 
                                onClick={(e) => { e.stopPropagation(); openAssignModal(item.id, item.analyst_id); }}
                                className={`flex items-center gap-2 px-2 py-1 rounded-full border text-xs transition-all ${
                                    item.analyst 
                                    ? 'bg-white border-gray-200 text-gray-700 hover:border-purple-300' 
                                    : 'bg-gray-50 border-dashed border-gray-300 text-gray-400 hover:text-purple-600 hover:border-purple-300'
                                }`}
                            >
                                {item.analyst ? (
                                    <>
                                        <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-[10px]">
                                            {item.analyst.full_name.charAt(0)}
                                        </div>
                                        <span className="max-w-[100px] truncate">{item.analyst.full_name.split(' ')[0]}</span>
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={14} />
                                        <span>Atribuir</span>
                                    </>
                                )}
                            </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleViewDetails(item); }}
                                className="text-purple-600 hover:bg-purple-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ml-auto"
                            >
                                {item.status === 'WAITING_SOSFU' ? 'Analisar' : 'Detalhes'} 
                                <ArrowRight size={14} />
                            </button>
                        </td>
                        </tr>
                    );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AssignModal 
        isOpen={isAssignModalOpen} 
        onClose={() => setIsAssignModalOpen(false)}
        onAssign={handleAssign}
        currentAnalystId={currentAnalystId}
        title="Atribuir Prestação de Contas"
        module="SOSFU"
      />
    </div>
  );
};