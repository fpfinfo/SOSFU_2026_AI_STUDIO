
import React, { useState, useEffect } from 'react';
import { AppModule, Profile, RequestItem } from '../types';
import { getRequests, getAllProfiles, signByOrdenador } from '../services/dataService';
import { supabase } from '../services/supabaseClient';
import VeoBanner from './VeoBanner';

interface SefinWorkstationProps {
  module: AppModule;
  onSelectRequest: (request: RequestItem) => void;
  profile?: Profile | null;
  activeView: 'inicio' | 'minutas' | 'autorizados' | 'config';
}

// Departamentos que enviam minutas para SEFIN
const ORIGIN_DEPARTMENTS = [
  { key: 'suprimento', label: 'SOSFU', icon: 'fa-box-open', color: 'emerald' },
  { key: 'diarias', label: 'SODPA', icon: 'fa-plane-departure', color: 'indigo' },
  { key: 'ajsefin', label: 'AJSEFIN', icon: 'fa-scale-balanced', color: 'slate' },
  { key: 'sgp', label: 'SEGEP', icon: 'fa-users-gear', color: 'sky' },
  { key: 'sead', label: 'SEAD', icon: 'fa-building-columns', color: 'zinc' },
  { key: 'reembolsos', label: 'REEMBOLSO', icon: 'fa-receipt', color: 'rose' },
  { key: 'coorc', label: 'COORC', icon: 'fa-chart-pie', color: 'violet' },
  { key: 'contas', label: 'SOP', icon: 'fa-file-invoice-dollar', color: 'orange' },
];

const SefinWorkstation: React.FC<SefinWorkstationProps> = ({
  module,
  onSelectRequest,
  profile: currentProfile = null,
  activeView = 'minutas'
}) => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [ordenadores, setOrdenadores] = useState<Profile[]>([]);
  const [originFilter, setOriginFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchPassword, setBatchPassword] = useState('');
  const [batchSigning, setBatchSigning] = useState(false);
  const [inboxTab, setInboxTab] = useState<'pendentes' | 'autorizados'>(activeView === 'autorizados' ? 'autorizados' : 'pendentes');

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

      // Filtrar apenas requisições que chegaram na SEFIN para assinatura ou já autorizadas
      const sefinRequests = (allRequests || []).filter(req =>
        req.status === 'Assinatura Ordenador' || req.status === 'Autorizado'
      );
      setRequests(sefinRequests);

      // Identificar Ordenadores de Despesa (somente role ORDENADOR_DESPESA)
      const sefinTeam = (allProfiles || []).filter(p =>
        p.systemRole?.toUpperCase() === 'ORDENADOR_DESPESA'
      );
      setOrdenadores(sefinTeam);
    } catch (err) {
      console.error("Erro ao carregar SEFIN:", err);
    } finally {
      setLoading(false);
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

  const pendingRequests = requests.filter(r => r.status === 'Assinatura Ordenador');
  const authorizedRequests = requests.filter(r => r.status === 'Autorizado');
  const displayRequests = inboxTab === 'pendentes' ? pendingRequests : authorizedRequests;
  const filteredRequests = displayRequests.filter(r =>
    originFilter === 'all' || r.originModule === originFilter
  );

  // Stats por origem
  const originStats = ORIGIN_DEPARTMENTS.map(dept => ({
    ...dept,
    count: pendingRequests.filter(r => r.originModule === dept.key).length,
    volume: pendingRequests.filter(r => r.originModule === dept.key).reduce((a, r) => a + (r.totalValue || 0), 0)
  })).filter(s => s.count > 0);

  const totalPendingVolume = pendingRequests.reduce((a, r) => a + (r.totalValue || 0), 0);
  const totalAuthorizedVolume = authorizedRequests.reduce((a, r) => a + (r.totalValue || 0), 0);

  // ===== RENDER: INÍCIO (HOME) =====
  if (activeView === 'inicio') {
    return (
      <div className="p-6 md:p-10 space-y-10 animate-in fade-in duration-700 min-h-screen">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.8)] animate-pulse"></div>
              <span className="text-[10px] font-black text-blue-300 uppercase tracking-[0.3em]">Secretaria de Planejamento, Coordenação e Finanças</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter leading-none mb-2">
              SEFIN <span className="text-blue-400 italic">Central</span>
            </h1>
            <p className="text-slate-400 font-medium text-lg max-w-2xl">
              Gabinete dos Ordenadores de Despesa — Assinatura e autorização de minutas financeiras de todos os setores do Tribunal.
            </p>
          </div>
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-600/10 rounded-full blur-[100px]"></div>
          <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-indigo-500/10 rounded-full blur-[80px]"></div>
        </div>

        {/* TJPA DIGITAL HUB */}
        <div className="animate-in slide-in-from-bottom-5 duration-700 delay-100">
          <VeoBanner />
        </div>

        {/* ÁGIL AI INSIGHT — Inteligência Financeira SEFIN */}
        <div className="bg-[#0a1628] rounded-[3rem] p-10 md:p-12 text-white shadow-2xl relative overflow-hidden group animate-in slide-in-from-bottom-5 duration-700 delay-200">
          {/* Background effects */}
          <div className="absolute inset-0 bg-linear-to-br from-blue-900/30 via-transparent to-indigo-900/20"></div>
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-500/8 rounded-full blur-[120px] group-hover:bg-blue-500/12 transition-all duration-1000"></div>
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/8 rounded-full blur-[100px] group-hover:bg-indigo-500/12 transition-all duration-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/3 rounded-full blur-[150px]"></div>
          
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-3">
              <span className="bg-linear-to-r from-blue-600 to-indigo-600 text-white px-5 py-2 rounded-full text-[10px] font-black tracking-[0.2em] uppercase shadow-lg shadow-blue-500/25 border border-blue-400/20">
                <i className="fa-solid fa-brain mr-2"></i>ÁGIL AI INSIGHT
              </span>
              <span className="flex h-2.5 w-2.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_12px_rgba(96,165,250,0.6)]"></span>
            </div>
            <h3 className="text-2xl md:text-3xl font-black tracking-tight leading-tight text-white/95">
              {requests.length === 0 
                ? <>Nenhuma minuta pendente. O fluxo está <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-300 to-emerald-500">Otimizado</span>.</>
                : <>Você tem <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-300 to-blue-500">{requests.filter(r => r.status === 'Assinatura SEFIN' || r.status === 'Em análise SEFIN').length} minutas</span> aguardando autorização.</>
              }
            </h3>
            <p className="text-blue-200/50 text-sm font-medium leading-relaxed max-w-xl">
              {requests.length === 0 
                ? 'Todas as minutas financeiras foram processadas. O gabinete está em dia com as autorizações.'
                : 'O tempo médio de processamento pode ser otimizado com a assinatura em lote disponível na tela de Minutas.'
              }
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 relative z-10">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-blue-500/20 transition-all group/kpi">
              <p className="text-[8px] font-black text-blue-300/60 uppercase tracking-[0.2em] mb-2">Volume em Pipeline</p>
              <p className="text-2xl font-black text-white italic group-hover/kpi:text-blue-200 transition-colors">R$ {requests.reduce((acc, r) => acc + (r.approvedAmount || r.requestedAmount || 0), 0).toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-blue-500/20 transition-all group/kpi">
              <p className="text-[8px] font-black text-blue-300/60 uppercase tracking-[0.2em] mb-2">Minutas Pendentes</p>
              <p className="text-2xl font-black text-blue-400 italic group-hover/kpi:text-blue-300 transition-colors">{requests.filter(r => r.status === 'Assinatura SEFIN' || r.status === 'Em análise SEFIN').length}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-emerald-500/20 transition-all group/kpi">
              <p className="text-[8px] font-black text-blue-300/60 uppercase tracking-[0.2em] mb-2">Autorizadas (Mês)</p>
              <p className="text-2xl font-black text-emerald-400 italic group-hover/kpi:text-emerald-300 transition-colors">{requests.filter(r => r.status === 'Autorizada' || r.status === 'Pagamento' || r.status === 'Concluída').length}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-indigo-500/20 transition-all group/kpi">
              <p className="text-[8px] font-black text-blue-300/60 uppercase tracking-[0.2em] mb-2">Tempo Médio</p>
              <p className="text-2xl font-black text-indigo-300 italic group-hover/kpi:text-indigo-200 transition-colors">2.4 dias</p>
            </div>
          </div>

          <div className="absolute top-1/2 right-8 -translate-y-1/2 opacity-[0.03] pointer-events-none">
            <i className="fa-solid fa-scale-balanced text-[18rem] text-blue-300"></i>
          </div>
        </div>

        {/* Ordenadores de Despesa — Destaque Premium */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <i className="fa-solid fa-user-shield text-blue-600 text-xl"></i>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Ordenadores de Despesa</h2>
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-[0.2em] ml-2">{ordenadores.length} DESIGNADOS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {ordenadores.length > 0 ? ordenadores.slice(0, 2).map((ord, idx) => {
              const funcaoInstitucional = ord.fullName?.toUpperCase().includes('MIGUEL') 
                ? 'Secretário da SEFIN' 
                : 'Secretário Adjunto da SEFIN';
              return (
                <div key={ord.id} className="group relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500">
                  <div className={`h-28 rounded-t-3xl ${idx === 0 ? 'bg-linear-to-r from-blue-700 via-blue-600 to-indigo-600' : 'bg-linear-to-r from-slate-800 via-slate-700 to-blue-900'} relative`}>
                    <div className="absolute inset-0 rounded-t-3xl bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')] opacity-50"></div>
                    <div className="absolute right-6 top-4">
                      <span className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-xl text-[8px] font-black text-white/80 uppercase tracking-[0.2em] border border-white/10">
                        {idx === 0 ? 'ORDENADOR TITULAR' : 'ORDENADOR SUBSTITUTO'}
                      </span>
                    </div>
                  </div>
                  <div className="relative px-8 -mt-12 z-10">
                    <div className="flex items-end gap-5">
                      <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-2xl overflow-hidden bg-white shrink-0">
                        {ord.avatarUrl ? (
                          <img src={ord.avatarUrl} className="w-full h-full object-cover" alt={ord.fullName} />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${idx === 0 ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'} text-3xl font-black`}>
                            {ord.fullName?.[0] || 'O'}
                          </div>
                        )}
                      </div>
                      <div className="pb-1 min-w-0">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-tight truncate">{ord.fullName}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          <i className="fa-solid fa-id-badge mr-1.5"></i>
                          {ord.systemRole?.replace('_', ' ') || 'ORDENADOR DE DESPESA'}
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
                      <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">
                        <i className="fa-solid fa-award mr-1"></i>{funcaoInstitucional}
                      </span>
                    </div>
                    {ord.unit && (
                      <div className="pl-3 border-l border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          <i className="fa-solid fa-building mr-1.5"></i>{ord.unit}
                        </span>
                      </div>
                    )}
                    {ord.registrationNumber && (
                      <div className="pl-3 border-l border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          Mat. {ord.registrationNumber}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }) : (
              [0, 1].map(i => (
                <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-24 h-24 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-200 text-5xl">
                    <i className="fa-solid fa-user-tie"></i>
                  </div>
                  <div>
                    <p className="font-black text-slate-400 uppercase text-sm tracking-tight">Ordenador de Despesa {i + 1}</p>
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
            { label: 'MINUTAS PENDENTES', value: pendingRequests.length, icon: 'fa-file-contract', color: 'blue', sub: 'AGUARDANDO ASSINATURA' },
            { label: 'VOLUME EM ASSINATURA', value: `R$ ${totalPendingVolume.toLocaleString('pt-BR')}`, icon: 'fa-sack-dollar', color: 'indigo', sub: 'TOTAL FINANCEIRO' },
            { label: 'AUTORIZADOS (MÊS)', value: authorizedRequests.length, icon: 'fa-check-double', color: 'emerald', sub: 'MINUTAS ASSINADAS' },
            { label: 'VOLUME AUTORIZADO', value: `R$ ${totalAuthorizedVolume.toLocaleString('pt-BR')}`, icon: 'fa-coins', color: 'emerald', sub: 'ESTIMATIVA MENSAL' },
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

        {/* Distribuição por Setor */}
        {originStats.length > 0 && (
          <section className="space-y-6">
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 px-2">
              <i className="fa-solid fa-diagram-project text-blue-500"></i>
              Minutas Pendentes por Setor de Origem
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {originStats.map(stat => (
                <div key={stat.key} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group cursor-pointer"
                  onClick={() => { setOriginFilter(stat.key); }}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform`}>
                      <i className={`fa-solid ${stat.icon}`}></i>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{stat.label}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{stat.count} {stat.count === 1 ? 'MINUTA' : 'MINUTAS'}</p>
                    </div>
                  </div>
                  <p className="text-lg font-black text-slate-900 tracking-tighter">
                    R$ {stat.volume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  // ===== RENDER: MINUTAS (INBOX PRINCIPAL) =====
  return (
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in duration-700 min-h-screen">
      {/* Header com título e tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-[1.5rem] bg-blue-700 text-white flex items-center justify-center text-3xl shadow-xl shadow-blue-100">
            <i className="fa-solid fa-file-signature"></i>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">Minutas para Assinatura</h2>
            <p className="text-slate-400 font-medium text-sm">Central de recebimento e autorização de documentos financeiros</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-100">
            {[
              { id: 'pendentes', label: 'PENDENTES', count: pendingRequests.length },
              { id: 'autorizados', label: 'AUTORIZADOS', count: authorizedRequests.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setInboxTab(tab.id as any)}
                className={`px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 ${
                  inboxTab === tab.id ? 'bg-white text-blue-700 shadow-lg' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab.label}
                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black ${
                  inboxTab === tab.id ? 'bg-blue-50 text-blue-600' : 'bg-slate-200/50 text-slate-400'
                }`}>{tab.count}</span>
              </button>
            ))}
          </div>
          <button onClick={fetchData} className="w-12 h-12 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 transition-all flex items-center justify-center shadow-sm hover:scale-110 active:scale-95">
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i>
          </button>
        </div>
      </div>

      {/* Filtros por Origem */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setOriginFilter('all')}
          className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
            originFilter === 'all'
              ? 'bg-blue-700 text-white shadow-lg shadow-blue-200'
              : 'bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-200'
          }`}
        >
          <i className="fa-solid fa-layer-group mr-2"></i>TODOS OS SETORES
        </button>
        {ORIGIN_DEPARTMENTS.map(dept => {
          const count = (inboxTab === 'pendentes' ? pendingRequests : authorizedRequests).filter(r => r.originModule === dept.key).length;
          return (
            <button
              key={dept.key}
              onClick={() => setOriginFilter(dept.key)}
              className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                originFilter === dept.key
                  ? 'bg-blue-700 text-white shadow-lg shadow-blue-200'
                  : 'bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-200'
              }`}
            >
              <i className={`fa-solid ${dept.icon}`}></i>
              {dept.label}
              {count > 0 && (
                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black ${
                  originFilter === dept.key ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                }`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Lista de Minutas */}
      <div className="space-y-4">
        {loading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="h-28 bg-white rounded-[2rem] border border-slate-50 animate-pulse"></div>)
        ) : filteredRequests.length === 0 ? (
          <div className="py-20 bg-white/50 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 text-4xl">
              <i className="fa-solid fa-check-double"></i>
            </div>
            <div>
              <p className="font-black uppercase tracking-widest text-[10px] text-slate-400">
                {inboxTab === 'pendentes' ? 'Nenhuma minuta pendente!' : 'Nenhuma minuta autorizada.'}
              </p>
              <p className="text-slate-300 text-[10px] font-bold">
                {originFilter !== 'all' ? `Filtro ativo: ${ORIGIN_DEPARTMENTS.find(d => d.key === originFilter)?.label || originFilter}` : 'Todos os setores estão em dia.'}
              </p>
            </div>
          </div>
        ) : (
          filteredRequests.map(req => (
            <div
              key={req.id}
              onClick={() => onSelectRequest(req)}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:shadow-2xl hover:border-blue-100 transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="flex items-center gap-6">
                {/* Checkbox for batch (only on pending) */}
                {inboxTab === 'pendentes' && (
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
                <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 flex items-center justify-center text-slate-300 transition-all group-hover:bg-blue-50 group-hover:text-blue-500 shadow-inner">
                  <i className="fa-solid fa-file-contract text-2xl"></i>
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-slate-900 uppercase text-sm tracking-tight group-hover:text-blue-700 transition-colors leading-tight">{req.title}</h4>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{new Date(req.createdAt).toLocaleDateString('pt-BR')}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest italic">{req.userProfile?.fullName || 'Servidor'}</span>
                    {req.nup && (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{req.nup}</span>
                      </>
                    )}
                    {req.originModule && (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                        <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tight ${
                          (() => {
                            const dept = ORIGIN_DEPARTMENTS.find(d => d.key === req.originModule);
                            return dept ? `bg-${dept.color}-50 text-${dept.color}-600` : 'bg-blue-50 text-blue-600';
                          })()
                        }`}>
                          <i className={`fa-solid ${ORIGIN_DEPARTMENTS.find(d => d.key === req.originModule)?.icon || 'fa-building'} mr-1`}></i>
                          {ORIGIN_DEPARTMENTS.find(d => d.key === req.originModule)?.label || req.originModule.toUpperCase()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1 text-center">VALOR TOTAL</p>
                  <p className="text-2xl font-black text-slate-900 tracking-tighter">R$ {(req.totalValue || 0).toLocaleString('pt-BR')}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:rotate-45">
                  <i className="fa-solid fa-chevron-right"></i>
                </div>
              </div>
              {/* Status indicator strip */}
              <div className={`absolute top-0 left-0 w-1.5 h-full ${req.status === 'Autorizado' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
            </div>
          ))
        )}
      </div>

      {/* Batch sign floating bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-blue-700 text-white px-10 py-5 rounded-[2rem] shadow-2xl flex items-center gap-8 animate-in slide-in-from-bottom-5 border border-blue-600">
          <span className="text-[11px] font-black uppercase tracking-widest">{selectedIds.size} MINUTAS SELECIONADAS</span>
          <button
            onClick={() => setShowBatchModal(true)}
            className="bg-white text-blue-700 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all active:scale-95"
          >
            <i className="fa-solid fa-signature mr-2"></i> ASSINAR EM LOTE
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-blue-200 hover:text-white transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Batch Sign Modal */}
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

export default SefinWorkstation;
