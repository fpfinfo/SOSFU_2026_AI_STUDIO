import React, { useState } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

interface SpendingChartProps {
    data: any[];
}

export const SpendingChart: React.FC<SpendingChartProps> = ({ data }) => {
    const [view, setView] = useState<'flow' | 'balance'>('flow');

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 backdrop-blur-sm border border-slate-200 p-4 rounded-2xl shadow-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{label}</p>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-8">
                            <span className="text-xs font-bold text-slate-500">Recebido</span>
                            <span className="text-xs font-black text-emerald-600">R$ {payload[0].value.toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center justify-between gap-8">
                            <span className="text-xs font-bold text-slate-500">Gasto</span>
                            <span className="text-xs font-black text-slate-700">R$ {payload[1].value.toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-8">
                            <span className="text-xs font-bold text-slate-400">Restante</span>
                            <span className="text-xs font-black text-amber-600">R$ {(payload[0].value - payload[1].value).toLocaleString('pt-BR')}</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 h-full flex flex-col shadow-sm transition-shadow hover:shadow-md">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Histórico de Empenho</h3>
                    <p className="text-sm text-slate-400 font-medium">Fluxo financeiro corporativo • Recebido vs Gasto</p>
                </div>
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 shadow-inner">
                    <button
                        onClick={() => setView('flow')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'flow' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Fluxo
                    </button>
                    <button
                        onClick={() => setView('balance')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'balance' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Balanço
                    </button>
                </div>
            </div>

            <div className="flex-1 w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900, textAnchor: 'middle' }} 
                            dy={15}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.4)', radius: 12 }} />
                        <Bar 
                            dataKey="recebido" 
                            fill="#059669" 
                            radius={[6, 6, 0, 0]} 
                            barSize={view === 'flow' ? 24 : 32}
                            animationDuration={1500}
                        />
                        <Bar 
                            dataKey="gasto" 
                            fill="#e2e8f0" 
                            radius={[6, 6, 0, 0]} 
                            barSize={view === 'flow' ? 24 : 0}
                            animationDuration={2000}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
