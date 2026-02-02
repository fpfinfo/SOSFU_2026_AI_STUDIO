import React, { useState } from 'react';
import { Save } from 'lucide-react';

export const GeneralSettings: React.FC = () => {
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [autoBackup, setAutoBackup] = useState(true);

    return (
        <div className="animate-in fade-in duration-300">
            <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800">Informações do Sistema</h3>
                <p className="text-sm text-gray-500 mt-1">Detalhes básicos sobre o módulo atual.</p>
            </div>

            <div className="space-y-6 max-w-2xl">
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Nome do Módulo</label>
                    <input 
                        type="text" 
                        defaultValue="SOSFU TJPA - Suprimento de Fundos" 
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">E-mail de Suporte</label>
                    <input 
                        type="email" 
                        defaultValue="suporte.sosfu@tjpa.jus.br" 
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </div>

                <div className="pt-8 border-t border-gray-100">
                    <h3 className="text-xl font-bold text-gray-800 mb-1">Preferências</h3>
                    <p className="text-sm text-gray-500 mb-6">Configurações globais de operação do sistema.</p>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div>
                                <p className="text-sm font-bold text-gray-800">Modo de Manutenção</p>
                                <p className="text-xs text-gray-500">Impede novos acessos de usuários comuns.</p>
                            </div>
                            <button 
                                onClick={() => setMaintenanceMode(!maintenanceMode)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${maintenanceMode ? 'bg-blue-600' : 'bg-gray-300'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${maintenanceMode ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
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
                </div>

                <div className="pt-6 flex justify-end">
                    <button className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-semibold shadow-sm hover:bg-emerald-700 transition-colors">
                        <Save size={18} />
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};