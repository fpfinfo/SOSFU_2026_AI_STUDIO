import React, { useEffect, useState } from 'react';
import { Plus, Filter, Search, MoreHorizontal, FileText, Loader2, UserPlus, Inbox, List, User, Eye, FolderOpen, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StatusBadge } from './StatusBadge';
import { AssignModal } from './AssignModal';

interface SolicitationsViewProps {
    onNavigate?: (page: string, processId?: string) => void;
}

type TabType = 'ALL' | 'NEW' | 'ANALYSIS' | 'DONE';

export const SolicitationsView: React.FC<SolicitationsViewProps> = ({ onNavigate }) => {
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
      
      // Calcular contagens
      setCounts({
          all: allItems.length,
          new: allItems.filter(s => s.status === 'WAITING_SOSFU_ANALYSIS').length,
          analysis: allItems.filter(s => ['WAITING_SEFIN_SIGNATURE', 'WAITING_SOSFU_PAYMENT', 'WAITING_SUPRIDO_CONFIRMATION', 'WAITING_CORRECTION'].includes(s.status)).length,
          done: allItems.filter(s => ['PAID', 'APPROVED', 'REJECTED'].includes(s.status)).length
      });

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
          alert('Erro ao atribuir analista.');
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
              // Novas = Aguardando Análise Inicial da SOSFU
              list = list.filter(s => s.status === 'WAITING_SOSFU_ANALYSIS');
              break;
          case 'ANALYSIS':
              // Em Análise = Processos que já passaram da triagem mas não terminaram
              // Inclui: Sefin, Pagamento, Aguardando Suprido, Correção
              list = list.filter(s => ['WAITING_SEFIN_SIGNATURE', 'WAITING_SOSFU_PAYMENT', 'WAITING_SUPRIDO_CONFIRMATION', 'WAITING_CORRECTION'].includes(s.status));
              break;
          case 'DONE':
              // Concluídas = Pagos ou Rejeitados
              list = list.filter(s => ['PAID', 'APPROVED', 'REJECTED'].includes(s.status));
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

  const TabButton = ({ id, label, count }: { id: TabType, label: string, count: number }) => (
      <button 
        onClick={() => setActiveTab(id)}
        className={`relative pb-3 px-4 text-sm font-bold transition-all ${
            activeTab === id 
            ? 'text-blue-600 border-b-2 border-blue-600' 
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-lg'
        }`}
      >
          {label}
          <span className={`ml-2 text-xs py-0.5 px-2 rounded-full ${
              activeTab === id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
          }`}>
              {count}
          </span>
      </button>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-md text-blue-600">
                <FileText size={20} />
            </div>
            Gestão de Solicitações (Concessão)
          </h2>
          <p className="text-gray-500 text-sm mt-1">Análise técnica de pedidos de suprimento.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* New Tabs System */}
        <div className="flex items-center gap-2 px-4 pt-4 border-b border-gray-200 overflow-x-auto">
            <TabButton id="ALL" label="Todas" count={counts.all} />
            <TabButton id="NEW" label="Novas" count={counts.new} />
            <TabButton id="ANALYSIS" label="Em Análise" count={counts.analysis} />
            <TabButton id="DONE" label="Concluídas" count={counts.done} />
        </div>

        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
            <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Buscar por processo ou beneficiário..." 
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>
            <div className="text-xs text-gray-500 font-medium hidden md:block">
                Visualizando {filteredSolicitations.length} de {counts.all} processos
            </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Processo</th>
                <th className="px-6 py-4">Beneficiário / Unidade</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Analista (Mesa)</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
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
      />
    </div>
  );
};