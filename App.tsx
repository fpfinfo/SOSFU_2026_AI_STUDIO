import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Header } from './components/Header';
import { StatCard } from './components/StatCard';
import { TeamTable } from './components/TeamTable';
import { SolicitationsView } from './components/SolicitationsView';
import { AccountabilityView } from './components/AccountabilityView';
import { SettingsView } from './components/SettingsView';
import { ProfileView } from './components/ProfileView';
import { SupridoDashboard } from './components/suprido/SupridoDashboard';
import { GestorDashboard } from './components/gestor/GestorDashboard';
import { SefinDashboard } from './components/sefin/SefinDashboard';
import { EmergencySolicitation } from './components/suprido/EmergencySolicitation';
import { JurySolicitation } from './components/suprido/JurySolicitation';
import { ProcessDetailView } from './components/process/ProcessDetailView';
import { LoginPage } from './components/LoginPage';
import { DASHBOARD_STATS } from './constants';
import { MessageSquare, Loader2 } from 'lucide-react';

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

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  
  // Estado para armazenar o ID do processo selecionado para visualização
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);

  useEffect(() => {
    // Inicialização da Sessão com Tratamento de Erro
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        if (session) {
            fetchUserProfile(session.user.id);
        } else {
            setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Erro crítico ao inicializar sessão:", err);
        setLoading(false); // Garante que o loading pare mesmo com erro
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
          // Apenas busca o perfil se não estivermos já carregando (evita flash)
          fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => { subscription.unsubscribe(); };
  }, []);

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
        // MODO DE RECUPERAÇÃO: Se falhar ao buscar o perfil (ex: erro de RLS), cria um perfil "fake" de admin
        // para permitir que o usuário acesse as Configurações e veja o comando SQL de correção.
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
        
        // Lógica de Redirecionamento Inicial baseada no Perfil
        const role = data.dperfil?.slug;
        
        // Só redireciona se estiver na tab padrão (dashboard) para evitar sobrescrever navegação do usuário
        if (activeTab === 'dashboard') {
            if (role === 'SUPRIDO' || role === 'SERVIDOR') {
                setActiveTab('suprido_dashboard');
            } else if (role === 'GESTOR') {
                setActiveTab('gestor_dashboard');
            } else if (role === 'SEFIN') {
                setActiveTab('sefin_dashboard');
            }
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função auxiliar de navegação que lida com passagem de ID
  const handleNavigation = (page: string, processId?: string) => {
      if (processId) setSelectedProcessId(processId);
      setActiveTab(page);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                {DASHBOARD_STATS.map((stat) => (
                  <StatCard key={stat.id} data={stat} />
                ))}
             </div>
             <TeamTable />
          </div>
        );
      case 'suprido_dashboard':
        return <SupridoDashboard onNavigate={handleNavigation} />;
      case 'gestor_dashboard':
        return <GestorDashboard onNavigate={handleNavigation} />;
      case 'sefin_dashboard':
        return <SefinDashboard onNavigate={handleNavigation} />;
      case 'solicitation_emergency':
        return <EmergencySolicitation onNavigate={handleNavigation} />;
      case 'solicitation_jury':
        return <JurySolicitation onNavigate={handleNavigation} />;
      case 'process_detail':
        return selectedProcessId ? (
            <ProcessDetailView 
                processId={selectedProcessId} 
                onBack={() => {
                    const role = userProfile?.dperfil?.slug;
                    if (role === 'SEFIN') return setActiveTab('sefin_dashboard');
                    if (role === 'GESTOR') return setActiveTab('gestor_dashboard');
                    if (role === 'SUPRIDO') return setActiveTab('suprido_dashboard');
                    return setActiveTab('dashboard');
                }} 
            />
        ) : (
            <div>Erro: Processo não selecionado</div>
        );
      case 'solicitations':
        return <SolicitationsView />;
      case 'accountability':
        return <AccountabilityView />;
      case 'settings':
        return <SettingsView />;
      case 'profile':
        return <ProfileView />;
      case 'reports':
        return (
            <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                     <MessageSquare size={32} />
                </div>
                <h3 className="text-lg font-semibold">Módulo de Relatórios</h3>
                <p className="text-sm">Em desenvolvimento.</p>
            </div>
        );
      default:
        return <div>Tab not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onNavigate={handleNavigation}
        userProfile={userProfile}
      />
      
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;