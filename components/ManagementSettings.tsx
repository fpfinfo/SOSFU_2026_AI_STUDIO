
import React, { useState, useEffect } from 'react';
import { AppModule, Profile, ExpenseElement, SystemRole, ManagementSettings as ISettings } from '../types';
import { MODULE_THEMES } from '../utils/themes';
import { 
  getExpenseElements, 
  saveExpenseElement, 
  updateProfile, 
  deleteExpenseElement, 
  getSystemRoles,
  getAllProfiles,
  getManagementSettings,
  saveManagementSettings,
  getComarcas,
  saveComarca,
  deleteComarca,
  getAdministrativeUnits,
  saveAdministrativeUnit,
  deleteAdministrativeUnit,
  getDailyAllowanceRates,
  saveDailyAllowanceRate,
  deleteDailyAllowanceRate
} from '../services/dataService';
import { Comarca, AdministrativeUnit, DailyAllowanceRate } from '../types';

interface ManagementSettingsProps {
  module: AppModule;
}

type SettingsSection = 'Geral' | 'Elementos' | 'Usuarios' | 'Perfis' | 'Banner';

const ManagementSettings: React.FC<ManagementSettingsProps> = ({ module }) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('Perfis');
  const [activeSubTab, setActiveSubTab] = useState<'Parâmetros' | 'Tabela' | 'Comarcas' | 'Unidades'>('Parâmetros');
  const theme = MODULE_THEMES[module] || MODULE_THEMES.usuarios;
  const [saving, setSaving] = useState(false);
  // ... rest of the file ...
  const [searchTerm, setSearchTerm] = useState('');
  const [elements, setElements] = useState<ExpenseElement[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [systemRoles, setSystemRoles] = useState<SystemRole[]>([]);
  const [comarcas, setComarcas] = useState<Comarca[]>([]);
  const [units, setUnits] = useState<AdministrativeUnit[]>([]);
  const [dailyAllowanceRates, setDailyAllowanceRates] = useState<DailyAllowanceRate[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');

  // General Settings State
  const [genSettings, setGenSettings] = useState<Partial<ISettings>>({
    expense_limit: 5000,
    expense_limit_extra: 15000,
    submission_deadline_days: 5,
    audit_auto_approve_score: 85,
    food_lunch: 30,
    food_dinner: 30,
    food_snack: 11,
    jury_servers: 7,
    jury_defenders: 2,
    jury_prosecutors: 2,
    jury_police: 5,
    maintenance_mode: false,
    banner_images: []
  });

  // State for Modals & Selections
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [targetRole, setTargetRole] = useState<string>('USER');
  
  const [showElementModal, setShowElementModal] = useState(false);
  const [selectedElement, setSelectedElement] = useState<Partial<ExpenseElement> | null>(null);

  // Modal State for Daily Allowance Rates
  const [showRateModal, setShowRateModal] = useState(false);
  const [selectedRate, setSelectedRate] = useState<Partial<DailyAllowanceRate>>({});

  // Modal State for Comarcas & Units
  const [showComarcaModal, setShowComarcaModal] = useState(false);
  const [selectedComarca, setSelectedComarca] = useState<Partial<Comarca>>({});
  
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Partial<AdministrativeUnit>>({});

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newTeamMember, setNewTeamMember] = useState({ userId: '', role: '' });

  useEffect(() => {
    loadBaseData();
  }, [module]);

  useEffect(() => {
    loadSectionData();
  }, [activeSection, activeSubTab]);

  const loadBaseData = async () => {
    try {
      const roles = await getSystemRoles();
      setSystemRoles(roles);
      const settings = await getManagementSettings(module === 'usuarios' ? 'geral' : module);
      setGenSettings(settings);
    } catch (err) {
      console.error("Erro ao carregar dados base:", err);
    }
  };

  const loadSectionData = async () => {
    setLoadingData(true);
    try {
      if (activeSection === 'Perfis' || activeSection === 'Usuarios') {
        const data = await getAllProfiles();
        setProfiles(data);
      } else if (activeSection === 'Elementos') {
        const data = await getExpenseElements();
        setElements(data);
      } else if (activeSection === 'Geral') {
        if (activeSubTab === 'Comarcas') {
          const data = await getComarcas();
          setComarcas(data);
        } else if (activeSubTab === 'Tabela') {
          const data = await getDailyAllowanceRates();
          setDailyAllowanceRates(data);
        } else if (activeSubTab === 'Unidades') {
          const data = await getAdministrativeUnits();
          setUnits(data);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados da seção:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await updateProfile({ id: userId, systemRole: newRole });
      loadSectionData();
      alert('Papel atualizado com sucesso!');
    } catch (err) {
      alert('Erro ao atualizar papel.');
    }
  };

  const handleSaveBannerSettings = async () => {
    setSaving(true);
    try {
      await saveManagementSettings({
        module: 'geral',
        banner_images: genSettings.banner_images
      });
      alert('Imagens do banner atualizadas!');
    } catch (err) {
      alert('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const addBannerImage = () => {
    if (newImageUrl && !genSettings.banner_images?.includes(newImageUrl)) {
      setGenSettings({
        ...genSettings,
        banner_images: [...(genSettings.banner_images || []), newImageUrl]
      });
      setNewImageUrl('');
    }
  };

  const removeBannerImage = (url: string) => {
    setGenSettings({
      ...genSettings,
      banner_images: (genSettings.banner_images || []).filter(u => u !== url)
    });
  };

  const sidebarItems: { id: SettingsSection; label: string; icon: string }[] = [
    { id: 'Perfis', label: 'Gestão de Perfis (RBAC)', icon: 'fa-id-card-clip' },
    { id: 'Usuarios', label: `Equipe Admin`, icon: 'fa-users-gear' },
    { id: 'Elementos', label: 'Elementos de Despesa', icon: 'fa-tags' },
    { id: 'Banner', label: 'Banner & AI Hub', icon: 'fa-clapperboard' },
    { id: 'Geral', label: 'Configurações Gerais', icon: 'fa-gear' },
  ];

  return (
    <div className="w-full min-h-screen p-6 md:p-10 flex flex-col lg:flex-row gap-8 animate-in fade-in duration-500 bg-gray-50/30">
      
      <aside className="w-full lg:w-72 shrink-0 space-y-4">
        <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm p-4 sticky top-24">
          <nav className="space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
                  activeSection === item.id ? `${theme.secondary} text-white shadow-lg` : `text-slate-400 ${theme.hover}`
                }`}
              >
                <i className={`fa-solid ${item.icon} text-lg w-6 text-center`}></i>
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col min-h-[700px]">
        {activeSection === 'Banner' && (
          <div className="p-10 space-y-10 animate-in slide-in-from-right-8">
             <div className="space-y-2">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Banner & Media</h2>
                <p className="text-slate-400 font-medium">Configure as imagens institucionais do slider principal e os parâmetros da IA.</p>
             </div>
             <section className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 space-y-8">
                <div className="flex justify-between items-center">
                   <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Imagens do Slider Ativo</h3>
                   <span className="text-[10px] font-bold text-blue-600">{genSettings.banner_images?.length || 0} imagens</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {(genSettings.banner_images || []).map((url, idx) => (
                     <div key={idx} className="relative group rounded-3xl overflow-hidden border-2 border-white shadow-lg aspect-video">
                        <img src={url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <button onClick={() => removeBannerImage(url)} className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center hover:scale-110 transition-transform">
                              <i className="fa-solid fa-trash-can"></i>
                           </button>
                        </div>
                     </div>
                   ))}
                   <div className="border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-6 bg-white/50 space-y-4 hover:border-blue-300 transition-all aspect-video">
                      <i className="fa-solid fa-cloud-arrow-up text-3xl text-slate-300"></i>
                      <div className="w-full space-y-2">
                        <input 
                          type="text" 
                          value={newImageUrl}
                          onChange={e => setNewImageUrl(e.target.value)}
                          placeholder="Cole a URL da imagem aqui..." 
                          className="w-full px-4 py-2 text-[10px] bg-white border border-slate-100 rounded-lg outline-none font-medium"
                        />
                        <button onClick={addBannerImage} className="w-full py-2.5 bg-blue-600 text-white font-black text-[9px] uppercase tracking-widest rounded-lg">Adicionar URL</button>
                      </div>
                   </div>
                </div>
                <div className="pt-6 border-t border-slate-200 flex justify-end">
                   <button 
                    onClick={handleSaveBannerSettings}
                    disabled={saving}
                    className="px-10 py-4 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-emerald-600 transition-all flex items-center gap-3"
                   >
                     {saving ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                     Persistir Configurações de Mídia
                   </button>
                </div>
             </section>
          </div>
        )}

        {activeSection === 'Perfis' && (
           <div className="p-10 space-y-10 animate-in slide-in-from-right-8">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                   <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Perfis (RBAC)</h2>
                   <p className="text-slate-400 font-medium">Controle de papéis e permissões institucionais.</p>
                </div>
              </div>
              <section className="bg-white border border-slate-100 rounded-[2.5rem] p-8 lg:p-12 shadow-sm space-y-10">
                 <div className="flex flex-col lg:flex-row gap-6 items-end">
                    <div className="flex-1 space-y-3 w-full">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] ml-2">Selecionar Usuário</label>
                       <select 
                         value={selectedUserId}
                         onChange={(e) => setSelectedUserId(e.target.value)}
                         className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-xs font-bold text-slate-700 outline-none uppercase"
                       >
                          <option value="">Selecione um servidor...</option>
                          {profiles.map(p => <option key={p.id} value={p.id}>{p.fullName} ({p.email})</option>)}
                       </select>
                    </div>
                    <div className="lg:w-72 space-y-3 w-full">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] ml-2">Perfil de Acesso</label>
                       <select 
                         value={targetRole}
                         onChange={(e) => setTargetRole(e.target.value)}
                         className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-xs font-bold text-slate-700 outline-none uppercase"
                       >
                          <option value="USUÁRIO">USUÁRIO PADRÃO</option>
                          {systemRoles.filter(r => r.id !== 'USUÁRIO').map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                       </select>
                    </div>
                    <button 
                      onClick={() => selectedUserId && handleUpdateRole(selectedUserId, targetRole)}
                      className="w-full lg:w-auto px-12 py-4 bg-blue-600 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl hover:bg-blue-700 transition-all"
                    >
                       Atribuir
                    </button>
                 </div>
              </section>
              <div className="relative group">
                 <i className="fa-solid fa-magnifying-glass absolute left-8 top-1/2 -translate-y-1/2 text-slate-300"></i>
                 <input 
                   type="text"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   placeholder="Pesquisar por nome ou e-mail..."
                   className="w-full bg-white border border-slate-100 rounded-3xl pl-16 pr-8 py-5 text-xs font-medium outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                 />
              </div>
              <div className="space-y-4">
                 {profiles.filter(p => !searchTerm || p.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || p.email?.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                    <div key={p.id} className="bg-white border border-slate-50 p-6 rounded-[2.5rem] flex items-center justify-between hover:shadow-xl transition-all group">
                       <div className="flex items-center gap-6 w-1/2">
                          <div className="w-14 h-14 rounded-full bg-slate-50 border flex items-center justify-center text-slate-300 overflow-hidden">
                             {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover" /> : <i className="fa-solid fa-user text-xl"></i>}
                          </div>
                          <div className="flex flex-col">
                             <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{p.fullName || 'Usuário'}</span>
                             <span className="text-[10px] text-slate-400 font-bold lowercase">{p.email}</span>
                          </div>
                       </div>
                       <div className="w-1/4 flex justify-center">
                          <div className="px-6 py-2.5 rounded-full border text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-400">
                             {p.systemRole || 'USUÁRIO PADRÃO'}
                          </div>
                       </div>
                       <div className="w-1/4 text-right">
                          <button onClick={() => { setSelectedUserId(p.id); setTargetRole(p.systemRole || 'USER'); }} className="text-blue-600 font-black text-[10px] uppercase hover:underline">EDITAR</button>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {activeSection === 'Usuarios' && (
           <div className="p-10 space-y-10 animate-in slide-in-from-right-8">
              <div className="flex justify-between items-center">
                 <h2 className="text-3xl font-black text-slate-900 tracking-tight">Equipe Técnica {module.toUpperCase()}</h2>
                 <button onClick={() => setShowTeamModal(true)} className="bg-blue-600 text-white px-10 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center gap-3">
                    <i className="fa-solid fa-plus"></i> Adicionar Membro
                 </button>
              </div>
              <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                 <div className="space-y-4">
                    {profiles.filter(p => {
                       const role = p.systemRole?.toUpperCase() || '';
                       const mod = module.toUpperCase();
                       // Para SEFIN, incluir ORDENADOR_DESPESA e roles com SEFIN, mas NÃO AJSEFIN
                       if (mod === 'SEFIN') {
                         return (role.includes('SEFIN') && !role.includes('AJSEFIN')) || role.includes('ORDENADOR');
                       }
                       return role.includes(mod);
                    }).map(p => (
                       <div key={p.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all border-b border-slate-50 last:border-0 font-bold">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center uppercase text-xs">{(p.fullName || 'X')[0]}</div>
                             <div className="flex flex-col">
                                <span className="text-xs font-black uppercase">{p.fullName}</span>
                                <span className="text-[9px] text-slate-400">{p.email}</span>
                             </div>
                          </div>
                          <span className="text-[9px] px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 uppercase tracking-widest">{p.systemRole}</span>
                          <button onClick={() => updateProfile({ id: p.id, systemRole: 'USUÁRIO' }).then(loadSectionData)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><i className="fa-solid fa-trash-can"></i></button>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        )}

        {activeSection === 'Elementos' && (
           <div className="p-10 space-y-6 animate-in slide-in-from-right-8">
              <div className="flex justify-between items-center">
                 <h2 className="text-3xl font-black text-slate-900 tracking-tight">Elementos de Despesa</h2>
                 <button onClick={() => { setSelectedElement({}); setShowElementModal(true); }} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all">
                    <i className="fa-solid fa-plus mr-2"></i> Novo Elemento
                 </button>
              </div>
              <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                 <table className="w-full">
                    <thead className="bg-slate-50/50 border-b">
                       <tr>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Código</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Descrição</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Módulo</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {elements.map(el => (
                          <tr key={el.id} className="hover:bg-slate-50 group">
                             <td className="px-8 py-6"><span className="px-3 py-1 bg-slate-100 rounded text-xs font-black uppercase">{el.code}</span></td>
                             <td className="px-8 py-6 text-xs text-slate-600 uppercase font-bold italic">{el.description}</td>
                             <td className="px-8 py-6 uppercase text-[10px] font-black text-blue-600">{el.module || 'GERAL'}</td>
                             <td className="px-8 py-6 text-right">
                                <div className="flex justify-end gap-2 text-slate-300 group-hover:text-slate-500 transition-colors">
                                   <button onClick={() => { setSelectedElement(el); setShowElementModal(true); }} className="p-2 hover:text-blue-600"><i className="fa-solid fa-pen"></i></button>
                                   <button onClick={() => deleteExpenseElement(el.id).then(loadSectionData)} className="p-2 hover:text-red-500"><i className="fa-solid fa-trash-can"></i></button>
                                </div>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {activeSection === 'Geral' && (
           <div className="p-10 space-y-10 animate-in slide-in-from-right-8">
              <div className="flex gap-2 p-1.5 bg-slate-100/50 rounded-[1.5rem] w-fit border border-slate-100">
                {(['Parâmetros', 'Tabela', 'Comarcas', 'Unidades'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveSubTab(tab)}
                    className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                      activeSubTab === tab ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeSubTab === 'Parâmetros' && (
                 <div className="grid grid-cols-2 gap-8">
                    <div className="bg-slate-50 p-8 rounded-[2rem] border space-y-6">
                       <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Limites Financeiros</h4>
                       <div className="space-y-4">
                          <div>
                             <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Limite Extraordinário (CNJ 169/13)</label>
                             <input type="number" value={genSettings.expense_limit_extra} onChange={e => setGenSettings({...genSettings, expense_limit_extra: Number(e.target.value)})} className="w-full bg-white border p-4 rounded-xl font-black text-lg focus:ring-4 focus:ring-blue-100 outline-none transition-all" />
                          </div>
                       </div>
                       <button onClick={() => saveManagementSettings(genSettings as any)} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">Salvar Parâmetros</button>
                    </div>
                 </div>
              )}

              {activeSubTab === 'Tabela' && (
                 <div className="space-y-6">
                    <div className="flex justify-between items-center">
                       <h3 className="text-xl font-black text-slate-900 tracking-tight tracking-tight uppercase">Tabela Vigente SODPA</h3>
                       <button onClick={() => { setShowRateModal(true); setSelectedRate({}); }} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-indigo-600 transition-all">Novo Valor</button>
                    </div>
                    <div className="bg-white border rounded-[2rem] overflow-hidden shadow-sm">
                       <table className="w-full text-left">
                          <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b">
                             <tr>
                                <th className="px-8 py-4">Cargo / Função</th>
                                <th className="px-8 py-4 text-center">Tipo</th>
                                <th className="px-8 py-4 text-center">Valor (R$)</th>
                                <th className="px-8 py-4 text-right">Ações</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {dailyAllowanceRates.map(rate => (
                                <tr key={rate.id} className="hover:bg-slate-50 group font-bold">
                                   <td className="px-8 py-5 text-xs uppercase text-slate-700">{rate.cargo_funcao}</td>
                                   <td className="px-8 py-5 text-center"><span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest">{rate.tipo_viagem}</span></td>
                                   <td className="px-8 py-5 text-center text-emerald-600">R$ {rate.valor.toLocaleString()}</td>
                                   <td className="px-8 py-5 text-right">
                                      <button onClick={() => { setSelectedRate(rate); setShowRateModal(true); }} className="text-slate-300 hover:text-blue-600 transition-colors"><i className="fa-solid fa-pen"></i></button>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              )}

              {activeSubTab === 'Comarcas' && (
                 <div className="space-y-6">
                    <div className="flex justify-between items-center">
                       <h3 className="text-xl font-black text-slate-900 tracking-tight tracking-tight uppercase">Base de Comarcas TJPA</h3>
                       <button onClick={() => { setSelectedComarca({}); setShowComarcaModal(true); }} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-indigo-600 transition-all">Nova Comarca</button>
                    </div>
                    <div className="bg-white border rounded-[2rem] overflow-hidden shadow-sm">
                       <table className="w-full text-left">
                          <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b">
                             <tr>
                                <th className="px-8 py-4">Comarca</th>
                                <th className="px-8 py-4">Polo / Região</th>
                                <th className="px-8 py-4 text-right">Ações</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-bold uppercase text-xs text-slate-700">
                             {comarcas.map(com => (
                                <tr key={com.id} className="hover:bg-slate-50 group">
                                   <td className="px-8 py-5">{com.name}</td>
                                   <td className="px-8 py-5 text-[9px] text-blue-600">{com.polo} / {com.region}</td>
                                   <td className="px-8 py-5 text-right">
                                      <div className="flex justify-end gap-2 text-slate-300">
                                         <button onClick={() => { setSelectedComarca(com); setShowComarcaModal(true); }} className="hover:text-blue-600"><i className="fa-solid fa-pen"></i></button>
                                         <button onClick={() => deleteComarca(com.id).then(loadSectionData)} className="hover:text-red-500"><i className="fa-solid fa-trash-can"></i></button>
                                      </div>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              )}

              {activeSubTab === 'Unidades' && (
                 <div className="space-y-6">
                    <div className="flex justify-between items-center">
                       <h3 className="text-xl font-black text-slate-900 tracking-tight tracking-tight uppercase">Unidades Administrativas</h3>
                       <button onClick={() => { setSelectedUnit({}); setShowUnitModal(true); }} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-indigo-600 transition-all">Nova Unidade</button>
                    </div>
                    <div className="bg-white border rounded-[2rem] overflow-hidden shadow-sm">
                       <table className="w-full text-left">
                          <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b">
                             <tr>
                                <th className="px-8 py-4">Sigla</th>
                                <th className="px-8 py-4">Nome Unidade</th>
                                <th className="px-8 py-4 text-right">Ações</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-bold uppercase text-xs text-slate-700">
                             {units.map(unit => (
                                <tr key={unit.id} className="hover:bg-slate-50 group">
                                   <td className="px-8 py-5 text-blue-600">{unit.acronym}</td>
                                   <td className="px-8 py-5">{unit.name}</td>
                                   <td className="px-8 py-5 text-right">
                                      <div className="flex justify-end gap-2 text-slate-300">
                                         <button onClick={() => { setSelectedUnit(unit); setShowUnitModal(true); }} className="hover:text-blue-600"><i className="fa-solid fa-pen"></i></button>
                                         <button onClick={() => deleteAdministrativeUnit(unit.id).then(loadSectionData)} className="hover:text-red-500"><i className="fa-solid fa-trash-can"></i></button>
                                      </div>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              )}
           </div>
        )}
      </main>

      {/* MODAIS - Todos fora do main para evitar overflow/zIndex issues */}
      
      {showRateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in">
           <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-10 space-y-8 animate-in zoom-in-95">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">SODPA: Valor de Diária</h3>
              <div className="space-y-4">
                 <input type="text" placeholder="Cargo / Função" value={selectedRate.cargo_funcao || ''} onChange={e => setSelectedRate({...selectedRate, cargo_funcao: e.target.value})} className="w-full bg-slate-50 border p-4 rounded-xl text-xs font-bold uppercase" />
                 <div className="grid grid-cols-2 gap-4">
                    <select value={selectedRate.tipo_viagem || 'Estadual'} onChange={e => setSelectedRate({...selectedRate, tipo_viagem: e.target.value as any})} className="bg-slate-50 border p-4 rounded-xl text-xs font-bold uppercase"><option value="Estadual">Estadual</option><option value="Nacional">Nacional</option></select>
                    <input type="number" placeholder="Valor (R$)" value={selectedRate.valor || ''} onChange={e => setSelectedRate({...selectedRate, valor: Number(e.target.value)})} className="bg-slate-50 border p-4 rounded-xl text-xs font-bold uppercase" />
                 </div>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setShowRateModal(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px]">Cancelar</button>
                 <button onClick={() => saveDailyAllowanceRate(selectedRate).then(() => { setShowRateModal(false); loadSectionData(); })} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] shadow-xl">Salvar Registro</button>
              </div>
           </div>
        </div>
      )}

      {showComarcaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 space-y-8">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Gestão: Comarca</h3>
              <div className="space-y-4 font-bold text-xs uppercase">
                 <input type="text" placeholder="Nome da Comarca" value={selectedComarca.name || ''} onChange={e => setSelectedComarca({...selectedComarca, name: e.target.value})} className="w-full bg-slate-50 border p-4 rounded-xl" />
                 <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Polo" value={selectedComarca.polo || ''} onChange={e => setSelectedComarca({...selectedComarca, polo: e.target.value})} className="bg-slate-50 border p-4 rounded-xl" />
                    <input type="text" placeholder="Região" value={selectedComarca.region || ''} onChange={e => setSelectedComarca({...selectedComarca, region: e.target.value})} className="bg-slate-50 border p-4 rounded-xl" />
                 </div>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setShowComarcaModal(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px]">Fechar</button>
                 <button onClick={() => saveComarca(selectedComarca).then(() => { setShowComarcaModal(false); loadSectionData(); })} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] shadow-xl">Salvar Comarca</button>
              </div>
           </div>
        </div>
      )}

      {showUnitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 space-y-8">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Gestão: Unidade</h3>
              <div className="space-y-4 font-bold text-xs uppercase">
                 <div className="grid grid-cols-4 gap-4">
                    <input type="text" placeholder="Sigla" value={selectedUnit.acronym || ''} onChange={e => setSelectedUnit({...selectedUnit, acronym: e.target.value})} className="col-span-1 bg-slate-50 border p-4 rounded-xl" />
                    <input type="text" placeholder="Nome Completo" value={selectedUnit.name || ''} onChange={e => setSelectedUnit({...selectedUnit, name: e.target.value})} className="col-span-3 bg-slate-50 border p-4 rounded-xl" />
                 </div>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setShowUnitModal(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px]">Voltar</button>
                 <button onClick={() => saveAdministrativeUnit(selectedUnit).then(() => { setShowUnitModal(false); loadSectionData(); })} className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] shadow-xl">Salvar Unidade</button>
              </div>
           </div>
        </div>
      )}

      {showElementModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 space-y-8">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Configura: Elemento</h3>
              <div className="space-y-4 font-bold text-xs uppercase">
                 <input type="text" placeholder="Código (Ex: 3.3.90.30)" value={selectedElement?.code || ''} onChange={e => setSelectedElement({...selectedElement, code: e.target.value})} className="w-full bg-slate-50 border p-4 rounded-xl" />
                 <input type="text" placeholder="Descrição Curta" value={selectedElement?.description || ''} onChange={e => setSelectedElement({...selectedElement, description: e.target.value})} className="w-full bg-slate-50 border p-4 rounded-xl" />
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setShowElementModal(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px]">Cancelar</button>
                 <button onClick={() => saveExpenseElement(selectedElement as ExpenseElement).then(() => { setShowElementModal(false); loadSectionData(); })} className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] shadow-xl">Confirmar</button>
              </div>
           </div>
        </div>
      )}

      {showTeamModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 space-y-8">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Vincular Membro à Equipe</h3>
              <div className="space-y-4">
                 <div className="space-y-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Servidor</label>
                   <select value={newTeamMember.userId} onChange={e => setNewTeamMember({...newTeamMember, userId: e.target.value})} className="w-full bg-slate-50 border p-4 rounded-xl font-bold uppercase text-[10px]"><option value="">Selecione o Servidor</option>{profiles.map(p => <option key={p.id} value={p.id}>{p.fullName} ({p.email})</option>)}</select>
                 </div>
                 <div className="space-y-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Função na Equipe</label>
                   <select value={newTeamMember.role} onChange={e => setNewTeamMember({...newTeamMember, role: e.target.value})} className="w-full bg-slate-50 border p-4 rounded-xl font-bold uppercase text-[10px]">
                     <option value="">Selecione a Função</option>
                     {module === 'sefin' && <option value="ORDENADOR_DESPESA">ORDENADOR DE DESPESA</option>}
                     <option value={`GESTOR_${module.toUpperCase()}`}>GESTOR {module.toUpperCase()}</option>
                     <option value={`ANALISTA_${module.toUpperCase()}`}>ANALISTA {module.toUpperCase()}</option>
                   </select>
                 </div>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setShowTeamModal(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px]">Fechar</button>
                 <button onClick={async () => { if (!newTeamMember.userId || !newTeamMember.role) return; await updateProfile({ id: newTeamMember.userId, systemRole: newTeamMember.role }); setShowTeamModal(false); loadSectionData(); alert('Vínculo criado!'); }} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px]">Vincular Agora</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ManagementSettings;
