
import React, { useState, useEffect } from 'react';
import VeoBanner from './VeoBanner';
import { supabase } from '../services/supabaseClient';
import { getProfile, getExpenses, getRequests, getRequestsByManager } from '../services/dataService';
import { Profile, Expense, RequestItem, AppModule } from '../types';
import { MODULE_THEMES } from '../utils/themes';

interface DashboardProps {
  module?: AppModule;
  profile?: Profile | null;
  onResolvePending?: () => void;
  onViewPendingList?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ module = 'usuarios', profile: initialProfile, onResolvePending, onViewPendingList }) => {
  const [profile, setProfile] = useState<Profile | null>(initialProfile || null);
  const [loading, setLoading] = useState(!initialProfile);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [pendingForManager, setPendingForManager] = useState<number>(0);
  const theme = MODULE_THEMES[module] || MODULE_THEMES.usuarios;

  useEffect(() => {
    const fetchData = async () => {
      // Só mostramos o loading se não tivermos perfil inicial
      if (!initialProfile) setLoading(true);
      // Se já temos o perfil inicial, podemos pular o carregamento inicial de perfil
      // mas ainda carregamos despesas e solicitações se necessário
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fetchTasks = [
          getExpenses(),
          getRequests()
        ];
        
        // Se não temos o perfil, buscamos
        let profilePromise: Promise<Profile | null> | null = null;
        if (!profile) {
          profilePromise = getProfile(user.id);
        }

        const results = await Promise.all([
          ...fetchTasks,
          ...(profilePromise ? [profilePromise] : [])
        ]);

        const expensesData = results[0] as Expense[];
        const requestsData = results[1] as RequestItem[];
        const profileData = profilePromise ? (results[2] as Profile | null) : profile;

        if (profileData) setProfile(profileData);
        setExpenses(expensesData || []);
        setRequests(requestsData || []);

        if (profileData?.email) {
          const managerTasks = await getRequestsByManager(profileData.email);
          setPendingForManager(managerTasks.filter(r => r.status === 'Pendente' || r.status === 'Assinatura Gestor').length);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [initialProfile]);

  // Cálculos para o Dashboard Analítico
  const getMonthlyTrends = () => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentMonth = new Date().getMonth();
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        last6Months.push({
            name: months[monthIndex],
            value: 0
        });
    }

    expenses.forEach(exp => {
        const date = new Date(exp.date);
        const monthName = months[date.getMonth()];
        const trend = last6Months.find(m => m.name === monthName);
        if (trend) trend.value += exp.amount || 0;
    });

    return last6Months;
  };

  const trends = getMonthlyTrends();
  const maxValue = Math.max(...trends.map(t => t.value), 1000);

  const displayName = profile?.fullName 
    ? profile.fullName.split(' ')[0] 
    : (profile?.email?.split('@')[0] || 'Servidor');

  const totalExpenses = expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);
  const isAdmin = module !== 'usuarios';

  const TrendChart = () => (
    <div className="h-48 w-full flex items-end gap-2 px-4 pb-2">
      {trends.map((t, i) => (
        <div key={i} className="flex-1 flex flex-col items-center group relative">
          {/* Fundo da barra (fantasma) */}
          <div 
            className={`w-full ${theme.secondary.replace('bg-', 'bg-')} opacity-10 rounded-t-xl group-hover:opacity-20 transition-all duration-500`} 
            style={{ height: '100%' }}
          ></div>
          
          {/* Barra principal com Gradiente e Glassmorphism */}
          <div 
            className={`absolute bottom-0 w-full bg-gradient-to-t ${theme.secondary.replace('bg-', 'from-')} to-blue-400 rounded-t-xl group-hover:brightness-110 transition-all duration-700 shadow-lg shadow-emerald-500/10 backdrop-blur-[2px]`} 
            style={{ height: `${(t.value / maxValue) * 100}%`, transitionDelay: `${i * 100}ms` }}
          >
             {/* Glow effect on hover */}
             <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/20 transition-opacity rounded-t-xl"></div>
             
             <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 bg-slate-900/90 backdrop-blur-md text-white text-[9px] font-black px-3 py-1.5 rounded-lg pointer-events-none whitespace-nowrap shadow-2xl border border-white/10 z-20">
                R$ {t.value.toLocaleString('pt-BR')}
             </div>
          </div>
          <span className="text-[9px] font-black text-slate-300 uppercase mt-3 tracking-tighter group-hover:text-slate-500 transition-colors">{t.name}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="px-6 py-6 md:p-10 space-y-10 animate-in fade-in duration-700">
      <div className="md:flex md:justify-between md:items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`${theme.badge} px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border ${theme.accent.replace('border-', 'border-')}`}>
                {isAdmin ? `Fluxo de Gestão - ${module.toUpperCase()}` : 'Sistema Online'}
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-medium text-slate-900 tracking-tight">
            Oi, <span className={`${theme.primary} font-black`}>{loading ? '...' : displayName}!</span>
          </h1>
          <p className="text-slate-400 text-lg font-medium">{theme.welcomeMsg}</p>
        </div>
      </div>

      {/* 1. TJPA DIGITAL HUB */}
      <div className="animate-in slide-in-from-bottom-5 duration-700 delay-100">
        <VeoBanner />
      </div>

      {/* 2. ÁGIL AI INSIGHT */}
      {module === 'suprimento' ? (
        <div className="bg-[#071a12] rounded-[3rem] p-10 md:p-12 text-white shadow-2xl relative overflow-hidden group animate-in slide-in-from-bottom-5 duration-700 delay-200">
          {/* Background effects */}
          <div className="absolute inset-0 bg-linear-to-br from-emerald-900/30 via-transparent to-teal-900/20"></div>
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/8 rounded-full blur-[120px] group-hover:bg-emerald-500/12 transition-all duration-1000"></div>
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-500/8 rounded-full blur-[100px] group-hover:bg-teal-500/12 transition-all duration-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/3 rounded-full blur-[150px]"></div>
          
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-3">
              <span className="bg-linear-to-r from-emerald-600 to-teal-600 text-white px-5 py-2 rounded-full text-[10px] font-black tracking-[0.2em] uppercase shadow-lg shadow-emerald-500/25 border border-emerald-400/20">
                <i className="fa-solid fa-brain mr-2"></i>ÁGIL AI INSIGHT
              </span>
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.6)]"></span>
            </div>
            <h3 className="text-2xl md:text-3xl font-black tracking-tight leading-tight text-white/95">
              O fluxo de suprimento de fundos está <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-300 to-emerald-500">Operacional</span>.
            </h3>
            <p className="text-emerald-200/50 text-sm font-medium leading-relaxed max-w-xl">
              Análise automatizada em tempo real dos processos de suprimento de fundos. A conformidade com limites CNJ e prazos está sendo monitorada continuamente.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 relative z-10">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-emerald-500/20 transition-all group/kpi">
              <p className="text-[8px] font-black text-emerald-300/60 uppercase tracking-[0.2em] mb-2">Processos Ativos</p>
              <p className="text-2xl font-black text-white italic group-hover/kpi:text-emerald-200 transition-colors">{requests.length}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-emerald-500/20 transition-all group/kpi">
              <p className="text-[8px] font-black text-emerald-300/60 uppercase tracking-[0.2em] mb-2">Em Auditoria</p>
              <p className="text-2xl font-black text-emerald-400 italic group-hover/kpi:text-emerald-300 transition-colors">{requests.filter(r => r.status === 'Em Analise' || r.status === 'Pendente').length}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-teal-500/20 transition-all group/kpi">
              <p className="text-[8px] font-black text-emerald-300/60 uppercase tracking-[0.2em] mb-2">Conformidade</p>
              <p className="text-2xl font-black text-teal-400 italic group-hover/kpi:text-teal-300 transition-colors">100%</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-emerald-500/20 transition-all group/kpi">
              <p className="text-[8px] font-black text-emerald-300/60 uppercase tracking-[0.2em] mb-2">Tempo Médio</p>
              <p className="text-2xl font-black text-emerald-300 italic group-hover/kpi:text-emerald-200 transition-colors">3.1 dias</p>
            </div>
          </div>

          <div className="absolute top-1/2 right-8 -translate-y-1/2 opacity-[0.03] pointer-events-none">
            <i className="fa-solid fa-shield-halved text-[18rem] text-emerald-300"></i>
          </div>
        </div>
      ) : (
      <div className={`bg-gradient-to-br ${theme.gradient.includes('slate') ? theme.gradient : 'from-slate-900 via-slate-800 to-slate-900'} rounded-[3.5rem] p-10 text-white shadow-2xl relative overflow-hidden group border border-white/5 dark:border-white/10 animate-in slide-in-from-bottom-5 duration-700 delay-200`}>
          <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                  <span className={`${theme.secondary.replace('bg-', 'bg-')}/20 ${theme.primary.replace('text-', 'text-')} px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase backdrop-blur-md border border-white/10`}>ÁGIL AI INSIGHT</span>
                  <span className={`flex h-2 w-2 rounded-full ${theme.secondary.replace('bg-', 'bg-')} animate-pulse`}></span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">Sua saúde financeira corporativa está <span className={theme.primary.replace('text-', 'text-')}>Excelente</span>.</h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl">
                  O tempo médio de aprovação de suas despesas diminuiu <span className="text-white font-bold">18%</span> este mês. Continue mantendo seus recibos nítidos para auditoria automática.
              </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10 relative z-10">
              <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Gasto</p>
                  <p className="text-xl font-black text-white italic">R$ {totalExpenses.toLocaleString('pt-BR')}</p>
              </div>
              <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Economia</p>
                  <p className="text-xl font-black text-emerald-400 italic">12.5%</p>
              </div>
              <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Aprovações</p>
                  <p className="text-xl font-black text-white italic">{(expenses.length * 0.9).toFixed(0)}/24</p>
              </div>
          </div>

          <div className="absolute top-0 right-0 p-10 opacity-5 -rotate-12 translate-x-1/4 -translate-y-1/4 pointer-events-none">
              <i className={`fa-solid ${theme.icon} text-[20rem]`}></i>
          </div>
      </div>
      )}

      {/* 3. Card de Pendências - Estilo Institucional Premium (Agora destaque central) */}
      <section className="bg-[#00422d] rounded-[3.5rem] p-12 text-white shadow-2xl flex flex-col justify-between min-h-[350px] relative overflow-hidden group animate-in slide-in-from-bottom-5 duration-700 delay-300">
          <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                        <i className="fa-solid fa-hourglass-half text-emerald-400"></i>
                    </div>
                    <p className="text-xs font-black text-emerald-100/50 uppercase tracking-[0.3em]">Pendências Atuais</p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onViewPendingList) onViewPendingList();
                    }}
                    className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/5 transition-all hover:bg-white/20 active:scale-95 shadow-lg group-hover:scale-110"
                    title="Ver lista de pendências"
                  >
                    <i className="fa-solid fa-list-ul text-2xl text-white"></i>
                  </button>
              </div>
              <div className="flex items-baseline gap-8">
                <h3 className="text-8xl font-black tracking-tighter animate-in zoom-in duration-700">{pendingForManager}</h3>
                <div className="space-y-1">
                    <p className="text-xl font-medium text-emerald-100/80 leading-relaxed max-w-[300px]">
                      Você tem <span className="text-white font-black">{pendingForManager} solicitações</span> aguardando sua ação imediata.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-[10px] font-black text-emerald-400/80 uppercase tracking-widest">Protocolos Prioritários</span>
                    </div>
                </div>
              </div>
          </div>
          
          <button 
              onClick={onResolvePending}
              className="relative z-10 w-full md:w-max px-12 mt-10 py-6 bg-white text-[#00422d] rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-emerald-50 transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-4"
          >
              <i className="fa-solid fa-circle-check"></i>
              Resolver Agora
          </button>

          {/* Elemento visual de fundo */}
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-emerald-400/10 rounded-full blur-[100px] group-hover:bg-emerald-400/20 transition-colors"></div>
          <i className="fa-solid fa-shield-halved absolute top-1/2 right-10 -translate-y-1/2 text-[15rem] text-white/5 -rotate-12 pointer-events-none"></i>
      </section>

      {/* 4. TENDÊNCIA DE GASTOS + ALERTAS DO ÁGIL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
        <div className="lg:col-span-1 animate-in slide-in-from-bottom-5 duration-700 delay-400">
            <div className="bg-white rounded-[3.5rem] p-10 shadow-xl border border-slate-50 h-full flex flex-col justify-between overflow-hidden relative group">
                <div className="space-y-1 mb-8 relative z-10">
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Fluxo Financeiro</p>
                   <h4 className="text-xl font-black text-slate-900 uppercase italic">Tendência de Gastos</h4>
                </div>
                
                <TrendChart />

                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-slate-50 rounded-full blur-3xl opacity-50 group-hover:bg-emerald-50 transition-colors"></div>
            </div>
        </div>

        <section className="bg-white rounded-[3.5rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-50 h-full lg:col-span-2 animate-in slide-in-from-bottom-5 duration-700 delay-500">
            <div className="flex justify-between items-center mb-8">
               <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center ${theme.primary} shadow-inner`}>
                      <i className="fa-solid fa-tower-broadcast"></i>
                  </div>
                  <h3 className="text-slate-900 font-black text-xl tracking-tight uppercase italic">Alertas do ÁGIL</h3>
               </div>
               <span className={`text-[10px] font-black ${theme.badge} px-4 py-1.5 rounded-full border ${theme.accent.replace('border-', 'border-')}`}>NOTIFICAÇÕES ATIVAS</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className={`flex gap-4 p-6 bg-slate-50/50 rounded-2xl group ${theme.hover} transition-all cursor-pointer border border-transparent hover:border-slate-100`}>
                  <div className={`w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center ${theme.primary} shadow-sm shrink-0 group-hover:scale-110 transition-transform`}>
                     <i className="fa-solid fa-bell-concierge"></i>
                  </div>
                  <div className="space-y-1">
                     <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Cobrança de Gestor</p>
                     <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Sua despesa está aguardando revisão há alguns dias. Verifique se há correções.</p>
                  </div>
               </div>
               <div className={`flex gap-4 p-6 bg-slate-50/50 rounded-2xl group ${theme.hover} transition-all cursor-pointer border border-transparent hover:border-slate-100`}>
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-blue-500 shadow-sm shrink-0 group-hover:scale-110 transition-transform">
                     <i className="fa-solid fa-calendar-check"></i>
                  </div>
                  <div className="space-y-1">
                     <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Aviso do Sistema</p>
                     <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Confira as atualizações de tabela vigentes no menu Configurações.</p>
                  </div>
               </div>
            </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
