import React from 'react';
import { Archive, FileText, FolderOpen, Lock, Eye, Database } from 'lucide-react';

interface ProcessArchiveTabProps {
  processData: any;
  documents: any[];
  processId: string;
  setSelectedDoc: (doc: any) => void;
  darkMode: boolean;
}

export const ProcessArchiveTab: React.FC<ProcessArchiveTabProps> = ({
  processData,
  documents,
  processId,
  setSelectedDoc,
  darkMode,
}) => {
  if (processData?.status !== 'ARCHIVED') {
    return (
      <div className="flex flex-col items-center justify-center h-[500px]">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors ${darkMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-400'}`}>
          <Archive size={40} />
        </div>
        <h3 className={`text-xl font-bold transition-colors ${darkMode ? 'text-slate-100' : 'text-gray-800'}`}>Processo ainda nao arquivado</h3>
        <p className={`mt-2 max-w-md text-center transition-colors ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>
          O arquivo ficara disponivel apos a baixa do processo no SIAFE.
          O processo atual esta em <strong>{processData?.status || '---'}</strong>.
        </p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/I';
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
  };

  return (
    <div className="animate-in fade-in">
      <div className="space-y-6">
        {/* Header do Arquivo */}
        <div className={`rounded-2xl p-8 text-white shadow-xl transition-all ${
          darkMode ? 'bg-slate-800 border border-slate-700 shadow-slate-950/40' : 'bg-gradient-to-r from-slate-800 to-slate-900 shadow-slate-900/20'
        }`}>
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center backdrop-blur transition-colors ${darkMode ? 'bg-emerald-500/10' : 'bg-white/10'}`}>
              <Archive size={28} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Processo Arquivado</h2>
              <p className={`${darkMode ? 'text-slate-500' : 'text-slate-400'} text-sm mt-1`}>Baixa efetuada no SIAFE — Processo encerrado</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`backdrop-blur border rounded-xl p-5 transition-colors ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-white/5 border-white/10'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>N do Processo</p>
              <p className="text-lg font-mono font-bold text-white">{processData.process_number}</p>
            </div>
            <div className={`backdrop-blur border rounded-xl p-5 transition-colors ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-white/5 border-white/10'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>NL SIAFE</p>
              <p className="text-lg font-mono font-bold text-emerald-400">
                {processData.nl_siafe || <span className="text-slate-500 italic text-sm">Nao informada</span>}
              </p>
            </div>
            <div className={`backdrop-blur border rounded-xl p-5 transition-colors ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-white/5 border-white/10'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Data da Baixa</p>
              <p className="text-lg font-bold text-white">
                {processData.data_baixa
                  ? new Date(processData.data_baixa).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                  : <span className="text-slate-500 italic text-sm">Nao informada</span>
                }
              </p>
            </div>
          </div>
        </div>

        {/* Resumo do Processo */}
        <div className={`rounded-2xl shadow-sm overflow-hidden border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
          <div className={`px-6 py-4 border-b transition-colors ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
            <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-gray-800'}`}>
              <FileText size={16} className="text-blue-600" />
              Resumo do Processo Arquivado
            </h3>
          </div>
          <div className="p-6">
            <table className="w-full">
              <tbody className={`divide-y transition-colors ${darkMode ? 'divide-slate-700' : 'divide-gray-100'}`}>
                <tr>
                  <td className={`py-3 text-sm font-bold w-48 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Suprido / Beneficiario</td>
                  <td className={`py-3 text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>{processData.beneficiary?.toUpperCase()}</td>
                </tr>
                <tr>
                  <td className={`py-3 text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Unidade / Lotacao</td>
                  <td className={`py-3 text-sm ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>{processData.unit?.split('[')[0]?.trim() || '---'}</td>
                </tr>
                <tr>
                  <td className={`py-3 text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Valor Concedido</td>
                  <td className={`py-3 text-sm font-mono font-bold ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(processData.value)}
                  </td>
                </tr>
                <tr>
                  <td className={`py-3 text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Periodo do Evento</td>
                  <td className={`py-3 text-sm ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                    {formatDate(processData.event_start_date)} — {formatDate(processData.event_end_date)}
                  </td>
                </tr>
                <tr>
                  <td className={`py-3 text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Data da Solicitacao</td>
                  <td className={`py-3 text-sm ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                    {new Date(processData.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </td>
                </tr>
                <tr>
                  <td className={`py-3 text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>NL SIAFE</td>
                  <td className="py-3">
                    {processData.nl_siafe ? (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-full text-xs font-bold font-mono transition-colors ${
                        darkMode ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        <Database size={12} />
                        {processData.nl_siafe}
                      </span>
                    ) : (
                      <span className={`text-sm italic transition-colors ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Pendente de registro</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className={`py-3 text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Status Final</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-xs font-bold uppercase transition-colors ${
                      darkMode ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      <Archive size={12} /> Arquivado
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Documentacao Gerada */}
        <div className={`rounded-2xl shadow-sm overflow-hidden border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
          <div className={`px-6 py-4 border-b transition-colors ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
            <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-gray-800'}`}>
              <FolderOpen size={16} className="text-amber-600" />
              Documentacao do Processo ({documents.length} documentos)
            </h3>
          </div>
          <div className="p-6">
            {documents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {documents.map((doc: any, i: number) => (
                  <button
                    key={doc.id || i}
                    onClick={() => setSelectedDoc(doc)}
                    className={`flex items-center gap-3 p-4 border rounded-xl transition-all text-left group ${
                      darkMode
                      ? 'border-slate-700 hover:border-blue-500 hover:bg-slate-700/50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      darkMode ? 'bg-slate-700 text-blue-400 group-hover:bg-slate-600' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
                    }`}>
                      <FileText size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate transition-colors ${darkMode ? 'text-slate-100' : 'text-gray-800'}`}>{doc.title}</p>
                      <p className={`text-[10px] mt-0.5 transition-colors ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                        {new Date(doc.created_at).toLocaleDateString('pt-BR')} • FLS. {String(i + 1).padStart(2, '0')}
                      </p>
                    </div>
                    <Eye size={14} className={`transition-colors ${darkMode ? 'text-slate-600 group-hover:text-blue-400' : 'text-gray-300 group-hover:text-blue-500'}`} />
                  </button>
                ))}
              </div>
            ) : (
              <p className={`text-sm text-center py-8 transition-colors ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Nenhum documento vinculado.</p>
            )}
          </div>
        </div>

        {/* Selo de Integridade */}
        <div className={`rounded-xl border p-4 flex items-center gap-4 transition-colors ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
            <Lock size={16} />
          </div>
          <div className="flex-1">
            <p className={`text-xs font-bold uppercase transition-colors ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Processo Encerrado e Arquivado</p>
            <p className={`text-[11px] mt-0.5 transition-colors ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
              Este processo foi baixado no SIAFE e arquivado definitivamente. Nenhuma alteracao e permitida apos o arquivamento.
            </p>
          </div>
          <div className={`text-[10px] font-mono transition-colors ${darkMode ? 'text-slate-600' : 'text-gray-400'}`}>
            ID: {processData.id?.split('-')[0]}
          </div>
        </div>
      </div>
    </div>
  );
};
