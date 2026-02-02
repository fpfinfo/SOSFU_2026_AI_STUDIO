import React, { useState } from 'react';
import { User, MapPin, Users, CreditCard, Mail, Briefcase, BadgeCheck, Camera, Save } from 'lucide-react';

export const ProfileView: React.FC = () => {
  // Mock initial state based on the reference image
  const [formData, setFormData] = useState({
    name: 'Raquel Filgueira - Perfil Admin',
    email: 'sosfu01@tjpa.jus.br',
    cpf: '000.000.000-00',
    matricula: 'SOSFU-001-AUTH',
    cargo: 'Analista de Diárias e Passagens',
    vinculo: '',
    telefone: '(91) 99999-9999',
    lotacao: 'Comarca ou Setor',
    municipio: 'Ex: Belém',
    gestorNome: '',
    gestorEmail: 'gestor@tjpa.jus.br',
    banco: 'Ex: Banco do Brasil',
    agencia: '0000-0',
    conta: '00000-0'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* Header Profile Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center md:items-start gap-6">
        <div className="relative group">
            <div className="w-24 h-24 rounded-full p-1 bg-white shadow-md border border-gray-100">
                <img 
                    src="https://picsum.photos/id/64/200/200" 
                    alt="Profile" 
                    className="w-full h-full rounded-full object-cover"
                />
            </div>
            <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-105">
                <Camera size={14} />
            </button>
        </div>
        
        <div className="flex-1 text-center md:text-left">
            <h1 className="text-xl font-bold text-gray-800">{formData.name}</h1>
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 mt-2 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                    <Mail size={14} />
                    <span>{formData.email}</span>
                </div>
                <div className="hidden md:block w-1 h-1 bg-gray-300 rounded-full"></div>
                <div className="flex items-center gap-1.5">
                    <Briefcase size={14} />
                    <span>{formData.cargo}</span>
                </div>
            </div>
            
            <div className="flex items-center justify-center md:justify-start gap-2 mt-4">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-xs font-bold uppercase">
                    <BadgeCheck size={12} />
                    Conta Verificada
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-700 border border-orange-100 rounded-full text-xs font-bold uppercase">
                    SOSFU
                </span>
            </div>
        </div>
      </div>

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
                    name="name"
                    value={formData.name}
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
                    onChange={handleChange}
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
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1"># Matrícula</label>
                <input 
                    type="text" 
                    name="matricula"
                    value={formData.matricula}
                    onChange={handleChange}
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
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Lotação</label>
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
                    name="gestorNome"
                    placeholder="Nome completo"
                    value={formData.gestorNome}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">E-mail do Gestor</label>
                <input 
                    type="email" 
                    name="gestorEmail"
                    value={formData.gestorEmail}
                    onChange={handleChange}
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
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Conta Corrente</label>
                <input 
                    type="text" 
                    name="conta"
                    value={formData.conta}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400"
                />
            </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end pt-4">
        <button className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl transition-all transform hover:-translate-y-0.5">
            <Save size={18} />
            Salvar Alterações
        </button>
      </div>

    </div>
  );
};