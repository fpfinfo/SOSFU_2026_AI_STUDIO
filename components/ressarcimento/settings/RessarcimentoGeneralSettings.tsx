
import React, { useState } from 'react';
import { 
    SlidersHorizontal, 
    MapPin, 
    Building2
} from 'lucide-react';
import { RessarcimentoParameters } from './RessarcimentoParameters';
import { ComarcasSettings } from '../../settings/ComarcasSettings';
import { UnidadesSettings } from '../../settings/UnidadesSettings';

interface RessarcimentoGeneralSettingsProps {
    darkMode?: boolean;
}

type GeneralTab = 'parametros' | 'comarcas' | 'unidades';

export const RessarcimentoGeneralSettings: React.FC<RessarcimentoGeneralSettingsProps> = ({ darkMode = false }) => {
    const [activeTab, setActiveTab] = useState<GeneralTab>('parametros');

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Context Header */}
            <div>
                <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    Configurações Gerais (Ressarcimento)
                </h2>
                <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Preferências globais do módulo de Ressarcimento de Despesas.
                </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200 pb-1">
                <button
                    onClick={() => setActiveTab('parametros')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-all ${
                        activeTab === 'parametros'
                            ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    <SlidersHorizontal size={16} />
                    Parâmetros
                </button>
                <button
                    onClick={() => setActiveTab('comarcas')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-all ${
                        activeTab === 'comarcas'
                            ? 'border-teal-600 text-teal-600 bg-teal-50/50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    <MapPin size={16} />
                    Comarcas
                </button>
                <button
                    onClick={() => setActiveTab('unidades')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-all ${
                        activeTab === 'unidades'
                            ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    <Building2 size={16} />
                    Unidades
                </button>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {activeTab === 'parametros' && (
                    <div className="animate-in fade-in duration-200">
                        <RessarcimentoParameters darkMode={darkMode} />
                    </div>
                )}

                {activeTab === 'comarcas' && (
                    <div className="animate-in fade-in duration-200">
                         {/* ComarcasSettings is self-contained */}
                        <ComarcasSettings />
                    </div>
                )}

                {activeTab === 'unidades' && (
                    <div className="animate-in fade-in duration-200">
                        {/* UnidadesSettings is self-contained */}
                        <UnidadesSettings />
                    </div>
                )}
            </div>
        </div>
    );
};
