import React, { useState, useRef, useEffect } from 'react';
import { Shield, User, Settings, LogOut, ChevronDown, LayoutDashboard, FileText, CheckSquare, PieChart, Briefcase, Gavel, Scale, Archive, Map } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { NotificationPanel } from './NotificationPanel';
import { Tooltip } from './ui/Tooltip';

interface HeaderProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onNavigate?: (page: string, processId?: string) => void;
  userProfile?: any;
  availableRoles?: {slug: string, name: string}[];
}

// ==================== MODULE CONFIGS ====================
// Each independent module defines its own branding
const MODULE_CONFIGS: Record<string, { title: string; subtitle: string; color: string; bgColor: string; textColor: string; accentBg: string; accentText: string }> = {
  sefin_dashboard: {
    title: 'SEFIN TJPA',
    subtitle: '• Secretaria de Finanças',
    color: 'teal',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    accentBg: 'bg-teal-50',
    accentText: 'text-teal-600',
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
  ajsefin_dashboard: {
    title: 'AJSEFIN TJPA',
    subtitle: '• Assessoria Jurídica',
    color: 'teal',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    accentBg: 'bg-teal-50',
    accentText: 'text-teal-600',
  },
  suprido_dashboard: {
    title: 'Portal do Usuário',
    subtitle: '• Servidor Público',
    color: 'teal',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    accentBg: 'bg-teal-50',
    accentText: 'text-teal-600',
  },
  sodpa_dashboard: {
    title: 'SODPA TJPA',
    subtitle: '• Serviço de Diárias e Passagens',
    color: 'sky',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
    accentBg: 'bg-sky-50',
    accentText: 'text-sky-600',
  },
  ressarcimento_dashboard: {
    title: 'RESSARCIMENTO TJPA',
    subtitle: '• Gestão de Despesas e Reembolsos',
    color: 'emerald',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    accentBg: 'bg-emerald-50',
    accentText: 'text-emerald-600',
  },
  dashboard: {
    title: 'SOSFU',
    subtitle: '• Gerência de Suprimento de Fundos',
    color: 'teal',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    accentBg: 'bg-teal-50',
    accentText: 'text-teal-600',
  },
  solicitations: {
    title: 'SOSFU',
    subtitle: '• Gerência de Suprimento de Fundos',
    color: 'teal',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    accentBg: 'bg-teal-50',
    accentText: 'text-teal-600',
  },
  accountability: {
    title: 'SOSFU',
    subtitle: '• Gerência de Suprimento de Fundos',
    color: 'teal',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    accentBg: 'bg-teal-50',
    accentText: 'text-teal-600',
  },
  archive: {
    title: 'SOSFU',
    subtitle: '• Gerência de Suprimento de Fundos',
    color: 'teal',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    accentBg: 'bg-teal-50',
    accentText: 'text-teal-600',
  },
  reports: {
    title: 'SOSFU',
    subtitle: '• Gerência de Suprimento de Fundos',
    color: 'teal',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    accentBg: 'bg-teal-50',
    accentText: 'text-teal-600',
  },
  settings: {
    title: 'SOSFU',
    subtitle: '• Gerência de Suprimento de Fundos',
    color: 'teal',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    accentBg: 'bg-teal-50',
    accentText: 'text-teal-600',
  },
  sgp_dashboard: {
    title: 'SGP TJPA',
    subtitle: '• Gestão de Pessoas',
    color: 'pink',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-700',
    accentBg: 'bg-pink-50',
    accentText: 'text-pink-600',
  },
  sead_dashboard: {
    title: 'SEAD TJPA',
    subtitle: '• Secretaria de Administração',
    color: 'slate',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-700',
    accentBg: 'bg-slate-50',
    accentText: 'text-slate-600',
  },
  presidencia_dashboard: {
    title: 'PRESIDÊNCIA TJPA',
    subtitle: '• Gabinete da Presidência',
    color: 'orange',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    accentBg: 'bg-orange-50',
    accentText: 'text-orange-600',
  },
};

// Modules that manage their own internal navigation (no tabs in main header)
const INDEPENDENT_MODULES = [
  'sefin_dashboard', 'gestor_dashboard', 'suprido_dashboard', 'ajsefin_dashboard', 
  'sodpa_dashboard', 'ressarcimento_dashboard', 'sgp_dashboard', 'sead_dashboard', 'presidencia_dashboard'
];

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, onNavigate, userProfile, availableRoles = [] }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const switcherRef = useRef<HTMLDivElement>(null);
  const [gestorLocationTitle, setGestorLocationTitle] = useState<string | null>(null);
  
  const allTabs = [
    { id: 'dashboard', label: 'Painel de Controle', icon: LayoutDashboard, roles: ['ADMIN', 'SOSFU_GESTOR', 'SOSFU_EQUIPE'] },
    { id: 'map_view', label: 'Mapa Geográfico', icon: Map, roles: ['ADMIN', 'SOSFU_GESTOR', 'SOSFU_EQUIPE', 'PRESIDENCIA_GESTOR', 'PRESIDENCIA_EQUIPE', 'SODPA_GESTOR', 'SODPA_EQUIPE'] },
  ];

  const modularDashboards = [
    { id: 'suprido_dashboard', label: 'Portal do Usuário', icon: Briefcase, roles: ['USER', 'SERVIDOR', 'ADMIN'], color: 'teal' },
    { id: 'gestor_dashboard', label: 'Gabinete do Gestor', icon: Gavel, roles: ['GESTOR', 'ADMIN'], color: 'amber' },
    { id: 'sefin_dashboard', label: 'Gabinete SEFIN', icon: Scale, roles: ['SEFIN', 'ADMIN'], color: 'teal' },
    { id: 'ajsefin_dashboard', label: 'Gabinete AJSEFIN', icon: Scale, roles: ['AJSEFIN', 'ADMIN'], color: 'teal' },
    { id: 'sodpa_dashboard', label: 'Gabinete SODPA', icon: PieChart, roles: ['SODPA', 'ADMIN'], color: 'sky' },
    { id: 'ressarcimento_dashboard', label: 'Gabinete Ressarcimento', icon: Shield, roles: ['RESSARCIMENTO', 'ADMIN'], color: 'emerald' },
    { id: 'sgp_dashboard', label: 'Gabinete SGP', icon: User, roles: ['SGP', 'ADMIN'], color: 'pink' },
    { id: 'sead_dashboard', label: 'Gabinete SEAD', icon: Settings, roles: ['SEAD', 'ADMIN'], color: 'slate' },
    { id: 'presidencia_dashboard', label: 'Gabinete Presidência', icon: Shield, roles: ['PRESIDENCIA', 'ADMIN'], color: 'orange' },
  ];

  const handleRoleSwitch = (slug: string) => {
    localStorage.setItem('simulated_role', slug);
    setIsMenuOpen(false);
    window.location.reload(); // Re-render everything with new role context
  };

  const userRole = userProfile?.dperfil?.slug || 'SERVIDOR';
  const availableTabs = allTabs.filter(tab => tab.roles.includes(userRole));

  // Determine if current module is independent (has its own internal navigation)
  const isIndependentModule = INDEPENDENT_MODULES.includes(activeTab || '');
  
  let moduleConfig = MODULE_CONFIGS[activeTab || ''];

  // 🆕 Global Context Persistence (Profile, Settings, Forms, Details)
  // Ensures branding persists when navigating to shared views
  const sharedViews = ['process_accountability', 'process_detail', 'profile', 'settings', 'solicitation_emergency', 'solicitation_jury', 'solicitation_diarias', 'solicitation_ressarcimento'];
  
  if (sharedViews.includes(activeTab || '') || !moduleConfig) {
      if (userRole === 'USER' || userRole === 'SERVIDOR') {
          moduleConfig = MODULE_CONFIGS['suprido_dashboard'];
      } else if (userRole.startsWith('GESTOR')) {
          moduleConfig = MODULE_CONFIGS['gestor_dashboard'];
      } else if (userRole.startsWith('SEFIN')) {
          moduleConfig = MODULE_CONFIGS['sefin_dashboard'];
      } else if (userRole.startsWith('AJSEFIN')) {
          moduleConfig = MODULE_CONFIGS['ajsefin_dashboard'];
      } else if (userRole.startsWith('SOSFU') || userRole === 'ADMIN' || userRole.startsWith('SGP') || userRole.startsWith('PRESIDENCIA') || userRole.startsWith('SEAD')) {
          moduleConfig = MODULE_CONFIGS['dashboard']; // SOSFU Branding (Default for Admin/Central Roles)
      } else if (userRole.startsWith('SODPA')) {
          moduleConfig = MODULE_CONFIGS['sodpa_dashboard'];
      } else if (userRole.startsWith('RESSARCIMENTO')) {
          moduleConfig = MODULE_CONFIGS['ressarcimento_dashboard'];
      }
  }

  // For independent modules, don't show the standard nav tabs
  // Only show the module's own dashboard tab (for the user to return to their home)
  const visibleTabs = isIndependentModule ? [] : availableTabs;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) setIsSwitcherOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch gestor's comarca/unidade for dynamic header title
  // Fetch gestor's comarca/unidade for dynamic header title
  useEffect(() => {
    // Also fetch if on shared views to maintain context
    if (activeTab !== 'gestor_dashboard' && !sharedViews.includes(activeTab || '')) { 
        setGestorLocationTitle(null); 
        return; 
    }

    const EXCLUDED_SIGLAS = ['SOSFU', 'AJSEFIN', 'SEFIN', 'SGP', 'SEAD', 'SODPA', 'GABPRES', 'GABVICE', 'GABCOR'];

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1) dcomarcas.gestor_id
        const { data: comarca } = await supabase
          .from('dcomarcas')
          .select('comarca')
          .eq('gestor_id', user.id)
          .limit(1)
          .maybeSingle();

        if (comarca?.comarca) {
          setGestorLocationTitle(`Comarca de ${comarca.comarca}`);
          return;
        }

        // 2) dUnidadesAdmin.responsavel_id
        const { data: unidade } = await supabase
          .from('dUnidadesAdmin')
          .select('nome, sigla')
          .eq('responsavel_id', user.id)
          .limit(1)
          .maybeSingle();

        if (unidade?.nome && !EXCLUDED_SIGLAS.includes(unidade.sigla || '')) {
          setGestorLocationTitle(unidade.nome);
        }
      } catch (err) {
        console.error('Header: erro ao buscar localidade do gestor:', err);
      }
    })();
  }, [activeTab]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear(); sessionStorage.clear(); window.location.href = '/';
  };

  const getInitials = (name: string) => (name || 'U').substring(0, 2).toUpperCase();

  // Dynamic branding based on active module
  const headerTitle = ((activeTab === 'gestor_dashboard' || sharedViews.includes(activeTab || '')) && gestorLocationTitle && userRole.startsWith('GESTOR'))
    ? gestorLocationTitle
    : (moduleConfig?.title || 'SODPA TJPA');
  const headerSubtitle = moduleConfig?.subtitle || '• Serviço de Diárias e Passagens';
  const titleColor = moduleConfig?.textColor || 'text-blue-600';
  const subtitleColor = moduleConfig ? moduleConfig.accentText.replace('600', '400') : 'text-blue-400';
  const activeTabBg = moduleConfig?.accentBg || 'bg-blue-50';
  const activeTabText = moduleConfig?.accentText || 'text-blue-600';

  return (
    <>
    <header className="bg-white border-b border-gray-200 h-16 px-4 md:px-6 flex items-center justify-between sticky top-0 z-50" role="banner">
      <div className="flex items-center gap-6">
        <div className="relative" ref={switcherRef}>
            <button 
                className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all duration-300 ${isSwitcherOpen ? 'bg-blue-50 border-blue-200 shadow-inner' : 'bg-white border-transparent hover:bg-gray-50'}`}
                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
            >
                <div className="relative">
                    <img src="/assets/brasao-tjpa.png" alt="Brasão TJPA" className={`h-9 md:h-10 w-auto transition-transform duration-500 ${isSwitcherOpen ? 'scale-110 rotate-3' : 'group-hover:scale-105'}`}/>
                    {isSwitcherOpen && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span></span>}
                </div>
                <div className="hidden lg:block text-left">
                    <div className="flex items-center gap-1.5">
                        <h1 className={`${titleColor} font-black text-[15px] leading-tight tracking-tight`}>{headerTitle}</h1>
                        <ChevronDown size={14} className={`text-gray-300 transition-transform duration-300 ${isSwitcherOpen ? 'rotate-180 text-blue-500' : ''}`} />
                    </div>
                    <p className={`${subtitleColor} text-[9px] font-black tracking-[0.1em] uppercase opacity-80 flex items-center gap-1`}>
                        {headerSubtitle}
                    </p>
                </div>
            </button>

            {/* Master Switcher Dropdown (Modules + Roles) */}
            {isSwitcherOpen && (
                <div className="absolute top-full left-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col animate-in zoom-in-95 fade-in duration-200 z-[70] overflow-hidden">
                    
                    {/* Role Simulation Section (Profiles) - Only for multi-role/admin */}
                    {availableRoles.length > 1 && (
                        <div className="p-3 bg-slate-50 border-b border-slate-100">
                             <div className="flex items-center justify-between mb-2 px-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Simular Perfil de Acesso</p>
                                <Shield size={12} className="text-slate-300" />
                             </div>
                             <div className="grid grid-cols-2 gap-2">
                                {availableRoles.map(r => (
                                    <button
                                        key={r.slug}
                                        onClick={() => handleRoleSwitch(r.slug)}
                                        className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center border text-center ${userRole === r.slug 
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02]' 
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm'}`}
                                    >
                                        {(r.name || r.slug).split(' ')[0]}
                                    </button>
                                ))}
                             </div>
                        </div>
                    )}

                    <div className="p-3 max-h-[60vh] overflow-y-auto">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 mb-2">Dashboards Oficiais</p>
                        <div className="grid grid-cols-1 gap-1">
                            {/* Main SOSFU dashboard */}
                            {(userRole === 'ADMIN' || userRole.startsWith('SOSFU')) && (
                                <button 
                                    onClick={() => { onTabChange?.('dashboard'); setIsSwitcherOpen(false); }}
                                    className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all text-left ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'}`}
                                >
                                    <div className={`p-2 rounded-lg ${activeTab === 'dashboard' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                        <LayoutDashboard size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold leading-tight">Painel de Controle SOSFU</p>
                                        <p className="text-[10px] opacity-60">Visão operacional da gerência</p>
                                    </div>
                                </button>
                            )}

                            {/* Modular Dashboards */}
                            {modularDashboards.map(mod => {
                                if (userRole !== 'ADMIN' && !mod.roles.includes(userRole)) return null;
                                const ModIcon = mod.icon;
                                const isCurrent = activeTab === mod.id;
                                const colorSchemes: Record<string, { bg: string, text: string, icon: string }> = {
                                    teal: { bg: 'bg-teal-50', text: 'text-teal-700', icon: 'bg-teal-100' },
                                    amber: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'bg-amber-100' },
                                    sky: { bg: 'bg-sky-50', text: 'text-sky-700', icon: 'bg-sky-100' },
                                    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'bg-emerald-100' },
                                    pink: { bg: 'bg-pink-50', text: 'text-pink-700', icon: 'bg-pink-100' },
                                    slate: { bg: 'bg-slate-50', text: 'text-slate-700', icon: 'bg-slate-100' },
                                    orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'bg-orange-100' }
                                };
                                const colors = colorSchemes[mod.color as keyof typeof colorSchemes] || colorSchemes.teal;

                                return (
                                    <button 
                                        key={mod.id}
                                        onClick={() => { onTabChange?.(mod.id); setIsSwitcherOpen(false); }}
                                        className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all text-left ${isCurrent ? `${colors.bg} ${colors.text}` : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'}`}
                                    >
                                        <div className={`p-2 rounded-lg ${isCurrent ? colors.icon : 'bg-gray-100'}`}>
                                            <ModIcon size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold leading-tight">{mod.label}</p>
                                            <p className="text-[10px] opacity-60">Acesso ao módulo especializado</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
        
        {visibleTabs.length > 0 && <div className="h-8 w-px bg-gray-200 hidden md:block"></div>}
        
        {/* Desktop Navigation — Hidden for independent modules */}
        {onTabChange && visibleTabs.length > 0 && (
            <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Navegação principal">
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
                aria-label="Menu do usuário"
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
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
                        
                        {(userRole === 'ADMIN' || userRole.startsWith('SOSFU') || userRole.startsWith('SODPA')) && (
                            <button 
                                onClick={() => { setIsMenuOpen(false); onTabChange && onTabChange('archive'); }} 
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                            >
                                <Archive size={16} className="text-gray-400" /> 
                                <span>Arquivo</span>
                            </button>
                        )}

                        {(userRole === 'ADMIN' || userRole.startsWith('SOSFU') || userRole.startsWith('SODPA') || userRole.startsWith('RESSARCIMENTO')) && (
                            <button 
                                onClick={() => { setIsMenuOpen(false); onTabChange && onTabChange('settings'); }} 
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                            >
                                <Settings size={16} className="text-gray-400" /> 
                                <span>Configurações</span>
                            </button>
                        )}
                        
                        {(userRole === 'ADMIN' || userRole.startsWith('SOSFU') || userRole.startsWith('SODPA') || userRole.startsWith('PRESIDENCIA')) && (
                            <button 
                                onClick={() => { setIsMenuOpen(false); onTabChange && onTabChange('reports'); }} 
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                            >
                                <PieChart size={16} className="text-gray-400" /> 
                                <span>Relatórios</span>
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
