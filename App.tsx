import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Header } from './components/Header';
import { StatCard } from './components/StatCard';
import { TeamTable } from './components/TeamTable';
import { SolicitationsView } from './components/SolicitationsView';
import { AccountabilityView } from './components/AccountabilityView';
import { SettingsView } from './components/SettingsView';
import { ProfileView } from './components/ProfileView';
import { LoginPage } from './components/LoginPage';
import { DASHBOARD_STATS } from './constants';
import { MessageSquare } from 'lucide-react';

function App() {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 pb-12 relative">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="max-w-[1600px] mx-auto px-6 pt-6">
        
        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
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

        {/* Solicitations View */}
        {activeTab === 'solicitations' && <SolicitationsView />}

        {/* Accountability View */}
        {activeTab === 'accountability' && <AccountabilityView />}

        {/* Settings View */}
        {activeTab === 'settings' && <SettingsView />}

        {/* Profile View */}
        {activeTab === 'profile' && <ProfileView />}

        {/* Placeholder for other tabs */}
        {(activeTab === 'reports') && (
            <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare size={32} />
                </div>
                <h3 className="text-lg font-semibold">Módulo em Desenvolvimento</h3>
                <p className="text-sm">Esta funcionalidade estará disponível em breve.</p>
            </div>
        )}

      </main>

      {/* Floating Action Button (Chat) */}
      <div className="fixed bottom-1/2 right-0 translate-y-1/2 translate-x-1/2 z-40 hover:translate-x-0 transition-transform duration-300">
        <button className="bg-gray-800 text-white w-12 h-12 rounded-l-full flex items-center justify-center shadow-lg hover:bg-gray-700">
            <MessageSquare size={20} />
        </button>
      </div>
    </div>
  );
}

export default App;