import React, { useState } from 'react';
import { 
    BarChart3, 
    Map as MapIcon, 
    TrendingUp, 
    ShieldCheck, 
    ArrowLeftRight, 
    Calculator,
    Zap,
    Download,
    Calendar,
    Search,
    Filter,
    LayoutDashboard,
    PieChart,
    ArrowUpRight
} from 'lucide-react';
import { GeographicMap } from './reports/GeographicMap';
import { GdrManagement } from './reports/GdrManagement';
import { InssManagement } from './reports/InssManagement';
import { ExecutionAnalytics } from './reports/ExecutionAnalytics';

type ReportTab = 'MAP' | 'GDR' | 'INSS' | 'ANALYTICS';

export const ReportsView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ReportTab>('MAP');

    const tabs: { id: ReportTab; label: string; icon: React.ReactNode; desc: string }[] = [
        { 
            id: 'MAP', 
            label: 'Mapa Geográfico', 
            icon: <MapIcon size={18} />, 
            desc: 'Visão espacial de investimentos por comarca'
        },
        { 
            id: 'ANALYTICS', 
            label: 'Analítico de Execução', 
            icon: <BarChart3 size={18} />, 
            desc: 'Detalhamento de despesas e notas fiscais'
        },
        { 
            id: 'GDR', 
            label: 'Gestão de GDR', 
            icon: <ArrowLeftRight size={18} />, 
            desc: 'Monitoramento de devoluções de saldo'
        },
        { 
            id: 'INSS', 
            label: 'Gestão de INSS', 
            icon: <Calculator size={18} />, 
            desc: 'Auditoria de tributos e retenções PF'
        },
    ];

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-500 gap-4">
            
            {/* ═══ Glassmorphism Header ═══ */}
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200/50 shadow-xl shadow-slate-200/20 shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 bg-teal-600 rounded-lg flex items-center justify-center text-white">
                                <PieChart size={14} />
                            </div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Portal de Inteligência SOSFU</h2>
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-8 flex items-center gap-2">
                             Dashboard Dinâmico de Transparência 
                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        </p>
                    </div>

                    {/* Quick Access Actions */}
                    <div className="flex items-center gap-2">
                         <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 shadow-inner">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 ${
                                        activeTab === tab.id 
                                            ? 'bg-white text-teal-600 shadow-lg scale-[1.02]' 
                                            : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                                    }`}
                                >
                                    {tab.icon}
                                    <span className="hidden md:block">{tab.label}</span>
                                    {activeTab === tab.id && (
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-teal-600 rounded-full" />
                                    )}
                                </button>
                            ))}
                        </div>
                        <button className="hidden lg:flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold transition-all hover:bg-teal-700 shadow-lg shadow-teal-200">
                             <Download size={14} /> Exportar Tudo
                        </button>
                    </div>
                </div>
            </div>

            {/* ═══ Main Content Canvas ═══ */}
            <div className="flex-1 min-h-0 relative">
                {/* Active Tooltip Info */}
                <div className="absolute -top-1 right-6 z-10 animate-in slide-in-from-right-4">
                    <div className="bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
                        <Zap size={10} className="text-yellow-500" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{tabs.find(t => t.id === activeTab)?.desc}</span>
                    </div>
                </div>

                <div className="h-full overflow-hidden">
                    {activeTab === 'MAP' && <GeographicMap />}
                    {activeTab === 'GDR' && <GdrManagement />}
                    {activeTab === 'INSS' && <InssManagement />}
                    {activeTab === 'ANALYTICS' && <ExecutionAnalytics />}
                </div>
            </div>

             {/* ═══ Dynamic Status Bar ═══ */}
             <div className="bg-slate-50/50 px-6 py-2 rounded-2xl border border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                        <Calendar size={12} /> Atualizado Hoje às {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                        <ShieldCheck size={12} /> Compliance em 92.4%
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-teal-500 hover:text-teal-700 cursor-pointer transition-colors">
                     Ver Detalhes do NUP Online <ArrowUpRight size={12} />
                </div>
            </div>
        </div>
    );
};
