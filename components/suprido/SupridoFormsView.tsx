import React from 'react';
import { Siren, Gavel, Plane, ShieldCheck, ArrowRight, ChevronLeft } from 'lucide-react';

interface SupridoFormsViewProps {
    onNavigate: (page: string) => void;
    onBack: () => void;
}

export const SupridoFormsView: React.FC<SupridoFormsViewProps> = ({ onNavigate, onBack }) => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 font-sans">
            <div className="mb-8 flex items-center gap-4">
                <button 
                    onClick={onBack}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                >
                    <ChevronLeft size={24} />
                </button>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Formulários de Solicitação</h2>
                    <p className="text-sm text-slate-500 font-medium">Selecione o tipo de suprimento de fundos que deseja iniciar</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Extra-Emergencial */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-red-200 transition-all group cursor-pointer relative overflow-hidden" onClick={() => onNavigate('solicitation_emergency')}>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform shadow-sm"><Siren size={32} /></div>
                            <span className="bg-red-50 text-red-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-red-100">Urgente</span>
                        </div>
                        <h4 className="text-xl font-black text-slate-800 mb-2">Extra-Emergencial</h4>
                        <p className="text-sm text-slate-500 mb-6 max-w-xs leading-relaxed font-medium">Utilizado para cobrir despesas imprevistas e urgentes que exigem execução imediata por Suprimento de Fundos.</p>
                        <div className="flex items-center gap-2 text-sm font-black text-red-600 group-hover:gap-3 transition-all">
                            <span>Iniciar Solicitação</span>
                            <ArrowRight size={16} />
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-50/30 rounded-full -mr-16 -mt-16 blur-3xl transition-opacity opacity-0 group-hover:opacity-100"></div>
                </div>

                {/* Extra-Júri */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all group cursor-pointer relative overflow-hidden" onClick={() => onNavigate('solicitation_jury')}>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform shadow-sm"><Gavel size={32} /></div>
                            <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-blue-100">Alimentação</span>
                        </div>
                        <h4 className="text-xl font-black text-slate-800 mb-2">Extra-Júri</h4>
                        <p className="text-sm text-slate-500 mb-6 max-w-xs leading-relaxed font-medium">Destinado exclusivamente ao custeio de alimentação para jurados e oficiais de justiça em sessões do Tribunal do Júri.</p>
                        <div className="flex items-center gap-2 text-sm font-black text-blue-600 group-hover:gap-3 transition-all">
                            <span>Iniciar Solicitação</span>
                            <ArrowRight size={16} />
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/30 rounded-full -mr-16 -mt-16 blur-3xl transition-opacity opacity-0 group-hover:opacity-100"></div>
                </div>

                {/* Diárias e Passagens */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-sky-200 transition-all group cursor-pointer relative overflow-hidden" onClick={() => onNavigate('solicitation_diarias')}>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500 group-hover:scale-110 transition-transform shadow-sm"><Plane size={32} /></div>
                            <span className="bg-sky-50 text-sky-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-sky-100">Deslocamento</span>
                        </div>
                        <h4 className="text-xl font-black text-slate-800 mb-2">Diárias e Passagens</h4>
                        <p className="text-sm text-slate-500 mb-6 max-w-xs leading-relaxed font-medium">Para solicitação de diárias por deslocamento a serviço e reserva de passagens aéreas institucionais.</p>
                        <div className="flex items-center gap-2 text-sm font-black text-sky-600 group-hover:gap-3 transition-all">
                            <span>Iniciar Solicitação</span>
                            <ArrowRight size={16} />
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50/30 rounded-full -mr-16 -mt-16 blur-3xl transition-opacity opacity-0 group-hover:opacity-100"></div>
                </div>

                {/* Ressarcimento */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-teal-200 transition-all group cursor-pointer relative overflow-hidden" onClick={() => onNavigate('solicitation_ressarcimento')}>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-500 group-hover:scale-110 transition-transform shadow-sm"><ShieldCheck size={32} /></div>
                            <span className="bg-teal-50 text-teal-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-teal-100">Reembolso</span>
                        </div>
                        <h4 className="text-xl font-black text-slate-800 mb-2">Ressarcimento</h4>
                        <p className="text-sm text-slate-500 mb-6 max-w-xs leading-relaxed font-medium">Para solicitar o ressarcimento de despesas autorizadas realizadas com recursos próprios pelo servidor.</p>
                        <div className="flex items-center gap-2 text-sm font-black text-teal-600 group-hover:gap-3 transition-all">
                            <span>Iniciar Solicitação</span>
                            <ArrowRight size={16} />
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50/30 rounded-full -mr-16 -mt-16 blur-3xl transition-opacity opacity-0 group-hover:opacity-100"></div>
                </div>
            </div>
        </div>
    );
};
