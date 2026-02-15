
import React, { useState, useEffect, useRef } from 'react';
import { suggestForm, generateJustification } from '../services/geminiService';
import { saveRequest, getProfile, getExpenseElements, getManagementSettings, updateRequest } from '../services/dataService';
import { supabase } from '../services/supabaseClient';
import { Profile, ExpenseElement, ManagementSettings, RequestItem } from '../types';

interface RequestFormsProps {
  onBack: () => void;
  editingRequest?: RequestItem;
}

type FormType = 'Extra-Emergencial' | 'Extra-Júri' | 'Diárias e Passagens' | 'Reembolsos' | 'Ordinário' | null;

interface ExpenseItem {
  id: string;
  classification: string;
  value: string;
  description?: string;
}

const RequestForms: React.FC<RequestFormsProps> = ({ onBack, editingRequest }) => {
  const [loading, setLoading] = useState(false);
  const [selectedForm, setSelectedForm] = useState<FormType>(editingRequest?.title as FormType || null);
  const [submitted, setSubmitted] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [expenseElements, setExpenseElements] = useState<ExpenseElement[]>([]);

  const [items, setItems] = useState<ExpenseItem[]>(
    editingRequest?.items || [{ id: '1', classification: '', value: '', description: '' }]
  );
  const [isSigning, setIsSigning] = useState(false);
  const [signPassword, setSignPassword] = useState('');
  const [signingError, setSigningError] = useState('');
  const [signLoading, setSignLoading] = useState(false);

  // Form States
  const [managerName, setManagerName] = useState(editingRequest?.managerInfo?.name || '');
  const [managerEmail, setManagerEmail] = useState(editingRequest?.managerInfo?.email || '');
  const [startDate, setStartDate] = useState(editingRequest?.startDate ? editingRequest.startDate.split('T')[0] : '');
  const [endDate, setEndDate] = useState(editingRequest?.endDate ? editingRequest.endDate.split('T')[0] : '');
  const [justification, setJustification] = useState(editingRequest?.justification || '');
  const [destination, setDestination] = useState(editingRequest?.destination || '');

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const [profileData, elementsData] = await Promise.all([
          user ? getProfile(user.id) : Promise.resolve(null),
          getExpenseElements()
        ]);

        if (profileData) {
          setProfile(profileData);
          if (!editingRequest) {
            setManagerName(profileData.managerName || '');
            setManagerEmail(profileData.managerEmail || '');
          }
        }

        if (elementsData) setExpenseElements(elementsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  const getNupConfig = (type: FormType) => {
    switch (type) {
      case 'Extra-Júri': return { sigla: 'JURI', sep: '-' };
      case 'Extra-Emergencial': return { sigla: 'EXT', sep: '-' };
      case 'Diárias e Passagens': return { sigla: 'DIP', sep: '/' };
      case 'Reembolsos': return { sigla: 'REE', sep: '/' };
      case 'Ordinário': return { sigla: 'ORD', sep: '/' };
      default: return { sigla: 'REQ', sep: '/' };
    }
  };

  const handleFinalSign = async () => {
    setSignLoading(true);
    setSigningError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Usuário não identificado.");

      // Re-autenticação para assinatura segura
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: signPassword
      });

      if (authError) {
        setSigningError('Senha institucional incorreta.');
        return;
      }

      const year = new Date().getFullYear();
      const serial = Math.floor(1000 + Math.random() * 9000);
      const config = getNupConfig(selectedForm);
      const nup = editingRequest?.nup || `TJPA-${config.sigla}-${year}${config.sep}${serial}`;

      const requestPayload = {
        user_id: user.id,
        title: selectedForm,
        type: config.sigla.toLowerCase() as any,
        total_value: items.reduce((acc, i) => acc + (parseFloat(i.value) || 0), 0),
        start_date: startDate || null,
        end_date: endDate || null,
        justification: justification,
        destination: destination || null,
        manager_name: managerName, 
        manager_email: managerEmail, 
        manager_info: { name: managerName, email: managerEmail }, 
        items: items,
        status: 'Assinatura Gestor', 
        nup: nup
      };

      if (editingRequest) {
        await updateRequest(editingRequest.id, requestPayload, editingRequest.notes);
      } else {
        await saveRequest(requestPayload);
      }
      
      setSubmitted(true);
      setIsSigning(false);
    } catch (error) {
       console.error(error);
      setSigningError("Erro ao processar assinatura.");
    } finally {
      setSignLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in duration-700">
        <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-xl">
          <i className="fa-solid fa-check text-4xl"></i>
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-2">Solicitação Protocolada!</h2>
        <p className="text-slate-500 mb-10">Seu pedido foi registrado e enviado para a caixa do gestor imediato.</p>
        <button onClick={onBack} className="px-12 py-5 bg-emerald-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-emerald-700 transition-all">Voltar ao Início</button>
      </div>
    );
  }

  if (selectedForm) {
    return (
      <div className="p-6 md:p-10 space-y-8 animate-in slide-in-from-right-8 max-w-4xl mx-auto pb-32">
        <div className="flex items-center gap-6">
          <button onClick={() => setSelectedForm(null)} className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 rounded-2xl text-slate-400 hover:text-emerald-600 shadow-sm transition-all"><i className="fa-solid fa-arrow-left"></i></button>
          <div><h2 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">{selectedForm}</h2></div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); setIsSigning(true); }} className="space-y-8">
          <section className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo do Gestor</label><input type="email" value={managerEmail} onChange={e => setManagerEmail(e.target.value)} required className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-100 outline-none font-bold text-slate-700" placeholder="gestor@tjpa.jus.br" /></div>
               <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Gestor</label><input type="text" value={managerName} onChange={e => setManagerName(e.target.value)} required className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-100 outline-none font-bold text-slate-700" /></div>
               <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Início</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold text-slate-700" /></div>
               <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Fim</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold text-slate-700" /></div>
               <div className="md:col-span-2 space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destino / Lotação</label><input type="text" value={destination} onChange={e => setDestination(e.target.value)} required className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold text-slate-700" /></div>
            </div>
          </section>

          <section className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center"><h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Elementos de Despesa</h3><button type="button" onClick={() => setItems([...items, { id: Math.random().toString(), classification: '', value: '' }])} className="text-emerald-600 font-black text-[10px] uppercase">+ Item</button></div>
            {items.map((item, idx) => (
              <div key={item.id} className="flex gap-4">
                <select 
                  value={item.classification} 
                  onChange={e => {
                    const selectedEl = expenseElements.find(el => el.description === e.target.value);
                    setItems(items.map(i => i.id === item.id ? {...i, classification: e.target.value, code: selectedEl?.code || ''} : i));
                  }} 
                  className="flex-1 px-6 py-4 bg-slate-50 rounded-2xl font-bold"
                >
                  <option value="">Selecione a Rubrica...</option>
                  {expenseElements.map(el => <option key={el.id} value={el.description}>{el.code} — {el.description}</option>)}
                </select>
                <input 
                  type="number" 
                  value={item.value} 
                  onChange={e => setItems(items.map(i => i.id === item.id ? {...i, value: e.target.value} : i))} 
                  className="w-32 px-6 py-4 bg-slate-50 rounded-2xl font-bold" 
                  placeholder="0,00" 
                />
              </div>
            ))}
          </section>

          <section className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm space-y-4">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Justificativa Formal</label>
             <textarea 
               value={justification} 
               onChange={e => setJustification(e.target.value)} 
               rows={5} 
               className="w-full px-8 py-8 bg-slate-50 border-none rounded-3xl focus:ring-2 focus:ring-emerald-100 outline-none font-medium text-slate-700" 
               placeholder="Descreva a necessidade da despesa..."
             />
          </section>

          <button type="submit" className="w-full py-6 bg-slate-900 text-white font-black uppercase tracking-[0.3em] rounded-[2.5rem] shadow-2xl hover:bg-emerald-600 transition-all">Protocolar via ÁGIL</button>
        </form>

        {isSigning && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-slate-900/60 animate-in fade-in duration-300">
             <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                <div className="bg-emerald-600 p-8 text-white flex items-center gap-4">
                  <i className="fa-solid fa-file-signature text-2xl"></i>
                  <h3 className="text-xl font-black uppercase">Assinatura Eletrônica</h3>
                </div>
                <div className="p-10 space-y-8">
                   <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirme sua Senha Institucional</label>
                     <input type="password" value={signPassword} onChange={e => setSignPassword(e.target.value)} autoFocus className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-emerald-500/20 outline-none transition-all font-bold text-slate-700" />
                     {signingError && <p className="text-red-500 text-[10px] font-black uppercase">{signingError}</p>}
                   </div>
                   <div className="flex gap-4">
                     <button onClick={() => setIsSigning(false)} className="flex-1 py-5 bg-slate-50 text-slate-400 font-black uppercase tracking-widest rounded-2xl">Cancelar</button>
                     <button onClick={handleFinalSign} disabled={signLoading || !signPassword} className="flex-[2] py-5 bg-slate-950 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3">
                       {signLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-check"></i>}Confirmar
                     </button>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-10 animate-in fade-in duration-700 max-w-6xl mx-auto pb-20">
      <h2 className="text-4xl font-black text-slate-900 tracking-tight italic">Nova Solicitação</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[
          { title: 'Extra-Júri', icon: 'fa-gavel', color: 'emerald', desc: 'Custeio de alimentação para sessões do tribunal do júri.' },
          { title: 'Extra-Emergencial', icon: 'fa-bolt-lightning', color: 'red', desc: 'Despesas imprevistas de pequena monta e urgentes.' },
          { title: 'Diárias e Passagens', icon: 'fa-plane', color: 'sky', desc: 'Deslocamento institucional para fins de serviço.' },
          { title: 'Reembolsos', icon: 'fa-receipt', color: 'teal', desc: 'Reembolso de gastos realizados com recursos próprios.' },
          { title: 'Ordinário', icon: 'fa-file-invoice', color: 'blue', desc: 'Suprimento planejado para manutenção da unidade.' }
        ].map((form, i) => (
          <div key={i} onClick={() => setSelectedForm(form.title as FormType)} className="bg-white rounded-[2.5rem] p-10 border border-slate-50 shadow-sm hover:shadow-2xl hover:scale-105 transition-all cursor-pointer group">
            <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center bg-${form.color}-50 text-${form.color}-600 mb-6 group-hover:bg-${form.color}-600 group-hover:text-white transition-all`}><i className={`fa-solid ${form.icon} text-3xl`}></i></div>
            <h3 className="text-2xl font-black text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight uppercase italic mb-2">{form.title}</h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">{form.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RequestForms;
