import React, { useState } from 'react';
import { Settings, Users, Shield, Clock, Bell } from 'lucide-react';
import { GeneralSettings } from './settings/GeneralSettings';
import { UsersSettings } from './settings/UsersSettings';
import { RolesSettings } from './settings/RolesSettings';

export const SettingsView: React.FC<{ userProfile?: any }> = ({ userProfile }) => {
    const [activeSection, setActiveSection] = useState('general');

    const menuItems = [
        { id: 'general', label: 'Geral', icon: Settings },
        { id: 'users', label: 'Usuários e Permissões', icon: Users },
        { id: 'roles', label: 'Gestão de Perfis', icon: Shield },
        { id: 'sla', label: 'Prazos e SLA', icon: Clock },
        { id: 'notifications', label: 'Notificações', icon: Bell },
    ];

    return (
        <div className="flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sidebar Navigation */}
            <div className="w-full md:w-64 flex-shrink-0">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 px-3 flex items-center gap-2">
                        <Settings size={14} />
                        Configurações
                    </h3>
                    <nav className="space-y-1">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeSection === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveSection(item.id)}
                                    className={`
                                        w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                                        ${isActive 
                                            ? 'bg-blue-50 text-blue-700' 
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                                    `}
                                >
                                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                    {item.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 min-h-[600px]">
                    {activeSection === 'general' && <GeneralSettings />}
                    {activeSection === 'users' && <UsersSettings userProfile={userProfile} />}
                    {activeSection === 'roles' && <RolesSettings />}
                    
                    {['sla', 'notifications'].includes(activeSection) && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <Settings size={48} className="mb-4 opacity-20" />
                            <h3 className="text-lg font-semibold">Configuração em Desenvolvimento</h3>
                            <p className="text-sm">Esta seção estará disponível em breve.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
