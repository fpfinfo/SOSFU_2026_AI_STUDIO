
import React, { useState, useEffect, useMemo } from 'react';
import { getRequests } from '../services/dataService';
import { RequestItem } from '../types';
import { supabase } from '../services/supabaseClient';

interface RequestsProps {
  onAddClick: () => void;
  onSelectRequest: (request: RequestItem) => void;
  onEditRequest: (request: RequestItem) => void;
}

const Requests: React.FC<RequestsProps> = ({ onAddClick, onSelectRequest, onEditRequest }) => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const data = await getRequests(user.id);
        setRequests(data || []);
      }
    } catch (error) {
      console.error("Erro ao carregar solicitações:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(req => 
      req.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      req.nup?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [requests, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'Pendente' || r.status === 'Assinatura Gestor').length,
      totalValue: requests.reduce((acc, r) => acc + (r.totalValue || 0), 0)
    };
  }, [requests]);

  const getStatusColor = (status: string) => {
    switch (status) {
        case 'Aprovado': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        case 'Rejeitado': return 'bg-red-50 text-red-600 border-red-100';
        case 'Em Analise': return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30';
        case 'Assinatura Gestor': return 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30';
        case 'Em Ajuste': return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
        default: return 'bg-yellow-50 text-yellow-600 border-yellow-100 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-900/30';
    }
  };

  const getRequestVisuals = (title: string = '') => {
    const t = title.toUpperCase();
    if (t.includes('JÚRI')) return { icon: 'fa-gavel', color: 'emerald' };
    if (t.includes('EMERGENCIAL')) return { icon: 'fa-bolt-lightning', color: 'red' };
    if (t.includes('DIÁRIAS')) return { icon: 'fa-plane', color: 'sky' };
    if (t.includes('REEMBOLSOS') || t.includes('RESSARCIMENTO')) return { icon: 'fa-receipt', color: 'teal' };
    return { icon: 'fa-file-invoice', color: 'blue' };
  };

  return (
    <div className="p-6 md:p-10 space-y-12 animate-in fade-in duration-700 bg-gray-50/30">
      {/* Header Estilo Screenshot */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div className="space-y-2">
          <h2 className="text-5xl font-black text-[#0f172a] tracking-tighter italic leading-none">Minhas Solicitações</h2>
          <p className="text-slate-400 text-lg font-medium">Acompanhe o trâmite dos seus processos administrativos.</p>
        </div>
        
        <div className="flex flex-wrap gap-6 w-full lg:w-auto items-center">
          {/* Card Total Solicitado */}
          <div className="bg-white px-8 py-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
             <div className="w-14 h-14 rounded-2xl bg-[#e6fcf5] text-[#00c283] flex items-center justify-center text-2xl shadow-inner">
               <i className="fa-solid fa-file-circle-check"></i>
             </div>
             <div className="flex flex-col">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Solicitado</p>
                <p className="text-2xl font-black text-[#0f172a] leading-none tracking-tight">R$ {stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
             </div>
          </div>
          
          {/* Card Pendentes (Escuro) */}
          <div className="bg-[#0f172a] px-10 py-6 rounded-[2rem] shadow-2xl flex items-center gap-6 relative overflow-hidden group">
             <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center text-xl backdrop-blur-md border border-white/5 transition-transform group-hover:scale-110">
               <i className="fa-solid fa-clock-rotate-left"></i>
             </div>
             <div className="relative z-10 flex flex-col">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pendentes</p>
                <p className="text-2xl font-black text-white leading-none tracking-tight italic">{stats.pending} Processos</p>
             </div>
             <div className="absolute top-0 right-0 p-8 opacity-5 -rotate-12 translate-x-4 -translate-y-4">
                <i className="fa-solid fa-file-invoice text-8xl"></i>
             </div>
          </div>
        </div>
      </div>

      {/* Barra de Busca e Botão Novo Solicitação na mesma linha */}
      <div className="flex flex-col md:flex-row gap-6 items-center">
        <div className="relative flex-1 w-full group">
          <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#00c283] transition-colors"></i>
          <input 
            type="text" 
            placeholder="Buscar por NUP ou título do processo..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-8 py-6 bg-white border border-slate-100 rounded-[2.5rem] outline-none focus:ring-4 focus:ring-emerald-50 transition-all font-bold text-slate-700 shadow-sm text-sm"
          />
        </div>
        <button 
          onClick={onAddClick}
          className="bg-[#00c283] text-white px-12 py-6 rounded-[2.5rem] font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-emerald-100 hover:bg-[#00a871] transition-all flex items-center justify-center gap-4 whitespace-nowrap active:scale-95"
        >
          <i className="fa-solid fa-plus-circle text-lg"></i>
          Nova Solicitação
        </button>
      </div>

      {/* Lista de Processos Estilo Screenshot */}
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-[3rem] border border-slate-50 animate-pulse"></div>
          ))
        ) : filteredRequests.length === 0 ? (
          <div className="py-32 text-center space-y-6 bg-white rounded-[3rem] border border-dashed border-slate-200">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-100 text-5xl">
               <i className="fa-solid fa-folder-open"></i>
            </div>
            <div className="space-y-1">
               <h3 className="text-2xl font-black text-slate-800 tracking-tight">Nenhum processo em trâmite</h3>
               <p className="text-slate-400 font-medium text-lg">Suas solicitações aparecerão aqui após serem protocoladas.</p>
            </div>
          </div>
        ) : (
          filteredRequests.map(req => {
            const visuals = getRequestVisuals(req.title);
            return (
            <div 
              key={req.id} 
              onClick={() => onSelectRequest(req)}
              className="bg-white p-10 rounded-[3.5rem] border border-slate-50 shadow-sm hover:shadow-2xl hover:border-emerald-100 transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden"
            >
              <div className="flex items-center gap-8 relative z-10">
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-3xl transition-all shadow-inner bg-${visuals.color}-50 text-${visuals.color}-500 group-hover:bg-${visuals.color}-600 group-hover:text-white`}>
                  <i className={`fa-solid ${visuals.icon}`}></i>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <h4 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">{req.nup || 'PROCESSO EM CRIAÇÃO'}</h4>
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusColor(req.status)} shadow-sm`}>
                      {req.status}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-[#0f172a] dark:text-slate-100 group-hover:text-[#00c283] transition-colors uppercase tracking-tighter leading-tight italic">{req.title}</h3>
                  <div className="flex flex-wrap items-center gap-4">
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">{new Date(req.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    {req.status === 'Em Ajuste' && (
                      <span className="flex items-center gap-1.5 text-[9px] font-black text-amber-600 uppercase tracking-tight bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-lg animate-pulse">
                        <i className="fa-solid fa-circle-exclamation"></i> Ajuste Necessário
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 relative z-10">
                <div className="flex items-center gap-12">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest leading-none mb-1">VALOR REQUISITADO</p>
                    <p className="text-3xl font-black text-[#0f172a] dark:text-slate-100 tracking-tighter italic leading-none">R$ {req.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-200 dark:text-slate-700 flex items-center justify-center group-hover:bg-[#0f172a] dark:group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xl active:scale-90">
                    <i className="fa-solid fa-arrow-right text-lg"></i>
                  </div>
                </div>
                
                {req.status === 'Em Ajuste' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEditRequest(req); }}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <i className="fa-solid fa-pen-to-square"></i> Editar Solicitação
                  </button>
                )}
              </div>
              
              {/* Marca d'água discreta ao fundo do card */}
              <div className="absolute right-0 bottom-0 p-8 opacity-[0.02] dark:opacity-[0.05] text-[15rem] pointer-events-none group-hover:opacity-[0.04] dark:group-hover:opacity-[0.08] transition-opacity">
                <i className={`fa-solid ${visuals.icon}`}></i>
              </div>

              {/* Bloco de Notas / Parecer IA se estiver em ajuste */}
              {req.status === 'Em Ajuste' && req.notes && (
                <div className="absolute inset-x-0 bottom-0 px-10 pb-4 no-print translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                  <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-t-2xl border-t border-x border-amber-100 dark:border-amber-900/30 backdrop-blur-md">
                     <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest opacity-60 mb-1">Parecer da SOSFU (Gemini AI)</p>
                     <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed italic line-clamp-2">
                       "{req.notes}"
                     </p>
                  </div>
                </div>
              )}
            </div>
          );
          })
        )}
      </div>

      {/* Footer Informativo */}
      <div className="bg-[#f8fafc] p-10 rounded-[3rem] border border-slate-100 flex flex-col md:flex-row items-center gap-8 shadow-inner">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-[#00c283] shadow-lg shrink-0 border border-slate-50 text-2xl">
           <i className="fa-solid fa-shield-check"></i>
        </div>
        <div className="space-y-1">
          <p className="text-lg text-slate-800 font-black tracking-tight leading-tight uppercase italic">Transparência Integrada</p>
          <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-2xl">
            Todos os seus processos administrativos no ÁGIL seguem as diretrizes de auditoria em tempo real, garantindo segurança jurídica e celeridade no ressarcimento de suas despesas.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Requests;
