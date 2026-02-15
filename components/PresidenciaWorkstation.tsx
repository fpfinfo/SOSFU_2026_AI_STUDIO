
import React, { useState, useEffect } from 'react';
import { AppModule, Profile, RequestItem } from '../types';
import { getRequests, getAllProfiles } from '../services/dataService';
import VeoBanner from './VeoBanner';

interface PresidenciaWorkstationProps {
  module: AppModule;
  onSelectRequest: (request: RequestItem) => void;
  profile?: Profile | null;
  activeView: 'inicio' | 'despachos' | 'autorizados' | 'config';
}

const PresidenciaWorkstation: React.FC<PresidenciaWorkstationProps> = ({
  module,
  onSelectRequest,
  profile: currentProfile = null,
  activeView = 'despachos'
}) => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [gabineteTeam, setGabineteTeam] = useState<Profile[]>([]);

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

      // Processos que chegaram ao Gabinete da Presidência
      const presRequests = (allRequests || []).filter(req =>
        req.status === 'Autorizado' || req.status === 'Assinatura Ordenador' || req.status === 'Concluido'
      );
      setRequests(presRequests);

      // Equipe do Gabinete
      const presTeam = (allProfiles || []).filter(p =>
        p.systemRole?.toUpperCase() === 'PRESIDENCIA' || p.systemRole?.toUpperCase() === 'CHEFE_GABINETE'
      );
      setGabineteTeam(presTeam);
    } catch (err) {
      console.error("Erro ao carregar Presidência:", err);
    } finally {
      setLoading(false);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'Assinatura Ordenador' || r.status === 'Autorizado');
  const completedRequests = requests.filter(r => r.status === 'Concluido');
  const totalVolume = requests.reduce((a, r) => a + (r.totalValue || 0), 0);

  // ===== RENDER: INÍCIO (HOME) =====
  if (activeView === 'inicio') {
    return (
      <div className="p-6 md:p-10 space-y-10 animate-in fade-in duration-700 min-h-screen">
        {/* Hero Section */}
        <div className="bg-linear-to-br from-slate-950 via-slate-900 to-zinc-950 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)] animate-pulse"></div>
              <span className="text-[10px] font-black text-amber-300/80 uppercase tracking-[0.3em]">Tribunal de Justiça do Estado do Pará</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter leading-none mb-2">
              Gabinete da <span className="text-amber-400 italic">Presidência</span>
            </h1>
            <p className="text-slate-400 font-medium text-lg max-w-2xl">
              Painel de Gestão Estratégica — Despachos, autorizações e governança da Alta Administração do TJPA.
            </p>
          </div>
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-amber-600/10 rounded-full blur-[100px]"></div>
          <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-zinc-500/10 rounded-full blur-[80px]"></div>
        </div>

        {/* TJPA DIGITAL HUB */}
        <div className="animate-in slide-in-from-bottom-5 duration-700 delay-100">
          <VeoBanner />
        </div>

        {/* ÁGIL AI INSIGHT — Inteligência Estratégica Presidência */}
        <div className="bg-[#0f0f14] rounded-[3rem] p-10 md:p-12 text-white shadow-2xl relative overflow-hidden group animate-in slide-in-from-bottom-5 duration-700 delay-200">
          {/* Background effects */}
          <div className="absolute inset-0 bg-linear-to-br from-amber-900/15 via-transparent to-zinc-900/20"></div>
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-500/6 rounded-full blur-[120px] group-hover:bg-amber-500/10 transition-all duration-1000"></div>
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-slate-500/8 rounded-full blur-[100px] group-hover:bg-slate-500/12 transition-all duration-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-600/3 rounded-full blur-[150px]"></div>
          
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-3">
              <span className="bg-linear-to-r from-amber-600 to-yellow-600 text-white px-5 py-2 rounded-full text-[10px] font-black tracking-[0.2em] uppercase shadow-lg shadow-amber-500/25 border border-amber-400/20">
                <i className="fa-solid fa-brain mr-2"></i>ÁGIL AI INSIGHT
              </span>
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.6)]"></span>
            </div>
            <h3 className="text-2xl md:text-3xl font-black tracking-tight leading-tight text-white/95">
              {pendingRequests.length === 0 
                ? <>A pauta do Gabinete está <span className="text-transparent bg-clip-text bg-linear-to-r from-amber-300 to-yellow-400">Livre</span>. Sem despachos pendentes.</>
                : <><span className="text-transparent bg-clip-text bg-linear-to-r from-amber-300 to-amber-500">{pendingRequests.length} despachos</span> aguardam deliberação da Presidência.</>
              }
            </h3>
            <p className="text-amber-200/40 text-sm font-medium leading-relaxed max-w-xl">
              {pendingRequests.length === 0 
                ? 'Todos os processos foram deliberados. O gabinete está com a pauta em dia.'
                : 'Processos financeiros e administrativos que requerem a decisão final da Alta Administração.'
              }
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 relative z-10">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-amber-500/20 transition-all group/kpi">
              <p className="text-[8px] font-black text-amber-300/50 uppercase tracking-[0.2em] mb-2">Volume Estratégico</p>
              <p className="text-2xl font-black text-white italic group-hover/kpi:text-amber-200 transition-colors">R$ {totalVolume.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-amber-500/20 transition-all group/kpi">
              <p className="text-[8px] font-black text-amber-300/50 uppercase tracking-[0.2em] mb-2">Despachos Pendentes</p>
              <p className="text-2xl font-black text-amber-400 italic group-hover/kpi:text-amber-300 transition-colors">{pendingRequests.length}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-emerald-500/20 transition-all group/kpi">
              <p className="text-[8px] font-black text-amber-300/50 uppercase tracking-[0.2em] mb-2">Deliberados (Mês)</p>
              <p className="text-2xl font-black text-emerald-400 italic group-hover/kpi:text-emerald-300 transition-colors">{completedRequests.length}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-amber-500/20 transition-all group/kpi">
              <p className="text-[8px] font-black text-amber-300/50 uppercase tracking-[0.2em] mb-2">Tempo Médio</p>
              <p className="text-2xl font-black text-amber-300 italic group-hover/kpi:text-amber-200 transition-colors">1.2 dias</p>
            </div>
          </div>

          <div className="absolute top-1/2 right-8 -translate-y-1/2 opacity-[0.03] pointer-events-none">
            <i className="fa-solid fa-landmark text-[18rem] text-amber-300"></i>
          </div>
        </div>

        {/* Equipe do Gabinete */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <i className="fa-solid fa-landmark text-slate-800 text-xl"></i>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Gabinete da Presidência</h2>
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-[9px] font-black uppercase tracking-[0.2em] ml-2">{gabineteTeam.length} MEMBROS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {gabineteTeam.length > 0 ? gabineteTeam.slice(0, 2).map((member, idx) => (
              <div key={member.id} className="group relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500">
                <div className={`h-28 rounded-t-3xl ${idx === 0 ? 'bg-linear-to-r from-slate-900 via-slate-800 to-zinc-800' : 'bg-linear-to-r from-zinc-800 via-slate-700 to-slate-900'} relative`}>
                  <div className="absolute inset-0 rounded-t-3xl bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')] opacity-50"></div>
                  <div className="absolute right-6 top-4">
                    <span className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-xl text-[8px] font-black text-white/80 uppercase tracking-[0.2em] border border-white/10">
                      {idx === 0 ? 'PRESIDENTE' : 'CHEFE DE GABINETE'}
                    </span>
                  </div>
                </div>
                <div className="relative px-8 -mt-12 z-10">
                  <div className="flex items-end gap-5">
                    <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-2xl overflow-hidden bg-white shrink-0">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} className="w-full h-full object-cover" alt={member.fullName} />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${idx === 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-600'} text-3xl font-black`}>
                          {member.fullName?.[0] || 'P'}
                        </div>
                      )}
                    </div>
                    <div className="pb-1 min-w-0">
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-tight truncate">{member.fullName}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        <i className="fa-solid fa-id-badge mr-1.5"></i>
                        {member.systemRole?.replace('_', ' ') || 'GABINETE'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="px-8 py-6 flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Ativo</span>
                  </div>
                  <div className="pl-3 border-l border-slate-100">
                    <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">
                      <i className="fa-solid fa-crown mr-1"></i>{idx === 0 ? 'Presidente do TJPA' : 'Chefe de Gabinete'}
                    </span>
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
                    <i className="fa-solid fa-landmark"></i>
                  </div>
                  <div>
                    <p className="font-black text-slate-400 uppercase text-sm tracking-tight">{i === 0 ? 'Presidente do TJPA' : 'Chefe de Gabinete'}</p>
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
            { label: 'DESPACHOS PENDENTES', value: pendingRequests.length, icon: 'fa-gavel', color: 'amber', sub: 'AGUARDANDO DELIBERAÇÃO' },
            { label: 'VOLUME FINANCEIRO', value: `R$ ${totalVolume.toLocaleString('pt-BR')}`, icon: 'fa-sack-dollar', color: 'slate', sub: 'TOTAL ESTRATÉGICO' },
            { label: 'DELIBERADOS (MÊS)', value: completedRequests.length, icon: 'fa-check-double', color: 'emerald', sub: 'PROCESSOS CONCLUÍDOS' },
            { label: 'EQUIPE GABINETE', value: gabineteTeam.length, icon: 'fa-users', color: 'zinc', sub: 'MEMBROS DESIGNADOS' },
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

  // ===== RENDER: DESPACHOS (DEFAULT) =====
  return (
    <div className="p-6 md:p-10 space-y-10 animate-in fade-in duration-700 min-h-screen">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-3xl bg-slate-900 text-white flex items-center justify-center text-3xl shadow-xl shadow-slate-200">
          <i className="fa-solid fa-landmark"></i>
        </div>
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">Gabinete — Despachos</h2>
          <p className="text-slate-400 font-medium">Deliberações e autorizações da Alta Administração.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-20 text-center space-y-4">
          <i className="fa-solid fa-inbox text-6xl text-slate-200"></i>
          <p className="text-slate-400 font-bold text-lg">Nenhum despacho pendente</p>
          <p className="text-slate-300 text-sm">Quando houver processos para deliberação, eles aparecerão aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map(req => (
            <div key={req.id} onClick={() => onSelectRequest(req)} className="bg-white rounded-3xl border border-slate-100 p-8 hover:shadow-xl hover:border-slate-200 transition-all cursor-pointer group">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-gavel"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-slate-900 truncate">{req.purpose || 'Despacho Presidência'}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{req.nup || req.id.slice(0, 8)}</p>
                </div>
                <div className="text-right">
                  <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    req.status === 'Assinatura Ordenador' ? 'bg-amber-50 text-amber-600' :
                    req.status === 'Autorizado' ? 'bg-blue-50 text-blue-600' :
                    req.status === 'Concluido' ? 'bg-emerald-50 text-emerald-600' :
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

export default PresidenciaWorkstation;
