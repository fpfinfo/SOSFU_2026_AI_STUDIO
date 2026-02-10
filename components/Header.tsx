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
    color: 'indigo',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    accentBg: 'bg-indigo-50',
    accentText: 'text-indigo-600',
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
    color: 'indigo',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    accentBg: 'bg-indigo-50',
    accentText: 'text-indigo-600',
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
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    accentBg: 'bg-blue-50',
    accentText: 'text-blue-600',
  },
  solicitations: {
    title: 'SOSFU',
    subtitle: '• Gerência de Suprimento de Fundos',
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    accentBg: 'bg-blue-50',
    accentText: 'text-blue-600',
  },
  accountability: {
    title: 'SOSFU',
    subtitle: '• Gerência de Suprimento de Fundos',
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    accentBg: 'bg-blue-50',
    accentText: 'text-blue-600',
  },
  archive: {
    title: 'SOSFU',
    subtitle: '• Gerência de Suprimento de Fundos',
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    accentBg: 'bg-blue-50',
    accentText: 'text-blue-600',
  },
  reports: {
    title: 'SOSFU',
    subtitle: '• Gerência de Suprimento de Fundos',
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    accentBg: 'bg-blue-50',
    accentText: 'text-blue-600',
  },
  settings: {
    title: 'SOSFU',
    subtitle: '• Gerência de Suprimento de Fundos',
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    accentBg: 'bg-blue-50',
    accentText: 'text-blue-600',
  },
};

// Modules that manage their own internal navigation (no tabs in main header)
const INDEPENDENT_MODULES = ['sefin_dashboard', 'gestor_dashboard', 'suprido_dashboard', 'ajsefin_dashboard', 'sodpa_dashboard', 'ressarcimento_dashboard'];

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, onNavigate, userProfile }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [gestorLocationTitle, setGestorLocationTitle] = useState<string | null>(null);
  
  const allTabs = [
    { id: 'dashboard', label: 'Painel de Controle', icon: LayoutDashboard, roles: ['ADMIN', 'SOSFU_GESTOR', 'SOSFU_EQUIPE', 'SEFIN_GESTOR', 'SEFIN_EQUIPE', 'PRESIDENCIA_GESTOR', 'PRESIDENCIA_EQUIPE', 'SGP_GESTOR', 'SGP_EQUIPE', 'SODPA_GESTOR', 'SODPA_EQUIPE'] },
    { id: 'suprido_dashboard', label: 'Portal do Usuário', icon: Briefcase, roles: ['USER', 'SERVIDOR'] }, 
    { id: 'gestor_dashboard', label: 'Gabinete do Gestor', icon: Gavel, roles: ['GESTOR', 'ADMIN'] },
    { id: 'sefin_dashboard', label: 'Gabinete SEFIN', icon: Scale, roles: ['SEFIN', 'ADMIN'] },
    { id: 'ajsefin_dashboard', label: 'Gabinete AJSEFIN', icon: Scale, roles: ['AJSEFIN', 'ADMIN'] },
    { id: 'solicitations', label: 'Solicitações SF', icon: FileText, roles: ['ADMIN', 'SOSFU_GESTOR', 'SOSFU_EQUIPE', 'SODPA_GESTOR', 'SODPA_EQUIPE'] },
    { id: 'accountability', label: 'Prest. Contas', icon: CheckSquare, roles: ['ADMIN', 'SOSFU_GESTOR', 'SOSFU_EQUIPE', 'SODPA_GESTOR', 'SODPA_EQUIPE'] },
    { id: 'archive', label: 'Arquivo', icon: Archive, roles: ['ADMIN', 'SOSFU_GESTOR', 'SOSFU_EQUIPE', 'SODPA_GESTOR', 'SODPA_EQUIPE'] },
    { id: 'reports', label: 'Relatórios', icon: PieChart, roles: ['ADMIN', 'SOSFU_GESTOR', 'SOSFU_EQUIPE', 'PRESIDENCIA_GESTOR', 'PRESIDENCIA_EQUIPE', 'SODPA_GESTOR', 'SODPA_EQUIPE'] },
    { id: 'settings', label: 'Configurações', icon: Settings, roles: ['ADMIN', 'SOSFU_GESTOR', 'SODPA_GESTOR', 'RESSARCIMENTO_GESTOR', 'SEFIN_GESTOR', 'AJSEFIN_GESTOR'] },
  ];

  // Multi-role handling
  const [availableRoles, setAvailableRoles] = useState<{slug: string, name: string}[]>([]);
  const [simulatedRole, setSimulatedRole] = useState<string | null>(localStorage.getItem('simulated_role'));

  useEffect(() => {
    if (userProfile?.id) {
        (async () => {
            const { data } = await supabase
                .from('sys_user_roles')
                .select('sys_roles(slug, name)')
                .eq('user_id', userProfile.id)
                .eq('is_active', true);
            
            if (data) {
                const roles = data.map((d: any) => ({
                    slug: d.sys_roles.slug,
                    name: d.sys_roles.name
                }));
                setAvailableRoles(roles);
            }
        })();
    }
  }, [userProfile?.id]);

  const handleRoleSwitch = (slug: string) => {
    localStorage.setItem('simulated_role', slug);
    setSimulatedRole(slug);
    setIsMenuOpen(false);
    window.location.reload(); // Re-render everything with new role context
  };

  const userRole = simulatedRole || userProfile?.dperfil?.slug || 'SERVIDOR';
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
        <Tooltip content="Voltar ao painel principal" position="bottom" delay={400}>
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => {
          if (isIndependentModule && activeTab) onTabChange?.(activeTab);
          else onTabChange?.(availableTabs[0]?.id || 'profile');
        }}>
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
                        {/* Seletor de Perfil (Multi-role) */}
                        {availableRoles.length > 1 && (
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Alterar Perfil Ativo</p>
                                <div className="flex flex-wrap gap-2">
                                    {availableRoles.map(r => (
                                        <button
                                            key={r.slug}
                                            onClick={() => handleRoleSwitch(r.slug)}
                                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all border ${userRole === r.slug 
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                                : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600'}`}
                                        >
                                            {r.name.split(' ')[0]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={() => { setIsMenuOpen(false); onTabChange && onTabChange('profile'); }} 
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                        >
                            <User size={16} className="text-gray-400" /> 
                            <span>Meu Perfil</span>
                        </button>
                        
                        {(userRole === 'ADMIN' || userRole.startsWith('SOSFU') || userRole.startsWith('SODPA') || userRole.startsWith('RESSARCIMENTO')) && (
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