import React, { useState, useEffect, Suspense } from 'react';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { supabase } from './lib/supabase';
import { Header } from './components/Header';
import { StatCard } from './components/StatCard';
import { TeamTable } from './components/TeamTable';
import { SolicitationsView } from './components/SolicitationsView';
import { AccountabilityView } from './components/AccountabilityView';
import { ArchiveView } from './components/ArchiveView';
import { SettingsView } from './components/SettingsView';
import { ProfileView } from './components/ProfileView';
import { SupridoDashboard } from './components/suprido/SupridoDashboard';
import { GestorDashboard } from './components/gestor/GestorDashboard';
import { SefinCockpit } from './components/sefin/SefinCockpit';
import { AjsefinCockpit } from './components/ajsefin/AjsefinCockpit';
import { SgpDashboard } from './components/sgp/SgpDashboard';
import { SeadDashboard } from './components/sead/SeadDashboard';
import { PresidenciaDashboard } from './components/presidencia/PresidenciaDashboard';
import { SodpaCockpit } from './components/sodpa/SodpaCockpit';
import { RessarcimentoCockpit } from './components/ressarcimento/RessarcimentoCockpit';
import { SosfuInbox } from './components/sosfu/SosfuInbox';
import { EmergencySolicitation } from './components/suprido/EmergencySolicitation';
import { JurySolicitation } from './components/suprido/JurySolicitation';
<<<<<<< HEAD
import { DiariasSolicitation } from './components/suprido/DiariasSolicitation';
import { RessarcimentoSolicitation } from './components/suprido/RessarcimentoSolicitation';
=======
>>>>>>> 337e63ae355d447079153573de4840f1a3b3b199
import { ProcessDetailView } from './components/process/ProcessDetailView';
import { AccountabilityWizard } from './components/accountability/AccountabilityWizard';
import { LoginView } from './components/LoginView';
import { DASHBOARD_STATS } from './constants';
import { Loader2, Map as MapIcon } from 'lucide-react';

// Lazy-load: Leaflet (~300KB) é carregado apenas quando o usuário abre a aba Relatórios
const LazyReportsView = React.lazy(() => import('./components/ReportsView').then(m => ({ default: m.ReportsView })));

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
  const [session, setSession] = useState<any>(null);
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
      const { data: profile, error } = await supabase
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
      } else if (profile) {
        // Fetch modern RBAC roles to override legacy
        const { data: roles } = await supabase
            .from('sys_user_roles')
            .select('sys_roles(slug, name)')
            .eq('user_id', userId);

        let activeRole = profile.dperfil;
        
        if (roles && roles.length > 0) {
            // Priority 1: SODPA Roles
            const sodpaRole = roles.find((r: any) => r.sys_roles?.slug?.includes('SODPA'));
            // Priority 2: Any System Role
            const anyRole = roles[0]?.sys_roles;
            
            if (sodpaRole?.sys_roles) {
                activeRole = sodpaRole.sys_roles;
            } else if (anyRole) {
                activeRole = anyRole;
            }
        }

        setUserProfile({ ...profile, dperfil: activeRole });
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
      } else if (role.startsWith('RESSARCIMENTO')) {
        setActiveTab('ressarcimento_dashboard');
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
<<<<<<< HEAD
    return <LoginView onPostLoginNavigate={(tab) => setActiveTab(tab)} />;
=======
    return <LoginView />;
>>>>>>> 337e63ae355d447079153573de4840f1a3b3b199
  }

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
             <SosfuInbox onNavigate={handleNavigation} userProfile={userProfile} />
             <TeamTable isGestor={true} />
          </div>
        );
      case 'suprido_dashboard':
        return <SupridoDashboard onNavigate={handleNavigation} userProfile={userProfile} />;
      case 'gestor_dashboard':
        return <GestorDashboard onNavigate={handleNavigation} userProfile={userProfile} />;
      case 'sefin_dashboard':
        return <SefinCockpit onNavigate={handleNavigation} userProfile={userProfile} />;
      case 'ajsefin_dashboard':
        return <AjsefinCockpit onNavigate={handleNavigation} userProfile={userProfile} />;
      case 'sgp_dashboard':
        return <SgpDashboard onNavigate={handleNavigation} userProfile={userProfile} />;
      case 'sead_dashboard':
        return <SeadDashboard onNavigate={handleNavigation} userProfile={userProfile} />;
      case 'presidencia_dashboard':
        return <PresidenciaDashboard onNavigate={handleNavigation} userProfile={userProfile} />;
      case 'sodpa_dashboard':
        return <SodpaCockpit onNavigate={handleNavigation} userProfile={userProfile} />;
      case 'ressarcimento_dashboard':
        return <RessarcimentoCockpit onNavigate={handleNavigation} userProfile={userProfile} />;
      case 'solicitation_emergency':
        return <EmergencySolicitation onNavigate={handleNavigation} />;
      case 'solicitation_jury':
        return <JurySolicitation onNavigate={handleNavigation} />;
<<<<<<< HEAD
      case 'solicitation_diarias':
        return <DiariasSolicitation onNavigate={handleNavigation} />;
      case 'solicitation_ressarcimento':
        return <RessarcimentoSolicitation onNavigate={handleNavigation} />;

=======
      
>>>>>>> 337e63ae355d447079153573de4840f1a3b3b199
      // DEPRECATED: accountability_wizard agora é embutido no process_detail
      
      case 'process_detail':
        return selectedProcessId ? (
            <ProcessDetailView 
                processId={selectedProcessId}
                initialTab={processInitialTab}
                userProfile={userProfile}
                onBack={() => {
                    // Se veio do Arquivo, volta pro Arquivo
                    if (processInitialTab === 'ARCHIVE') return setActiveTab('archive');
                    const role = userProfile?.dperfil?.slug || '';
                    if (role.startsWith('SEFIN')) return setActiveTab('sefin_dashboard');
                    if (role.startsWith('AJSEFIN')) return setActiveTab('ajsefin_dashboard');
                    if (role.startsWith('SGP')) return setActiveTab('sgp_dashboard');
                    if (role.startsWith('SEAD')) return setActiveTab('sead_dashboard');
                    if (role.startsWith('PRESIDENCIA')) return setActiveTab('presidencia_dashboard');
                    if (role.startsWith('SODPA')) return setActiveTab('sodpa_dashboard');
                    if (role.startsWith('RESSARCIMENTO')) return setActiveTab('ressarcimento_dashboard');
                    if (role === 'GESTOR') return setActiveTab('gestor_dashboard');
                    if (role === 'USER') return setActiveTab('suprido_dashboard');
                    if (role.startsWith('SOSFU') || role === 'ADMIN') return setActiveTab('accountability');
                    return setActiveTab('dashboard');
                }} 
            />
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
      
      {activeTab === 'sefin_dashboard' || activeTab === 'ajsefin_dashboard' || activeTab === 'sodpa_dashboard' || activeTab === 'ressarcimento_dashboard' ? (
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