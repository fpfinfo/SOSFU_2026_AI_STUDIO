import React from 'react';
import { BarChart3, TrendingUp, PieChart, LineChart } from 'lucide-react';

export const RessarcimentoReports: React.FC = () => (
    <div className="p-6">
        <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <BarChart3 className="text-emerald-600" /> Relatórios Gerenciais
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer group">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <TrendingUp className="text-emerald-600" />
                </div>
                <h3 className="font-bold text-lg text-slate-800">Fluxo de Pagamento</h3>
                <p className="text-sm text-slate-500 mt-1">Tempo médio de processamento e execução.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer group">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <PieChart className="text-emerald-600" />
                </div>
                <h3 className="font-bold text-lg text-slate-800">Despesas por Unidade</h3>
                <p className="text-sm text-slate-500 mt-1">Análise de ressarcimentos por setor.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer group">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <LineChart className="text-emerald-600" />
                </div>
                <h3 className="font-bold text-lg text-slate-800">Evolução Mensal</h3>
                <p className="text-sm text-slate-500 mt-1">Comparativo de gastos mês a mês.</p>
            </div>
        </div>
    </div>
);
