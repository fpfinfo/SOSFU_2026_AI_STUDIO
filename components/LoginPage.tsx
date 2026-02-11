import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const LoginPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

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
                options: {
                    data: {
                        full_name: name,
                    },
                },
            });

            if (authError) throw authError;

            if (data.user && !data.session) {
                setSuccessMessage('Cadastro realizado com sucesso! Verifique seu e-mail para confirmar a conta antes de fazer login.');
                setIsSignUp(false); // Switch back to login
            }
        } else {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                if (authError.message.includes('Invalid login credentials')) {
                    throw new Error('E-mail ou senha incorretos.');
                } else if (authError.message.includes('Email not confirmed')) {
                     throw new Error('E-mail não confirmado. Verifique sua caixa de entrada.');
                } else if (authError.message.includes('Failed to fetch')) {
                     throw new Error('Falha na conexão com o servidor. Verifique sua internet.');
                } else {
                    throw authError;
                }
            }
        }
        // Success is handled by the onAuthStateChange listener in App.tsx
    } catch (err: any) {
        let errorMessage = err.message || 'Ocorreu um erro inesperado. Tente novamente.';
        if (errorMessage === 'Failed to fetch') {
            errorMessage = 'Falha na conexão com o servidor. Verifique sua internet.';
        }
        setError(errorMessage);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-blue-600/5 skew-y-3 transform origin-top-left pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 relative z-10 border border-gray-100">
        
        {/* Header / Logo Area */}
        <div className="bg-gradient-to-b from-blue-50/50 to-white p-8 text-center border-b border-gray-100">
          <div className="relative inline-block">
             <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full"></div>
             <img 
                src="/assets/brasao-tjpa.png" 
                alt="Brasão TJPA" 
                className="h-24 w-auto mx-auto mb-4 relative drop-shadow-sm transform hover:scale-105 transition-transform duration-300"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">SOSFU TJPA</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="h-px w-8 bg-blue-200"></span>
            <p className="text-blue-500 text-[10px] font-bold tracking-widest uppercase">Suprimento de Fundos</p>
            <span className="h-px w-8 bg-blue-200"></span>
          </div>
        </div>

        {/* Form Area */}
        <div className="p-8 pt-6">
          <div className="mb-8 text-center">
            <h2 className="text-lg font-semibold text-gray-700">
                {isSignUp ? 'Criar Nova Conta' : 'Bem-vindo de volta'}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
                {isSignUp ? 'Preencha os dados abaixo para se cadastrar' : 'Acesse sua conta institucional para continuar'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start gap-2 animate-in slide-in-from-top-2 border border-red-100">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm flex items-start gap-2 animate-in slide-in-from-top-2 border border-green-100">
                <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                <span className="leading-snug">{successMessage}</span>
              </div>
            )}

            {isSignUp && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nome Completo</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    <User size={18} />
                    </div>
                    <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400 focus:bg-white"
                    placeholder="Seu nome completo"
                    />
                </div>
                </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">E-mail Institucional</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400 focus:bg-white"
                  placeholder="usuario@tjpa.jus.br"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Senha</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400 focus:bg-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {!isSignUp && (
                <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-gray-900 transition-colors">
                    <div className="relative flex items-center">
                        <input type="checkbox" className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 shadow-sm checked:border-blue-500 checked:bg-blue-500 hover:border-blue-400 transition-all" />
                        <CheckCircle2 size={10} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                    </div>
                    Lembrar-me
                </label>
                <a href="#" className="text-blue-600 hover:text-blue-700 hover:underline font-semibold transition-colors">Esqueceu a senha?</a>
                </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`
                w-full bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 
                text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 
                transition-all transform hover:-translate-y-0.5 active:translate-y-0
                flex items-center justify-center gap-2 mt-6
                ${loading ? 'opacity-80 cursor-wait' : ''}
              `}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-white/90">Processando...</span>
                </div>
              ) : (
                <>
                  {isSignUp ? 'Criar Conta' : 'Acessar Sistema'}
                  <ArrowRight size={18} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
                onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                    setSuccessMessage('');
                }}
                className="text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors"
            >
                {isSignUp ? 'Já possui uma conta? ' : 'Não possui uma conta? '}
                <span className="text-blue-600 font-bold underline decoration-blue-200 underline-offset-2 hover:decoration-blue-600 transition-all">
                    {isSignUp ? 'Fazer Login' : 'Cadastre-se'}
                </span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50/80 p-4 text-center border-t border-gray-100 backdrop-blur-sm">
          <p className="text-[10px] text-gray-400 font-medium">
            Tribunal de Justiça do Estado do Pará &copy; 2024 <br/>
            Departamento de Tecnologia da Informação
          </p>
        </div>
      </div>
    </div>
  );
};
