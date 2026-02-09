import React from 'react';
import { LayoutDashboard, FileText, CheckSquare, Archive, Settings, BarChart3, Receipt, Wallet, Moon, Sun } from 'lucide-react';

export type RessarcimentoViewType = 'control' | 'requests' | 'payments' | 'archive' | 'reports' | 'settings';

interface RessarcimentoHeaderProps {
    activeView: RessarcimentoViewType;
    onNavigate: (view: RessarcimentoViewType) => void;
    pendingCount?: number;
    urgentCount?: number;
    darkMode?: boolean;
    onToggleDarkMode?: (isDark: boolean) => void;
}

export const RessarcimentoHeader: React.FC<RessarcimentoHeaderProps> = ({
    activeView,
    onNavigate,
    pendingCount = 0,
    urgentCount = 0,
    darkMode = false,
    onToggleDarkMode,
}) => {
    
    const tabs = [
        { id: 'control', label: 'Painel de Controle', icon: LayoutDashboard },
        { id: 'requests', label: 'Solicitações', icon: FileText },
        { id: 'payments', label: 'Pagamentos', icon: Wallet },
        { id: 'archive', label: 'Arquivo', icon: Archive },
        { id: 'reports', label: 'Relatórios', icon: BarChart3 },
        { id: 'settings', label: 'Configurações', icon: Settings },
    ];

    return (
        <div className={`border-b shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="h-12 flex items-center px-6 gap-4">
                
                {/* Navigation Tabs */}
                <nav className="flex items-center gap-1">
                    {tabs.map((tab) => {
                        const isActive = activeView === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onNavigate(tab.id as RessarcimentoViewType)}
                                className={`
                                    flex items-center gap-2 px-3 py-1.5 rounded-lg
                                    text-sm font-medium transition-all duration-200
                                    ${isActive
                                        ? darkMode
                                            ? 'bg-emerald-500/20 text-emerald-300 shadow-sm'
                                            : 'bg-emerald-500/15 text-emerald-700 shadow-sm'
                                        : darkMode
                                            ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                                    }
                                `}
                            >
                                <span className={isActive ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') : ''}>
                                    <Icon size={18} />
                                </span>
                                <span className="hidden xl:inline">{tab.label}</span>
                                
                                {/* Badge for Requests */}
                                {tab.id === 'requests' && pendingCount > 0 && (
                                    <span className={`
                                        min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold
                                        flex items-center justify-center
                                        ${isActive 
                                            ? (darkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-600 text-white')
                                            : (darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600')
                                    }`}>
                                        {pendingCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Spacer */}
                <div className="flex-1" />

                <div className="flex items-center gap-4">
                     {/* Urgent Badge */}
                     {urgentCount > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-600 rounded-lg border border-red-200 animate-pulse">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span className="text-xs font-bold">{urgentCount} Urgentes</span>
                        </div>
                    )}
                    
                    {/* Dark Mode Toggle */}
                    <button
                        onClick={() => onToggleDarkMode?.(!darkMode)}
                        className={`p-2 rounded-lg transition-all ${
                            darkMode 
                                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' 
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                        }`}
                        title="Alternar Tema"
                    >
                        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>
            </div>
        </div>
    );
};
