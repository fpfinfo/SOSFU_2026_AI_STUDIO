import React from 'react';

// Interfaces
interface DocumentProps {
  data: any; // Dados da solicitação
  user: any; // Dados do perfil do usuário (Suprido)
  gestor?: any; // Dados do perfil do gestor (opcional)
  signer?: any; // Dados do assinante (Ordenador/SEFIN)
  content?: string; // Conteúdo manual para documentos genéricos
  subType?: string; // Subtipo (Memorando, Ofício, etc)
}

// --- LAYOUT BASE PADRONIZADO ---
// Alterado: h-auto em vez de h-full e removido overflow-hidden para evitar cortes em documentos longos
const BaseDocumentLayout: React.FC<{ children: React.ReactNode; docId?: string }> = ({ children, docId }) => {
    return (
        <div className="bg-white w-full h-auto p-[20mm] flex flex-col text-slate-900 font-serif relative shadow-sm border border-gray-100 min-h-[297mm]">
            {/* Header */}
            <div className="flex flex-col items-center mb-12">
                <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/217479058_brasao-tjpa.png" 
                    alt="Brasão TJPA" 
                    className="h-20 mb-4"
                />
                <h1 className="text-base font-bold uppercase tracking-widest text-center">Poder Judiciário</h1>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-center">Tribunal de Justiça do Estado do Pará</h2>
                <div className="w-16 h-0.5 bg-black mt-2"></div>
            </div>

            {/* Conteúdo Dinâmico */}
            <div className="flex-1">
                {children}
            </div>

            {/* Footer */}
            <div className="mt-auto pt-8 border-t border-gray-200 text-center text-[10px] text-gray-400 font-sans uppercase">
                <p>Documento gerado pelo sistema SOSFU - TJPA</p>
                {docId && <p>ID de Autenticação: {docId}</p>}
            </div>
        </div>
    );
};

// Helper function to determine process type more robustly
const getProcessType = (unitStr: string | null) => {
    const unit = (unitStr || '').toUpperCase();
    if (unit.includes('JÚRI') || unit.includes('JURI') || unit.includes('PROCESSO:')) {
        return 'EXTRA-JÚRI';
    }
    // Default to Extra-Emergencial/Ordinário for everything else
    // This fixes the issue where missing tags caused it to fall back to Jury logic previously
    return 'EXTRA-EMERGENCIAL';
};

// --- 1. CAPA DO PROCESSO ---
export const ProcessCoverTemplate: React.FC<DocumentProps> = ({ data }) => {
  const processType = getProcessType(data.unit);

  return (
    <BaseDocumentLayout>
          {/* Process Number Highlight */}
          <div className="border-y-2 border-black py-8 text-center mb-16 mt-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-2">Número Único de Protocolo</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">
                {data.process_number}
            </h1>
          </div>

          {/* Details Grid */}
          <div className="space-y-8 px-4">
            <div className="grid grid-cols-2 gap-12">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Interessado / Requerente</p>
                    <p className="text-lg font-bold text-slate-900 uppercase border-b border-gray-200 pb-1">{data.beneficiary}</p>
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Modalidade</p>
                    <p className="text-lg font-bold text-slate-900 uppercase border-b border-gray-200 pb-1">
                        Suprimento {processType}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-12">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Unidade / Lotação</p>
                    <p className="text-base font-semibold text-slate-800 uppercase">
                        {data.unit?.split('[')[0] || 'NÃO INFORMADA'}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Valor Solicitado</p>
                    <p className="text-base font-semibold text-slate-800 font-mono">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.value)}
                    </p>
                </div>
            </div>
            
            <div className="mt-8">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Assunto / Natureza</p>
                <p className="text-base font-medium text-slate-700">
                    Concessão de Suprimento de Fundos - Serviços de Terceiros e/ou Material de Consumo
                </p>
            </div>
          </div>
    </BaseDocumentLayout>
  );
};

// --- 2. REQUERIMENTO INICIAL ---
export const RequestTemplate: React.FC<DocumentProps> = ({ data, user }) => {
  const processType = getProcessType(data.unit);
  
  return (
    <BaseDocumentLayout>
        <div className="text-center mb-10">
            <h2 className="text-xl font-bold uppercase">REQUERIMENTO INICIAL</h2>
        </div>

        <div className="border p-6 rounded mb-8 bg-gray-50 text-sm">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <span className="block font-bold text-gray-500 text-xs">REQUERENTE</span>
                    <span className="uppercase">{data.beneficiary}</span>
                </div>
                <div>
                    <span className="block font-bold text-gray-500 text-xs">MATRÍCULA</span>
                    <span>{user.matricula || '---'}</span>
                </div>
            </div>
        </div>

        <div className="text-justify leading-relaxed space-y-4 text-base">
            <p>
                Solicito a concessão de Suprimento de Fundos na modalidade <strong>{processType}</strong>, 
                no valor de <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.value)}</strong>, 
                para atender despesas da unidade <strong>{user.lotacao || 'Unidade Judiciária'}</strong>.
            </p>
            
            <h3 className="font-bold mt-6 mb-2">JUSTIFICATIVA E PLANO DE APLICAÇÃO</h3>
            <div className="bg-gray-50 p-6 border-l-4 border-slate-300 whitespace-pre-wrap font-sans text-sm">
                {data.justification || 'Conforme detalhamento técnico anexo.'}
            </div>
        </div>

        <div className="mt-20 text-center">
            <p className="uppercase font-medium mb-8">Nesta data.</p>
            <div className="inline-block border-t border-black pt-2 px-12">
                <p className="font-bold text-gray-900 uppercase">{data.beneficiary}</p>
                <p className="text-sm text-gray-600">Requerente / Suprido</p>
                <p className="text-[10px] text-gray-400 mt-1">Assinado digitalmente via SOSFU</p>
            </div>
        </div>
    </BaseDocumentLayout>
  );
};

// --- 3. CERTIDÃO DE ATESTO (GESTOR) - MODELO JURÍDICO ---
export const AttestationTemplate: React.FC<DocumentProps> = ({ data, user, gestor }) => {
    const managerName = data.manager_name || gestor?.full_name || 'GESTOR DA UNIDADE';
    const location = user.municipio ? `COMARCA DE ${user.municipio.toUpperCase()}` : 'CAPITAL';
    const today = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    const processType = getProcessType(data.unit);

    return (
        <BaseDocumentLayout docId={`CERT-${data.process_number.replace(/\D/g,'')}`}>
            <div className="text-center mb-12">
                <h2 className="text-2xl font-bold uppercase tracking-wide">CERTIDÃO DE ATESTO DA CHEFIA IMEDIATA</h2>
                <p className="text-sm font-bold text-gray-600 mt-2">Processo Nº {data.process_number}</p>
            </div>

            <div className="text-justify text-lg leading-relaxed font-serif space-y-8 px-4">
                <p>
                    <strong>CERTIFICO</strong>, no uso das minhas atribuições legais e em conformidade com o Regulamento de Suprimento de Fundos do Tribunal de Justiça do Estado do Pará, que a despesa pretendida pelo servidor <strong>{data.beneficiary.toUpperCase()}</strong> no processo <strong>{data.process_number}</strong> reveste-se de interesse público e atende aos critérios de conveniência e oportunidade desta unidade judiciária.
                </p>

                <p>
                    <strong>DECLARO</strong> que verifiquei a adequação dos itens solicitados às necessidades do serviço, conforme detalhamento abaixo:
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded p-6 mx-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="block font-bold text-gray-500 text-xs uppercase">Modalidade</span>
                            <span className="font-semibold text-slate-900">{processType}</span>
                        </div>
                        <div>
                            <span className="block font-bold text-gray-500 text-xs uppercase">Valor Aprovado</span>
                            <span className="font-bold text-slate-900 text-base">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.value)}</span>
                        </div>
                    </div>
                </div>

                <p>
                    <strong>ATESTO</strong>, ainda, a impossibilidade de atendimento da demanda via fluxo normal de compras/licitação em tempo hábil, caracterizando a necessidade emergencial/excepcional que justifica a concessão do suprimento de fundos.
                </p>

                <p className="pt-4">
                    Encaminhe-se ao <strong>Serviço de Suprimento de Fundos (SOSFU)</strong> para análise técnica e demais providências cabíveis.
                </p>
            </div>

            <div className="mt-20 text-center">
                <p className="uppercase font-medium mb-12">{location}, {today}.</p>
                <div className="inline-block border-t border-black pt-4 px-12">
                    <p className="font-bold text-gray-900 uppercase text-lg">{managerName}</p>
                    <p className="text-base text-gray-700 italic">Gestor / Magistrado Responsável</p>
                    <p className="text-[10px] text-gray-400 mt-2 font-sans">Assinatura Digital - Token de Validação</p>
                </div>
            </div>
        </BaseDocumentLayout>
    );
};

// --- DOCUMENTO GENÉRICO (NOVOS DOCS) ---
export const GenericDocumentTemplate: React.FC<DocumentProps> = ({ data, user, content, subType }) => {
    return (
        <BaseDocumentLayout>
            <div className="text-center mb-10 border-b border-black pb-4">
                <h2 className="text-2xl font-bold uppercase">{subType || 'DOCUMENTO DIVERSO'}</h2>
                <p className="text-sm text-gray-500 mt-1 uppercase">Ref. Processo: {data.process_number}</p>
            </div>

            <div className="w-full text-justify text-base leading-relaxed whitespace-pre-wrap font-serif min-h-[300px]">
                {content || '(Documento sem conteúdo)'}
            </div>

            <div className="mt-20 text-center">
                <p className="uppercase font-medium mb-12">Belém, {new Date().toLocaleDateString('pt-BR', {day:'numeric', month:'long', year:'numeric'})}.</p>
                <div className="inline-block border-t border-black pt-4 px-12">
                    <p className="font-bold text-gray-900 uppercase">{user.full_name}</p>
                    <p className="text-sm text-gray-700">{user.cargo || 'Servidor TJPA'}</p>
                </div>
            </div>
        </BaseDocumentLayout>
    );
};

// MANTIDOS SEM ALTERAÇÃO VISUAL PROFUNDA (JÁ ESTAVAM OK)
export const GrantActTemplate: React.FC<DocumentProps> = ({ data, signer }) => (
    <BaseDocumentLayout>
        <div className="text-center mb-8"><h2 className="text-2xl font-bold uppercase">ATO DE CONCESSÃO</h2></div>
        <div className="text-justify leading-8"><p>O ORDENADOR DE DESPESA CONCEDE suprimento de fundos no valor de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.value)}.</p></div>
        <div className="mt-20 text-center"><p className="border-t border-black inline-block pt-2 px-12 font-bold">{signer?.full_name || 'ORDENADOR'}</p></div>
    </BaseDocumentLayout>
);

export const RegularityCertificateTemplate: React.FC<DocumentProps> = ({ data }) => (
    <BaseDocumentLayout>
        <div className="text-center mb-8"><h2 className="text-xl font-bold uppercase">CERTIDÃO DE REGULARIDADE</h2></div>
        <div className="text-justify leading-8"><p>CERTIFICO que o requerente encontra-se apto e sem pendências.</p></div>
        <div className="mt-20 text-center"><p className="border-t border-black inline-block pt-2 px-12 font-bold">SOSFU / TJPA</p></div>
    </BaseDocumentLayout>
);

export const CommitmentNoteTemplate: React.FC<DocumentProps> = ({ data }) => (
    <BaseDocumentLayout>
        <div className="text-center mb-8"><h2 className="text-xl font-bold uppercase">NOTA DE EMPENHO</h2></div>
        <div className="border border-black p-4 font-mono text-sm">EMPENHO AUTOMÁTICO PARA PROCESSO {data.process_number}</div>
    </BaseDocumentLayout>
);

export const BankOrderTemplate: React.FC<DocumentProps> = ({ data }) => (
    <BaseDocumentLayout>
        <div className="text-center mb-8"><h2 className="text-xl font-bold uppercase">ORDEM BANCÁRIA</h2></div>
        <div className="border border-black p-4 font-mono text-sm">PAGAMENTO AUTORIZADO: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.value)}</div>
    </BaseDocumentLayout>
);