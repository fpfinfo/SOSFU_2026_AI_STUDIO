import React, { useState, useRef, useEffect } from 'react';
import { Shield, User, Settings, LogOut, ChevronDown, LayoutDashboard, BarChart3, Sun, Moon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { NotificationPanel } from '../NotificationPanel';

export type SodpaViewType = 'control' | 'processes' | 'accountability' | 'archive' | 'reports' | 'settings';

interface SodpaHeaderProps {
    activeView: SodpaViewType;
    onNavigate: (view: SodpaViewType) => void;
    pendingCount?: number;
    urgentCount?: number;
    newCount?: number;
    onAcknowledgeNew?: () => void;
    darkMode?: boolean;
    onToggleDarkMode?: () => void;
    userProfile?: any;
}

export const SodpaHeader: React.FC<SodpaHeaderProps> = ({
    activeView,
    onNavigate,
    pendingCount = 0,
    urgentCount = 0,
    newCount = 0,
    onAcknowledgeNew,
    darkMode = false,
    onToggleDarkMode,
    userProfile
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const switcherRef = useRef<HTMLDivElement>(null);
    const userRole = userProfile?.dperfil?.slug || 'SERVIDOR';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
            if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) setIsSwitcherOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.clear(); sessionStorage.clear(); window.location.href = '/';
    };

    const getInitials = (name: string) => (name || 'U').substring(0, 2).toUpperCase();

    const tabs = [
        { id: 'control', label: 'Painel de Controle', icon: LayoutDashboard },
        { id: 'reports', label: 'Mapa Geográfico', icon: BarChart3 },
    ];

    // SODPA Branding
    const headerTitle = 'SODPA TJPA';
    const headerSubtitle = '• Serviço de Diárias e Passagens';
    const titleColor = 'text-sky-700';
    const subtitleColor = 'text-sky-400';
    const activeTabBg = 'bg-sky-50';
    const activeTabText = 'text-sky-600';

    return (
        <header className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} h-16 px-4 md:px-6 flex items-center justify-between sticky top-0 z-50 transition-colors duration-300 shadow-sm`} role="banner">
            <div className="flex items-center gap-6">
                <div className="relative" ref={switcherRef}>
                    <button 
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all duration-300 ${isSwitcherOpen ? (darkMode ? 'bg-slate-800 border-slate-700 shadow-inner' : 'bg-sky-50 border-sky-200 shadow-inner') : (darkMode ? 'bg-slate-900 border-transparent hover:bg-slate-800' : 'bg-white border-transparent hover:bg-gray-50')}`}
                        onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                    >
                        <div className="relative">
                            <img src="/assets/brasao-tjpa.png" alt="Brasão TJPA" className={`h-9 md:h-10 w-auto transition-transform duration-500 filter ${darkMode ? 'brightness-125' : ''} ${isSwitcherOpen ? 'scale-110 rotate-3' : 'group-hover:scale-105'}`}/>
                        </div>
                        <div className="hidden lg:block text-left">
                            <div className="flex items-center gap-1.5">
                                <h1 className={`${darkMode ? 'text-slate-100' : titleColor} font-black text-[15px] leading-tight tracking-tight`}>{headerTitle}</h1>
                                <ChevronDown size={14} className={`${darkMode ? 'text-slate-600' : 'text-gray-300'} transition-transform duration-300 ${isSwitcherOpen ? 'rotate-180 text-sky-500' : ''}`} />
                            </div>
                            <p className={`${darkMode ? 'text-slate-400' : subtitleColor} text-[9px] font-black tracking-[0.1em] uppercase opacity-80 flex items-center gap-1`}>
                                {headerSubtitle}
                            </p>
                        </div>
                    </button>
                    {/* Placeholder for Switcher Content if needed later */}
                </div>
                
                <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                
                <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Navegação principal">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeView === tab.id;
                        return (
                            <button 
                                key={tab.id} 
                                onClick={() => onNavigate(tab.id as SodpaViewType)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${isActive ? `${activeTabBg} ${activeTabText}` : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                                title={tab.label}
                            >
                                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="hidden xl:inline">{tab.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={onToggleDarkMode}
                    className={`p-2 rounded-lg transition-all flex items-center justify-center ${
                        darkMode
                            ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                    }`}
                    title={darkMode ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
                >
                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <NotificationPanel userId={userProfile?.id} onNavigate={onNavigate as any} />

                <div className="relative" ref={menuRef}>
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)} 
                        className={`flex items-center gap-3 pl-2 md:pl-4 md:border-l border-gray-200 group focus:outline-none transition-all ${isMenuOpen ? 'opacity-100' : 'opacity-90'}`}
                    >
                        <div className="text-right hidden md:block group-hover:opacity-100 transition-opacity">
                            <p className={`text-xs font-bold ${darkMode ? 'text-slate-200' : 'text-gray-800'} uppercase leading-none mb-1`}>{userProfile?.full_name?.split(' ')[0] || 'Usuário'}</p>
                            <div className="flex items-center justify-end gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${userRole === 'ADMIN' ? 'bg-red-500' : 'bg-green-500'}`}></span>
                                <p className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-gray-500'} font-medium leading-none`}>{userProfile?.dperfil?.name || 'Carregando...'}</p>
                            </div>
                        </div>
                        <div className="relative">
                            {userProfile?.avatar_url ? (
                                <img 
                                    src={userProfile.avatar_url} 
                                    alt="User" 
                                    className="w-9 h-9 rounded-full border-2 border-white shadow-sm object-cover ring-2 ring-transparent group-hover:ring-sky-100 transition-all"
                                />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-xs border-2 border-white shadow-sm">
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
                            <div className="md:hidden px-4 py-4 border-b border-gray-100 bg-gray-50/50">
                                <p className="text-sm font-bold text-gray-900 truncate">{userProfile?.full_name}</p>
                                <span className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700 uppercase">
                                    <Shield size={10} />
                                    {userProfile?.dperfil?.name}
                                </span>
                            </div>

                            <div className="py-1">
                                <button 
                                    onClick={() => { setIsMenuOpen(false); onNavigate('settings'); }} 
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-sky-600 flex items-center gap-3 transition-colors"
                                >
                                    <Settings size={16} className="text-gray-400" /> 
                                    <span>Configurações</span>
                                </button>
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
    );
};
