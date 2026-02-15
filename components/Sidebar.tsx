
import React, { useEffect, useState } from 'react';
import { AppTab, AppModule, Profile } from '../types';
import { supabase } from '../services/supabaseClient';
import { getProfile } from '../services/dataService';
import { MODULE_THEMES } from '../utils/themes';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  module: AppModule; 
  setActiveModule: (mod: AppModule) => void;
  isAdmin: boolean;
  userRole: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, module, setActiveModule, isAdmin, userRole }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const theme = MODULE_THEMES[module] || MODULE_THEMES.usuarios;

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const data = await getProfile(user.id);
      setProfile(data);
    }
  };

  const tabs: { id: AppTab; label: string; icon: string }[] = [
    { id: 'inicio', label: 'Início', icon: 'fa-house' },
    { id: 'solicitacoes', label: 'Solicitações', icon: 'fa-briefcase' },
    { id: 'criar', label: 'Lançar Despesa', icon: 'fa-circle-plus' },
    { id: 'despesas', label: 'Minhas Despesas', icon: 'fa-wallet' },
  ];

  // Adicionar Inbox de Gestão se for gestor/admin mesmo no módulo de usuários
  if (module === 'usuarios' && (isAdmin || userRole?.toUpperCase().includes('GESTOR') || userRole?.toUpperCase().includes('ANALISTA') || ['SOSFU', 'DIARIAS', 'REEMBOLSOS', 'ADMIN'].includes(userRole?.toUpperCase()))) {
    tabs.splice(2, 0, { id: 'gestao_inbox', label: 'Inbox Gestão', icon: theme.icon || 'fa-list-check' });
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isManagementActive = module !== 'usuarios';

  const getRoleLabel = (role: string) => {
    if (!role) return 'SERVIDOR';
    if (role === 'ADMIN') return 'ADMINISTRADOR MASTER';
    if (role === 'USUÁRIO' || role === 'USER') return 'SERVIDOR';
    return role.replace('_', ' ');
  };

  const userName = profile?.fullName 
    ? profile.fullName.split(' ')[0] 
    : (profile?.email?.split('@')[0] || 'USUÁRIO');

  return (
    <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 h-screen p-8 shrink-0 transition-all duration-500">
      {/* Module Selector - Master Control */}
      {(isAdmin || 
        userRole?.toUpperCase().includes('GESTOR') || 
        userRole?.toUpperCase().includes('ANALISTA') || 
        userRole?.toUpperCase().includes('ORDENADOR') || 
        userRole?.toUpperCase().includes('SEFIN') || 
        ['SOSFU', 'DIARIAS', 'REEMBOLSOS', 'ADMIN'].includes(userRole?.toUpperCase())) && (
        <div className="mb-8 space-y-3">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Fluxos ÁGIL</span>
          <div className="relative group">
            <i className={`fa-solid ${theme.icon} absolute left-4 top-1/2 -translate-y-1/2 ${theme.primary} transition-all text-sm`}></i>
            <select 
              value={module}
              onChange={(e) => {
                setActiveModule(e.target.value as AppModule);
                setActiveTab('inicio');
              }}
              className="w-full bg-slate-900 dark:bg-slate-800 text-white pl-11 pr-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest outline-none border-none appearance-none cursor-pointer shadow-lg shadow-slate-200 dark:shadow-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <optgroup label="Portal do Servidor">
                <option value="usuarios">Minhas Despesas</option>
              </optgroup>
              <optgroup label="Corregedoria e Auditoria">
                <option value="suprimento">SOSFU (SUPRIMENTO)</option>
                <option value="diarias">SODPA (DIÁRIAS)</option>
                <option value="reembolsos">DESPESA (REEMBOLSO)</option>
                <option value="contas">SOP (PREST. CONTAS)</option>
              </optgroup>
              <optgroup label="Gestão Estratégica">
                <option value="ajsefin">AJSEFIN</option>
                <option value="coorc">COORC</option>
                <option value="sefin">SEFIN</option>
                <option value="sgp">SEGEP (SGP)</option>
                <option value="sead">SEAD</option>
                <option value="presidencia">GABINETE</option>
              </optgroup>
            </select>
            <i className={`fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 ${theme.primary.replace('text-', 'text-opacity-50 text-')} pointer-events-none text-[10px]`}></i>
          </div>
        </div>
      )}

      {/* Título do App */}
      <div className="mb-12 flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setActiveTab('inicio')}>
        <div className="w-12 h-12 flex items-center justify-center">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/217479058_brasao-tjpa.png" 
            alt="Brasão TJPA" 
            className="w-10 h-auto object-contain"
          />
        </div>
        <div className="flex flex-col">
          <span className={`text-3xl font-black ${theme.primary.replace('text-', 'text-')} tracking-tighter leading-none italic`}>ÁGIL</span>
        </div>
      </div>

      {/* Navegação por Módulo */}
      {module === 'usuarios' ? (
        <nav className="flex-1 space-y-3">
          {tabs.map((tab) => {
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 ${
                  isTabActive 
                    ? `bg-gradient-to-r ${theme.gradient} text-white shadow-xl shadow-emerald-100 dark:shadow-none scale-[1.02]` 
                    : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <i className={`fa-solid ${tab.icon} text-lg w-6`}></i>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      ) : module === 'sefin' ? (
            <nav className="flex-1 space-y-3">
             <button 
               onClick={() => setActiveTab('inicio')}
               className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
                 activeTab === 'inicio' ? `bg-gradient-to-r ${theme.gradient} text-white shadow-xl dark:shadow-none` : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
               }`}
             >
                <i className="fa-solid fa-house text-lg w-6 text-center"></i>
                <span>Início</span>
             </button>

             <button 
               onClick={() => setActiveTab('gestao_inbox')}
               className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
                 activeTab === 'gestao_inbox' ? `bg-gradient-to-r ${theme.gradient} text-white shadow-xl dark:shadow-none` : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
               }`}
             >
                <i className="fa-solid fa-file-signature text-lg w-6 text-center"></i>
                <span>Minutas</span>
             </button>

             <button 
               onClick={() => setActiveTab('gestao_contas')}
               className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
                 activeTab === 'gestao_contas' ? `bg-gradient-to-r ${theme.gradient} text-white shadow-xl dark:shadow-none` : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
               }`}
             >
                <i className="fa-solid fa-check-double text-lg w-6 text-center"></i>
                <span>Autorizados</span>
             </button>

             <button 
               onClick={() => setActiveTab('gestao_config')}
               className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
                 activeTab === 'gestao_config' ? `bg-gradient-to-r ${theme.gradient} text-white shadow-xl dark:shadow-none` : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
               }`}
             >
                <i className="fa-solid fa-sliders text-lg w-6 text-center"></i>
                <span>Configurações</span>
             </button>
          </nav>
      ) : (
            <nav className="flex-1 space-y-3">
             <button 
               onClick={() => setActiveTab('inicio')}
               className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
                 activeTab === 'inicio' ? `bg-gradient-to-r ${theme.gradient} text-white shadow-xl dark:shadow-none` : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
               }`}
             >
                <i className="fa-solid fa-house text-lg w-6 text-center"></i>
                <span>Início (Pessoal)</span>
             </button>

             <button 
               onClick={() => setActiveTab('gestao_inbox')}
               className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
                 activeTab === 'gestao_inbox' ? `bg-gradient-to-r ${theme.gradient} text-white shadow-xl dark:shadow-none` : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
               }`}
             >
                <i className={`fa-solid ${theme.icon} text-lg w-6 text-center`}></i>
                <span>Inbox de Gestão</span>
             </button>

             <button 
               onClick={() => setActiveTab('gestao_mesa')}
               className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
                 activeTab === 'gestao_mesa' ? `bg-gradient-to-r ${theme.gradient} text-white shadow-xl dark:shadow-none` : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
               }`}
             >
                <i className="fa-solid fa-desktop text-lg w-6 text-center"></i>
                <span>Minha Mesa</span>
             </button>
             
             <button 
               onClick={() => setActiveTab('gestao_config')}
               className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
                 activeTab === 'gestao_config' ? `bg-gradient-to-r ${theme.gradient} text-white shadow-xl dark:shadow-none` : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
               }`}
             >
                <i className="fa-solid fa-sliders text-lg w-6 text-center"></i>
                <span>Configurações</span>
             </button>
          </nav>
      )}
   {/* User Card Bottom */}
      <div className="mt-auto pt-8">
        <div 
          onClick={() => setActiveTab('mais')}
          className={`bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 p-4 rounded-3xl flex items-center gap-4 group transition-all cursor-pointer ${theme.hover.replace('hover:', 'hover:border-')}`}
        >
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black shadow-sm shrink-0 overflow-hidden relative">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} className="w-full h-full object-cover" />
            ) : (
              <span className={`text-lg ${theme.primary.replace('text-', 'text-')} font-black`}>{userName[0]}</span>
            )}
            <div className={`absolute inset-0 transition-colors ${theme.secondary.replace('bg-', 'group-hover:bg-').replace('-600', '-600/10')}`}></div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`text-[10px] font-black text-slate-800 dark:text-slate-200 truncate leading-tight uppercase tracking-tight transition-colors ${theme.primary.replace('text-', 'group-hover:text-')}`}>
              {userName}
            </h4>
            <div className="flex items-center gap-1 mt-0.5">
               <span className={`w-1.5 h-1.5 rounded-full ${theme.secondary.replace('bg-', 'bg-')} animate-pulse`}></span>
               <p className="text-[8px] text-slate-400 font-bold truncate uppercase tracking-widest">
                {getRoleLabel(userRole)}
               </p>
            </div>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); handleLogout(); }} 
            className="text-slate-300 hover:text-red-500 transition-colors px-2"
          >
            <i className="fa-solid fa-right-from-bracket text-xs"></i>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
