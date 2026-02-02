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
import { LoginPage } from './components/LoginPage';
import { DASHBOARD_STATS } from './constants';
import { MessageSquare, Loader2 } from 'lucide-react';

// Interface para o perfil do usuário
interface UserProfile {
  id: string;
  full_name: string;
  matricula: string;
  avatar_url: string;
  perfil_id: string;
  email?: string;
  dperfil?: {
    slug: string;
    name: string;
    allowed_modules: string[];
  };
}

function App() {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  const fetchUserProfile = async (userId: string) => {
      try {
          const { data, error } = await supabase
              .from('profiles')
              .select(`
                  *,
                  dperfil:perfil_id (
                      slug,
                      name,
                      allowed_modules
                  )
              `)
              .eq('id', userId)
              .single();

          if (error) {
            console.error('Erro ao buscar perfil:', error);
            // Em caso de erro, não bloqueamos totalmente, tentamos carregar o login
            setIsLoading(false);
            return;
          }

          if (data) {
              // ------------------------------------------------------------------
              // OVERRIDE DE SEGURANÇA: Garante acesso SOSFU para Fabio Freitas
              // Verifica email OU nome para ser à prova de falhas
              // ------------------------------------------------------------------
              const email = data.email?.toLowerCase().trim() || '';
              const name = data.full_name?.toLowerCase().trim() || '';
              
              if (email.includes('fabio.freitas') || name.includes('fabio pereira de freitas')) {
                  console.log('Aplicando override de perfil SOSFU para:', data.full_name);
                  data.dperfil = {
                      slug: 'SOSFU',
                      name: 'Técnico SOSFU',
                      allowed_modules: ['dashboard', 'solicitations', 'accountability', 'reports', 'settings']
                  };
                  // Garante matrícula correta se não existir
                  if (!data.matricula || data.matricula === 'AGUARDANDO') {
                      data.matricula = '203424';
                  }
              }
              // ------------------------------------------------------------------

              setUserProfile(data);
              
              // Lógica de Redirecionamento Inicial baseada no Perfil
              const roleSlug = data.dperfil?.slug;
              
              // Se for servidor, vai para o dashboard do suprido
              // Se for SOSFU/Admin (inclusive via override), vai para o dashboard técnico
              if (roleSlug === 'SERVIDOR') {
                  setActiveTab('suprido_dashboard');
              } else {
                  setActiveTab('dashboard');
              }
          }
      } catch (error) {
          console.error('Erro fatal ao carregar perfil:', error);
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession()
        .then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                fetchUserProfile(session.user.id);
            } else {
                setIsLoading(false);
            }
        })
        .catch((err) => {
            console.error('Error checking session:', err);
            setSession(null);
            setIsLoading(false);
        });

    // Listen for changes on auth state
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);


  if (isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-500 font-medium animate-pulse">Carregando sistema...</p>
            </div>
        </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  // Define se é uma visão técnica (Admin/Sosfu) ou visão de Servidor
  // A esse ponto, userProfile já tem o override aplicado se for o Fabio
  const isTechnicalView = userProfile?.dperfil?.slug !== 'SERVIDOR';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 pb-12 relative">
      <Header 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        userProfile={userProfile} 
      />
      
      <main className="max-w-[1600px] mx-auto px-6 pt-6">
        
        {/* Dashboard View (Admin/Técnico) */}
        {activeTab === 'dashboard' && isTechnicalView && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {DASHBOARD_STATS.map((stat) => (
                <StatCard key={stat.id} data={stat} />
              ))}
            </div>
            {/* Team Section */}
            <TeamTable />
          </div>
        )}

        {/* Módulo Suprido (Acessível para Servidor e Admins que querem ver a view) */}
        {activeTab === 'suprido_dashboard' && <SupridoDashboard />}

        {/* Solicitations View (Técnica) */}
        {activeTab === 'solicitations' && isTechnicalView && <SolicitationsView />}

        {/* Accountability View (Técnica) */}
        {activeTab === 'accountability' && isTechnicalView && <AccountabilityView />}

        {/* Settings View (Apenas Admin e SOSFU normalmente, mas liberado para demo) */}
        {activeTab === 'settings' && isTechnicalView && <SettingsView />}

        {/* Profile View (Todos) */}
        {activeTab === 'profile' && <ProfileView />}

        {/* Placeholder for other tabs */}
        {(activeTab === 'reports') && isTechnicalView && (
            <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare size={32} />
                </div>
                <h3 className="text-lg font-semibold">Módulo em Desenvolvimento</h3>
                <p className="text-sm">Relatórios gerenciais estarão disponíveis em breve.</p>
            </div>
        )}

      </main>

      {/* Floating Action Button (Chat) - Disponível para todos */}
      <div className="fixed bottom-1/2 right-0 translate-y-1/2 translate-x-1/2 z-40 hover:translate-x-0 transition-transform duration-300">
        <button className="bg-gray-800 text-white w-12 h-12 rounded-l-full flex items-center justify-center shadow-lg hover:bg-gray-700">
            <MessageSquare size={20} />
        </button>
      </div>
    </div>
  );
}

export default App;