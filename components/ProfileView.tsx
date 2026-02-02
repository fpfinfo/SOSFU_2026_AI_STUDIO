import React, { useState, useEffect } from 'react';
import { User, MapPin, Users, CreditCard, Mail, Briefcase, BadgeCheck, Camera, Save, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Interface compatível com a tabela profiles do banco
interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  cpf: string;
  matricula: string;
  cargo: string;
  vinculo: string;
  telefone: string;
  lotacao: string;
  municipio: string;
  gestor_nome: string;
  gestor_email: string;
  banco: string;
  agencia: string;
  conta_corrente: string;
  avatar_url: string | null;
  is_verified: boolean;
  perfil_id: string;
  dperfil?: {
    name: string;
    slug: string;
  };
}

export const ProfileView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const [formData, setFormData] = useState<UserProfile>({
    id: '',
    full_name: '',
    email: '',
    cpf: '',
    matricula: '',
    cargo: '',
    vinculo: '',
    telefone: '',
    lotacao: '',
    municipio: '',
    gestor_nome: '',
    gestor_email: '',
    banco: '',
    agencia: '',
    conta_corrente: '',
    avatar_url: null,
    is_verified: false,
    perfil_id: ''
  });

  // Buscar dados do usuário ao carregar
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          dperfil:perfil_id (
            name,
            slug
          )
        `)
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        // OVERRIDE TEMPORÁRIO PARA UI CORRETA (Fabio Freitas)
        const email = data.email?.toLowerCase().trim() || '';
        const name = data.full_name?.toLowerCase().trim() || '';

        if (email.includes('fabio.freitas') || name.includes('fabio pereira de freitas')) {
             data.dperfil = { name: 'Técnico SOSFU', slug: 'SOSFU' };
             if (!data.cargo || data.cargo.trim() === '') data.cargo = 'Analista Judiciário - SOSFU';
             if (data.matricula === 'AGUARDANDO') data.matricula = '203424';
             data.is_verified = true;
        }

        setFormData({
            id: data.id,
            full_name: data.full_name || '',
            email: data.email || user.email || '',
            cpf: data.cpf || '',
            matricula: data.matricula || '',
            cargo: data.cargo || '',
            vinculo: data.vinculo || '',
            telefone: data.telefone || '',
            lotacao: data.lotacao || '',
            municipio: data.municipio || '',
            gestor_nome: data.gestor_nome || '',
            gestor_email: data.gestor_email || '',
            banco: data.banco || '',
            agencia: data.agencia || '',
            conta_corrente: data.conta_corrente || '',
            avatar_url: data.avatar_url,
            is_verified: data.is_verified || false,
            perfil_id: data.perfil_id,
            dperfil: data.dperfil
        });
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      setMessage({ type: 'error', text: 'Não foi possível carregar os dados do perfil.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
            full_name: formData.full_name,
            cpf: formData.cpf,
            cargo: formData.cargo,
            vinculo: formData.vinculo,
            telefone: formData.telefone,
            lotacao: formData.lotacao,
            municipio: formData.municipio,
            gestor_nome: formData.gestor_nome,
            gestor_email: formData.gestor_email,
            banco: formData.banco,
            agencia: formData.agencia,
            conta_corrente: formData.conta_corrente
        })
        .eq('id', formData.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Dados atualizados com sucesso!' });
      
      // Remove mensagem após 3 segundos
      setTimeout(() => setMessage(null), 3000);

    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar alterações. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return (name || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center h-96">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Carregando perfil...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* Header Profile Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center md:items-start gap-6">
        <div className="relative group">
            <div className="w-24 h-24 rounded-full p-1 bg-white shadow-md border border-gray-100 flex items-center justify-center bg-gray-100 overflow-hidden">
                {formData.avatar_url ? (
                    <img 
                        src={formData.avatar_url} 
                        alt="Profile" 
                        className="w-full h-full rounded-full object-cover"
                    />
                ) : (
                    <span className="text-2xl font-bold text-gray-400">{getInitials(formData.full_name)}</span>
                )}
            </div>
            <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-105">
                <Camera size={14} />
            </button>
        </div>
        
        <div className="flex-1 text-center md:text-left">
            <h1 className="text-xl font-bold text-gray-800">{formData.full_name || 'Usuário Sem Nome'}</h1>
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 mt-2 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                    <Mail size={14} />
                    <span>{formData.email}</span>
                </div>
                <div className="hidden md:block w-1 h-1 bg-gray-300 rounded-full"></div>
                <div className="flex items-center gap-1.5">
                    <Briefcase size={14} />
                    <span>{formData.cargo || 'Cargo não informado'}</span>
                </div>
            </div>
            
            <div className="flex items-center justify-center md:justify-start gap-2 mt-4">
                {formData.is_verified && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-xs font-bold uppercase">
                        <BadgeCheck size={12} />
                        Conta Verificada
                    </span>
                )}
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-bold uppercase">
                    {formData.dperfil?.name || 'Servidor'}
                </span>
            </div>
        </div>
      </div>

      {/* Mensagem de Feedback */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 border ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
        }`}>
            <AlertCircle size={20} />
            <span className="font-medium text-sm">{message.text}</span>
        </div>
      )}

      {/* Section: Dados Pessoais */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <h3 className="text-gray-800 font-bold text-lg mb-6 flex items-center gap-2">
            <User className="text-blue-600" size={20} />
            Dados Pessoais
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nome Completo</label>
                <input 
                    type="text" 
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">E-mail</label>
                <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1"># CPF</label>
                <input 
                    type="text" 
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleChange}
                    placeholder="000.000.000-00"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1"># Matrícula</label>
                <input 
                    type="text" 
                    name="matricula"
                    value={formData.matricula}
                    disabled
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
                />
            </div>

             <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Cargo / Função</label>
                <input 
                    type="text" 
                    name="cargo"
                    value={formData.cargo}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Tipo de Vínculo</label>
                <div className="relative">
                    <select 
                        name="vinculo"
                        value={formData.vinculo}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 appearance-none cursor-pointer"
                    >
                        <option value="">Selecione...</option>
                        <option value="efetivo">Efetivo</option>
                        <option value="comissionado">Comissionado</option>
                        <option value="cedido">Cedido</option>
                        <option value="estagiario">Estagiário</option>
                        <option value="terceirizado">Terceirizado</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Telefone</label>
                <input 
                    type="text" 
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleChange}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400"
                />
            </div>
        </div>
      </div>

      {/* Section: Localização */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <h3 className="text-gray-800 font-bold text-lg mb-6 flex items-center gap-2">
            <MapPin className="text-green-600" size={20} />
            Localização
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Lotação (Setor/Comarca)</label>
                <input 
                    type="text" 
                    name="lotacao"
                    value={formData.lotacao}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Município</label>
                <input 
                    type="text" 
                    name="municipio"
                    value={formData.municipio}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400"
                />
            </div>
        </div>
      </div>

       {/* Section: Gestor Imediato */}
       <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <h3 className="text-gray-800 font-bold text-lg mb-6 flex items-center gap-2">
            <Users className="text-purple-600" size={20} />
            Gestor Imediato
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nome do Gestor</label>
                <input 
                    type="text" 
                    name="gestor_nome"
                    placeholder="Nome completo"
                    value={formData.gestor_nome}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">E-mail do Gestor</label>
                <input 
                    type="email" 
                    name="gestor_email"
                    value={formData.gestor_email}
                    onChange={handleChange}
                    placeholder="gestor@tjpa.jus.br"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400"
                />
            </div>
        </div>
      </div>

      {/* Section: Dados Bancários */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <h3 className="text-gray-800 font-bold text-lg mb-6 flex items-center gap-2">
            <CreditCard className="text-orange-600" size={20} />
            Dados Bancários
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Banco</label>
                <input 
                    type="text" 
                    name="banco"
                    value={formData.banco}
                    onChange={handleChange}
                    placeholder="Ex: Banco do Brasil"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Agência</label>
                <input 
                    type="text" 
                    name="agencia"
                    value={formData.agencia}
                    onChange={handleChange}
                    placeholder="0000-0"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Conta Corrente</label>
                <input 
                    type="text" 
                    name="conta_corrente"
                    value={formData.conta_corrente}
                    onChange={handleChange}
                    placeholder="00000-0"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400"
                />
            </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end pt-4">
        <button 
            onClick={handleSave}
            disabled={saving}
            className={`
                flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 
                hover:bg-blue-700 hover:shadow-xl transition-all transform hover:-translate-y-0.5
                ${saving ? 'opacity-80 cursor-not-allowed' : ''}
            `}
        >
            {saving ? (
                <>
                    <Loader2 size={18} className="animate-spin" />
                    Salvando...
                </>
            ) : (
                <>
                    <Save size={18} />
                    Salvar Alterações
                </>
            )}
        </button>
      </div>

    </div>
  );
};