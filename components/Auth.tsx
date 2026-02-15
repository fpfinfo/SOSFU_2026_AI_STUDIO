
import React from 'react';
import { useAuth } from '../hooks/useAuth';

const Auth: React.FC = () => {
  const {
    email,
    setEmail,
    password,
    setPassword,
    fullName,
    setFullName,
    cpf,
    handleCpfChange,
    isSignUp,
    loading,
    message,
    toggleMode,
    handleAuth
  } = useAuth();

  const modules = [
    { name: 'Usuário', icon: 'fa-user-gear', desc: 'Portal do servidor.' },
    { name: 'Suprimento de Fundos', icon: 'fa-bolt-lightning', desc: 'Controle de SOSFU.' },
    { name: 'Diárias e Passagens', icon: 'fa-plane-departure', desc: 'Logística de viagens.' },
    { name: 'Reembolso de Despesas', icon: 'fa-receipt', desc: 'Ressarcimentos ágeis.' },
    { name: 'Prestação de Contas', icon: 'fa-calculator', desc: 'Auditoria com IA.' }
  ];

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white overflow-hidden">
      {/* Coluna Esquerda: Branding & Marketing */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 bg-[#012517] relative p-12 lg:p-20 flex-col justify-between overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full opacity-[0.03] pointer-events-none">
          <i className="fa-solid fa-sparkles text-[40rem] absolute -top-40 -right-40 text-emerald-400 rotate-12"></i>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-16">
            <div className="p-2">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/217479058_brasao-tjpa.png" 
                alt="TJPA" 
                className="w-14 h-auto"
              />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">ÁGIL</h1>
          </div>

          <div className="space-y-8 max-w-2xl">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                <i className="fa-solid fa-microchip animate-pulse"></i> Inteligência Artificial Integrada
              </span>
              <h2 className="text-5xl lg:text-6xl font-black text-white leading-[1.05] tracking-tight">
                A revolução na <span className="text-[#00c283]">gestão corporativa</span> do TJPA.
              </h2>
              <p className="text-emerald-100/70 text-lg font-medium leading-relaxed max-w-lg">
                Um ecossistema moderno e inteligente que utiliza IA para agilizar solicitações e prestações de contas em 5 módulos integrados:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {modules.map((mod, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-sm group hover:bg-white/[0.05] transition-all">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                    <i className={`fa-solid ${mod.icon}`}></i>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-xs uppercase tracking-tight">{mod.name}</h4>
                    <p className="text-white/40 text-[10px] mt-0.5 leading-tight">{mod.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6">
               <div className="inline-flex items-center gap-3 text-[#00c283] font-black text-xl italic tracking-tighter">
                  <i className="fa-solid fa-mobile-screen-button"></i>
                  Agilidade na palma da sua mão.
               </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-10 border-t border-white/[0.05]">
          <p className="text-emerald-500/40 text-[10px] font-black uppercase tracking-[0.15em]">
            © 2026 TRIBUNAL DE JUSTIÇA DO ESTADO DO PARÁ - LABORATÓRIO DE INOVAÇÃO DA SEFIN
          </p>
        </div>
      </div>

      {/* Coluna Direita: Formulário */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-12 lg:px-24 py-12 bg-white">
        <div className="max-w-md w-full mx-auto space-y-10">
          
          <div className="md:hidden flex flex-col items-center mb-6">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/217479058_brasao-tjpa.png" 
              alt="TJPA" 
              className="w-16 h-auto mb-4"
            />
          </div>

          <div className="space-y-3">
            <h2 className="text-4xl font-black text-[#0f172a] tracking-tight">
              {isSignUp ? 'Criar sua conta' : 'Seja bem-vindo'}
            </h2>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">
              {isSignUp 
                ? 'Comece a utilizar a plataforma inteligente de despesas do TJPA.' 
                : 'Acesse o portal ÁGIL com suas credenciais institucionais.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {message && (
              <div className={`p-4 rounded-2xl text-xs font-bold border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                <i className={`fa-solid ${message.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
                {message.text}
              </div>
            )}

            {isSignUp && (
              <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <div className="relative group">
                    <i className="fa-solid fa-user absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors"></i>
                    <input 
                      type="text" 
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nome completo do servidor"
                      className="w-full pl-12 pr-4 py-4 bg-[#f8fafc] border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all font-semibold text-slate-800 placeholder:text-slate-300"
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF</label>
                  <div className="relative group">
                    <i className="fa-solid fa-id-card absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors"></i>
                    <input 
                      type="text" 
                      required
                      value={cpf}
                      onChange={handleCpfChange}
                      maxLength={14}
                      placeholder="000.000.000-00"
                      className="w-full pl-12 pr-4 py-4 bg-[#f8fafc] border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all font-semibold text-slate-800 placeholder:text-slate-300"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Institucional</label>
              <div className="relative group">
                <i className="fa-solid fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors"></i>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@tjpa.jus.br"
                  className="w-full pl-12 pr-4 py-4 bg-[#f8fafc] border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all font-semibold text-slate-800 placeholder:text-slate-300"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Senha</label>
              </div>
              <div className="relative group">
                <i className="fa-solid fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors"></i>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-[#f8fafc] border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all font-semibold text-slate-800 placeholder:text-slate-300"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-[#009b67] text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-100/50 hover:bg-[#008156] active:scale-[0.98] transition-all flex items-center justify-center gap-3 relative overflow-hidden group mt-4"
            >
              {loading ? (
                <i className="fa-solid fa-circle-notch fa-spin"></i>
              ) : (
                <>
                  <span>{isSignUp ? 'Cadastrar Agora' : 'Entrar no Sistema'}</span>
                  <i className={`fa-solid ${isSignUp ? 'fa-arrow-right' : 'fa-arrow-right-to-bracket'} text-sm group-hover:translate-x-1 transition-transform`}></i>
                </>
              )}
            </button>
          </form>

          <div className="pt-8 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500 font-medium">
              {isSignUp ? 'Já possui uma conta?' : 'Ainda não tem acesso?'}
              <button 
                onClick={toggleMode}
                className="ml-2 text-emerald-600 font-bold hover:underline"
              >
                {isSignUp ? 'Faça login' : 'Solicitar cadastro'}
              </button>
            </p>
          </div>

          <div className="flex flex-col gap-6 pt-2">
             <div className="flex items-center gap-4 text-slate-300">
               <div className="h-px flex-1 bg-slate-100"></div>
               <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Suporte Ágil</span>
               <div className="h-px flex-1 bg-slate-100"></div>
             </div>
             <div className="flex justify-center gap-10">
               <button className="flex flex-col items-center gap-2 group">
                 <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all border border-transparent group-hover:border-emerald-100 shadow-sm">
                   <i className="fa-solid fa-book-open text-lg"></i>
                 </div>
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter group-hover:text-emerald-600 transition-colors">Manuais</span>
               </button>
               <button className="flex flex-col items-center gap-2 group">
                 <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all border border-transparent group-hover:border-emerald-100 shadow-sm">
                   <i className="fa-solid fa-headset text-lg"></i>
                 </div>
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter group-hover:text-emerald-600 transition-colors">Chamados</span>
               </button>
               <button className="flex flex-col items-center gap-2 group">
                 <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all border border-transparent group-hover:border-emerald-100 shadow-sm">
                   <i className="fa-solid fa-video text-lg"></i>
                 </div>
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter group-hover:text-emerald-600 transition-colors">Tutoriais</span>
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
