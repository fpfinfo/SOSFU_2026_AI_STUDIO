import React, { useState, useRef, useEffect } from 'react';
import { Bell, User, Settings, LogOut, ChevronDown, LayoutDashboard, FileText, CheckSquare, PieChart, Briefcase } from 'lucide-react';
import { CURRENT_USER } from '../constants';
import { supabase } from '../lib/supabase';

interface HeaderProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => {
  const [currentUser, setCurrentUser] = useState(CURRENT_USER);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const tabs = [
    { id: 'dashboard', label: 'Painel de Controle', icon: LayoutDashboard },
    { id: 'suprido_dashboard', label: 'Portal do Suprido', icon: Briefcase },
    { id: 'solicitations', label: 'Gestão de Solicitações', icon: FileText },
    { id: 'accountability', label: 'Gestão de Prestação de Contas', icon: CheckSquare },
    { id: 'reports', label: 'Relatórios', icon: PieChart },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

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
        console.error('Erro no logout:', error);
    } finally {
        // Força recarregamento para limpar estado e redirecionar para login
        // Isso resolve problemas onde o signOut falha por erro de rede (Failed to fetch)
        window.location.reload();
    }
  };

  return (
    <>
    <header className="bg-white border-b border-gray-200 h-16 px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-6">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange && onTabChange('dashboard')}>
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

        {/* Main Navigation (Integrated) */}
        {onTabChange && (
            <nav className="hidden md:flex items-center gap-1">
                {tabs.map((tab) => {
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
                <p className="text-xs font-bold text-gray-800 uppercase">{currentUser.name}</p>
                <p className="text-[10px] text-gray-500 font-medium">MAT. {currentUser.matricula}</p>
            </div>
            <div className="relative">
                <img 
                src={currentUser.avatar} 
                alt="User Profile" 
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover group-hover:ring-2 group-hover:ring-blue-100 transition-all"
                />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-[60]">
                    <div className="px-4 py-3 border-b border-gray-100 mb-1">
                        <p className="text-sm font-bold text-gray-900 truncate">{currentUser.name}</p>
                        <p className="text-xs text-gray-500 truncate">analista.judiciario@tjpa.jus.br</p>
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