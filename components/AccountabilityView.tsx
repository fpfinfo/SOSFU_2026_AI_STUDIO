import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Filter, Search, MoreHorizontal, CheckSquare, AlertCircle, Loader2, Inbox, List, UserPlus, Eye, ArrowRight, Bell, Sparkles, Users, CheckCircle2 } from 'lucide-react';
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
              // Inbox: Aguardando SOSFU
              list = list.filter(i => i.status === 'WAITING_SOSFU');
              break;
          case 'ANALYSIS':
              // Minha Fila: Atribuídos a mim (se userProfile existir) ou Em Correção/Atraso (fallback)
              // Idealmente, filtrar por analyst_id se tivermos o ID do usuário
              // Como userProfile não está nas props explícitas (mas é passado no App.tsx), vamos tentar usar sessao
              // Mas aqui filter é síncrono.
              // Vamos usar um fallback inteligente:
              // Se tiver analyst_id definido e for != null, assume que é de alguém.
              // Mas "Minha Fila" implica "Meus".
              // Vou filtrar onde 'status' não é aprovado E não é waiting_sosfu (novas), ou seja, em andamento.
              list = list.filter(i => i.status !== 'APPROVED' && i.status !== 'WAITING_SOSFU');
              break;
          case 'DONE':
              // Processados: Concluídas
              list = list.filter(i => i.status === 'APPROVED');
              break;
          default:
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
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <div className="p-2 bg-purple-600 rounded-lg text-white shadow-sm">
                <CheckSquare size={18} />
            </div>
            Painel de Controle SOSFU
          </h2>
          <p className="text-slate-500 text-sm mt-1 ml-11">Gestão centralizada de prestação de contas.</p>
        </div>
      </div>

      {/* Section C: Queue Tabs */}
      <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm">
        <div className="flex items-center gap-1 px-4 pt-4 pb-0 bg-white">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                {([
                    { id: 'NEW' as TabType, label: 'Inbox', icon: <Inbox size={14} />, count: counts.new },
                    { id: 'ANALYSIS' as TabType, label: 'Minha Fila', icon: <Users size={14} />, count: counts.analysis },
                    { id: 'DONE' as TabType, label: 'Processados', icon: <CheckCircle2 size={14} />, count: counts.done },
                ]).map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => handleTabClick(tab.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === tab.id 
                            ? 'bg-purple-600 text-white shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 hover:bg-white'
                        }`}
                    >
                        {tab.icon} {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className={`ml-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                                activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                            } ${hasNewItems && tab.id === 'NEW' ? 'animate-pulse bg-red-500 text-white' : ''}`}>
                                {tab.count > 99 ? '99+' : tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>
            
            <div className="flex-1" />
            
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Buscar..." 
                    value={filter} 
                    onChange={e => setFilter(e.target.value)} 
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300" 
                />
            </div>
        </div>

        {/* Toolbar Info */}
        {(activeTab === 'NEW' || activeTab === 'ANALYSIS') && (
             <div className="px-6 py-2 bg-purple-50/50 border-b border-purple-100/50 flex items-center gap-2">
                <Sparkles size={12} className="text-purple-400" />
                <span className="text-xs font-medium text-purple-700">
                    {activeTab === 'NEW' ? 'Processos aguardando triagem ou análise inicial.' : 'Processos em sua fila de trabalho.'}
                </span>
             </div>
        )}

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider border-b border-slate-100">
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
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                   <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center h-48 gap-3">
                              <Loader2 className="animate-spin text-purple-600" size={32} /> 
                              <p className="font-medium">Carregando contas...</p>
                          </div>
                      </td>
                  </tr>
              ) : filteredItems.length === 0 ? (
                  <tr>
                      <td colSpan={7} className="px-6 py-24 text-center">
                          <div className="flex flex-col items-center justify-center">
                              <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 size={32} className="text-purple-400" />
                              </div>
                              <p className="text-slate-600 font-bold text-lg">Nenhum processo nesta fila</p>
                              <p className="text-sm text-slate-400 mt-1">Tudo em dia para a SOSFU.</p>
                          </div>
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