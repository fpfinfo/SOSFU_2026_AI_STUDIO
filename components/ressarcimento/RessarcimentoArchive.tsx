import React from 'react';
import { Archive, Search, FileText } from 'lucide-react';

export const RessarcimentoArchive: React.FC<{ onNavigate: (p: string) => void }> = () => (
    <div className="p-8 text-center animate-in fade-in">
        <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Archive size={32} className="text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-700">Arquivo de Ressarcimentos</h2>
        <p className="text-slate-500 mt-2">Histórico completo de processos finalizados e arquivados.</p>
        
        <div className="mt-8 max-w-md mx-auto">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Buscar processo arquivado..." className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-200 focus:outline-none" />
            </div>
        </div>
    </div>
);
