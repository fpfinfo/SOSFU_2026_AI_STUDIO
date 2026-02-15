
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import RequestsByManager from './components/RequestsByManager';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Requests from './components/Requests';
import NewExpense from './components/NewExpense';
import ExpenseList from './components/ExpenseList';
import RequestForms from './components/RequestForms';
import RequestDetails from './components/RequestDetails';
import ManagementDashboard from './components/ManagementDashboard';
import ManagementSettings from './components/ManagementSettings';
import AccountabilityManagement from './components/AccountabilityManagement';
import Auth from './components/Auth';
import ProfilePage from './components/ProfilePage';
import AgilLiveAssistant from './components/AgilLiveAssistant';
import { NotificationProvider } from './contexts/NotificationContext';
import { Profile, RequestItem, AppModule, Expense } from './types';
import { supabase } from './services/supabaseClient';
import { getProfile, getRequests } from './services/dataService';

export type AppTab = 'inicio' | 'solicitacoes' | 'formularios' | 'gestao_inbox' | 'gestao_mesa' | 'gestao_contas' | 'gestao_config' | 'mais' | 'despesas' | 'criar' | 'contas';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeModule, setActiveModule] = useState<AppModule>('usuarios');
  const [activeTab, setActiveTab] = useState<AppTab>('inicio');
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingRequest, setEditingRequest] = useState<RequestItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const data = await getProfile(userId);
      console.log("Perfil carregado:", data); // Log para debug interno se necessário
      setProfile(data);
      
      if (data) {
        const role = (data.systemRole || '').toUpperCase();
        
        // Lógica de Roteamento Baseada em Perfil Institucional
        if (role === 'ADMIN') {
          setActiveModule('suprimento');
        } else if (role.includes('SUPRIMENTO') || role.includes('SOSFU') || role.includes('ANALISTA_SUPRIMENTO')) {
          setActiveModule('suprimento');
        } else if (role.includes('DIARIAS') || role.includes('SODPA')) {
          setActiveModule('diarias');
        } else if (role.includes('REEMBOLSOS')) {
          setActiveModule('reembolsos');
        } else if (role.includes('CONTAS') || role.includes('SOP')) {
          setActiveModule('contas');
        } else if (role.includes('AJSEFIN')) {
          setActiveModule('ajsefin');
        } else if (role.includes('SEFIN')) {
          setActiveModule('sefin');
        } else if (role.includes('COORC')) {
          setActiveModule('coorc');
        } else if (role.includes('SEAD')) {
          setActiveModule('sead');
        } else if (role.includes('SGP') || role.includes('SEGEP')) {
          setActiveModule('sgp');
        } else {
          setActiveModule('usuarios');
        }
      }
    } catch (e) {
      console.error("Erro ao carregar perfil:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleResolvePending = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      const allRequests = await getRequests();
      
      // 1. Prioridade: Solicitações de subordinados que eu preciso assinar
      const toSign = allRequests.find(r => 
        r.status === 'Pendente' && 
        r.managerInfo?.email === profile.email
      );

      if (toSign) {
        setSelectedRequest(toSign);
        setActiveTab('gestao_inbox');
        setLoading(false);
        return;
      }

      // 2. Secundário: Minhas próprias solicitações que estão pendentes
      const myPending = allRequests.find(r => 
        r.status === 'Pendente' && 
        r.userId === profile.id
      );

      if (myPending) {
        setSelectedRequest(myPending);
        setActiveTab('solicitacoes');
        setLoading(false);
        return;
      }

      setActiveTab('solicitacoes');
    } catch (e) {
      console.error("Erro ao resolver pendências:", e);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = profile?.systemRole === 'ADMIN' || session?.user?.email === 'fabio.freitas@tjpa.jus.br';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-6">
           <img src="https://glnwuozsxzcnotpfmxcb.supabase.co/storage/v1/object/public/avatars/217479058_brasao-tjpa.png" className="w-16 animate-pulse" />
           <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 animate-[loading_2s_ease-in-out_infinite] w-1/2"></div>
           </div>
           <p className="text-emerald-500/50 font-black text-[10px] uppercase tracking-[0.3em]">Autenticando no ÁGIL...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Auth />;

  const renderContent = () => {
    if (selectedRequest) {
      return (
        <RequestDetails
          request={selectedRequest}
          onBack={() => setSelectedRequest(null)}
          isManagerView={activeTab === 'gestao_inbox'}
          activeModule={activeModule}
          onRefresh={async () => {
             const updated = await getRequests();
             const req = updated.find(r => r.id === selectedRequest.id);
             if (req) setSelectedRequest(req);
          }}
        />
      );
    }

    // Rotas de Gestão (Manager/Admin)
    if (activeModule !== 'usuarios') {
      if (activeModule === 'contas') {
        if (activeTab === 'gestao_config') return <ManagementSettings module={activeModule} />;
        return <AccountabilityManagement />;
      }

      switch (activeTab) {
        case 'gestao_inbox': return <ManagementDashboard module={activeModule} onSelectRequest={setSelectedRequest} profile={profile} />;
        case 'gestao_mesa': return <ManagementDashboard module={activeModule} onSelectRequest={setSelectedRequest} initialTab="Inbox" isPersonalDesk={true} profile={profile} />;
        case 'gestao_contas': return <AccountabilityManagement />;
        case 'gestao_config': return <ManagementSettings module={activeModule} />;
        case 'inicio': return (
          <Dashboard 
            module={activeModule} 
            profile={profile} 
            onResolvePending={handleResolvePending} 
            onViewPendingList={() => setActiveTab('gestao_inbox')}
          />
        );
        default: return <ManagementDashboard module={activeModule} onSelectRequest={setSelectedRequest} />;
      }
    }

    // Portal do Servidor (User)
    if (editingExpense) {
      return (
        <NewExpense 
          onComplete={() => { setEditingExpense(null); setActiveTab('despesas'); }} 
          initialData={{
            id: editingExpense.id,
            description: editingExpense.merchant,
            amount: editingExpense.amount.toString(),
            category: editingExpense.category,
            date: editingExpense.date
          }}
          isEditing={true}
        />
      );
    }

    switch (activeTab) {
      case 'inicio': return (
        <Dashboard 
          module={activeModule} 
          profile={profile} 
          onResolvePending={handleResolvePending} 
          onViewPendingList={() => setActiveTab('gestao_inbox')}
        />
      );
      case 'gestao_inbox': return <RequestsByManager onSelectRequest={setSelectedRequest} />;
      case 'solicitacoes': return (
        <Requests 
          onAddClick={() => setActiveTab('formularios')} 
          onSelectRequest={setSelectedRequest} 
          onEditRequest={(req) => { setEditingRequest(req); setActiveTab('formularios'); }}
        />
      );
      case 'formularios': return (
        <RequestForms 
          onBack={() => { setEditingRequest(null); setActiveTab('solicitacoes'); }} 
          editingRequest={editingRequest || undefined}
        />
      );
      case 'criar': return <NewExpense onComplete={() => setActiveTab('despesas')} />;
      case 'despesas': return <ExpenseList onEdit={setEditingExpense} />;
      case 'mais': return <ProfilePage onForceRefresh={() => fetchProfile(session.user.id)} />;
      default: return (
        <Dashboard 
          module={activeModule} 
          profile={profile} 
          onResolvePending={handleResolvePending} 
          onViewPendingList={() => setActiveTab('gestao_inbox')}
        />
      );
    }
  };

  return (
    <NotificationProvider>
      <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 overflow-hidden transition-colors duration-500">
        <Sidebar 
          activeTab={activeTab === 'formularios' ? 'solicitacoes' : activeTab} 
          setActiveTab={(tab) => { 
            setSelectedRequest(null);
            setEditingExpense(null);
            setEditingRequest(null);
            setActiveTab(tab as AppTab); 
          }}
          module={activeModule} 
          setActiveModule={(mod) => { setActiveModule(mod); setActiveTab('inicio'); }}
          isAdmin={isAdmin}
          userRole={profile?.systemRole || 'USUÁRIO'}
        />

        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <Header 
            activeModule={activeModule} 
            profile={profile}
            onProfileClick={() => setActiveTab('mais')}
          />
          
          <main className="flex-1 overflow-y-auto pb-24 md:pb-8">
            <div className={`${activeModule !== 'usuarios' ? 'max-w-none px-0' : 'max-w-6xl mx-auto px-6' } w-full transition-all duration-500`}>
              {renderContent()}
            </div>
          </main>

          <div className="md:hidden">
            <BottomNav activeTab={activeTab} setActiveTab={(tab) => setActiveTab(tab as AppTab)} />
          </div>
        </div>
        <AgilLiveAssistant />
      </div>
    </NotificationProvider>
  );
};

export default App;
