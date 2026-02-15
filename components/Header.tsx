
import React from 'react';
import { AppModule, Profile } from '../types';
import { MODULE_THEMES } from '../utils/themes';
import NotificationBell from './NotificationBell';

interface HeaderProps {
  activeModule?: AppModule;
  profile?: Profile | null;
  onProfileClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeModule = 'usuarios', profile, onProfileClick }) => {
  const theme = MODULE_THEMES[activeModule] || MODULE_THEMES.usuarios;
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const nextDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('agil_theme', nextDark ? 'dark' : 'light');
    setIsDark(nextDark);
  };

  const userName = profile?.fullName 
    ? profile.fullName.split(' ')[0] 
    : (profile?.email?.split('@')[0] || 'Servidor');

  return (
    <header className={`px-6 md:px-10 py-4 md:py-6 bg-white dark:bg-slate-900/80 dark:backdrop-blur-xl border-b ${theme.accent.replace('border-', 'border-b-')} md:border-b-gray-100 dark:md:border-b-slate-800 flex justify-between items-center sticky top-0 z-40 transition-all duration-500`}>
      <div className="md:hidden flex items-center gap-3">
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/217479058_brasao-tjpa.png" 
          alt="Brasão TJPA" 
          className="w-9 h-auto object-contain"
        />
        <span className={`font-black text-xl tracking-tighter ${theme.primary}`}>ÁGIL</span>
      </div>

      <div className="hidden md:flex items-center text-gray-400 dark:text-slate-500 gap-2 text-sm font-medium">
        <span className="hover:text-emerald-600 cursor-pointer transition-colors">TJPA</span>
        <i className="fa-solid fa-chevron-right text-[10px]"></i>
        <span className="hover:text-emerald-600 cursor-pointer transition-colors">ÁGIL</span>
        <i className="fa-solid fa-chevron-right text-[10px]"></i>
        <div className="flex items-center gap-2">
          <i className={`fa-solid ${theme.icon} ${theme.primary} text-xs`}></i>
          <span className="text-gray-800 dark:text-slate-200 font-bold">{theme.label}</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden lg:flex items-center bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 px-4 py-2.5 rounded-2xl text-gray-400 text-sm w-72 focus-within:ring-2 focus-within:ring-emerald-100 dark:focus-within:ring-emerald-900/30 transition-all">
            <i className="fa-solid fa-magnifying-glass mr-2 text-gray-300 dark:text-slate-600"></i>
            <input type="text" placeholder="Pesquisar..." className="bg-transparent border-none outline-none w-full text-gray-700 dark:text-slate-300 placeholder-gray-300 dark:placeholder-slate-600 font-bold" />
        </div>
        
        <div className="flex items-center gap-2 md:gap-4 text-gray-600">
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-slate-800 active:scale-95 rounded-2xl transition-all duration-200 group text-slate-400 hover:text-amber-500 dark:hover:text-yellow-400"
              title="Alternar Tema"
            >
                {!isDark ? (
                  <i className="fa-solid fa-sun text-lg animate-in zoom-in spin-in duration-300"></i>
                ) : (
                  <i className="fa-solid fa-moon text-lg animate-in zoom-in spin-in duration-300"></i>
                )}
            </button>

            <NotificationBell />
            
            <button 
              onClick={onProfileClick}
              className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all group"
            >
              <div className="hidden md:block text-right">
                <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight leading-none mb-0.5">{userName}</p>
                <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{profile?.systemRole ? profile.systemRole.replace('_', ' ') : 'SERVIDOR'}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center ${theme.primary} font-black overflow-hidden shadow-sm group-hover:border-emerald-200 dark:group-hover:border-emerald-800 transition-all`}>
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  userName[0]
                )}
              </div>
            </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
