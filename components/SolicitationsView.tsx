import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Filter, Search, MoreHorizontal, FileText, Loader2, UserPlus, Inbox, List, User, Eye, FolderOpen, CheckCircle2, Clock, AlertCircle, Bell, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StatusBadge } from './StatusBadge';
import { AssignModal } from './AssignModal';
import { useRealtimeInbox } from '../hooks/useRealtimeInbox';

interface SolicitationsViewProps {
    onNavigate?: (page: string, processId?: string) => void;
    darkMode?: boolean;
}

type TabType = 'ALL' | 'NEW' | 'ANALYSIS' | 'DONE';

export const SolicitationsView: React.FC<SolicitationsViewProps> = ({ onNavigate, darkMode = false }) => {
  const [activeTab, setActiveTab] = useState<TabType>('NEW');
  const [solicitations, setSolicitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  
  // Assign Logic
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [currentAnalystId, setCurrentAnalystId] = useState<string | undefined>(undefined);

  // Counts
  const [counts, setCounts] = useState({ all: 0, new: 0, analysis: 0, done: 0 });

  // 🆕 Realtime & Notification State
  const [hasNewItems, setHasNewItems] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [newProcessNumber, setNewProcessNumber] = useState<string | null>(null);
  const lastSeenCountRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 🔔 Realtime subscription for SOSFU inbox
  const refetchSolicitations = useCallback(() => {
    fetchSolicitations();
  }, []);

  useRealtimeInbox({
    module: 'SOSFU',
    onNewProcess: (payload) => {
      console.log('[SOSFU] 🆕 Novo processo:', payload.new?.process_number);
      setNewProcessNumber(payload.new?.process_number || 'Novo processo');
      setShowNotification(true);
      setHasNewItems(true);
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => setShowNotification(false), 5000);
      
      // Play notification sound
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
      
      refetchSolicitations();
    },
    onAnyChange: refetchSolicitations,
  });

  useEffect(() => {
    fetchSolicitations();
  }, []);

  const fetchSolicitations = async () => {
    try {
      setLoading(true);
      // Busca solicitations com dados do analista (join)
      const { data, error } = await supabase
        .from('solicitations')
        .select(`
            *,
            analyst:analyst_id (full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const allItems = data || [];
      setSolicitations(allItems);
      
      // Calcular contagens - PENDING também conta como "Nova" para SOSFU
      // (PENDING = chegou na plataforma, WAITING_SOSFU_ANALYSIS = triada pela SOSFU)
      const newCount = allItems.filter(s => 
        s.status === 'WAITING_SOSFU_ANALYSIS' || 
        s.status === 'PENDING' || 
        s.status === 'WAITING_SOSFU'
      ).length;
      
      setCounts({
          all: allItems.length,
          new: newCount,
          analysis: allItems.filter(s => ['WAITING_SEFIN_SIGNATURE', 'WAITING_SOSFU_PAYMENT', 'WAITING_SUPRIDO_CONFIRMATION', 'WAITING_CORRECTION', 'WAITING_SOSFU_EXECUTION', 'WAITING_SEFIN'].includes(s.status)).length,
          done: allItems.filter(s => ['PAID', 'APPROVED', 'REJECTED', 'ARCHIVED'].includes(s.status)).length
      });

      // Check if new items arrived since last check
      if (newCount > lastSeenCountRef.current && lastSeenCountRef.current > 0) {
        setHasNewItems(true);
      }
      lastSeenCountRef.current = newCount;

    } catch (error) {
      console.error('Error fetching solicitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (analystId: string) => {
      if (!selectedProcessId) return;
      try {
          const { error } = await supabase
            .from('solicitations')
            .update({ analyst_id: analystId })
            .eq('id', selectedProcessId);
          
          if (error) throw error;
          
          // Refresh local state
          setSolicitations(prev => prev.map(s => 
             s.id === selectedProcessId ? { ...s, analyst_id: analystId } : s
          ));
          await fetchSolicitations(); // Full refresh to get analyst name
      } catch (err) {
          console.error(err);
          console.error('Erro ao atribuir analista.');
      }
  };

  const openAssignModal = (procId: string, currAnalystId?: string) => {
      setSelectedProcessId(procId);
      setCurrentAnalystId(currAnalystId);
      setIsAssignModalOpen(true);
  };

  const handleViewDetails = (id: string) => {
      if (onNavigate) {
          onNavigate('process_detail', id);
      }
  };

  // Lógica de Filtragem de Abas
  const getFilteredList = () => {
      let list = solicitations;
      
      switch (activeTab) {
          case 'NEW':
              // Novas = Aguardando Análise Inicial da SOSFU (inclui PENDING e WAITING_SOSFU)
              list = list.filter(s => 
                s.status === 'WAITING_SOSFU_ANALYSIS' || 
                s.status === 'PENDING' || 
                s.status === 'WAITING_SOSFU'
              );
              break;
          case 'ANALYSIS':
              // Em Análise = Processos que já passaram da triagem mas não terminaram
              // Inclui: Sefin, Pagamento, Aguardando Suprido, Correção, Execução
              list = list.filter(s => ['WAITING_SEFIN_SIGNATURE', 'WAITING_SOSFU_PAYMENT', 'WAITING_SUPRIDO_CONFIRMATION', 'WAITING_CORRECTION', 'WAITING_SOSFU_EXECUTION', 'WAITING_SEFIN'].includes(s.status));
              break;
          case 'DONE':
              // Concluídas = Pagos, Rejeitados ou Arquivados
              list = list.filter(s => ['PAID', 'APPROVED', 'REJECTED', 'ARCHIVED'].includes(s.status));
              break;
          case 'ALL':
          default:
              // Todas (Sem filtro de status)
              break;
      }

      return list.filter(item => 
        item.process_number.toLowerCase().includes(filter.toLowerCase()) ||
        item.beneficiary.toLowerCase().includes(filter.toLowerCase())
      );
  };

  const filteredSolicitations = getFilteredList();

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
            ? (darkMode ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600') 
            : (darkMode ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-t-lg' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-lg')
        }`}
      >
          {label}
          <span className={`ml-2 text-xs py-0.5 px-2 rounded-full relative ${
              activeTab === id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
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
    <div className={`space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ${darkMode ? 'text-slate-100' : ''}`}>
      
      {/* 🔔 Notification Toast */}
      {showNotification && (
        <div 
          className="fixed top-20 right-6 z-50 animate-in slide-in-from-right-5 duration-300"
          onClick={() => setShowNotification(false)}
        >
          <div className="bg-gradient-to-r from-blue-600 to-teal-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 cursor-pointer hover:shadow-xl transition-shadow">
            <div className="p-2 bg-white/20 rounded-lg">
              <Bell size={18} className="animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-100">NOVO PROCESSO</p>
              <p className="text-sm font-bold">{newProcessNumber}</p>
            </div>
            <Sparkles size={16} className="text-yellow-300 animate-pulse" />
          </div>
        </div>
      )}

      {/* Hidden audio element for notification sound */}
      <audio ref={audioRef} preload="auto">
        <source src="/notification.mp3" type="audio/mpeg" />
      </audio>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-gray-800'}`}>
            <div className={`p-1.5 rounded-md ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                <FileText size={20} />
            </div>
            Gestão de Solicitações (Concessão)
          </h2>
          <p className={`${darkMode ? 'text-slate-400' : 'text-gray-500'} text-sm mt-1`}>Análise técnica de pedidos de suprimento.</p>
        </div>
      </div>

      <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border overflow-hidden`}>
        
        {/* New Tabs System */}
        <div className={`flex items-center gap-2 px-4 pt-4 border-b overflow-x-auto ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
            <TabButton id="ALL" label="Todas" count={counts.all} />
            <TabButton id="NEW" label="Novas" count={counts.new} isPulsing={hasNewItems && activeTab !== 'NEW'} />
            <TabButton id="ANALYSIS" label="Em Análise" count={counts.analysis} />
            <TabButton id="DONE" label="Concluídas" count={counts.done} />
        </div>

        <div className={`p-4 border-b flex justify-between items-center ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50/50 border-gray-200'}`}>
            <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Buscar por processo ou beneficiário..." 
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                        darkMode 
                        ? 'bg-slate-900 border-slate-700 text-slate-100 focus:ring-blue-500/20 focus:border-blue-500' 
                        : 'bg-white border-gray-200 text-gray-800 focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>
            <div className={`text-xs font-medium hidden md:block ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                Visualizando {filteredSolicitations.length} de {counts.all} processos
            </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead className={`font-semibold text-xs uppercase tracking-wider ${darkMode ? 'bg-slate-900/80 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
              <tr>
                <th className="px-6 py-4">Processo</th>
                <th className="px-6 py-4">Beneficiário / Unidade</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Analista (Mesa)</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-gray-100'}`}>
              {loading ? (
                  <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          <div className="flex justify-center items-center gap-2">
                              <Loader2 className="animate-spin" size={20} /> Carregando solicitações...
                          </div>
                      </td>
                  </tr>
              ) : filteredSolicitations.length === 0 ? (
                  <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400 flex flex-col items-center justify-center w-full">
                          <Inbox size={32} className="mb-2 opacity-50"/>
                          <p>Nenhum processo encontrado nesta aba.</p>
                      </td>
                  </tr>
              ) : (
                filteredSolicitations.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => handleViewDetails(item.id)}>
                    <td className="px-6 py-4">
                        <span className="font-bold text-gray-800 text-sm">{item.process_number}</span>
                        <div className="text-[10px] text-gray-400 mt-0.5">{new Date(item.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-800">{item.beneficiary}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{item.unit || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                        <span className="text-sm font-mono text-gray-700">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        <StatusBadge status={item.status} size="sm" />
                    </td>
                    <td className="px-6 py-4">
                        <button 
                            onClick={(e) => { e.stopPropagation(); openAssignModal(item.id, item.analyst_id); }}
                            className={`flex items-center gap-2 px-2 py-1 rounded-full border text-xs transition-all ${
                                item.analyst 
                                ? 'bg-white border-gray-200 text-gray-700 hover:border-blue-300' 
                                : 'bg-gray-50 border-dashed border-gray-300 text-gray-400 hover:text-blue-600 hover:border-blue-300'
                            }`}
                        >
                            {item.analyst ? (
                                <>
                                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[10px]">
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
                        <div className="flex justify-end gap-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleViewDetails(item.id); }}
                                className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                                title="Ver Detalhes do Processo"
                            >
                                <Eye size={16} />
                                <span className="hidden md:inline">Detalhes</span>
                            </button>
                        </div>
                    </td>
                    </tr>
                ))
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
        module="SOSFU"
      />
    </div>
  );
};
