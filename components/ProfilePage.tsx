
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { getProfile, updateProfile, uploadAvatar } from '../services/dataService';
import { Profile } from '../types';

interface ProfilePageProps {
  onForceRefresh?: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onForceRefresh }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const data = await getProfile(user.id);
        if (data) {
          setProfile(data);
        } else {
          setProfile({ id: user.id, email: user.email });
        }
      }
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleSignatureClick = () => {
    signatureInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      setSaving(true);
      setError(null);
      try {
        const publicUrl = await uploadAvatar(user.id, file);
        setProfile(prev => ({ ...prev, avatarUrl: publicUrl }));
        await updateProfile({ id: user.id, avatarUrl: publicUrl });
        if (onForceRefresh) onForceRefresh();
      } catch (err: any) {
        console.error("Erro no upload do avatar:", err);
        setError(err.message || "Erro ao realizar upload da imagem.");
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
        setSaving(true);
        try {
            const publicUrl = await uploadAvatar(user.id, file); // Reutilizando a função de upload de arquivos
            setProfile(prev => ({ ...prev, signatureUrl: publicUrl }));
            await updateProfile({ id: user.id, signatureUrl: publicUrl });
            if (onForceRefresh) onForceRefresh();
            alert("Sua assinatura eletrônica foi salva com sucesso.");
        } catch (err) {
            console.error(err);
            alert("Erro ao salvar assinatura.");
        } finally {
            setSaving(false);
        }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (user) {
        await updateProfile({ ...profile, id: user.id });
        if (onForceRefresh) onForceRefresh();
        alert("Configurações atualizadas com sucesso diretamente no banco de dados.");
      }
    } catch (err: any) {
      console.error("Erro ao salvar perfil:", err);
      setError("Erro ao salvar alterações no banco de dados. Verifique sua conexão.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <i className="fa-solid fa-circle-notch fa-spin text-5xl text-emerald-600"></i>
        <p className="font-black text-[10px] uppercase tracking-widest text-slate-400">Carregando Perfil ÁGIL...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-5xl mx-auto pb-32 animate-in fade-in duration-700">
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700 text-sm font-bold animate-in slide-in-from-top-4">
          <i className="fa-solid fa-circle-exclamation text-lg"></i>
          {error}
        </div>
      )}

      {/* Header Profile Info */}
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-10 relative overflow-hidden">
        <div className="relative group cursor-pointer shrink-0" onClick={handleAvatarClick}>
          <div className="w-40 h-40 rounded-full border-8 border-slate-50 dark:border-slate-800 overflow-hidden shadow-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
            ) : (
              <i className="fa-solid fa-user text-6xl text-slate-300 dark:text-slate-700"></i>
            )}
          </div>
          <div className="absolute bottom-2 right-2 bg-blue-600 w-12 h-12 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center text-white text-xl shadow-xl group-hover:scale-110 transition-transform">
            {saving ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-camera"></i>}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
        </div>

        <div className="flex-1 space-y-6 text-center md:text-left">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tighter italic leading-none">{profile.fullName || 'Usuário Servidor'}</h1>
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-sm text-slate-400 dark:text-slate-500 font-semibold">
              <span className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg"><i className="fa-regular fa-envelope text-blue-500"></i> {profile.email}</span>
              <span className="text-slate-200 dark:text-slate-700 hidden md:inline">•</span>
              <span className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg"><i className="fa-solid fa-briefcase text-blue-500"></i> {profile.role || 'Cargo / Função'}</span>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center md:justify-start gap-3">
            <span className="px-5 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
              <i className="fa-solid fa-check-circle"></i> CONTA VERIFICADA
            </span>
            <span className="px-5 py-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
              EQUIPE TÉCNICA {profile.systemRole === 'SOSFU' ? 'SOSFU' : 'GESTÃO'}
            </span>
          </div>
        </div>
        <i className="fa-solid fa-id-badge absolute -bottom-10 -right-10 text-slate-50 text-[15rem] -rotate-12 pointer-events-none opacity-50"></i>
      </div>

      <div className="grid grid-cols-1 gap-10">
        
        {/* Bloco: Assinatura Eletrônica - NOVO */}
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-gray-100 dark:border-slate-800 shadow-sm space-y-10">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-600 flex items-center justify-center">
                    <i className="fa-solid fa-signature"></i>
                </div>
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Assinatura Eletrônica</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                        A sua assinatura aparecerá no rodapé dos documentos administrativos que você atestar. Você pode fazer o upload de uma imagem da sua assinatura manuscrita (fundo branco ou transparente).
                    </p>
                    <button 
                        onClick={handleSignatureClick}
                        className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-orange-600 transition-all flex items-center gap-3 active:scale-95"
                    >
                        <i className="fa-solid fa-upload"></i> Upload de Assinatura
                    </button>
                    <input type="file" ref={signatureInputRef} onChange={handleSignatureUpload} className="hidden" accept="image/*" />
                </div>

                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center p-8 min-h-[180px]">
                    {profile.signatureUrl ? (
                        <div className="space-y-4 text-center">
                            <img src={profile.signatureUrl} alt="Assinatura Ativa" className="max-h-24 max-w-full opacity-80 mix-blend-multiply" />
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sua Assinatura Atual</p>
                        </div>
                    ) : (
                        <div className="text-center space-y-2 opacity-30">
                            <i className="fa-solid fa-signature text-5xl text-slate-400"></i>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Nenhuma assinatura vinculada</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Bloco: Dados Pessoais */}
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-gray-100 dark:border-slate-800 shadow-sm space-y-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 flex items-center justify-center">
               <i className="fa-solid fa-user"></i>
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Dados Pessoais</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-12 space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">Nome Completo</label>
              <input 
                type="text" name="fullName" value={profile.fullName || ''} onChange={handleInputChange}
                placeholder="Nome completo conforme matricula"
                className="w-full px-6 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 focus:border-blue-400 outline-none font-bold text-slate-700 dark:text-slate-300 transition-all shadow-sm"
              />
            </div>
            
            <div className="lg:col-span-6 space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Institucional</label>
              <input 
                type="email" name="email" value={profile.email || ''} readOnly
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-400 cursor-not-allowed shadow-inner"
              />
            </div>

            <div className="lg:col-span-6 space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1"># CPF</label>
              <input 
                type="text" name="cpf" value={profile.cpf || ''} onChange={handleInputChange} placeholder="000.000.000-00"
                className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none font-bold text-slate-700 transition-all shadow-sm"
              />
            </div>

            <div className="lg:col-span-6 space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1"># Matrícula</label>
              <input 
                type="text" name="registrationNumber" value={profile.registrationNumber || ''} onChange={handleInputChange} placeholder="203424"
                className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none font-bold text-slate-700 transition-all shadow-sm"
              />
            </div>

            <div className="lg:col-span-6 space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo / Função</label>
              <input 
                type="text" name="role" value={profile.role || ''} onChange={handleInputChange} placeholder="Analista Judiciário"
                className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none font-bold text-slate-700 transition-all shadow-sm"
              />
            </div>

            <div className="lg:col-span-6 space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Vínculo</label>
              <div className="relative">
                <select 
                  name="employmentType" value={profile.employmentType || ''} onChange={handleInputChange}
                  className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none font-bold text-slate-700 transition-all appearance-none shadow-sm"
                >
                  <option value="">Selecione...</option>
                  <option value="Efetivo">Efetivo</option>
                  <option value="Comissionado">Comissionado</option>
                  <option value="Cedido">Cedido</option>
                  <option value="Temporário">Temporário</option>
                </select>
                <i className="fa-solid fa-chevron-down absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-xs"></i>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
              <input 
                type="text" name="phone" value={profile.phone || ''} onChange={handleInputChange} placeholder="(91) 98218-8699"
                className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none font-bold text-slate-700 transition-all shadow-sm"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Bloco: Localização */}
            <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm space-y-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <i className="fa-solid fa-location-dot"></i>
                    </div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Localização</h2>
                </div>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lotação (Setor/Comarca)</label>
                        <input 
                            type="text" name="unit" value={profile.unit || ''} onChange={handleInputChange}
                            className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-100 outline-none font-bold text-slate-700 shadow-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Município Sede</label>
                        <input 
                            type="text" name="city" value={profile.city || ''} onChange={handleInputChange}
                            className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-100 outline-none font-bold text-slate-700 shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Bloco: Gestor Imediato */}
            <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm space-y-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <i className="fa-solid fa-user-tie"></i>
                    </div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Gestor Imediato</h2>
                </div>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Superior</label>
                        <input 
                            type="text" name="managerName" value={profile.managerName || ''} onChange={handleInputChange}
                            className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-purple-100 outline-none font-bold text-slate-700 shadow-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo do Gestor</label>
                        <input 
                            type="email" name="managerEmail" value={profile.managerEmail || ''} onChange={handleInputChange}
                            className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-purple-100 outline-none font-bold text-slate-700 shadow-sm"
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Bloco: Dados Bancários */}
        <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm space-y-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <i className="fa-solid fa-credit-card"></i>
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Dados Bancários para Crédito</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instituição</label>
              <input 
                type="text" name="bankName" value={profile.bankName || ''} onChange={handleInputChange} placeholder="Banpará"
                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-100 outline-none font-bold text-slate-700 shadow-sm"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cód. Banco</label>
              <input 
                type="text" name="bankCode" value={profile.bankCode || ''} onChange={handleInputChange} placeholder="037"
                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-100 outline-none font-bold text-slate-700 shadow-sm"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Agência</label>
              <input 
                type="text" name="bankAgency" value={profile.bankAgency || ''} onChange={handleInputChange} placeholder="0000"
                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-100 outline-none font-bold text-slate-700 shadow-sm"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Conta Corrente</label>
              <input 
                type="text" name="bankAccount" value={profile.bankAccount || ''} onChange={handleInputChange} placeholder="00000-0"
                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-100 outline-none font-bold text-slate-700 shadow-sm"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-bold italic bg-slate-50 p-4 rounded-xl border border-slate-100">
            <i className="fa-solid fa-circle-info mr-2 text-blue-500"></i>
            Nota: Estes dados serão utilizados exclusivamente para depósitos de suprimento emergencial e ressarcimento de despesas autorizadas.
          </p>
        </div>
      </div>

      {/* Floating Save Area */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-10 border-t border-slate-100">
        <div className="text-center md:text-left">
            <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Segurança dos Dados</p>
            <p className="text-[10px] text-slate-400 font-medium">Suas informações estão protegidas por criptografia de ponta-a-ponta TJPA.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full md:w-auto flex items-center justify-center gap-4 px-12 py-6 bg-slate-900 text-white font-black uppercase tracking-[0.2em] rounded-[2rem] shadow-2xl hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? <i className="fa-solid fa-circle-notch fa-spin text-xl"></i> : <i className="fa-solid fa-floppy-disk text-xl text-emerald-400"></i>}
          <span>Salvar no Banco de Dados</span>
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
