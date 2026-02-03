import React, { useState, useRef, useEffect } from 'react';
import { Bell, User, Settings, LogOut, ChevronDown, LayoutDashboard, FileText, CheckSquare, PieChart, Briefcase, Search, Loader2, X, Gavel, Scale } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HeaderProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onNavigate?: (page: string, processId?: string) => void;
  userProfile?: any;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, onNavigate, userProfile }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const allTabs = [
    { id: 'dashboard', label: 'Painel de Controle', icon: LayoutDashboard, roles: ['ADMIN', 'SOSFU', 'SEFIN', 'PRESIDENCIA', 'SGP', 'AJSEFIN'] },
    { id: 'suprido_dashboard', label: 'Portal do Suprido', icon: Briefcase, roles: ['SUPRIDO', 'SERVIDOR', 'GESTOR'] }, 
    { id: 'gestor_dashboard', label: 'Atesto de Gestão', icon: Gavel, roles: ['GESTOR', 'ADMIN'] },
    { id: 'sefin_dashboard', label: 'Gabinete SEFIN', icon: Scale, roles: ['SEFIN', 'ADMIN'] },
    { id: 'solicitations', label: 'Gestão de Solicitações', icon: FileText, roles: ['ADMIN', 'SOSFU', 'SEFIN'] },
    { id: 'accountability', label: 'Gestão de Contas', icon: CheckSquare, roles: ['ADMIN', 'SOSFU', 'SEFIN'] },
    { id: 'reports', label: 'Relatórios', icon: PieChart, roles: ['ADMIN', 'SOSFU', 'PRESIDENCIA'] },
    { id: 'settings', label: 'Configurações', icon: Settings, roles: ['ADMIN', 'SOSFU'] },
  ];

  const userRole = userProfile?.dperfil?.slug || 'SERVIDOR';
  const availableTabs = allTabs.filter(tab => tab.roles.includes(userRole));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults([]);
        if (searchQuery.length < 3) setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchQuery]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        setIsSearching(true);
        try {
          const { data: solicitations, error } = await supabase
            .from('solicitations')
            .select('id, process_number, beneficiary, value, status, unit')
            .or(`process_number.ilike.%${searchQuery}%,beneficiary.ilike.%${searchQuery}%`)
            .order('created_at', { ascending: false })
            .limit(5);
          if (error) throw error;
          setSearchResults(solicitations || []);
        } catch (error) { console.error("Erro busca:", error); setSearchResults([]); } finally { setIsSearching(false); }
      } else { setSearchResults([]); }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear(); sessionStorage.clear(); window.location.href = '/';
  };

  const handleSearchResultClick = (processId: string) => {
      if (onNavigate) onNavigate('process_detail', processId);
      setSearchQuery(''); setSearchResults([]);
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'PAID': return 'text-green-600 bg-green-50';
          case 'WAITING_MANAGER': return 'text-indigo-600 bg-indigo-50';
          case 'WAITING_SOSFU_ANALYSIS': return 'text-blue-600 bg-blue-50';
          case 'WAITING_SEFIN_SIGNATURE': return 'text-emerald-600 bg-emerald-50';
          case 'WAITING_SOSFU_PAYMENT': return 'text-cyan-600 bg-cyan-50';
          case 'WAITING_SUPRIDO_CONFIRMATION': return 'text-orange-600 bg-orange-50';
          case 'REJECTED': return 'text-red-600 bg-red-50';
          default: return 'text-gray-600 bg-gray-50';
      }
  };

  return (
    <>
    <header className="bg-white border-b border-gray-200 h-16 px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange && onTabChange(availableTabs[0]?.id || 'profile')}>
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/217479058_brasao-tjpa.png" alt="Brasão TJPA" className="h-10 w-auto opacity-90"/>
            <div className="hidden lg:block">
            <h1 className="text-blue-600 font-bold text-base leading-tight">SOSFU TJPA</h1>
            <p className="text-blue-400 text-[9px] font-bold tracking-wider uppercase">• Suprimento de Fundos</p>
            </div>
        </div>
        <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
        {onTabChange && (
            <nav className="hidden md:flex items-center gap-1">
                {availableTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => onTabChange(tab.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                            <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="hidden xl:inline">{tab.label}</span>
                        </button>
                    );
                })}
            </nav>
        )}
      </div>

      <div className="flex-1 max-w-lg mx-6 relative hidden md:block" ref={searchRef}>
        <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input type="text" placeholder="Buscar processo..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent hover:border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-lg text-sm transition-all outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
            {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Loader2 size={14} className="animate-spin text-blue-500" /></div>}
            {searchQuery && !isSearching && <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={14} /></button>}
        </div>
        {searchQuery.length >= 3 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2">
                {searchResults.length > 0 ? (
                    <div>
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Resultados</div>
                        {searchResults.map((item) => (
                            <button key={item.id} onClick={() => handleSearchResultClick(item.id)} className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center justify-between group border-b border-gray-50 last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><FileText size={16} /></div>
                                    <div><p className="text-sm font-bold text-gray-800 group-hover:text-blue-700">{item.process_number}</p><p className="text-xs text-gray-500 truncate max-w-[200px]">{item.beneficiary}</p></div>
                                </div>
                                <div className="text-right">
                                     <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(item.status)}`}>{item.status.replace(/WAITING_|_/g, ' ')}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (!isSearching && <div className="p-6 text-center text-gray-400"><p className="text-sm">Nenhum resultado.</p></div>)}
            </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        <button className="p-2 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-full bg-white shadow-sm transition-colors relative">
          <Bell size={20} /><span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-3 pl-4 border-l border-gray-200 group focus:outline-none">
            <div className="text-right hidden md:block group-hover:opacity-80 transition-opacity">
                <p className="text-xs font-bold text-gray-800 uppercase">{userProfile?.full_name || 'Usuário'}</p>
                <div className="flex items-center justify-end gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${userRole === 'SUPRIDO' ? 'bg-indigo-500' : 'bg-green-500'}`}></span>
                    <p className="text-[10px] text-gray-500 font-medium">{userProfile?.dperfil?.name || 'Carregando...'}</p>
                </div>
            </div>
            <div className="relative">
                <img src={userProfile?.avatar_url || "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/avatar_placeholder.png"} alt="User" className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover group-hover:ring-2 group-hover:ring-blue-100 transition-all"/>
            </div>
            <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-[60]">
                    <div className="px-4 py-3 border-b border-gray-100 mb-1">
                        <p className="text-sm font-bold text-gray-900 truncate">{userProfile?.full_name}</p>
                        <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 uppercase">{userProfile?.dperfil?.name}</span>
                    </div>
                    <button onClick={() => { setIsMenuOpen(false); onTabChange && onTabChange('profile'); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-3"><User size={16} /> Perfil</button>
                    {(userRole === 'ADMIN' || userRole === 'SOSFU') && <button onClick={() => { setIsMenuOpen(false); onTabChange && onTabChange('settings'); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-3"><Settings size={16} /> Configurações</button>}
                    <div className="h-px bg-gray-100 my-1"></div>
                    <button onClick={handleLogout} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"><LogOut size={16} /> Sair</button>
                </div>
            )}
        </div>
      </div>
    </header>
    </>
  );
};