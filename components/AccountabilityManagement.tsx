
import React, { useState, useEffect } from 'react';
import { AccountabilityReport, Profile } from '../types';
import { getAccountabilityReports, updateAccountabilityStatus, getAllProfiles } from '../services/dataService';

const AccountabilityManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<AccountabilityReport[]>([]);
  const [team, setTeam] = useState<Profile[]>([]);
  const [selectedReport, setSelectedReport] = useState<AccountabilityReport | null>(null);
  const [filter, setFilter] = useState<'Todos' | 'Pendente' | 'Aprovado' | 'Rejeitado' | 'Em Ajuste'>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reportsData, allProfiles] = await Promise.all([
        getAccountabilityReports(),
        getAllProfiles()
      ]);
      setReports(reportsData);
      
      // Filtrar equipe gestora (ADMIN ou papéis de auditoria se existissem)
      const auditTeam = allProfiles.filter(p => p.systemRole === 'ADMIN' || p.systemRole === 'SOSFU');
      setTeam(auditTeam);
    } catch (err) {
      console.error("Erro ao carregar dados de prestação de contas:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: AccountabilityReport['status']) => {
    if (!selectedReport) return;
    setSaving(true);
    try {
      await updateAccountabilityStatus(selectedReport.id, status, reviewNote);
      await fetchData();
      setSelectedReport(null);
      setReviewNote('');
    } catch (err) {
      alert("Erro ao atualizar status contábil.");
    } finally {
      setSaving(false);
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesFilter = filter === 'Todos' || r.status === filter;
    const matchesSearch = r.requestTitle.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.userProfile?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aprovado': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Rejeitado': return 'bg-red-50 text-red-600 border-red-100';
      case 'Em Ajuste': return 'bg-orange-50 text-orange-600 border-orange-100';
      default: return 'bg-blue-50 text-blue-600 border-blue-100';
    }
  };

  const stats = [
    { label: 'Em Auditoria', value: `R$ ${reports.filter(r => r.status === 'Pendente').reduce((acc, r) => acc + r.totalSpent, 0).toLocaleString('pt-BR')}`, icon: 'fa-scale-balanced', color: 'slate' },
    { label: 'Pendentes', value: reports.filter(r => r.status === 'Pendente').length, icon: 'fa-clock-rotate-left', color: 'blue' },
    { label: 'Em Ajuste', value: reports.filter(r => r.status === 'Em Ajuste').length, icon: 'fa-pen-ruler', color: 'orange' },
    { label: 'Auditores', value: team.length, icon: 'fa-user-tie', color: 'emerald' },
  ];

  return (
    <div className="p-6 md:p-10 space-y-10 animate-in fade-in duration-700">
      {/* Header Dinâmico */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center text-2xl shadow-lg">
                <i className="fa-solid fa-calculator"></i>
             </div>
             <h2 className="text-3xl font-black text-slate-900 tracking-tight italic text-blue-900">Inbox: Prestação de Contas</h2>
          </div>
          <p className="text-slate-400 font-medium ml-1">Análise técnica de liquidação de despesas e conformidade contábil.</p>
        </div>
        <div className="flex gap-3">
           <button onClick={fetchData} className="w-12 h-12 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 transition-all flex items-center justify-center shadow-sm">
              <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i>
           </button>
           <button className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-3">
              <i className="fa-solid fa-file-export"></i> Fechamento Mensal
           </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5 group hover:border-blue-200 transition-all">
            <div className={`w-12 h-12 rounded-2xl bg-slate-50 text-${stat.color}-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform shadow-inner`}>
              <i className={`fa-solid ${stat.icon}`}></i>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
              <p className="text-xl font-black text-slate-800 tracking-tighter">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Coluna Principal: Inbox + Equipe */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* Inbox de Solicitações (Prestações) */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-3">
                  <i className="fa-solid fa-inbox text-blue-500"></i>
                  Inbox de Auditoria
                </h3>
                <div className="bg-slate-100/50 p-1.5 rounded-2xl flex flex-wrap gap-1">
                  {['Todos', 'Pendente', 'Em Ajuste', 'Aprovado', 'Rejeitado'].map(f => (
                    <button 
                      key={f}
                      onClick={() => setFilter(f as any)}
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
            </div>

            <div className="space-y-4">
                <div className="relative group">
                    <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-slate-300"></i>
                    <input 
                      type="text" 
                      placeholder="Pesquisar por processo ou nome do servidor..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-700 text-xs shadow-sm"
                    />
                </div>

                {loading ? (
                  Array(3).fill(0).map((_, i) => <div key={i} className="h-32 bg-white rounded-[2.5rem] border border-slate-50 animate-pulse"></div>)
                ) : filteredReports.length === 0 ? (
                  <div className="py-20 bg-white rounded-[2.5rem] border border-slate-50 flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                    <i className="fa-solid fa-folder-open text-6xl"></i>
                    <p className="font-black uppercase tracking-widest text-xs italic">Nenhuma prestação encontrada.</p>
                  </div>
                ) : (
                  filteredReports.map(report => (
                    <div 
                      key={report.id} 
                      onClick={() => setSelectedReport(report)}
                      className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-[1.5rem] bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors shadow-inner relative">
                            <i className="fa-solid fa-file-invoice-dollar text-xl"></i>
                            {report.aiAnalysis && (
                              <span className={`absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-[8px] font-black text-white shadow-lg border-2 border-white ${report.aiAnalysis.score > 80 ? 'bg-emerald-500' : 'bg-orange-500'}`}>
                                {report.aiAnalysis.score}%
                              </span>
                            )}
                        </div>
                        <div>
                            <h4 className="font-black text-slate-800 uppercase text-xs tracking-tight group-hover:text-blue-700 transition-colors">{report.requestTitle}</h4>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">{new Date(report.submittedAt).toLocaleDateString()}</span>
                              <span className="text-slate-200">•</span>
                              <span className="text-[10px] text-slate-400 font-black uppercase">{report.userProfile?.fullName}</span>
                            </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-8 border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-50">
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Valor Liquidado</p>
                            <p className="text-lg font-black text-slate-900 tracking-tighter">R$ {report.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className={`px-4 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${getStatusBadge(report.status)}`}>
                            {report.status}
                        </div>
                        <button className="w-10 h-10 rounded-xl bg-slate-50 text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all flex items-center justify-center">
                            <i className="fa-solid fa-chevron-right text-xs"></i>
                        </button>
                      </div>
                    </div>
                  ))
                )}
            </div>
          </div>

          {/* Gerenciar Equipes Contábeis */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-3">
                  <i className="fa-solid fa-shield-halved text-emerald-500"></i>
                  Auditores e Gestores
                </h3>
                <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full uppercase tracking-widest">{team.length} Integrantes</span>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                  <div className="relative max-w-xs w-full">
                      <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                      <input type="text" placeholder="Buscar auditor..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-emerald-100 transition-all" />
                  </div>
                  <button className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-white border border-emerald-100 px-4 py-2 rounded-xl hover:bg-emerald-50 transition-all shadow-sm">
                    <i className="fa-solid fa-user-shield mr-2"></i> Adicionar Auditor
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-50">
                  {team.length === 0 ? (
                    <div className="col-span-full p-10 text-center text-slate-300 italic text-[10px] font-bold uppercase">Nenhum gestor de auditoria.</div>
                  ) : (
                    team.map(member => (
                      <div key={member.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-black shrink-0 overflow-hidden shadow-inner">
                              {member.avatarUrl ? <img src={member.avatarUrl} className="w-full h-full object-cover" /> : member.fullName?.[0] || 'A'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black text-slate-800 uppercase truncate leading-none mb-1">{member.fullName}</p>
                              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Auditor Sênior</p>
                            </div>
                        </div>
                        <button className="text-slate-300 hover:text-blue-600 transition-colors">
                            <i className="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                      </div>
                    ))
                  )}
                </div>
            </div>
          </div>
        </div>

        {/* Coluna Lateral: Insights Contábeis */}
        <div className="lg:col-span-4 space-y-10">
           {/* AI Insight Contábil */}
           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group border border-white/5 shadow-2xl">
              <div className="relative z-10 space-y-4">
                 <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">IA Audit: Compliance</h4>
                 </div>
                 <p className="text-xs font-medium text-slate-400 leading-relaxed">
                   Detectamos um padrão de <span className="text-white font-black">notas fiscais duplicadas</span> em 3 prestações de contas de deslocamento para a comarca de Altamira. Recomenda-se auditoria manual rigorosa.
                 </p>
                 <button className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all backdrop-blur-md border border-white/10 flex items-center justify-center gap-3">
                    <i className="fa-solid fa-magnifying-glass-chart text-emerald-400"></i>
                    Ver Alertas de Risco
                 </button>
              </div>
              <i className="fa-solid fa-calculator absolute -bottom-10 -right-10 text-white/[0.03] text-[12rem] rotate-12 group-hover:rotate-0 transition-transform duration-1000"></i>
           </div>

           {/* Atalhos de Auditoria */}
           <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ferramentas de Auditoria</h4>
              <div className="grid grid-cols-1 gap-3">
                 <button className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 transition-all text-slate-600 hover:text-blue-700 group border border-transparent hover:border-blue-100">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                       <i className="fa-solid fa-book-bookmark"></i>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Manual de Liquidação</span>
                 </button>
                 <button className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50 transition-all text-slate-600 hover:text-emerald-700 group border border-transparent hover:border-emerald-100">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                       <i className="fa-solid fa-file-invoice"></i>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Modelos de Glosa</span>
                 </button>
                 <button className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-purple-50 transition-all text-slate-600 hover:text-purple-700 group border border-transparent hover:border-purple-100">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                       <i className="fa-solid fa-chart-pie"></i>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Balanço por Comarca</span>
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* Modal de Auditoria Detalhada (Mantido mas com estilo atualizado) */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-[3.5rem] shadow-[0_0_100px_rgba(0,0,0,0.3)] p-10 md:p-16 space-y-12 animate-in zoom-in-95 relative my-auto border border-white/20">
             <button 
               onClick={() => { setSelectedReport(null); setReviewNote(''); fetchData(); }} 
               className="absolute top-10 right-10 w-14 h-14 rounded-full bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center shadow-sm"
             >
                <i className="fa-solid fa-xmark text-2xl"></i>
             </button>

             <div className="flex flex-col md:flex-row gap-10 items-start">
                <div className="w-24 h-24 rounded-[2rem] bg-slate-900 text-emerald-400 flex items-center justify-center text-4xl shadow-2xl shrink-0 rotate-3">
                   <i className="fa-solid fa-stamp"></i>
                </div>
                <div className="space-y-3">
                   <div className="flex items-center gap-3">
                      <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black tracking-[0.2em] uppercase">Auditoria Fiscal</span>
                      <span className="text-slate-300 text-xs font-bold">PROCESSO #{selectedReport.id.slice(0,8)}</span>
                   </div>
                   <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-none uppercase italic">{selectedReport.requestTitle}</h3>
                   <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                           <i className="fa-solid fa-user text-[10px] text-slate-400"></i>
                        </div>
                        <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">{selectedReport.userProfile?.fullName}</span>
                      </div>
                      <span className="text-slate-200 text-lg">•</span>
                      <div className="flex items-center gap-2">
                        <i className="fa-regular fa-calendar text-slate-300"></i>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Enviado em {new Date(selectedReport.submittedAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-7 space-y-10">
                   <section className="space-y-6">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                         <i className="fa-solid fa-receipt text-emerald-500"></i> Documentação Comprobatória
                      </h4>
                      <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-inner">
                         <table className="w-full text-left text-sm">
                            <thead>
                               <tr className="bg-slate-200/50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                  <th className="px-8 py-5">Descrição da Despesa</th>
                                  <th className="px-8 py-5 text-right">Valor Auditado</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                               {selectedReport.items.map((item, idx) => (
                                 <tr key={idx} className="hover:bg-white transition-colors">
                                    <td className="px-8 py-5 font-bold text-slate-700">{item.desc}</td>
                                    <td className="px-8 py-5 text-right font-black text-slate-900">R$ {item.val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                 </tr>
                               ))}
                            </tbody>
                         </table>
                         <div className="px-8 py-8 bg-slate-900 text-white flex justify-between items-center">
                            <div className="space-y-1">
                               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/70">Liquidação Final</span>
                               <p className="text-xs text-slate-400 font-medium">Soma dos comprovantes válidos</p>
                            </div>
                            <span className="text-3xl font-black tracking-tighter text-emerald-400">R$ {selectedReport.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                         </div>
                      </div>
                   </section>

                   <section className="space-y-6">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                         <i className="fa-solid fa-pen-nib text-blue-500"></i> Parecer Contábil
                      </h4>
                      <textarea 
                        value={reviewNote}
                        onChange={e => setReviewNote(e.target.value)}
                        placeholder="Insira as notas técnicas de auditoria, motivos de glosa ou orientações para ajuste..."
                        className="w-full p-8 bg-slate-50 border-none rounded-[2rem] focus:ring-4 focus:ring-blue-50 outline-none text-sm font-medium text-slate-700 resize-none h-40 shadow-inner placeholder:text-slate-300"
                      />
                   </section>
                </div>

                <div className="lg:col-span-5 space-y-10">
                   <section className="bg-emerald-950 rounded-[3rem] p-10 text-white space-y-8 relative overflow-hidden border border-emerald-400/20 shadow-2xl">
                      <div className="relative z-10 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <i className="fa-solid fa-wand-magic-sparkles text-emerald-400"></i>
                            <h4 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">Análise de Risco AI</h4>
                         </div>
                         <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center font-black text-sm shadow-lg shadow-emerald-900/40">
                            {selectedReport.aiAnalysis?.score}%
                         </div>
                      </div>
                      <p className="relative z-10 text-base font-medium leading-relaxed text-emerald-100/70 italic">
                         "{selectedReport.aiAnalysis?.summary || "Realizando auditoria cruzada com base nas normativas do tribunal..."}"
                      </p>
                      {selectedReport.aiAnalysis?.flags && selectedReport.aiAnalysis.flags.length > 0 && (
                        <div className="relative z-10 flex flex-wrap gap-3">
                           {selectedReport.aiAnalysis.flags.map(f => (
                             <span key={f} className="bg-red-500/20 text-red-400 px-4 py-2 rounded-xl text-[9px] font-black uppercase border border-red-500/30 flex items-center gap-2">
                                <i className="fa-solid fa-triangle-exclamation"></i> {f}
                             </span>
                           ))}
                        </div>
                      )}
                      <i className="fa-solid fa-sparkles absolute -bottom-10 -right-10 text-white/5 text-[15rem] rotate-12"></i>
                   </section>

                   <div className="grid grid-cols-1 gap-4">
                      <button 
                        onClick={() => handleUpdateStatus('Aprovado')} 
                        disabled={saving}
                        className="w-full py-6 bg-emerald-600 text-white font-black uppercase tracking-[0.2em] rounded-[1.5rem] shadow-xl shadow-emerald-100/50 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-4 text-xs"
                      >
                         {saving ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-check-double"></i>}
                         Aprovar & Liquidar
                      </button>
                      <div className="grid grid-cols-2 gap-4">
                         <button 
                           onClick={() => handleUpdateStatus('Em Ajuste')} 
                           disabled={saving}
                           className="py-5 bg-white border-2 border-orange-100 text-orange-600 font-black uppercase tracking-widest rounded-[1.5rem] hover:bg-orange-50 active:scale-95 transition-all flex items-center justify-center gap-2 text-[10px]"
                         >
                            <i className="fa-solid fa-rotate-left"></i> Ajustes
                         </button>
                         <button 
                           onClick={() => handleUpdateStatus('Rejeitado')} 
                           disabled={saving}
                           className="py-5 bg-red-50 text-red-600 font-black uppercase tracking-widest rounded-[1.5rem] hover:bg-red-600 hover:text-white active:scale-95 transition-all flex items-center justify-center gap-2 text-[10px]"
                         >
                            <i className="fa-solid fa-ban"></i> Rejeitar
                         </button>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountabilityManagement;
