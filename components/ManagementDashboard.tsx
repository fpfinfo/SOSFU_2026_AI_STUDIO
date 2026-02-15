
import React, { useState, useEffect } from 'react';
import { AppModule, Profile, RequestItem } from '../types';
import { getRequests, getAllProfiles, assignRequest, signByOrdenador } from '../services/dataService';
import { MODULE_THEMES } from '../utils/themes';
import { supabase } from '../services/supabaseClient';

interface ManagementDashboardProps {
  module: AppModule;
  onSelectRequest: (request: RequestItem) => void;
  initialTab?: 'Inbox' | 'Mesa' | 'Analise' | 'Concluidos';
  isPersonalDesk?: boolean;
  profile?: Profile | null;
}

const ManagementDashboard: React.FC<ManagementDashboardProps> = ({ 
  module, 
  onSelectRequest, 
  initialTab = 'Inbox',
  isPersonalDesk = false,
  profile: currentProfile = null
}) => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [team, setTeam] = useState<Profile[]>([]);
  const [inboxTab, setInboxTab] = useState<'Inbox' | 'Mesa' | 'Analise' | 'Concluidos'>(isPersonalDesk ? 'Mesa' : initialTab);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);

  // SEFIN - Ordenador de Despesas
  const [originFilter, setOriginFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchPassword, setBatchPassword] = useState('');
  const [batchSigning, setBatchSigning] = useState(false);
  const isSefin = module === 'sefin';

  useEffect(() => {
    fetchData();
  }, [module, isPersonalDesk, currentProfile?.id]);

  useEffect(() => {
    setInboxTab(isPersonalDesk ? 'Mesa' : initialTab);
  }, [isPersonalDesk, initialTab]);

  const handleAssign = async (requestId: string, analyst: Profile) => {
    try {
      await assignRequest(requestId, analyst.id, analyst.fullName);
      setShowAssignModal(null);
      fetchData();
      alert(`Processo atribuído a ${analyst.fullName}`);
    } catch (err) {
      console.error("Erro ao atribuir:", err);
      alert("Erro ao atribuir processo.");
    }
  };

  const handleBatchSign = async () => {
    setBatchSigning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email!, password: batchPassword
      });
      if (authError) { alert('Senha incorreta'); setBatchSigning(false); return; }
      await Promise.all(
        (Array.from(selectedIds) as string[]).map(id =>
          signByOrdenador(id, user.id, 'Autorizado em lote pelo Ordenador de Despesas.')
        )
      );
      setSelectedIds(new Set());
      setShowBatchModal(false);
      setBatchPassword('');
      fetchData();
    } catch (err) {
      alert('Erro ao assinar em lote.');
    } finally {
      setBatchSigning(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allRequests, allProfiles] = await Promise.all([
        getRequests(),
        getAllProfiles()
      ]);

      const moduleRequests = (allRequests || []).filter(req => {
        // Primeiro filtro: Pertence ao módulo?
        const belongsToModule = (() => {
          switch(module) {
            case 'suprimento': return req.type === 'suprimento' || req.type === 'extra-emergencial' || req.type === 'extra-juri' || req.originModule === 'suprimento';
            case 'diarias': return req.type === 'diaria' || req.type === 'passagem';
            case 'reembolsos': return req.type === 'reembolso';
            case 'ajsefin': return req.status === 'Parecer Juridico';
            case 'sefin': return req.status === 'Assinatura Ordenador' || req.status === 'Autorizado';
            default: return true;
          }
        })();

        if (!belongsToModule) return false;

        // Segundo filtro: Se for "Minha Mesa", deve estar atribuído a mim
        if (isPersonalDesk) {
          if (!currentProfile) return false;
          return req.assignedToId === currentProfile.id;
        }

        return true;
      });
      setRequests(moduleRequests);

      const moduleTeam = (allProfiles || []).filter(p => 
        p.systemRole === 'ADMIN' || 
        p.systemRole === module.toUpperCase() ||
        p.systemRole === `GESTOR_${module.toUpperCase()}` ||
        p.systemRole === `ANALISTA_${module.toUpperCase()}` ||
        (module === 'suprimento' && (p.systemRole === 'SOSFU' || p.systemRole === 'GESTOR_SOSFU' || p.systemRole === 'ANALISTA_SOSFU')) ||
        p.isTeamMember
      );
      setTeam(moduleTeam);
    } catch (err) {
      console.error("Erro ao carregar dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    // Filtro por tab
    let tabMatch = true;
    if (isSefin) {
      if (inboxTab === 'Inbox') tabMatch = req.status === 'Assinatura Ordenador';
      else if (inboxTab === 'Mesa') tabMatch = req.assignedToId !== null && req.status === 'Assinatura Ordenador';
      else if (inboxTab === 'Concluidos') tabMatch = req.status === 'Autorizado';
      else tabMatch = true;
    } else {
      if (inboxTab === 'Inbox') tabMatch = req.status === 'Pendente' || req.status === 'Em Analise';
      else if (inboxTab === 'Mesa') tabMatch = req.assignedToId !== null;
      else if (inboxTab === 'Analise') tabMatch = req.status === 'Em Analise' || req.status === 'Parecer Juridico';
      else if (inboxTab === 'Concluidos') tabMatch = req.status === 'Aprovado' || req.status === 'Rejeitado';
    }
    // Filtro por origem (SEFIN only)
    const originMatch = !isSefin || originFilter === 'all' || req.originModule === originFilter;
    return tabMatch && originMatch;
  });

  const getModuleConfig = () => {
    const theme = MODULE_THEMES[module] || MODULE_THEMES.usuarios;
    let colorName = 'emerald';
    if (theme.primary.includes('emerald')) colorName = 'emerald';
    else if (theme.primary.includes('indigo')) colorName = 'indigo';
    else if (theme.primary.includes('rose')) colorName = 'rose';
    else if (theme.primary.includes('orange')) colorName = 'orange';
    else if (theme.primary.includes('blue')) colorName = 'blue';
    else if (theme.primary.includes('sky')) colorName = 'sky';
    else if (theme.primary.includes('violet')) colorName = 'violet';
    else if (theme.primary.includes('zinc')) colorName = 'zinc';
    else if (theme.primary.includes('slate')) colorName = 'slate';

    return { 
      label: theme.label, 
      color: colorName, 
      icon: theme.icon, 
      desc: theme.welcomeMsg 
    };
  };

  const config = getModuleConfig();

  return (
    <div className="p-6 md:p-10 space-y-10 animate-in fade-in duration-700 bg-gray-50/50 dark:bg-transparent min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
             <div className={`w-14 h-14 rounded-[1.5rem] bg-${config.color}-600 text-white flex items-center justify-center text-3xl shadow-xl shadow-${config.color}-100 animate-in zoom-in-50`}>
                <i className={`fa-solid ${config.icon}`}></i>
             </div>
              <div className="space-y-0.5">
                <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter italic leading-none">Gestão: {config.label}</h2>
                <p className="text-slate-400 dark:text-slate-500 font-medium">{config.desc}</p>
              </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
            <button onClick={fetchData} className="w-12 h-12 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-emerald-600 transition-all flex items-center justify-center shadow-sm hover:scale-110 active:scale-95">
               <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i>
            </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {(isSefin ? [
           { label: 'AGUARDANDO ASSINATURA', value: requests.filter(r => r.status === 'Assinatura Ordenador').length, icon: 'fa-file-contract', color: 'blue', sub: 'MINUTAS PENDENTES' },
           { label: 'VOLUME PENDENTE', value: `R$ ${requests.filter(r => r.status === 'Assinatura Ordenador').reduce((a, r) => a + (r.totalValue || 0), 0).toLocaleString('pt-BR')}`, icon: 'fa-sack-dollar', color: 'indigo', sub: 'EM ASSINATURA' },
           { label: 'AUTORIZADOS (MÊS)', value: requests.filter(r => r.status === 'Autorizado').length, icon: 'fa-check-double', color: 'emerald', sub: 'MINUTAS ASSINADAS' },
           { label: 'ORDENADORES', value: team.length, icon: 'fa-user-shield', color: 'slate', sub: 'GESTORES DESIGNADOS' }
         ] : [
           { label: isPersonalDesk ? 'MEU VOLUME' : 'VOLUME TOTAL', value: `R$ ${requests.reduce((acc, r) => acc + (r.totalValue || 0), 0).toLocaleString('pt-BR')}`, icon: 'fa-sack-dollar', color: 'emerald', sub: isPersonalDesk ? 'PROCESSOS NA MINHA MESA' : 'TODAS AS SOLICITAÇÕES' },
           { label: isPersonalDesk ? 'MINHA FILA' : 'INBOX (NOVAS)', value: requests.filter(r => r.status === 'Pendente').length, icon: 'fa-inbox', color: 'blue', sub: isPersonalDesk ? 'AGUARDANDO MINHA AÇÃO' : 'AGUARDANDO TRIAGEM' },
           { label: 'EM ANÁLISE', value: requests.filter(r => r.status === 'Em Analise').length, icon: 'fa-magnifying-glass-chart', color: 'indigo', sub: 'PROCESSAMENTO ATIVO' },
           !isPersonalDesk && { label: 'EQUIPE ATIVA', value: team.length, icon: 'fa-users-gear', color: 'slate', sub: 'GESTORES DESIGNADOS' }
         ].filter(Boolean) as any[]).map((stat, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-6 hover:shadow-xl transition-all group overflow-hidden relative">
              <div className={`w-16 h-16 rounded-3xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600 flex items-center justify-center text-3xl transition-transform group-hover:scale-110 duration-500`}>
                <i className={`fa-solid ${stat.icon}`}></i>
              </div>
              <div className="flex flex-col">
                 <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stat.label}</span>
                 <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">{stat.value}</span>
                 <span className="text-[9px] text-slate-300 dark:text-slate-700 font-bold uppercase tracking-tighter mt-1">{stat.sub}</span>
              </div>
              <div className={`absolute -right-4 -bottom-4 w-24 h-24 bg-${stat.color}-50/30 rounded-full blur-2xl group-hover:bg-${stat.color}-50/50 transition-colors`}></div>
           </div>
         ))}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* Central Dashboard - 8 Columns */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* Inbox de Solicitações */}
          <section className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
               <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-4">
                 <i className="fa-solid fa-rectangle-list text-emerald-500"></i>
                 Inbox de Solicitações
               </h3>
               <div className="flex gap-1.5 p-1.5 bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700">
                  {(isSefin ? [
                    { id: 'Inbox', label: 'AGUARDANDO ASSINATURA' },
                    { id: 'Concluidos', label: 'AUTORIZADOS' }
                  ] : [
                    { id: 'Inbox', label: 'INBOX' },
                    { id: 'Analise', label: 'EM ANÁLISE' },
                    { id: 'Concluidos', label: 'CONCLUÍDOS' }
                  ]).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setInboxTab(tab.id as any)}
                      className={`px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${
                        inboxTab === tab.id ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-lg' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
               </div>
            </div>

            {isSefin && (
              <div className="flex gap-2 flex-wrap">
                {['all', 'suprimento', 'diarias', 'reembolsos', 'ajsefin', 'sgp', 'coorc', 'sead', 'presidencia'].map(origin => (
                  <button
                    key={origin}
                    onClick={() => setOriginFilter(origin)}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                      originFilter === origin
                        ? 'bg-blue-700 text-white shadow-lg'
                        : 'bg-white border border-slate-100 text-slate-400 hover:text-blue-600'
                    }`}
                  >
                    {origin === 'all' ? 'TODAS ORIGENS' : origin.toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-4">
               {loading ? (
                 Array(3).fill(0).map((_, i) => <div key={i} className="h-28 bg-white rounded-[2rem] border border-slate-50 animate-pulse"></div>)
               ) : filteredRequests.length === 0 ? (
                 <div className="py-20 bg-white/50 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95">
                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 text-4xl">
                       <i className="fa-solid fa-check-double"></i>
                    </div>
                    <div>
                       <p className="font-black uppercase tracking-widest text-[10px] text-slate-400">Tudo limpo!</p>
                       <p className="text-slate-300 text-[10px] font-bold">Nenhum processo pendente nesta categoria.</p>
                    </div>
                 </div>
               ) : (
                 filteredRequests.map(req => (
                   <div 
                     key={req.id} 
                     onClick={() => onSelectRequest(req)}
                     className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-8 hover:shadow-2xl hover:border-emerald-100 dark:hover:border-emerald-900 transition-all cursor-pointer group animate-in slide-in-from-bottom-5 relative overflow-hidden"
                   >
                       <div className="flex items-center gap-6">
                        {isSefin && inboxTab === 'Inbox' && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(req.id)}
                            onChange={e => {
                              e.stopPropagation();
                              setSelectedIds(prev => {
                                const next = new Set(prev);
                                e.target.checked ? next.add(req.id) : next.delete(req.id);
                                return next;
                              });
                            }}
                            onClick={e => e.stopPropagation()}
                            className="w-5 h-5 rounded-lg accent-blue-600 cursor-pointer flex-shrink-0"
                          />
                        )}
                        <div className="w-20 h-20 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 transition-all group-hover:bg-emerald-50 group-hover:text-emerald-500 shadow-inner">
                            <i className={`fa-solid ${isSefin ? 'fa-file-contract' : 'fa-file-invoice'} text-3xl`}></i>
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase text-sm tracking-tight group-hover:text-emerald-600 transition-colors leading-tight">{req.title}</h4>
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">{new Date(req.createdAt).toLocaleDateString()}</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700"></span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest italic">{req.userProfile?.fullName || 'Servidor'}</span>
                              {isSefin && req.originModule && (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700"></span>
                                  <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-tight">Origem: {req.originModule.toUpperCase()}</span>
                                </>
                              )}
                              {req.assignedToName && (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700"></span>
                                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-tight">Atribuído a: {req.assignedToName}</span>
                                </>
                              )}
                            </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-10">
                         {inboxTab === 'Inbox' && !isPersonalDesk && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setShowAssignModal(req.id); }}
                            className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 dark:hover:bg-emerald-400 transition-all shadow-lg active:scale-95"
                          >
                            Atribuir
                          </button>
                        )}
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest leading-none mb-1 text-center">VALOR TOTAL</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">R$ {(req.totalValue || 0).toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 group-hover:bg-emerald-600 group-hover:text-white transition-all transform group-hover:rotate-45">
                            <i className="fa-solid fa-chevron-right"></i>
                        </div>
                      </div>
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${req.assignedToId ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                   </div>
                 ))
               )}
            </div>
          </section>

          {/* Modal de Atribuição */}
          {showAssignModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
               <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/5">
                  <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                     <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Atribuir Processo</h3>
                        <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">Selecione um analista da sua equipe</p>
                     </div>
                     <button onClick={() => setShowAssignModal(null)} className="w-10 h-10 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 transition-all">
                        <i className="fa-solid fa-xmark"></i>
                     </button>
                  </div>
                  <div className="p-4 max-h-[400px] overflow-y-auto">
                     {team.filter(m =>
                       isSefin
                         ? m.systemRole?.includes('SEFIN') || m.systemRole === 'ADMIN'
                         : m.systemRole?.includes('ANALISTA') || m.systemRole === 'ADMIN'
                     ).map((analyst) => (
                       <button 
                         key={analyst.id} 
                         onClick={() => handleAssign(showAssignModal, analyst)}
                         className="w-full p-4 hover:bg-emerald-50 rounded-2xl flex items-center gap-4 transition-all group"
                       >
                         <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-black text-lg text-slate-400 group-hover:border-emerald-200 group-hover:text-emerald-600">
                            {analyst.avatarUrl ? <img src={analyst.avatarUrl} className="w-full h-full object-cover" /> : analyst.fullName[0]}
                         </div>
                         <div className="text-left">
                            <p className="font-black text-slate-800 text-sm uppercase tracking-tight group-hover:text-emerald-700 transition-colors">{analyst.fullName}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{analyst.systemRole?.replace('_', ' ') || 'ANALISTA'}</p>
                         </div>
                         <i className="fa-solid fa-chevron-right ml-auto text-slate-200 group-hover:text-emerald-400 transition-all group-hover:translate-x-1"></i>
                       </button>
                     ))}
                  </div>
               </div>
            </div>
          )}

          {/* Equipe Gestora Section */}
          {!isPersonalDesk && (
            <section className="space-y-8">
               <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                    <i className="fa-solid fa-users-viewfinder text-blue-500"></i>
                    Equipe Gestora
                  </h3>
                  <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">{team.length} ATIVOS</span>
               </div>

               <div className="bg-white border border-slate-100 rounded-[3rem] p-4 flex flex-col md:flex-row items-center gap-4 shadow-sm">
                  <div className="flex-1 w-full bg-slate-50/50 rounded-2xl flex items-center px-6 py-4 gap-4 border border-slate-50 group focus-within:border-blue-200 focus-within:bg-white transition-all">
                     <i className="fa-solid fa-magnifying-glass text-slate-300 group-focus-within:text-blue-500"></i>
                     <input type="text" placeholder="Buscar membro da equipe..." className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-700 w-full placeholder:text-slate-300" />
                  </div>
                  <button className="w-full md:w-auto px-8 py-4 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-3">
                     <i className="fa-solid fa-user-plus"></i>
                     ADICIONAR GESTOR
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {team.map((member) => (
                    <div key={member.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-100 transition-all">
                       <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 border-2 border-white shadow-xl overflow-hidden relative">
                             {member.avatarUrl ? (
                               <img src={member.avatarUrl} className="w-full h-full object-cover" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-500 font-black text-xl italic">{member.fullName[0]}</div>
                             )}
                          </div>
                          <div>
                             <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-tight">{member.fullName}</h5>
                             <div className="flex items-center gap-3 mt-1">
                                <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 uppercase tracking-tighter">
                                   {member.systemRole?.replace('_', ' ') || 'EQUIPE'}
                                </span>
                                <div className="flex items-center gap-1.5 border-l border-slate-100 pl-3">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
                                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.1em]">ONLINE</span>
                                </div>
                             </div>
                          </div>
                       </div>
                       <button className="w-10 h-10 rounded-xl hover:bg-blue-50 text-slate-200 hover:text-blue-500 transition-all"><i className="fa-solid fa-ellipsis-vertical"></i></button>
                    </div>
                  ))}
               </div>
            </section>
          )}

        </div>

        {/* Right Sidebar - 4 Columns */}
        <div className="lg:col-span-4 space-y-10 sticky top-8">
           
           {isSefin ? (
             <>
               {/* SEFIN Analytics Widget */}
               <div className="bg-[#0f172a] rounded-[3rem] p-10 text-white relative overflow-hidden border border-white/5 shadow-2xl">
                  <div className="relative z-10 space-y-8">
                     <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)] animate-pulse"></div>
                        <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Painel SEFIN — Métricas</h4>
                     </div>
                     <div className="space-y-6">
                        <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                          <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">Volume em Assinatura</p>
                          <p className="text-2xl font-black text-white">
                            R$ {requests.filter(r => r.status === 'Assinatura Ordenador').reduce((a, r) => a + (r.totalValue || 0), 0).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div className="space-y-3">
                          <p className="text-[9px] text-slate-400 uppercase tracking-widest">Por Módulo de Origem</p>
                          {['suprimento', 'diarias', 'reembolsos', 'ajsefin', 'sgp', 'coorc', 'sead'].map(origin => {
                            const count = requests.filter(r => r.originModule === origin && r.status === 'Assinatura Ordenador').length;
                            return count > 0 ? (
                              <div key={origin} className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">{origin.toUpperCase()}</span>
                                <span className="text-[10px] font-black text-white bg-blue-600 px-3 py-1 rounded-lg">{count}</span>
                              </div>
                            ) : null;
                          })}
                          {requests.filter(r => r.status === 'Assinatura Ordenador' && !r.originModule).length > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">SEM ORIGEM</span>
                              <span className="text-[10px] font-black text-white bg-slate-600 px-3 py-1 rounded-lg">
                                {requests.filter(r => r.status === 'Assinatura Ordenador' && !r.originModule).length}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                          <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">Volume Autorizado (Mês)</p>
                          <p className="text-2xl font-black text-emerald-400">
                            R$ {requests.filter(r => r.status === 'Autorizado').reduce((a, r) => a + (r.totalValue || 0), 0).toLocaleString('pt-BR')}
                          </p>
                        </div>
                     </div>
                  </div>
                  <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px]"></div>
               </div>

               {/* Ações Rápidas SEFIN */}
               <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações Rápidas</h4>
                  </div>
                  <div className="space-y-4">
                     {[
                       { label: 'Relatório de Autorizações', icon: 'fa-file-invoice-dollar' },
                       !isPersonalDesk && { label: 'Notificar Analistas', icon: 'fa-bell' }
                     ].filter(Boolean).map((action, i) => (
                       <button key={i} className="w-full bg-white p-10 rounded-[2.5rem] border border-slate-100 flex items-center gap-6 group hover:border-blue-200 transition-all shadow-sm hover:shadow-xl hover:scale-[1.02]">
                          <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500 flex items-center justify-center text-3xl shadow-inner transition-colors">
                             <i className={`fa-solid ${action.icon}`}></i>
                          </div>
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest group-hover:text-slate-900 transition-colors">{action.label}</span>
                       </button>
                     ))}
                  </div>
               </div>
             </>
           ) : (
             <>
               {/* IA Widget - Otimização de Fluxo */}
               <div className="bg-[#0f172a] rounded-[3rem] p-10 text-white relative overflow-hidden group border border-white/5 shadow-2xl">
                  <div className="relative z-10 space-y-8">
                     <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)] animate-pulse"></div>
                        <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Otimização de Fluxo</h4>
                     </div>
                     <div className="space-y-4">
                        <p className="text-[11px] font-medium text-slate-300 leading-relaxed italic">
                           A IA detectou que a aba <span className="text-white font-black underline decoration-blue-500">Em Análise</span> possui 2 processos com score de conformidade <span className="text-emerald-400 font-black">&gt; 95%</span>. Sugerimos aprovação em lote para agilizar o fluxo de ressarcimento.
                        </p>
                        <button className="w-full py-5 bg-white/5 backdrop-blur-md rounded-2xl flex items-center justify-center gap-4 group hover:bg-blue-600 transition-all border border-white/10 shadow-lg">
                           <i className="fa-solid fa-wand-magic-sparkles text-blue-400 group-hover:text-white transition-colors"></i>
                           <span className="text-[9px] font-black uppercase tracking-widest">VER RECOMENDAÇÕES</span>
                        </button>
                     </div>
                  </div>
                  <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px]"></div>
                  <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-600/5 rounded-full blur-[60px]"></div>
               </div>

               {/* Ações Rápidas */}
               <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações Rápidas</h4>
                  </div>
                  <div className="space-y-4">
                     {[
                       { label: 'Relatório Mensal', icon: 'fa-file-invoice-dollar' },
                       !isPersonalDesk && { label: 'Notificar Todos', icon: 'fa-bell' }
                     ].filter(Boolean).map((action, i) => (
                       <button key={i} className="w-full bg-white p-10 rounded-[2.5rem] border border-slate-100 flex items-center gap-6 group hover:border-emerald-200 transition-all shadow-sm hover:shadow-xl hover:scale-[1.02]">
                          <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 text-slate-300 group-hover:bg-emerald-50 group-hover:text-emerald-500 flex items-center justify-center text-3xl shadow-inner transition-colors">
                             <i className={`fa-solid ${action.icon}`}></i>
                          </div>
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest group-hover:text-slate-900 transition-colors">{action.label}</span>
                       </button>
                     ))}
                  </div>
               </div>
             </>
           )}

        </div>
      </div>
      {/* SEFIN Batch Sign Floating Bar */}
      {isSefin && selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-blue-700 text-white px-10 py-5 rounded-[2rem] shadow-2xl flex items-center gap-8 animate-in slide-in-from-bottom-5 border border-blue-600">
          <span className="text-[11px] font-black uppercase tracking-widest">{selectedIds.size} MINUTAS SELECIONADAS</span>
          <button
            onClick={() => setShowBatchModal(true)}
            className="bg-white text-blue-700 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all"
          >
            <i className="fa-solid fa-signature mr-2"></i> ASSINAR EM LOTE
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-blue-200 hover:text-white transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* SEFIN Batch Sign Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-12 space-y-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl"><i className="fa-solid fa-vault"></i></div>
              <div>
                <h3 className="text-3xl font-black uppercase text-slate-900 tracking-tight">Assinatura em Lote</h3>
                <p className="text-sm text-slate-400 font-bold">{selectedIds.size} minutas serão autorizadas</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 text-sm text-blue-700 font-medium italic">
                "Autorizo a execução das despesas selecionadas, conforme análise técnica de conformidade realizada pelas unidades competentes."
              </div>
              <input
                type="password"
                value={batchPassword}
                onChange={e => setBatchPassword(e.target.value)}
                autoFocus
                className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none font-black text-slate-900 text-xl tracking-[0.2em] focus:border-blue-500/20"
                placeholder="••••••••"
              />
            </div>
            <div className="flex gap-4">
              <button onClick={() => { setShowBatchModal(false); setBatchPassword(''); }} className="flex-1 py-6 bg-slate-50 text-slate-400 font-black uppercase tracking-widest rounded-2xl">Cancelar</button>
              <button onClick={handleBatchSign} disabled={batchSigning || !batchPassword} className="flex-[2] py-6 bg-blue-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-blue-600 transition-all disabled:opacity-40">
                {batchSigning ? <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> : null}Confirmar Autorização em Lote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagementDashboard;
