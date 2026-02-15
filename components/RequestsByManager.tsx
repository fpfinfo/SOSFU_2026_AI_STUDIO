import React, { useState, useEffect } from 'react';
import { RequestItem, Profile } from '../types';
import { getRequestsByManager } from '../services/dataService';
import { supabase } from '../services/supabaseClient';

interface RequestsByManagerProps {
  onSelectRequest: (request: RequestItem) => void;
}

const RequestsByManager: React.FC<RequestsByManagerProps> = ({ onSelectRequest }) => {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        // Obter perfil para garantir que temos o email correto
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          setProfile(profileData as any);
          const pendingRequests = await getRequestsByManager(profileData.email);
          setRequests(pendingRequests);
        }
      }
      setLoading(false);
    };

    fetchRequests();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-pulse">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-500 mb-4">
          <i className="fa-solid fa-spinner fa-spin text-2xl"></i>
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Carregando seu fluxo...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-10 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Inbox de Atesto</h2>
          <p className="text-sm text-slate-400 font-medium">Ações pendentes de subordinados da unidade.</p>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-[3rem] border-2 border-dashed border-slate-100 p-20 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-24 h-24 bg-emerald-50 text-emerald-400 rounded-full flex items-center justify-center text-4xl shadow-inner animate-in zoom-in-95 duration-500">
            <i className="fa-solid fa-check"></i>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-relaxed">
              NENHUMA PENDÊNCIA ENCONTRADA. SEU FLUXO ESTÁ LIMPO!
            </h3>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {requests.map(req => (
            <button
              key={req.id}
              onClick={() => onSelectRequest(req)}
              className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:scale-[1.02] transition-all text-left flex flex-col gap-6 group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100">
                    {req.userProfile?.avatarUrl ? (
                      <img src={req.userProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <i className="fa-solid fa-user text-slate-200"></i>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{req.userProfile?.fullName || 'Servidor'}</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{req.type === 'suprimento' ? 'Suprimento' : 'Diárias'}</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-amber-50 rounded-lg text-amber-600 text-[8px] font-black uppercase tracking-widest border border-amber-100">
                  Pendente
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed line-clamp-2 italic">
                  "{req.justification || 'Sem justificativa informada.'}"
                </p>
                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Valor do Pedido</p>
                    <p className="text-lg font-black text-slate-900 tracking-tighter">R$ {req.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                    <i className="fa-solid fa-arrow-right"></i>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RequestsByManager;
