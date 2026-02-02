import React, { useState } from 'react';
import { Siren, Gavel, FileText, CheckSquare, Plus, Search, Filter, ArrowRight, Clock } from 'lucide-react';
import { SolicitationModal } from './SolicitationModal';

export const SupridoDashboard: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [initialType, setInitialType] = useState<'EMERGENCY' | 'JURY' | null>(null);

    const openSolicitation = (type: 'EMERGENCY' | 'JURY') => {
        setInitialType(type);
        setIsModalOpen(true);
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 mb-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold mb-2">Portal do Suprido</h2>
                    <p className="text-gray-300 max-w-xl">
                        Gerencie suas solicitações de suprimento de fundos, acompanhe aprovações e realize prestações de contas de forma simples e rápida.
                    </p>
                </div>
            </div>

            {/* Quick Actions */}
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 ml-1">Nova Solicitação Extraordinária</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                {/* Card Emergency */}
                <button 
                    onClick={() => openSolicitation('EMERGENCY')}
                    className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-red-200 transition-all group text-left relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Siren size={80} className="text-red-500" />
                    </div>
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600 mb-4 group-hover:scale-110 transition-transform">
                        <Siren size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Extra-Emergencial</h3>
                    <p className="text-sm text-gray-500 mb-4 pr-10">
                        Para despesas urgentes e imprevisíveis que exigem atendimento imediato.
                    </p>
                    <div className="inline-flex items-center gap-2 text-sm font-bold text-red-600 group-hover:translate-x-1 transition-transform">
                        Iniciar Solicitação <ArrowRight size={16} />
                    </div>
                </button>

                {/* Card Jury */}
                <button 
                    onClick={() => openSolicitation('JURY')}
                    className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all group text-left relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Gavel size={80} className="text-blue-500" />
                    </div>
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                        <Gavel size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Extra-Júri</h3>
                    <p className="text-sm text-gray-500 mb-4 pr-10">
                        Para custeio de alimentação e logística em sessões do Tribunal do Júri.
                    </p>
                    <div className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                        Iniciar Solicitação <ArrowRight size={16} />
                    </div>
                </button>
            </div>

            {/* Pendências e Prestação de Contas */}
            <div className="flex items-center justify-between mb-4">
                 <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Meus Processos e Prestação de Contas</h3>
                 <button className="text-sm text-blue-600 font-bold hover:underline">Ver Histórico Completo</button>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Buscar processo..." 
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50">
                            <Filter size={14} /> Filtros
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="divide-y divide-gray-100">
                    {/* Item 1 - Pendente PC */}
                    <div className="p-4 hover:bg-gray-50 transition-colors flex flex-col md:flex-row items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 flex-shrink-0">
                            <Clock size={20} />
                        </div>
                        <div className="flex-1 min-w-0 text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                                <h4 className="font-bold text-gray-800 text-sm">SF-2024/045 - Suprimento Júri</h4>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 uppercase border border-blue-100">Extra-Júri</span>
                            </div>
                            <p className="text-xs text-gray-500">Aprovado em 12/02/2024 • Valor: R$ 4.500,50</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">Aguardando Prestação de Contas</span>
                            <span className="text-[10px] text-gray-400">Prazo: 10 dias restantes</span>
                        </div>
                        <button className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800 shadow-sm whitespace-nowrap">
                            Prestar Contas
                        </button>
                    </div>

                    {/* Item 2 - Em Análise */}
                    <div className="p-4 hover:bg-gray-50 transition-colors flex flex-col md:flex-row items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 flex-shrink-0">
                            <FileText size={20} />
                        </div>
                        <div className="flex-1 min-w-0 text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                                <h4 className="font-bold text-gray-800 text-sm">SF-2024/102 - Reparo Hidráulico</h4>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 uppercase border border-red-100">Emergencial</span>
                            </div>
                            <p className="text-xs text-gray-500">Solicitado em 15/02/2024 • Valor: R$ 800,00</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded">Em Análise Técnica</span>
                        </div>
                        <button className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-50 shadow-sm whitespace-nowrap">
                            Ver Detalhes
                        </button>
                    </div>
                     {/* Item 3 - PC Enviada */}
                     <div className="p-4 hover:bg-gray-50 transition-colors flex flex-col md:flex-row items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
                            <CheckSquare size={20} />
                        </div>
                        <div className="flex-1 min-w-0 text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                                <h4 className="font-bold text-gray-800 text-sm">PC-2023/998 - Material de Consumo</h4>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-600 uppercase border border-purple-100">Prestação de Contas</span>
                            </div>
                            <p className="text-xs text-gray-500">Enviada em 20/02/2024</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">Em Análise Financeira</span>
                        </div>
                        <button className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-50 shadow-sm whitespace-nowrap">
                            Acompanhar
                        </button>
                    </div>
                </div>
            </div>

            <SolicitationModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                initialType={initialType} 
            />

        </div>
    );
};