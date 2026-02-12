import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Ban, Scale } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { JuriReviewPanel } from '../../accountability/JuriReviewPanel';

interface ProcessAnalysisTabProps {
  processData: any;
  processId: string;
  currentUserRole: string;
  darkMode: boolean;
  isExtraJuri: boolean;
  fetchProcessData: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const ProcessAnalysisTab: React.FC<ProcessAnalysisTabProps> = ({
  processData,
  processId,
  currentUserRole,
  darkMode,
  isExtraJuri,
  fetchProcessData,
  setLoading,
}) => {
  const [analystNote, setAnalystNote] = useState('');
  const [juriReviewOpen, setJuriReviewOpen] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm('Confirmar alteracao de status?')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('solicitations').update({ status: newStatus }).eq('id', processId);
      if (error) throw error;
      await fetchProcessData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
      <div className="lg:col-span-2 space-y-6">

        {/* Extra-Juri Review Button (SOSFU only) */}
        {isExtraJuri && currentUserRole === 'SOSFU' && (
          <div className={`rounded-xl p-5 text-white shadow-lg transition-all ${
            darkMode ? 'bg-gradient-to-r from-blue-900 to-teal-900 border border-blue-500/20' : 'bg-gradient-to-r from-blue-600 to-teal-600'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-lg backdrop-blur">
                  <Scale size={22} />
                </div>
                <div>
                  <h3 className="font-black text-base">Analise Extra-Juri</h3>
                  <p className={`${darkMode ? 'text-blue-400/80' : 'text-blue-100'} text-xs mt-0.5`}>Ajuste quantidades e valores aprovados para participantes e despesas.</p>
                </div>
              </div>
              <button
                onClick={() => setJuriReviewOpen(true)}
                className={`px-5 py-2.5 rounded-lg text-sm font-black shadow-lg transition-all flex items-center gap-2 ${
                  darkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-white text-blue-700 hover:bg-blue-50'
                }`}
              >
                <Scale size={16} /> Abrir Painel de Revisao
              </button>
            </div>
          </div>
        )}

        {/* Extra-Juri Info Banner (non-SOSFU) */}
        {isExtraJuri && currentUserRole !== 'SOSFU' && (
          <div className={`${darkMode ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-200'} border rounded-xl p-4 flex items-center gap-3 transition-colors`}>
            <Scale size={18} className="text-blue-500 shrink-0" />
            <div>
              <p className={`text-sm font-bold ${darkMode ? 'text-blue-400' : 'text-blue-800'}`}>Processo Extra-Juri</p>
              <p className={`text-xs ${darkMode ? 'text-blue-500/70' : 'text-blue-600'}`}>A SOSFU realizara a analise e ajuste das quantidades aprovadas para este processo.</p>
            </div>
          </div>
        )}

        <div className={`${darkMode ? 'bg-slate-800 border-slate-700 shadow-slate-950/20' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-xl border transition-colors`}>
          <h3 className={`font-bold mb-4 ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>Parecer Tecnico</h3>
          <textarea
            className={`w-full p-4 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none transition-all ${
              darkMode
              ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-blue-500'
              : 'bg-gray-50 border-gray-200 focus:border-blue-400'
            }`}
            rows={6}
            placeholder="Digite o parecer tecnico..."
            value={analystNote}
            onChange={e => setAnalystNote(e.target.value)}
          />
          <div className="flex justify-end mt-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
            >
              Salvar Parecer
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className={`${darkMode ? 'bg-slate-800 border-slate-700 shadow-slate-950/20' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-xl border transition-colors`}>
          <h3 className={`font-bold mb-4 ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>Acoes de Controle</h3>

          <div className="space-y-3">
            {currentUserRole === 'SOSFU_GESTOR' && (
              <button
                onClick={() => handleStatusChange('WAITING_SOSFU_EXECUTION')}
                className={`w-full py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 border ${
                  darkMode
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                }`}
              >
                <CheckCircle2 size={16}/> Aprovar para Execucao
              </button>
            )}

            <button
              onClick={() => handleStatusChange('WAITING_CORRECTION')}
              className={`w-full py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 border ${
                darkMode
                ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20'
                : 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100'
              }`}
            >
              <AlertTriangle size={16}/> Solicitar Correcao
            </button>

            {currentUserRole === 'SOSFU_GESTOR' && (
              <button
                onClick={() => handleStatusChange('REJECTED')}
                className={`w-full py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 border ${
                  darkMode
                  ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                  : 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100'
                }`}
              >
                <Ban size={16}/> Indeferir Processo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* JuriReviewPanel Overlay */}
      {juriReviewOpen && (
        <JuriReviewPanel
          solicitacaoId={processId}
          onClose={() => setJuriReviewOpen(false)}
          onSave={() => {
            setJuriReviewOpen(false);
            fetchProcessData();
          }}
        />
      )}
    </div>
  );
};
