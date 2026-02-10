import React, { useState } from 'react';
import { 
    BarChart3, 
    Map as MapIcon, 
    TrendingUp, 
    ArrowLeftRight, 
    Zap,
    Download,
    Calendar,
    PieChart,
    ArrowUpRight,
    Plane,
    Briefcase
} from 'lucide-react';
import { SodpaGeoMap } from './SodpaGeoMap';
import { SodpaExecutionAnalytics } from './reports/SodpaExecutionAnalytics';
import { SodpaGdrManagement } from './reports/SodpaGdrManagement';

type SodpaReportTab = 'MAP' | 'ANALYTICS' | 'GDR';

interface SodpaReportsViewProps {
    darkMode?: boolean;
}

export const SodpaReportsView: React.FC<SodpaReportsViewProps> = ({ darkMode = false }) => {
    const [activeTab, setActiveTab] = useState<SodpaReportTab>('MAP');

    const tabs: { id: SodpaReportTab; label: string; icon: React.ReactNode; desc: string }[] = [
        { 
            id: 'MAP', 
            label: 'Mapa de Situação', 
            icon: <MapIcon size={18} />, 
            desc: 'Geolocalização de custos com diárias e passagens'
        },
        { 
            id: 'ANALYTICS', 
            label: 'Monitor de Execução', 
            icon: <BarChart3 size={18} />, 
            desc: 'Analítico de concessões por elemento de despesa'
        },
        { 
            id: 'GDR', 
            label: 'Controle de Devoluções', 
            icon: <ArrowLeftRight size={18} />, 
            desc: 'Monitoramento de saldos de diárias não utilizadas'
        },
    ];

    return (
        <div className={`flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-500 gap-4 p-4 ${darkMode ? 'bg-slate-900' : ''}`}>
            
            {/* ═══ Glassmorphism Header ═══ */}
            <div className={`${darkMode ? 'bg-slate-800 border-slate-700 shadow-slate-900/50' : 'bg-white/80 backdrop-blur-md border-slate-200/50 shadow-slate-200/20'} p-4 rounded-3xl border shadow-xl shrink-0`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 bg-sky-600 rounded-lg flex items-center justify-center text-white">
                                <Plane size={14} />
                            </div>
                            <h2 className={`text-xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>Inteligência de Viagens SODPA</h2>
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-8 flex items-center gap-2">
                             Painel Geral de Execução Geográfica 
                             <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                        </p>
                    </div>

                    {/* Quick Access Actions */}
                    <div className="flex items-center gap-2">
                         <div className={`${darkMode ? 'bg-slate-900 shadow-inner' : 'bg-slate-100'} p-1 rounded-2xl flex gap-1 shadow-inner`}>
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 ${
                                        activeTab === tab.id 
                                            ? `${darkMode ? 'bg-slate-800 text-sky-400 shadow-xl' : 'bg-white text-sky-600 shadow-lg'} scale-[1.02]` 
                                            : `${darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`
                                    }`}
                                >
                                    {tab.icon}
                                    <span className="hidden md:block">{tab.label}</span>
                                    {activeTab === tab.id && (
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-sky-600 rounded-full" />
                                    )}
                                </button>
                            ))}
                        </div>
                        <button className="hidden lg:flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold transition-all hover:bg-sky-700 shadow-lg shadow-sky-200">
                             <Download size={14} /> Exportar
                        </button>
                    </div>
                </div>
            </div>

            {/* ═══ Main Content Canvas ═══ */}
            <div className="flex-1 min-h-0 relative">
                {/* Active Tooltip Info */}
                <div className="absolute -top-1 right-6 z-10 animate-in slide-in-from-right-4">
                    <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} px-3 py-1 rounded-full border shadow-sm flex items-center gap-2`}>
                        <Zap size={10} className="text-yellow-500" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{tabs.find(t => t.id === activeTab)?.desc}</span>
                    </div>
                </div>

                <div className="h-full overflow-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                    {activeTab === 'MAP' && <SodpaGeoMap darkMode={darkMode} />}
                    {activeTab === 'ANALYTICS' && <SodpaExecutionAnalytics darkMode={darkMode} />}
                    {activeTab === 'GDR' && <SodpaGdrManagement darkMode={darkMode} />}
                </div>
            </div>

             {/* ═══ Dynamic Status Bar ═══ */}
             <div className={`${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50/50 border-slate-100'} px-6 py-2 rounded-2xl border flex justify-between items-center shrink-0`}>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                        <Calendar size={12} /> Última Auditoria: {new Date().toLocaleDateString('pt-BR')} 
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-sky-600 bg-sky-50 px-3 py-1 rounded-full">
                        <Briefcase size={12} /> Controle de Diárias Ativo
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-sky-500 hover:text-sky-700 cursor-pointer transition-colors">
                     Consultar Portaria de Diárias 2026 <ArrowUpRight size={12} />
                </div>
            </div>
        </div>
    );
};
