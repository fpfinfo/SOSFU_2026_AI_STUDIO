
import React, { useState, useEffect } from 'react';
import { AppModule, Profile, RequestItem } from '../types';
import { getRequests, getAllProfiles } from '../services/dataService';
import VeoBanner from './VeoBanner';

interface SgpWorkstationProps {
  module: AppModule;
  onSelectRequest: (request: RequestItem) => void;
  profile?: Profile | null;
  activeView: 'inicio' | 'processos' | 'autorizados' | 'config';
}

const SgpWorkstation: React.FC<SgpWorkstationProps> = ({
  module,
  onSelectRequest,
  profile: currentProfile = null,
  activeView = 'processos'
}) => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allRequests, allProfiles] = await Promise.all([
        getRequests(),
        getAllProfiles()
      ]);

      // Processos que envolvem a SGP
      const sgpRequests = (allRequests || []).filter(req =>
        req.originModule === 'sgp' || req.originModule === 'diarias'
      );
      setRequests(sgpRequests);

      // Equipe SGP
      const sgpTeam = (allProfiles || []).filter(p =>
        p.systemRole?.toUpperCase() === 'SGP' || p.systemRole?.toUpperCase() === 'GESTOR_SGP'
      );
      setTeamMembers(sgpTeam);
    } catch (err) {
      console.error("Erro ao carregar SGP:", err);
    } finally {
      setLoading(false);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'Pendente' || r.status === 'Em Analise');
  const completedRequests = requests.filter(r => r.status === 'Autorizado' || r.status === 'Concluída');

  // ===== RENDER: INÍCIO (HOME) =====
  if (activeView === 'inicio') {
    return (
      <div className="p-6 md:p-10 space-y-10 animate-in fade-in duration-700 min-h-screen">
        {/* Hero Section */}
        <div className="bg-linear-to-br from-sky-950 via-slate-900 to-cyan-950 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)] animate-pulse"></div>
              <span className="text-[10px] font-black text-sky-300 uppercase tracking-[0.3em]">Secretaria de Gestão de Pessoas</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter leading-none mb-2">
              SEGEP <span className="text-sky-400 italic">Central</span>
            </h1>
            <p className="text-slate-400 font-medium text-lg max-w-2xl">
              Gestão de servidores, autorizações administrativas e controle de deslocamentos institucionais do Tribunal.
            </p>
          </div>
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-sky-600/10 rounded-full blur-[100px]"></div>
          <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-cyan-500/10 rounded-full blur-[80px]"></div>
        </div>

        {/* TJPA DIGITAL HUB */}
        <div className="animate-in slide-in-from-bottom-5 duration-700 delay-100">
          <VeoBanner />
        </div>

        {/* ÁGIL AI INSIGHT — Inteligência SEGEP */}
        <div className="bg-[#081a28] rounded-[3rem] p-10 md:p-12 text-white shadow-2xl relative overflow-hidden group animate-in slide-in-from-bottom-5 duration-700 delay-200">
          {/* Background effects */}
          <div className="absolute inset-0 bg-linear-to-br from-sky-900/30 via-transparent to-cyan-900/20"></div>
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-sky-500/8 rounded-full blur-[120px] group-hover:bg-sky-500/12 transition-all duration-1000"></div>
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-500/8 rounded-full blur-[100px] group-hover:bg-cyan-500/12 transition-all duration-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-600/3 rounded-full blur-[150px]"></div>
          
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-3">
              <span className="bg-linear-to-r from-sky-600 to-cyan-600 text-white px-5 py-2 rounded-full text-[10px] font-black tracking-[0.2em] uppercase shadow-lg shadow-sky-500/25 border border-sky-400/20">
                <i className="fa-solid fa-brain mr-2"></i>ÁGIL AI INSIGHT
              </span>
              <span className="flex h-2.5 w-2.5 rounded-full bg-sky-400 animate-pulse shadow-[0_0_12px_rgba(56,189,248,0.6)]"></span>
            </div>
            <h3 className="text-2xl md:text-3xl font-black tracking-tight leading-tight text-white/95">
              {pendingRequests.length === 0 
                ? <>Todos os processos processados. A gestão de pessoas está <span className="text-transparent bg-clip-text bg-linear-to-r from-sky-300 to-cyan-400">Em Dia</span>.</>
                : <>Existem <span className="text-transparent bg-clip-text bg-linear-to-r from-sky-300 to-sky-500">{pendingRequests.length} processos</span> pendentes de análise.</>
              }
            </h3>
            <p className="text-sky-200/50 text-sm font-medium leading-relaxed max-w-xl">
              {pendingRequests.length === 0 
                ? 'Todas as autorizações administrativas e deslocamentos foram processados pela SEGEP.'
                : 'Processos de autorização de deslocamento e gestão de servidores aguardam análise da SEGEP.'
              }
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 relative z-10">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-sky-500/20 transition-all group/kpi">
              <p className="text-[8px] font-black text-sky-300/60 uppercase tracking-[0.2em] mb-2">Processos Ativos</p>
              <p className="text-2xl font-black text-white italic group-hover/kpi:text-sky-200 transition-colors">{requests.length}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-sky-500/20 transition-all group/kpi">
              <p className="text-[8px] font-black text-sky-300/60 uppercase tracking-[0.2em] mb-2">Autorizações Pendentes</p>
              <p className="text-2xl font-black text-sky-400 italic group-hover/kpi:text-sky-300 transition-colors">{pendingRequests.length}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-cyan-500/20 transition-all group/kpi">
              <p className="text-[8px] font-black text-sky-300/60 uppercase tracking-[0.2em] mb-2">Concluídos (Mês)</p>
              <p className="text-2xl font-black text-cyan-400 italic group-hover/kpi:text-cyan-300 transition-colors">{completedRequests.length}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-sky-500/20 transition-all group/kpi">
              <p className="text-[8px] font-black text-sky-300/60 uppercase tracking-[0.2em] mb-2">Tempo Médio</p>
              <p className="text-2xl font-black text-sky-300 italic group-hover/kpi:text-sky-200 transition-colors">1.8 dias</p>
            </div>
          </div>

          <div className="absolute top-1/2 right-8 -translate-y-1/2 opacity-[0.03] pointer-events-none">
            <i className="fa-solid fa-users-gear text-[18rem] text-sky-300"></i>
          </div>
        </div>

        {/* Equipe SEGEP */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <i className="fa-solid fa-users-gear text-sky-600 text-xl"></i>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Equipe SEGEP</h2>
            <span className="px-3 py-1 bg-sky-50 text-sky-600 rounded-full text-[9px] font-black uppercase tracking-[0.2em] ml-2">{teamMembers.length} MEMBROS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {teamMembers.length > 0 ? teamMembers.slice(0, 2).map((member, idx) => (
              <div key={member.id} className="group relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500">
                <div className={`h-28 rounded-t-3xl ${idx === 0 ? 'bg-linear-to-r from-sky-700 via-sky-600 to-cyan-600' : 'bg-linear-to-r from-slate-800 via-slate-700 to-sky-900'} relative`}>
                  <div className="absolute inset-0 rounded-t-3xl bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')] opacity-50"></div>
                  <div className="absolute right-6 top-4">
                    <span className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-xl text-[8px] font-black text-white/80 uppercase tracking-[0.2em] border border-white/10">
                      {idx === 0 ? 'SECRETÁRIO SGP' : 'SECRETÁRIO ADJUNTO'}
                    </span>
                  </div>
                </div>
                <div className="relative px-8 -mt-12 z-10">
                  <div className="flex items-end gap-5">
                    <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-2xl overflow-hidden bg-white shrink-0">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} className="w-full h-full object-cover" alt={member.fullName} />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${idx === 0 ? 'bg-sky-50 text-sky-600' : 'bg-slate-50 text-slate-600'} text-3xl font-black`}>
                          {member.fullName?.[0] || 'S'}
                        </div>
                      )}
                    </div>
                    <div className="pb-1 min-w-0">
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-tight truncate">{member.fullName}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        <i className="fa-solid fa-id-badge mr-1.5"></i>
                        {member.systemRole?.replace('_', ' ') || 'GESTÃO DE PESSOAS'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="px-8 py-6 flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Ativo</span>
                  </div>
                  {member.unit && (
                    <div className="pl-3 border-l border-slate-100">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        <i className="fa-solid fa-building mr-1.5"></i>{member.unit}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )) : (
              [0, 1].map(i => (
                <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-24 h-24 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-200 text-5xl">
                    <i className="fa-solid fa-user-gear"></i>
                  </div>
                  <div>
                    <p className="font-black text-slate-400 uppercase text-sm tracking-tight">Membro da SEGEP {i + 1}</p>
                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Aguardando designação</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'PROCESSOS PENDENTES', value: pendingRequests.length, icon: 'fa-clipboard-list', color: 'sky', sub: 'AGUARDANDO ANÁLISE' },
            { label: 'SERVIDORES CADASTRADOS', value: teamMembers.length, icon: 'fa-users', color: 'cyan', sub: 'EQUIPE SGP' },
            { label: 'CONCLUÍDOS (MÊS)', value: completedRequests.length, icon: 'fa-check-double', color: 'emerald', sub: 'PROCESSOS FINALIZADOS' },
            { label: 'VOLUME FINANCEIRO', value: `R$ ${requests.reduce((a, r) => a + (r.totalValue || 0), 0).toLocaleString('pt-BR')}`, icon: 'fa-sack-dollar', color: 'indigo', sub: 'TOTAL GERAL' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6 hover:shadow-xl transition-all group overflow-hidden relative">
              <div className={`w-16 h-16 rounded-3xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center text-3xl transition-transform group-hover:scale-110 duration-500`}>
                <i className={`fa-solid ${stat.icon}`}></i>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                <span className="text-2xl font-black text-slate-900 tracking-tighter">{stat.value}</span>
                <span className="text-[9px] text-slate-300 font-bold uppercase tracking-tighter mt-1">{stat.sub}</span>
              </div>
              <div className={`absolute -right-4 -bottom-4 w-24 h-24 bg-${stat.color}-50/30 rounded-full blur-2xl group-hover:bg-${stat.color}-50/50 transition-colors`}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ===== RENDER: PROCESSOS (DEFAULT) =====
  return (
    <div className="p-6 md:p-10 space-y-10 animate-in fade-in duration-700 min-h-screen">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-3xl bg-sky-600 text-white flex items-center justify-center text-3xl shadow-xl shadow-sky-100">
          <i className="fa-solid fa-users-gear"></i>
        </div>
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">SEGEP — Processos</h2>
          <p className="text-slate-400 font-medium">Gestão de servidores e autorizações administrativas.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-20 text-center space-y-4">
          <i className="fa-solid fa-inbox text-6xl text-slate-200"></i>
          <p className="text-slate-400 font-bold text-lg">Nenhum processo encontrado</p>
          <p className="text-slate-300 text-sm">Quando houver processos de gestão de pessoas, eles aparecerão aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map(req => (
            <div key={req.id} onClick={() => onSelectRequest(req)} className="bg-white rounded-3xl border border-slate-100 p-8 hover:shadow-xl hover:border-sky-100 transition-all cursor-pointer group">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-file-lines"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-slate-900 truncate">{req.purpose || 'Processo SGP'}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{req.nup || req.id.slice(0, 8)}</p>
                </div>
                <div className="text-right">
                  <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    req.status === 'Pendente' ? 'bg-amber-50 text-amber-600' :
                    req.status === 'Em Analise' ? 'bg-sky-50 text-sky-600' :
                    req.status === 'Autorizado' ? 'bg-emerald-50 text-emerald-600' :
                    'bg-slate-50 text-slate-600'
                  }`}>{req.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SgpWorkstation;
