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
import { FilterBar } from './components/FilterBar';

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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
      }
      
      if (data) {
         // Override temporário para demonstração (Fabio Freitas = SOSFU)
         const email = data.email?.toLowerCase().trim() || '';
         const name = data.full_name?.toLowerCase().trim() || '';

         if (email.includes('fabio.freitas') || name.includes('fabio pereira de freitas')) {
             data.dperfil = { name: 'Equipe Técnica SOSFU', slug: 'SOSFU' };
        }
        
        setUserProfile(data);
        
        // Lógica de Redirecionamento Inicial baseada no Perfil
        const role = data.dperfil?.slug;
        
        if (role === 'SUPRIDO' || role === 'SERVIDOR') {
            setActiveTab('suprido_dashboard');
        } else if (role === 'SOSFU' || role === 'ADMIN' || role === 'SEFIN') {
             // Se estava em suprido_dashboard (ex: logout/login), força dashboard
             if (activeTab === 'suprido_dashboard') {
                 setActiveTab('dashboard');
             }
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
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
             <FilterBar />
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                {DASHBOARD_STATS.map((stat) => (
                  <StatCard key={stat.id} data={stat} />
                ))}
             </div>
             <TeamTable />
          </div>
        );
      case 'suprido_dashboard':
        return <SupridoDashboard />;
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
        userProfile={userProfile}
      />
      
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;