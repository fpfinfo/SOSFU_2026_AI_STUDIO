import React, { useState } from 'react';
import {
    Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, User,
    Wallet, Plane, FileText, Receipt, ShieldCheck, ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginViewProps {
    onPostLoginNavigate?: (tab: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onPostLoginNavigate }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedModule, setSelectedModule] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        if (!email || !password) {
            setError('Por favor, informe seu e-mail e senha.');
            setLoading(false);
            return;
        }

        if (isSignUp && !name) {
            setError('Por favor, informe seu nome completo.');
            setLoading(false);
            return;
        }

        try {
            if (isSignUp) {
                const { data, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: name } },
                });

                if (authError) throw authError;

                if (data.user && !data.session) {
                    setSuccessMessage('Cadastro realizado com sucesso! Verifique seu e-mail.');
                    setIsSignUp(false);
                }
            } else {
                const { error: authError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (authError) throw authError;

                // If user selected a module card, store navigation intent
                if (selectedModule && onPostLoginNavigate) {
                    const moduleMap: Record<string, string> = {
                        suprimento: 'solicitation_emergency',
                        diarias: 'solicitation_diarias',
                        ressarcimento: 'solicitation_ressarcimento',
                    };
                    const targetTab = moduleMap[selectedModule];
                    if (targetTab) onPostLoginNavigate(targetTab);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro inesperado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-gray-50">
            {/* Left Panel - Branding & Info */}
            <div className="hidden lg:flex flex-col justify-between relative bg-[#1e293b] text-white p-12 overflow-hidden">
                {/* Background Gradient & Effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 to-slate-900/95 z-0" />
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10 mix-blend-overlay z-0" />
                
                {/* Decorative Circles */}
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl transform translate-x-1/3 translate-y-1/3" />

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col">
                    <div className="flex items-center gap-3">
                        <img 
                            src="/assets/brasao-tjpa.png" 
                            alt="Brasão TJPA" 
                            className="h-16 w-auto drop-shadow-lg"
                        />
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-white/90">TJPA</h2>
                            <p className="text-xs text-blue-200 font-medium uppercase tracking-widest">Tribunal de Justiça do Pará</p>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full">
                        <h1 className="text-4xl font-bold mb-6 leading-tight">
                            Gestão Administrativa <br/>
                            <span className="text-blue-400">Integrada e Eficiente</span>
                        </h1>
                        <p className="text-lg text-gray-300 mb-10 leading-relaxed">
                            Acesso centralizado para todos os serviços administrativos do TJPA. 
                            Gerencie solicitações e processos com transparência e agilidade.
                        </p>

                        {/* Modules Grid */}
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                { id: 'suprimento', tab: 'solicitation_emergency', icon: Wallet, label: 'Suprimento de Fundos', desc: 'Gestão de adiantamentos e prestação de contas', color: 'blue' },
                                { id: 'diarias', tab: 'solicitation_diarias', icon: Receipt, label: 'Diárias e Passagens', desc: 'Controle de deslocamentos e indenizações', color: 'emerald' },
                                { id: 'ressarcimento', tab: 'solicitation_ressarcimento', icon: ShieldCheck, label: 'Ressarcimentos', desc: 'Solicitação e acompanhamento de reembolsos', color: 'teal' },
                            ].map(mod => (
                                <button
                                    key={mod.id}
                                    type="button"
                                    onClick={() => setSelectedModule(selectedModule === mod.id ? null : mod.id)}
                                    className={`flex items-center gap-4 p-4 rounded-xl border backdrop-blur-sm transition-all text-left w-full group ${
                                        selectedModule === mod.id
                                            ? `bg-white/15 border-${mod.color}-400/40 ring-1 ring-${mod.color}-400/30`
                                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                                    }`}
                                >
                                    <div className={`p-2.5 bg-${mod.color}-500/20 rounded-lg text-${mod.color}-300`}>
                                        <mod.icon size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-white">{mod.label}</h3>
                                        <p className="text-xs text-gray-400">{mod.desc}</p>
                                    </div>
                                    <ChevronRight size={16} className={`text-gray-500 transition-transform ${selectedModule === mod.id ? 'rotate-90 text-white' : 'group-hover:translate-x-0.5'}`} />
                                </button>
                            ))}
                            {selectedModule && (
                                <p className="text-xs text-blue-300 text-center animate-in fade-in duration-300">
                                    Faça login para acessar o módulo selecionado
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="text-xs text-gray-400 mt-12 flex justify-between items-center bg-black/20 p-4 rounded-lg backdrop-blur-md border border-white/5">
                        <span>© 2026 Tribunal de Justiça do Estado do Pará</span>
                        <span className="flex items-center gap-1.5 opacity-70">
                            <ShieldCheck size={12} /> Ambiente Seguro
                        </span>
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex items-center justify-center p-6 lg:p-12 relative">
                 {/* Mobile Header (Only visible on small screens) */}
                 <div className="lg:hidden absolute top-0 left-0 w-full p-6 flex justify-center">
                    <img src="/assets/brasao-tjpa.png" alt="Logo" className="h-16" />
                </div>

                <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl lg:shadow-none border border-gray-100 lg:border-none animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="mb-8">
                        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                            {isSignUp ? 'Criar Conta' : 'Bem-vindo de volta'}
                        </h2>
                        <p className="text-gray-500">
                            {isSignUp 
                                ? 'Preencha os dados abaixo para se cadastrar.' 
                                : 'Insira suas credenciais para acessar o painel.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start gap-2 border border-red-100">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {successMessage && (
                            <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm flex items-start gap-2 border border-green-100">
                                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                                <span>{successMessage}</span>
                            </div>
                        )}

                        {isSignUp && (
                            <div className="space-y-2">
                                    <label htmlFor="full-name-input" className="text-sm font-semibold text-gray-700 ml-1">Nome Completo</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <User size={18} />
                                    </div>
                                    <input
                                        id="full-name-input"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                        placeholder="Seu nome completo"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor="login-email-input" className="text-sm font-semibold text-gray-700 ml-1">E-mail</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <Mail size={18} />
                                </div>
                                <input
                                    id="login-email-input"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                    placeholder="usuario@tjpa.jus.br"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label htmlFor="login-password-input" className="text-sm font-semibold text-gray-700 ml-1">Senha</label>
                                {!isSignUp && (
                                    <a href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                                        Esqueceu a senha?
                                    </a>
                                )}
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <Lock size={18} />
                                </div>
                                <input
                                    id="login-password-input"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`
                                w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl
                                shadow-lg shadow-blue-200 hover:shadow-blue-300
                                transition-all transform hover:-translate-y-0.5 active:translate-y-0
                                flex items-center justify-center gap-2 mt-4
                                ${loading ? 'opacity-80 cursor-wait' : ''}
                            `}
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {isSignUp ? 'Criar Conta' : 'Entrar no Sistema'}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-500">
                            {isSignUp ? 'Já tem uma conta?' : 'Não tem uma conta?'}
                            <button
                                onClick={() => {
                                    setIsSignUp(!isSignUp);
                                    setError('');
                                    setSuccessMessage('');
                                }}
                                className="ml-1 font-bold text-blue-600 hover:text-blue-700 hover:underline focus:outline-none"
                            >
                                {isSignUp ? 'Faça login' : 'Cadastre-se'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
