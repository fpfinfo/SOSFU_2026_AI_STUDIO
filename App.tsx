import React, { useState, useEffect, Suspense } from 'react';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { Header } from './components/Header';
import { StatCard } from './components/StatCard';
import { TeamTable } from './components/TeamTable';
import { SolicitationsView } from './components/SolicitationsView';
import { AccountabilityView } from './components/AccountabilityView';
import { ArchiveView } from './components/ArchiveView';
import { SettingsView } from './components/SettingsView';
import { ProfileView } from './components/ProfileView';
import { LoginView } from './components/LoginView';
import { DASHBOARD_STATS } from './constants';
import { Loader2, Map as MapIcon } from 'lucide-react';

// Lazy-load: componentes pesados carregados sob demanda
const LazyReportsView = React.lazy(() => import('./components/ReportsView').then(m => ({ default: m.ReportsView })));
const LazyProcessDetailView = React.lazy(() => import('./components/process/ProcessDetailView').then(m => ({ default: m.ProcessDetailView })));
const LazySefinCockpit = React.lazy(() => import('./components/sefin/SefinCockpit').then(m => ({ default: m.SefinCockpit })));
const LazyAjsefinCockpit = React.lazy(() => import('./components/ajsefin/AjsefinCockpit').then(m => ({ default: m.AjsefinCockpit })));
const LazySupridoDashboard = React.lazy(() => import('./components/suprido/SupridoDashboard').then(m => ({ default: m.SupridoDashboard })));
const LazyGestorDashboard = React.lazy(() => import('./components/gestor/GestorDashboard').then(m => ({ default: m.GestorDashboard })));
const LazySgpDashboard = React.lazy(() => import('./components/sgp/SgpDashboard').then(m => ({ default: m.SgpDashboard })));
const LazySeadDashboard = React.lazy(() => import('./components/sead/SeadDashboard').then(m => ({ default: m.SeadDashboard })));
const LazyPresidenciaDashboard = React.lazy(() => import('./components/presidencia/PresidenciaDashboard').then(m => ({ default: m.PresidenciaDashboard })));
const LazySodpaDashboard = React.lazy(() => import('./components/sodpa/SodpaDashboard').then(m => ({ default: m.SodpaDashboard })));
const LazyEmergencySolicitation = React.lazy(() => import('./components/suprido/EmergencySolicitation').then(m => ({ default: m.EmergencySolicitation })));
const LazyJurySolicitation = React.lazy(() => import('./components/suprido/JurySolicitation').then(m => ({ default: m.JurySolicitation })));

// Interface para o perfil do usuário
interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  matricula: string;
  role: string;
  avatar_url: string;
  dperfil?: {
    slug: string;
    name: string;
  };
}

// Tipo para as abas do Process Detail
type ProcessTabType = 'OVERVIEW' | 'DOSSIER' | 'EXECUTION' | 'ANALYSIS' | 'ACCOUNTABILITY' | 'ARCHIVE';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  
  // Dashboard Stats Real
  const [stats, setStats] = useState(DASHBOARD_STATS);
  
  // Estado para navegação detalhada
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [processInitialTab, setProcessInitialTab] = useState<ProcessTabType>('OVERVIEW');

  useEffect(() => {
    // Inicialização da Sessão com Tratamento de Erro
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        if (session) {
            fetchUserProfile(session.user.id);
            if (activeTab === 'dashboard') fetchDashboardStats(session.user.id);
        } else {
            setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Erro crítico ao inicializar sessão:", err);
        setLoading(false); 
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
          // Apenas busca o perfil se necessário
          fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  const fetchDashboardStats = async (userId: string) => {
      try {
          // 1. Caixa de Entrada (Solicitações aguardando SOSFU + PC aguardando SOSFU)
          // Inclui: WAITING_SOSFU_ANALYSIS (Novas) + WAITING_SOSFU_EXECUTION (Execução)
          const { count: inboxSol } = await supabase.from('solicitations').select('*', { count: 'exact', head: true }).in('status', ['WAITING_SOSFU_ANALYSIS', 'WAITING_SOSFU_EXECUTION']);
          const { count: inboxPC } = await supabase.from('accountabilities').select('*', { count: 'exact', head: true }).eq('status', 'WAITING_SOSFU');
          
          // 2. Minha Mesa (Solicitações atribuídas a mim)
          const { count: mySol } = await supabase.from('solicitations').select('*', { count: 'exact', head: true }).eq('analyst_id', userId).neq('status', 'PAID');
          
          // 3. Minha Mesa (PCs atribuídas a mim)
          const { count: myPC } = await supabase.from('accountabilities').select('*', { count: 'exact', head: true }).eq('analyst_id', userId).eq('status', 'WAITING_SOSFU');

          // 4. Fluxo SEFIN (Waiting SEFIN)
          const { count: sefin } = await supabase.from('solicitations').select('*', { count: 'exact', head: true }).eq('status', 'WAITING_SEFIN_SIGNATURE');

          const newStats = [...DASHBOARD_STATS];
          newStats[0] = { ...newStats[0], count: (inboxSol || 0) + (inboxPC || 0), details: [`${inboxSol} Solicitações`, `${inboxPC} Prest. Contas`] };
          newStats[1] = { ...newStats[1], count: mySol || 0, details: ['Em análise por mim'] };
          newStats[2] = { ...newStats[2], count: myPC || 0, details: ['PCs em análise'] };
          newStats[3] = { ...newStats[3], count: sefin || 0, details: ['Aguardando Ordenador'] };

          setStats(newStats);

      } catch (err) {
          console.error("Erro ao carregar stats:", err);
      }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          dperfil:perfil_id (
            slug,
            name
          )
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setUserProfile({
            id: userId,
            full_name: 'Modo de Recuperação',
            email: 'admin@sistema',
            matricula: '000000',
            role: 'ADMIN',
            avatar_url: '',
            dperfil: { slug: 'ADMIN', name: 'Administrador (Fallback)' }
        });
      } else if (data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Redirecionamento reativo: Move da tab genérica 'dashboard' para o dashboard específico do perfil
  useEffect(() => {
    if (userProfile && activeTab === 'dashboard') {
      const role = userProfile.dperfil?.slug || '';
      if (role === 'USER' || role === 'SERVIDOR') {
        setActiveTab('suprido_dashboard');
      } else if (role === 'GESTOR') {
        setActiveTab('gestor_dashboard');
      } else if (role.startsWith('SEFIN')) {
        setActiveTab('sefin_dashboard');
      } else if (role.startsWith('AJSEFIN')) {
        setActiveTab('ajsefin_dashboard');
      } else if (role.startsWith('SGP')) {
        setActiveTab('sgp_dashboard');
      } else if (role.startsWith('SEAD')) {
        setActiveTab('sead_dashboard');
      } else if (role.startsWith('PRESIDENCIA')) {
        setActiveTab('presidencia_dashboard');
      } else if (role.startsWith('SODPA')) {
        setActiveTab('sodpa_dashboard');
      }
    }
  }, [userProfile, activeTab]);

  // Função de navegação aprimorada
  const handleNavigation = (page: string, processId?: string, accountabilityId?: string) => {
      // 1. Rota de Detalhe de PC (Abre ProcessDetail na aba ACCOUNTABILITY)
      if (page === 'process_accountability' && processId) {
          setSelectedProcessId(processId);
          setProcessInitialTab('ACCOUNTABILITY');
          setActiveTab('process_detail');
          return;
      }

      // 2. Rota de Detalhe via Arquivo (Abre ProcessDetail na aba ARCHIVE)
      if (page === 'process_archive' && processId) {
          setSelectedProcessId(processId);
          setProcessInitialTab('ARCHIVE');
          setActiveTab('process_detail');
          return;
      }

      // 2. Rota de Detalhe Padrão (Abre ProcessDetail na aba OVERVIEW)
      if (page === 'process_detail' && processId) {
          setSelectedProcessId(processId);
          setProcessInitialTab('OVERVIEW');
          setActiveTab('process_detail');
          return;
      }

      // 3. Outras rotas
      if (processId) setSelectedProcessId(processId);
      setActiveTab(page);
      
      if (page === 'dashboard' && session) fetchDashboardStats(session.user.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <LoginView />;
  }

  const lazyFallback = (
    <div className="flex items-center justify-center h-[300px]">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                {stats.map((stat) => (
                  <StatCard key={stat.id} data={stat} />
                ))}
             </div>
             <TeamTable isGestor={true} />
          </div>
        );
      case 'suprido_dashboard':
        return <Suspense fallback={lazyFallback}><LazySupridoDashboard onNavigate={handleNavigation} userProfile={userProfile} /></Suspense>;
      case 'gestor_dashboard':
        return <Suspense fallback={lazyFallback}><LazyGestorDashboard onNavigate={handleNavigation} userProfile={userProfile} /></Suspense>;
      case 'sefin_dashboard':
        return <Suspense fallback={lazyFallback}><LazySefinCockpit onNavigate={handleNavigation} userProfile={userProfile} /></Suspense>;
      case 'ajsefin_dashboard':
        return <Suspense fallback={lazyFallback}><LazyAjsefinCockpit onNavigate={handleNavigation} userProfile={userProfile} /></Suspense>;
      case 'sgp_dashboard':
        return <Suspense fallback={lazyFallback}><LazySgpDashboard onNavigate={handleNavigation} userProfile={userProfile} /></Suspense>;
      case 'sead_dashboard':
        return <Suspense fallback={lazyFallback}><LazySeadDashboard onNavigate={handleNavigation} userProfile={userProfile} /></Suspense>;
      case 'presidencia_dashboard':
        return <Suspense fallback={lazyFallback}><LazyPresidenciaDashboard onNavigate={handleNavigation} userProfile={userProfile} /></Suspense>;
      case 'sodpa_dashboard':
        return <Suspense fallback={lazyFallback}><LazySodpaDashboard onNavigate={handleNavigation} userProfile={userProfile} /></Suspense>;
      case 'solicitation_emergency':
        return <Suspense fallback={lazyFallback}><LazyEmergencySolicitation onNavigate={handleNavigation} /></Suspense>;
      case 'solicitation_jury':
        return <Suspense fallback={lazyFallback}><LazyJurySolicitation onNavigate={handleNavigation} /></Suspense>;

      case 'process_detail':
        return selectedProcessId ? (
            <Suspense fallback={lazyFallback}>
            <LazyProcessDetailView
                processId={selectedProcessId}
                initialTab={processInitialTab}
                userProfile={userProfile}
                onBack={() => {
                    if (processInitialTab === 'ARCHIVE') return setActiveTab('archive');
                    const role = userProfile?.dperfil?.slug || '';
                    if (role.startsWith('SEFIN')) return setActiveTab('sefin_dashboard');
                    if (role.startsWith('AJSEFIN')) return setActiveTab('ajsefin_dashboard');
                    if (role.startsWith('SGP')) return setActiveTab('sgp_dashboard');
                    if (role.startsWith('SEAD')) return setActiveTab('sead_dashboard');
                    if (role.startsWith('PRESIDENCIA')) return setActiveTab('presidencia_dashboard');
                    if (role.startsWith('SODPA')) return setActiveTab('sodpa_dashboard');
                    if (role === 'GESTOR') return setActiveTab('gestor_dashboard');
                    if (role === 'USER') return setActiveTab('suprido_dashboard');
                    if (role.startsWith('SOSFU') || role === 'ADMIN') return setActiveTab('accountability');
                    return setActiveTab('dashboard');
                }}
            />
            </Suspense>
        ) : (
            <div>Erro: Processo não selecionado</div>
        );
      case 'solicitations':
        return <SolicitationsView onNavigate={handleNavigation} userProfile={userProfile} />;
      case 'accountability':
        return <AccountabilityView onNavigate={handleNavigation} userProfile={userProfile} />;
      case 'archive':
        return <ArchiveView onNavigate={handleNavigation} />;
      case 'settings':
        return <SettingsView />;
      case 'profile':
        return <ProfileView />;
      case 'reports':
        return (
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center h-[500px] bg-slate-50 rounded-xl animate-pulse">
              <MapIcon size={48} className="text-indigo-200 mb-4" />
              <p className="text-gray-400 font-medium">Carregando mapa geográfico...</p>
              <Loader2 size={20} className="text-indigo-300 animate-spin mt-3" />
            </div>
          }>
            <LazyReportsView />
          </Suspense>
        );
      default:
        return <div>Tab not found</div>;
    }
  };

  return (
    <ErrorBoundary fallbackTitle="Erro no Sistema SOSFU">
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header 
        activeTab={activeTab} 
        onTabChange={(tab) => handleNavigation(tab)}
        onNavigate={handleNavigation}
        userProfile={userProfile}
      />
      
      {activeTab === 'sefin_dashboard' || activeTab === 'ajsefin_dashboard' ? (
        <div id="main-content">{renderContent()}</div>
      ) : (
        <main id="main-content" className="max-w-[1600px] mx-auto px-6 py-8">
          {renderContent()}
        </main>
      )}
    </div>
    </ErrorBoundary>
  );
};

export default App;