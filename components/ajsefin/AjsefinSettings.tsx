import React, { useState } from 'react';
import {
    Settings,
    Users,
    Shield,
    Bell,
    Clock
} from 'lucide-react';
import { UsersSettings } from '../settings/UsersSettings';

interface AjsefinSettingsProps {
    darkMode?: boolean;
    userProfile?: any;
}

type SettingsTab = 'general' | 'users' | 'roles' | 'notifications';

export const AjsefinSettings: React.FC<AjsefinSettingsProps> = ({ darkMode = false, userProfile }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');

    const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
        { id: 'general', label: 'Geral', icon: <Settings size={18} /> },
        { id: 'users', label: 'Usuários e Permissões', icon: <Users size={18} /> },
        { id: 'roles', label: 'Gestão de Perfis', icon: <Shield size={18} /> },
        { id: 'notifications', label: 'Notificações', icon: <Bell size={18} /> },
    ];

    const cardClass = darkMode
        ? 'bg-slate-800 border-slate-700 text-white'
        : 'bg-white border-slate-200';

    return (
        <div className={`max-w-[1400px] mx-auto px-6 py-8 space-y-6 animate-in fade-in ${darkMode ? 'text-white' : ''}`}>
            
            {/* ═══ HEADER ═══ */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        Configurações AJSEFIN
                    </h1>
                    <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Gerencie parâmetros técnicos e administrativos do módulo Jurídico.
                    </p>
                </div>
            </div>

            <div className="flex gap-8 items-start">
                
                {/* ═══ SIDEBAR MENU ═══ */}
                <div className="w-64 shrink-0 space-y-4 sticky top-24">
                    <div className={`rounded-xl border p-2 shadow-sm ${cardClass}`}>
                        <div className="space-y-1">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`group relative w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all font-medium text-sm ${
                                        activeTab === tab.id
                                            ? 'bg-teal-50 text-teal-700 font-bold'
                                            : darkMode
                                                ? 'text-slate-400 hover:bg-slate-700 hover:text-white'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                                >
                                    {/* Active Indicator */}
                                    {activeTab === tab.id && (
                                        <div className="absolute left-0 w-1 h-6 bg-teal-600 rounded-r-full" />
                                    )}
                                    <div className={`${activeTab === tab.id ? 'text-teal-600' : 'text-slate-400'}`}>
                                        {tab.icon}
                                    </div>
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ═══ MAIN CONTENT AREA ═══ */}
                <div className="flex-1 min-w-0">
                    <div className={`rounded-2xl border shadow-sm min-h-[600px] p-6 ${cardClass}`}>
                        
                        {/* TAB: GERAL */}
                        {activeTab === 'general' && (
                            <div className="flex flex-col items-center justify-center h-96 text-center animate-in fade-in zoom-in-95">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                    <Settings size={32} className="text-slate-400" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700">Configurações Gerais</h3>
                                <p className="text-slate-500 max-w-sm mt-2">
                                    Configurações globais do sistema de análise jurídica.
                                </p>
                            </div>
                        )}

                        {/* TAB: USUÁRIOS */}
                        {activeTab === 'users' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <UsersSettings userProfile={userProfile} />
                            </div>
                        )}

                        {/* TAB: ROLES */}
                        {activeTab === 'roles' && (
                            <div className="flex flex-col items-center justify-center h-96 text-center animate-in fade-in zoom-in-95">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                    <Shield size={32} className="text-slate-400" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700">Gestão de Perfis</h3>
                                <p className="text-slate-500 max-w-sm mt-2">
                                    Gestão de atribuições e permissões de acesso.
                                </p>
                            </div>
                        )}

                        {/* TAB: NOTIFICAÇÕES */}
                        {activeTab === 'notifications' && (
                            <div className="flex flex-col items-center justify-center h-96 text-center animate-in fade-in zoom-in-95">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                    <Bell size={32} className="text-slate-400" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700">Central de Notificações</h3>
                                <p className="text-slate-500 max-w-sm mt-2">
                                    Configuração de alertas e templates de e-mail.
                                </p>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};
