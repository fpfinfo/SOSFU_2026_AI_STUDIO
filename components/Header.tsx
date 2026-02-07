import React, { useState, useRef, useEffect } from 'react';
import { Shield, User, Settings, LogOut, ChevronDown, LayoutDashboard, FileText, CheckSquare, PieChart, Briefcase, Gavel, Scale, Archive } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { NotificationPanel } from './NotificationPanel';
import { Tooltip } from './ui/Tooltip';

interface HeaderProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onNavigate?: (page: string, processId?: string) => void;
  userProfile?: any;
}

// ==================== MODULE CONFIGS ====================
// Each independent module defines its own branding
const MODULE_CONFIGS: Record<string, { title: string; subtitle: string; color: string; bgColor: string; textColor: string; accentBg: string; accentText: string }> = {
  sefin_dashboard: {
    title: 'SEFIN TJPA',
    subtitle: '• Secretaria de Finanças',
    color: 'emerald',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    accentBg: 'bg-emerald-50',
    accentText: 'text-emerald-600',
  },
  gestor_dashboard: {
    title: 'Gabinete do Gestor',
    subtitle: '• Gestão de Unidade',
    color: 'amber',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    accentBg: 'bg-amber-50',
    accentText: 'text-amber-600',
  },
  suprido_dashboard: {
    title: 'Portal do Usuário',
    subtitle: '• Servidor Público',
    color: 'indigo',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    accentBg: 'bg-indigo-50',
    accentText: 'text-indigo-600',
  },
};

// Modules that manage their own internal navigation (no tabs in main header)
const INDEPENDENT_MODULES = ['sefin_dashboard', 'gestor_dashboard', 'suprido_dashboard'];

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, onNavigate, userProfile }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const allTabs = [
    { id: 'dashboard', label: 'Painel de Controle', icon: LayoutDashboard, roles: ['ADMIN', 'SOSFU', 'SEFIN', 'PRESIDENCIA', 'SGP', 'AJSEFIN'] },
    { id: 'suprido_dashboard', label: 'Portal do Usuário', icon: Briefcase, roles: ['USER', 'SERVIDOR'] }, 
    { id: 'gestor_dashboard', label: 'Gabinete do Gestor', icon: Gavel, roles: ['GESTOR', 'ADMIN'] },
    { id: 'sefin_dashboard', label: 'Gabinete SEFIN', icon: Scale, roles: ['SEFIN', 'ADMIN'] },
    { id: 'solicitations', label: 'Gestão de Solicitações', icon: FileText, roles: ['ADMIN', 'SOSFU', 'SEFIN'] },
    { id: 'accountability', label: 'Gestão de Contas', icon: CheckSquare, roles: ['ADMIN', 'SOSFU', 'SEFIN'] },
    { id: 'archive', label: 'Arquivo', icon: Archive, roles: ['ADMIN', 'SOSFU', 'SEFIN'] },
    { id: 'reports', label: 'Relatórios', icon: PieChart, roles: ['ADMIN', 'SOSFU', 'PRESIDENCIA'] },
    { id: 'settings', label: 'Configurações', icon: Settings, roles: ['ADMIN', 'SOSFU'] },
  ];

  const userRole = userProfile?.dperfil?.slug || 'SERVIDOR';
  const availableTabs = allTabs.filter(tab => tab.roles.includes(userRole));

  // Determine if current module is independent (has its own internal navigation)
  const isIndependentModule = INDEPENDENT_MODULES.includes(activeTab || '');
  const moduleConfig = MODULE_CONFIGS[activeTab || ''];

  // For independent modules, don't show the standard nav tabs
  // Only show the module's own dashboard tab (for the user to return to their home)
  const visibleTabs = isIndependentModule ? [] : availableTabs;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear(); sessionStorage.clear(); window.location.href = '/';
  };

  const getInitials = (name: string) => (name || 'U').substring(0, 2).toUpperCase();

  // Dynamic branding based on active module
  const headerTitle = moduleConfig?.title || 'SOSFU TJPA';
  const headerSubtitle = moduleConfig?.subtitle || '• Suprimento de Fundos';
  const titleColor = moduleConfig?.textColor || 'text-blue-600';
  const subtitleColor = moduleConfig ? moduleConfig.accentText.replace('600', '400') : 'text-blue-400';
  const activeTabBg = moduleConfig?.accentBg || 'bg-blue-50';
  const activeTabText = moduleConfig?.accentText || 'text-blue-600';

  return (
    <>
    <header className="bg-white border-b border-gray-200 h-16 px-4 md:px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Tooltip content="Voltar ao painel principal" position="bottom" delay={400}>
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onTabChange && onTabChange(availableTabs[0]?.id || 'profile')}>
            <img src="/assets/brasao-tjpa.png" alt="Brasão TJPA" className="h-9 md:h-10 w-auto opacity-90 group-hover:scale-105 transition-transform"/>
            <div className="hidden lg:block">
                <h1 className={`${titleColor} font-bold text-base leading-tight`}>{headerTitle}</h1>
                <p className={`${subtitleColor} text-[9px] font-bold tracking-wider uppercase`}>{headerSubtitle}</p>
            </div>
        </div>
        </Tooltip>
        
        {visibleTabs.length > 0 && <div className="h-8 w-px bg-gray-200 hidden md:block"></div>}
        
        {/* Desktop Navigation — Hidden for independent modules */}
        {onTabChange && visibleTabs.length > 0 && (
            <nav className="hidden md:flex items-center gap-1">
                {visibleTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button 
                            key={tab.id} 
                            onClick={() => onTabChange(tab.id)} 
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${isActive ? `${activeTabBg} ${activeTabText}` : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                            title={tab.label}
                        >
                            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="hidden xl:inline">{tab.label}</span>
                        </button>
                    );
                })}
            </nav>
        )}
      </div>

      <div className="flex items-center gap-4">
        <NotificationPanel userId={userProfile?.id} onNavigate={onNavigate} />
        
        {/* User Dropdown */}
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className={`flex items-center gap-3 pl-2 md:pl-4 md:border-l border-gray-200 group focus:outline-none transition-all ${isMenuOpen ? 'opacity-100' : 'opacity-90'}`}
            >
                <div className="text-right hidden md:block group-hover:opacity-100 transition-opacity">
                    <p className="text-xs font-bold text-gray-800 uppercase leading-none mb-1">{userProfile?.full_name?.split(' ')[0] || 'Usuário'}</p>
                    <div className="flex items-center justify-end gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${userRole === 'ADMIN' ? 'bg-red-500' : 'bg-green-500'}`}></span>
                        <p className="text-[10px] text-gray-500 font-medium leading-none">{userProfile?.dperfil?.name || 'Carregando...'}</p>
                    </div>
                </div>
                <div className="relative">
                    {userProfile?.avatar_url ? (
                        <img 
                            src={userProfile.avatar_url} 
                            alt="User" 
                            className="w-9 h-9 rounded-full border-2 border-white shadow-sm object-cover ring-2 ring-transparent group-hover:ring-blue-100 transition-all"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs border-2 border-white shadow-sm">
                            {getInitials(userProfile?.full_name || 'U')}
                        </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-100">
                        <ChevronDown size={10} className={`text-gray-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                    </div>
                </div>
            </button>

            {isMenuOpen && (
                <div className="absolute right-0 top-full mt-3 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-[60] overflow-hidden">
                    {/* Header Mobile Only */}
                    <div className="md:hidden px-4 py-4 border-b border-gray-100 bg-gray-50/50">
                        <p className="text-sm font-bold text-gray-900 truncate">{userProfile?.full_name}</p>
                        <span className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">
                            <Shield size={10} />
                            {userProfile?.dperfil?.name}
                        </span>
                    </div>

                    <div className="py-1">
                        <button 
                            onClick={() => { setIsMenuOpen(false); onTabChange && onTabChange('profile'); }} 
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                        >
                            <User size={16} className="text-gray-400" /> 
                            <span>Meu Perfil</span>
                        </button>
                        
                        {(userRole === 'ADMIN' || userRole === 'SOSFU') && (
                            <button 
                                onClick={() => { setIsMenuOpen(false); onTabChange && onTabChange('settings'); }} 
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                            >
                                <Settings size={16} className="text-gray-400" /> 
                                <span>Configurações</span>
                            </button>
                        )}
                    </div>

                    <div className="h-px bg-gray-100 my-1 mx-4"></div>
                    
                    <button 
                        onClick={handleLogout} 
                        className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                    >
                        <LogOut size={16} /> 
                        <span>Sair do Sistema</span>
                    </button>
                </div>
            )}
        </div>
      </div>
    </header>
    </>
  );
};