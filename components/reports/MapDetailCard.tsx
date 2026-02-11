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
}

const formatCurrency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPercentage = (value: number) => `${Math.round(value)}%`;

export const MapDetailCard = memo(({ data, onClose }: MapDetailCardProps) => {
    const prestadoPct = data.totalConcedido > 0 ? (data.totalPrestado / data.totalConcedido) * 100 : 0;
    const pendingValue = data.totalConcedido - data.totalPrestado;
    
    const initials = data.juiz?.name
        ? data.juiz.name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
        : '?';

    return (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 md:translate-x-0 md:translate-y-0 md:top-6 md:left-20 md:transform-none z-[1000] w-[340px] md:w-[380px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="relative p-5 pb-6 bg-gradient-to-br from-white to-slate-50 border-b border-slate-100">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                >
                    <X size={16} />
                </button>
                
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">{data.comarca}</h2>
                    <div className="flex flex-wrap gap-2 mt-2">
                        <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide border border-blue-100">
                            {data.entrancia}
                        </span>
                        <span className="bg-teal-50 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide border border-teal-100">
                            {data.regiao}
                        </span>
                        {data.polo && (
                             <span className="bg-slate-50 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide border border-slate-200">
                                Polo {data.polo}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto max-h-[70vh]">
                
                {/* Magistrado Section */}
                {data.juiz && (
                    <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-100/80 ring-1 ring-amber-50">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[9px] font-black text-amber-500 uppercase tracking-[0.15em]">Magistrado Responsável</p>
                            {/* <img src="/assets/brasao-tjpa.png" alt="TJPA" className="h-4 opacity-40 grayscale" /> */}
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                {data.juiz.avatar_url ? (
                                    <img src={data.juiz.avatar_url} alt={data.juiz.name} 
                                        className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md" />
                                ) : (
                                    <div className="w-14 h-14 rounded-full bg-amber-200 flex items-center justify-center text-lg font-black text-amber-700 border-2 border-white shadow-md">
                                        {initials}
                                    </div>
                                )}
                                <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white" title="Ativo" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-800 leading-tight mb-1">{data.juiz.name}</h3>
                                {data.juiz.email && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-0.5">
                                        <Mail size={10} />
                                        <span className="truncate max-w-[180px]">{data.juiz.email}</span>
                                    </div>
                                )}
                                {data.juiz.matricula && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                        <Hash size={10} />
                                        <span>Mat: {data.juiz.matricula}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Financial Summary */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-4 grid grid-cols-2 gap-4 divide-x divide-slate-100">
                        <div>
                            <div className="flex items-center gap-1.5 mb-1">
                                <TrendingUp size={12} className="text-emerald-500" />
                                <p className="text-[9px] font-black text-slate-400 uppercase">Recebido no Ano</p>
                            </div>
                            <p className="text-lg font-black text-emerald-600 tracking-tight">{formatCurrency.format(data.totalConcedido)}</p>
                        </div>
                        <div className="pl-4">
                            <div className="flex items-center gap-1.5 mb-1">
                                <CheckCircle2 size={12} className="text-blue-500" />
                                <p className="text-[9px] font-black text-slate-400 uppercase">Prestado Contas</p>
                            </div>
                            <p className="text-lg font-black text-blue-600 tracking-tight">{formatCurrency.format(data.totalPrestado)}</p>
                        </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="px-4 pb-4">
                        <div className="flex justify-between items-end mb-1.5">
                            <span className="text-[10px] text-slate-400 font-bold">{data.processCount} processos ativos</span>
                            <div className="text-right">
                                <span className="text-xs font-black text-slate-700">{formatPercentage(prestadoPct)}</span>
                                <span className="text-[9px] text-slate-400 font-medium ml-1">concluído</span>
                            </div>
                        </div>
                        <div className="relative h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${prestadoPct}%` }}
                            />
                        </div>
                        <div className="mt-2 text-right">
                            <span className="text-[9px] text-slate-400 font-medium">
                                Pendente: <span className="font-bold text-slate-500">{formatCurrency.format(pendingValue)}</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Expenses Breakdown */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             <Layers size={12} /> Distribuição por Elemento
                        </p>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-50">
                                <th className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase w-16">Elemento</th>
                                <th className="px-2 py-2 text-[9px] font-bold text-slate-400 uppercase">Descrição</th>
                                <th className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs">
                            {data.elementos.length > 0 ? (
                                data.elementos.slice(0, 5).map((el) => (
                                    <tr key={el.codigo} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-2 font-mono text-slate-500 text-[10px]">{el.codigo}</td>
                                        <td className="px-2 py-2 font-medium text-slate-700 truncate max-w-[120px]" title={el.descricao}>{el.descricao}</td>
                                        <td className="px-4 py-2 font-bold text-slate-800 text-right">{formatCurrency.format(el.valor)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="px-4 py-6 text-center text-slate-400 text-xs italic">
                                        Nenhuma despesa registrada neste período.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {data.elementos.length > 0 && (
                            <tfoot>
                                <tr className="bg-slate-50/50 border-t border-slate-100">
                                    <td colSpan={2} className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase">Total</td>
                                    <td className="px-4 py-2 text-[10px] font-black text-emerald-600 text-right">
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
