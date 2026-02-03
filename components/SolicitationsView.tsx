import React, { useEffect, useState } from 'react';
import { Plus, Filter, Search, MoreHorizontal, FileText, Loader2, UserPlus, Inbox, List, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StatusBadge } from './StatusBadge';
import { AssignModal } from './AssignModal';

export const SolicitationsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'INBOX' | 'ALL'>('INBOX');
  const [solicitations, setSolicitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  
  // Assign Logic
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [currentAnalystId, setCurrentAnalystId] = useState<string | undefined>(undefined);

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
      setSolicitations(data || []);
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

  // Lógica de Filtragem de Abas
  // Inbox: Processos que chegaram do Gestor (WAITING_SOSFU_ANALYSIS)
  // All: Tudo
  const getFilteredList = () => {
      let list = solicitations;
      
      if (activeTab === 'INBOX') {
          list = list.filter(s => s.status === 'WAITING_SOSFU_ANALYSIS');
      }

      return list.filter(item => 
        item.process_number.toLowerCase().includes(filter.toLowerCase()) ||
        item.beneficiary.toLowerCase().includes(filter.toLowerCase())
      );
  };

  const filteredSolicitations = getFilteredList();

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
        <div className="flex gap-3">
          {/* Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab('INBOX')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'INBOX' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <Inbox size={16} /> Caixa de Entrada
              </button>
              <button 
                onClick={() => setActiveTab('ALL')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'ALL' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <List size={16} /> Todos
              </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
            <div className="text-xs text-gray-500 font-medium">
                Mostrando {filteredSolicitations.length} processos
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
                          <p>Nenhum processo encontrado nesta visão.</p>
                      </td>
                  </tr>
              ) : (
                filteredSolicitations.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
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
                        <button className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded hover:bg-blue-50">
                            <MoreHorizontal size={18} />
                        </button>
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
