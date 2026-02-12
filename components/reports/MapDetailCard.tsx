import React, { memo } from 'react';
import { X, MapPin, Landmark, TrendingUp, CheckCircle2, User, Mail, Hash, Layers } from 'lucide-react';

interface ElementoDespesa {
    codigo: string;
    descricao: string;
    valor: number;
}

export interface ComarcaData {
    comarca: string;
    lat: number;
    lng: number;
    entrancia: string;
    polo: string;
    regiao: string;
    totalConcedido: number;
    totalPrestado: number;
    processCount: number;
    elementos: ElementoDespesa[];
    juiz: {
        name: string;
        email: string;
        avatar_url: string | null;
        matricula: string;
    } | null;
}

interface MapDetailCardProps {
    data: ComarcaData;
    onClose: () => void;
    isDashboard?: boolean;
}

const formatCurrency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPercentage = (value: number) => `${Math.round(value)}%`;

export const MapDetailCard = memo(({ data, onClose, isDashboard = false }: MapDetailCardProps) => {
    const prestadoPct = data.totalConcedido > 0 ? (data.totalPrestado / data.totalConcedido) * 100 : 0;
    const pendingValue = data.totalConcedido - data.totalPrestado;
    
    const initials = data.juiz?.name
        ? data.juiz.name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
        : '?';

    return (
        <div className={`w-full h-full flex flex-col bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-500 ${isDashboard ? 'rounded-[40px]' : ''}`}>
            {/* Header */}
            <div className={`relative p-8 pb-10 bg-gradient-to-br from-white via-slate-50/50 to-teal-50/20 border-b border-slate-100 shrink-0 ${isDashboard ? 'px-12' : 'p-5'}`}>
                {!isDashboard && (
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors flex items-center gap-1.5 px-3"
                    >
                        <span className="text-[10px] font-bold uppercase hidden md:inline">Voltar</span>
                        <X size={14} />
                    </button>
                )}
                
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-10 bg-teal-500 rounded-full" />
                        <h2 className={`${isDashboard ? 'text-4xl' : 'text-xl'} font-black text-slate-800 uppercase tracking-tighter leading-none`}>
                            {data.comarca}
                        </h2>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                        <span className="bg-blue-100/50 text-blue-700 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-blue-200/50">
                            {data.entrancia}
                        </span>
                        <span className="bg-teal-100/50 text-teal-700 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-teal-200/50">
                            {data.regiao}
                        </span>
                        {data.polo && (
                             <span className="bg-slate-100/50 text-slate-600 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-slate-200/50">
                                Polo {data.polo}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className={`${isDashboard ? 'p-10 px-12' : 'p-5'} space-y-8 overflow-y-auto flex-1 custom-scrollbar`}>
                
                {/* Immersive Dashboard Layout Split */}
                <div className={`grid ${isDashboard ? 'grid-cols-2' : 'grid-cols-1'} gap-8`}>
                    {/* Left Column (Magistrado & Info) */}
                    <div className="space-y-6">
                        {/* Magistrado Section */}
                        {data.juiz && (
                            <div className="bg-amber-50/40 rounded-3xl p-6 border border-amber-100/50 shadow-sm">
                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-4">Magistrado Responsável</p>
                                <div className="flex items-center gap-5">
                                    <div className="relative">
                                        {data.juiz.avatar_url ? (
                                            <img src={data.juiz.avatar_url} alt={data.juiz.name} 
                                                className="w-20 h-20 rounded-[28px] object-cover border-4 border-white shadow-xl" />
                                        ) : (
                                            <div className="w-20 h-20 rounded-[28px] bg-amber-200 flex items-center justify-center text-2xl font-black text-amber-700 border-4 border-white shadow-xl">
                                                {initials}
                                            </div>
                                        )}
                                        <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-4 border-white shadow-lg" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-xl font-black text-slate-800 leading-tight mb-2 truncate">{data.juiz.name}</h3>
                                        <div className="space-y-1.5">
                                            {data.juiz.email && (
                                                <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                                                    <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center shadow-sm border border-slate-100">
                                                        <Mail size={12} className="text-slate-400" />
                                                    </div>
                                                    <span className="truncate">{data.juiz.email}</span>
                                                </div>
                                            )}
                                            {data.juiz.matricula && (
                                                <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                                                    <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center shadow-sm border border-slate-100">
                                                        <Hash size={12} className="text-slate-400" />
                                                    </div>
                                                    <span>Mat: {data.juiz.matricula}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column (Financial Summary) */}
                    <div className="space-y-6">
                        <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                            <div className="relative z-10 flex flex-col h-full justify-between">
                                <div className="grid grid-cols-2 gap-8 mb-8">
                                    <div>
                                        <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-1.5">Total Concedido</p>
                                        <p className="text-3xl font-black tracking-tighter text-white">{formatCurrency.format(data.totalConcedido)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1.5">Total Prestado</p>
                                        <p className="text-3xl font-black tracking-tighter text-white">{formatCurrency.format(data.totalPrestado)}</p>
                                    </div>
                                </div>
                                
                                <div>
                                    <div className="flex justify-between items-end mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">{data.processCount} Processos em Análise</span>
                                        </div>
                                        <span className="text-xl font-black text-teal-400">{formatPercentage(prestadoPct)}</span>
                                    </div>
                                    <div className="h-4 w-full bg-white/10 rounded-full overflow-hidden border border-white/5 p-1">
                                        <div 
                                            className="h-full bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(45,212,191,0.5)]"
                                            style={{ width: `${prestadoPct}%` }}
                                        />
                                    </div>
                                    <div className="mt-4 flex justify-between items-center border-t border-white/10 pt-4">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saldo Pendente</span>
                                        <span className="text-sm font-black text-orange-400">{formatCurrency.format(pendingValue)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Expenses Breakdown */}
                <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                    <div className="bg-slate-50/80 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-teal-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
                                <Layers size={14} />
                            </div>
                            <p className="text-[11px] font-black text-slate-800 uppercase tracking-[0.15em]">
                                Distribuição Técnica por Elemento
                            </p>
                        </div>
                        <span className="bg-white px-3 py-1 rounded-full text-[9px] font-black text-slate-400 border border-slate-100 uppercase tracking-widest">
                            Top 10 Categorias
                        </span>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Código</th>
                                <th className="px-2 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição do Elemento</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Alocado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {data.elementos.length > 0 ? (
                                data.elementos.slice(0, 10).map((el) => (
                                    <tr key={el.codigo} className="hover:bg-teal-50/30 transition-colors group">
                                        <td className="px-8 py-4">
                                            <span className="font-mono text-teal-600 text-xs font-black bg-teal-50 px-2 py-0.5 rounded border border-teal-100/50">
                                                {el.codigo}
                                            </span>
                                        </td>
                                        <td className="px-2 py-4 font-bold text-slate-700">
                                            {el.descricao}
                                        </td>
                                        <td className="px-8 py-4 font-black text-slate-900 text-right text-base">
                                            {formatCurrency.format(el.valor)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="px-8 py-12 text-center text-slate-400 text-sm font-bold italic">
                                        Nenhuma despesa registrada para {data.comarca} neste período.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {data.elementos.length > 0 && (
                            <tfoot>
                                <tr className="bg-slate-50/50 border-t-2 border-slate-100">
                                    <td colSpan={2} className="px-8 py-5 text-sm font-black text-slate-600 uppercase tracking-widest text-right">Somatório Total do Exercício</td>
                                    <td className="px-8 py-5 text-xl font-black text-teal-600 text-right tracking-tight">
                                        {formatCurrency.format(data.elementos.reduce((acc, curr) => acc + curr.valor, 0))}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

            </div>
        </div>
    );
});
