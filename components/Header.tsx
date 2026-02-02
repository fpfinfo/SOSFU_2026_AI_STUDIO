import React, { useState, useRef, useEffect } from 'react';
import { Bell, User, Settings, LogOut, ChevronDown, LayoutDashboard, FileText, CheckSquare, PieChart, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HeaderProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  userProfile?: any; // Recebe o perfil completo do App.tsx
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, userProfile }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Define os menus disponíveis
  const allTabs = [
    { id: 'dashboard', label: 'Painel de Controle', icon: LayoutDashboard, roles: ['ADMIN', 'SOSFU', 'SEFIN', 'PRESIDENCIA', 'SGP', 'AJSEFIN'] },
    { id: 'suprido_dashboard', label: 'Portal do Suprido', icon: Briefcase, roles: ['SERVIDOR', 'ADMIN', 'SOSFU'] }, // Admins também podem ver o portal
    { id: 'solicitations', label: 'Gestão de Solicitações', icon: FileText, roles: ['ADMIN', 'SOSFU', 'SEFIN'] },
    { id: 'accountability', label: 'Gestão de Contas', icon: CheckSquare, roles: ['ADMIN', 'SOSFU', 'SEFIN'] },
    { id: 'reports', label: 'Relatórios', icon: PieChart, roles: ['ADMIN', 'SOSFU', 'PRESIDENCIA'] },
    { id: 'settings', label: 'Configurações', icon: Settings, roles: ['ADMIN', 'SOSFU'] },
  ];

  // Filtra as tabs baseado no role do usuário
  const userRole = userProfile?.dperfil?.slug || 'SERVIDOR';
  
  const availableTabs = allTabs.filter(tab => 
    tab.roles.includes(userRole)
  );

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
        await supabase.auth.signOut();
    } catch (error) {
        console.error('Erro ao tentar sair:', error);
    } finally {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
    }
  };

  return (
    <>
    <header className="bg-white border-b border-gray-200 h-16 px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-6">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange && onTabChange(availableTabs[0]?.id || 'profile')}>
            <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/217479058_brasao-tjpa.png" 
                alt="Brasão TJPA" 
                className="h-10 w-auto opacity-90"
            />
            <div className="hidden lg:block">
            <h1 className="text-blue-600 font-bold text-base leading-tight">SOSFU TJPA</h1>
            <p className="text-blue-400 text-[9px] font-bold tracking-wider uppercase">• Suprimento de Fundos</p>
            </div>
        </div>

        {/* Separator */}
        <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

        {/* Main Navigation (Dynamic) */}
        {onTabChange && (
            <nav className="hidden md:flex items-center gap-1">
                {availableTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`
                                flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all
                                ${isActive 
                                    ? 'bg-blue-50 text-blue-600' 
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
                            `}
                        >
                            <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="hidden xl:inline">{tab.label}</span>
                            <span className="xl:hidden">{tab.label.split(' ')[0]}</span>
                        </button>
                    );
                })}
            </nav>
        )}
      </div>

      <div className="flex items-center gap-6">
        <button className="p-2 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-full bg-white shadow-sm transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>

        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-3 pl-4 border-l border-gray-200 group focus:outline-none"
            >
            <div className="text-right hidden md:block group-hover:opacity-80 transition-opacity">
                <p className="text-xs font-bold text-gray-800 uppercase">{userProfile?.full_name || 'Usuário'}</p>
                <div className="flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    <p className="text-[10px] text-gray-500 font-medium">{userProfile?.dperfil?.name || 'Carregando...'}</p>
                </div>
            </div>
            <div className="relative">
                <img 
                src={userProfile?.avatar_url || "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/avatar_placeholder.png"} 
                alt="User Profile" 
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover group-hover:ring-2 group-hover:ring-blue-100 transition-all"
                />
            </div>
            <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-[60]">
                    <div className="px-4 py-3 border-b border-gray-100 mb-1">
                        <p className="text-sm font-bold text-gray-900 truncate">{userProfile?.full_name}</p>
                        <p className="text-xs text-gray-500 truncate">{userProfile?.email}</p>
                        <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 uppercase">
                            {userProfile?.dperfil?.name}
                        </span>
                    </div>
                    
                    <button 
                        onClick={() => {
                            setIsMenuOpen(false);
                            onTabChange && onTabChange('profile');
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                    >
                        <User size={16} />
                        Perfil do Usuário
                    </button>
                    
                    {/* Configurações só aparece no dropdown se tiver permissão */}
                    {(userRole === 'ADMIN' || userRole === 'SOSFU') && (
                        <button 
                            onClick={() => {
                                setIsMenuOpen(false);
                                onTabChange && onTabChange('settings');
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                        >
                            <Settings size={16} />
                            Configurações do Sistema
                        </button>
                    )}
                    
                    <div className="h-px bg-gray-100 my-1"></div>
                    
                    <button 
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                    >
                        <LogOut size={16} />
                        Sair
                    </button>
                </div>
            )}
        </div>
      </div>
    </header>
    </>
  );
};