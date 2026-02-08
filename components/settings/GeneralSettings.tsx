import React, { useState } from 'react';
import { Save, Database, Copy, CheckCircle2, Settings, MapPin } from 'lucide-react';
import { ComarcasSettings } from './ComarcasSettings';

type SubTab = 'system' | 'comarcas';

export const GeneralSettings: React.FC = () => {
    const [autoBackup, setAutoBackup] = useState(true);
    const [copied, setCopied] = useState(false);
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('system');

    const copySQL = () => {
        const sql = `ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dperfil DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.profiles TO anon, authenticated, service_role;
GRANT SELECT ON public.dperfil TO anon, authenticated, service_role;`;
        navigator.clipboard.writeText(sql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const subTabs: { id: SubTab; label: string; icon: React.ElementType }[] = [
        { id: 'system', label: 'Sistema', icon: Settings },
        { id: 'comarcas', label: 'Comarcas', icon: MapPin },
    ];

    return (
        <div className="animate-in fade-in duration-300">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800">Configurações Gerais</h3>
                <p className="text-sm text-gray-500 mt-1">Preferências globais do sistema.</p>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
                {subTabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeSubTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all ${
                                isActive
                                    ? 'bg-white text-blue-700 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Icon size={14} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            {activeSubTab === 'comarcas' ? (
                <ComarcasSettings />
            ) : (
                <div className="space-y-6 max-w-3xl">
                    {/* Diagnóstico e Reparo */}
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-2 text-orange-800 font-bold">
                            <Database size={18} />
                            <h4>Diagnóstico e Reparo de Banco de Dados</h4>
                        </div>
                        <p className="text-xs text-orange-700 mb-4">
                            Se você estiver enfrentando erros de "Recursão Infinita" ou "Erro ao carregar equipe", execute o comando abaixo no painel do Supabase.
                        </p>
                        <div className="relative">
                            <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap border border-gray-700">
{`ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dperfil DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.profiles TO anon, authenticated, service_role;
GRANT SELECT ON public.dperfil TO anon, authenticated, service_role;`}
                            </pre>
                            <button 
                                onClick={copySQL}
                                className="absolute top-2 right-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded flex items-center gap-1 transition-colors shadow-sm"
                            >
                                {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                                {copied ? 'Copiado!' : 'Copiar SQL'}
                            </button>
                        </div>
                    </div>

                    {/* Configurações Gerais do Módulo */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Nome do Módulo</label>
                            <input 
                                type="text" 
                                defaultValue="SOSFU TJPA - Suprimento de Fundos" 
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div>
                                <p className="text-sm font-bold text-gray-800">Backup Automático</p>
                                <p className="text-xs text-gray-500">Realizar backup diário às 23:00.</p>
                            </div>
                            <button 
                                onClick={() => setAutoBackup(!autoBackup)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${autoBackup ? 'bg-blue-600' : 'bg-gray-300'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${autoBackup ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end">
                        <button className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-semibold shadow-sm hover:bg-emerald-700 transition-colors">
                            <Save size={18} />
                            Salvar Alterações
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};