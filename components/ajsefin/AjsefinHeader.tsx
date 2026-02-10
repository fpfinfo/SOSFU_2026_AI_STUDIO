import React, { useState, useEffect } from 'react';
import {
    PanelTop,
    FileText,
    BellRing,
    Sun,
    Moon,
    Scale
} from 'lucide-react';

export type AjsefinViewType = 'painel' | 'processos' | 'equipe';

interface AjsefinHeaderProps {
    activeView: AjsefinViewType;
    onNavigate: (view: AjsefinViewType) => void;
    pendingCount?: number;
    urgentCount?: number;
    newCount?: number;
    onAcknowledgeNew?: () => void;
    darkMode?: boolean;
    onToggleDarkMode?: () => void;
}

interface NavItem {
    id: AjsefinViewType;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    badge?: number;
    badgeType?: 'default' | 'urgent';
}

export const AjsefinHeader: React.FC<AjsefinHeaderProps> = ({
    activeView,
    onNavigate,
    pendingCount = 0,
    urgentCount = 0,
    newCount = 0,
    onAcknowledgeNew,
    darkMode = false,
    onToggleDarkMode
}) => {
    const [showNewAlert, setShowNewAlert] = useState(false);

    useEffect(() => {
        if (newCount > 0) setShowNewAlert(true);
    }, [newCount]);

    const handleAcknowledge = () => {
        setShowNewAlert(false);
        onAcknowledgeNew?.();
    };

    const navItems: NavItem[] = [
        {
            id: 'painel',
            label: 'Painel de Controle',
            shortLabel: 'Painel',
            icon: <PanelTop size={18} />,
            badge: pendingCount,
            badgeType: urgentCount > 0 ? 'urgent' : 'default'
        },
        {
            id: 'processos',
            label: 'Análise Jurídica',
            shortLabel: 'Processos',
            icon: <Scale size={18} />
        }
    ];

    return (
        <div className={`border-b shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            {/* New Processes Alert Banner */}
            {showNewAlert && newCount > 0 && (
                <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-4 py-2 flex items-center justify-between animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-2">
                        <BellRing size={18} className="animate-bounce" />
                        <span className="text-sm font-medium">
                            {newCount} novo(s) processo(s) para análise jurídica!
                        </span>
                    </div>
                    <button
                        onClick={handleAcknowledge}
                        className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors"
                    >
                        Entendido
                    </button>
                </div>
            )}

            {/* Navigation Row */}
            <div className="h-12 flex items-center px-6 gap-4">
                {/* Navigation Tabs */}
                <nav className="flex items-center gap-1">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-lg
                                text-sm font-medium transition-all duration-200
                                ${activeView === item.id
                                    ? darkMode
                                        ? 'bg-teal-500/20 text-teal-300 shadow-sm'
                                        : 'bg-teal-500/15 text-teal-700 shadow-sm'
                                    : darkMode
                                        ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                                }
                            `}
                        >
                            <span className={activeView === item.id ? (darkMode ? 'text-teal-400' : 'text-teal-600') : ''}>
                                {item.icon}
                            </span>
                            <span className="hidden lg:inline">{item.label}</span>
                            <span className="lg:hidden">{item.shortLabel}</span>

                            {/* Badge */}
                            {item.badge !== undefined && item.badge > 0 && (
                                <span className={`
                                    min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold
                                    flex items-center justify-center
                                    ${item.badgeType === 'urgent'
                                        ? 'bg-red-500 text-white animate-pulse'
                                        : 'bg-slate-600 text-white'
                                    }
                                `}>
                                    {item.badge > 99 ? '99+' : item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Dark Mode Toggle */}
                <button
                    onClick={onToggleDarkMode}
                    className={`p-2 rounded-lg transition-all ${
                        darkMode
                            ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                    }`}
                    title="Tema Escuro (D)"
                >
                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>
        </div>
    );
};
