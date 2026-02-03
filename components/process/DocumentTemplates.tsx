import React, { useMemo } from 'react';

// Interfaces
interface DocumentProps {
  data: any; // Dados da solicitação
  user: any; // Dados do perfil do usuário (Suprido)
  gestor?: any; // Dados do perfil do gestor (opcional)
  signer?: any; // Dados do assinante (Ordenador/SEFIN)
}

// --- 1. CAPA DO PROCESSO ---
export const ProcessCoverTemplate: React.FC<DocumentProps> = ({ data, user }) => {
  return (
    <div className="bg-white w-full h-full p-12 flex flex-col items-center justify-between text-slate-800 font-serif relative overflow-hidden shadow-sm border border-gray-100 min-h-[297mm]">
      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
        <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/217479058_brasao-tjpa.png" 
            className="w-[500px]" 
            alt="Watermark" 
        />
      </div>

      <div className="w-full relative z-10 flex-1 flex flex-col">
          {/* Header */}
          <div className="text-center space-y-4 mb-16">
            <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/217479058_brasao-tjpa.png" 
                alt="Brasão TJPA" 
                className="h-24 mx-auto mb-4"
            />
            <div>
                <h1 className="text-xl font-bold uppercase tracking-widest text-slate-900">Poder Judiciário</h1>
                <h2 className="text-lg font-semibold uppercase tracking-wider text-slate-700">Tribunal de Justiça do Estado do Pará</h2>
            </div>
            <div className="w-24 h-1 bg-slate-800 mx-auto mt-6"></div>
          </div>

          {/* Process Number Highlight */}
          <div className="bg-slate-50 border-y-2 border-slate-900 py-12 text-center mb-16">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Número Único de Protocolo</p>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter tabular-nums">
                {data.process_number}
            </h1>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-8 px-8">
            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Interessado / Requerente</p>
                <p className="text-lg font-bold text-slate-800 uppercase border-b border-slate-200 pb-2">{data.beneficiary}</p>
            </div>

            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Modalidade</p>
                <p className="text-lg font-bold text-slate-800 uppercase border-b border-slate-200 pb-2">
                    {data.unit?.includes('EMERGENCIAL') ? 'Suprimento Extra-Emergencial' : 'Suprimento Extra-Júri'}
                </p>
            </div>

            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Unidade / Lotação</p>
                <p className="text-base font-semibold text-slate-700 uppercase">
                    {data.unit?.split('[')[0]}
                </p>
            </div>

            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Valor Solicitado</p>
                <p className="text-base font-semibold text-slate-700 font-mono">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.value)}
                </p>
            </div>
            
            <div className="col-span-2 mt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Assunto / Natureza</p>
                <p className="text-base font-medium text-slate-600">
                    Concessão de Suprimento de Fundos - {data.unit?.includes('3.3.90.30') ? 'Material de Consumo' : 'Serviços de Terceiros'}
                </p>
            </div>
          </div>
      </div>

      {/* Footer */}
      <div className="w-full text-center border-t border-slate-200 pt-4 mt-auto">
        <p className="text-xs text-slate-400">
            Data de Autuação: {new Date(data.created_at).toLocaleDateString('pt-BR')} • {new Date(data.created_at).toLocaleTimeString('pt-BR')}
        </p>
        <p className="text-[10px] text-slate-300 mt-1 uppercase">
            Sistema de Orientação e Suprimento de Fundos - TJPA
        </p>
      </div>
    </div>
  );
};

// --- 2. REQUERIMENTO INICIAL (Com Lógica de Paginação) ---
export const RequestTemplate: React.FC<DocumentProps> = ({ data, user }) => {
  const justification = data.justification || 'Conforme detalhamento em anexo.';
  const CHAR_LIMIT = 1200; // Limite seguro de caracteres para a primeira página

  const content = useMemo(() => {
    if (justification.length <= CHAR_LIMIT) {
        return { parts: [justification], multiPage: false };
    }

    // Lógica para quebrar na última pontuação antes do limite
    let splitIndex = justification.lastIndexOf('.', CHAR_LIMIT);
    if (splitIndex === -1) splitIndex = justification.lastIndexOf(' ', CHAR_LIMIT);
    if (splitIndex === -1) splitIndex = CHAR_LIMIT; // Força corte se não achar ponto ou espaço

    const part1 = justification.substring(0, splitIndex + 1);
    const part2 = justification.substring(splitIndex + 1).trim();

    return { parts: [part1, part2], multiPage: true };
  }, [justification]);

  const Header = () => (
      <div className="flex items-center gap-4 border-b border-gray-200 pb-6 mb-8">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/217479058_brasao-tjpa.png" alt="Brasão" className="h-12" />
          <div>
            <h3 className="text-sm font-bold uppercase text-slate-900">Tribunal de Justiça do Estado do Pará</h3>
            <p className="text-xs text-slate-500 uppercase">Solicitação de Suprimento de Fundos</p>
            <p className="text-xs font-mono text-slate-400 mt-1">NUP: {data.process_number}</p>
          </div>
       </div>
  );

  const DataSection = () => (
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-2">1. DADOS DA SOLICITAÇÃO</h2>
        <div className="bg-slate-50 p-4 rounded border border-slate-100 grid grid-cols-2 gap-4">
            <div><span className="block text-xs font-bold text-slate-400 uppercase">Tipo</span><span className="font-semibold">{data.unit?.includes('EMERGENCIAL') ? 'Extra-Emergencial' : 'Extra-Júri'}</span></div>
            <div><span className="block text-xs font-bold text-slate-400 uppercase">Lotação</span><span className="font-semibold">{user.lotacao || data.unit?.split('[')[0]}</span></div>
        </div>
      </div>
  );

  const FooterSignature = () => (
      <div className="mt-auto pt-8 border-t border-slate-200 text-center">
         <p className="font-bold text-slate-900 uppercase">{data.beneficiary}</p>
         <p className="text-xs text-slate-500 uppercase">{user.cargo || 'Servidor Responsável'}</p>
         <p className="text-[10px] text-slate-400 mt-2 font-mono">Assinado Eletronicamente em {new Date(data.created_at).toLocaleDateString('pt-BR')}</p>
      </div>
  );

  if (!content.multiPage) {
      // Renderização Página Única (Padrão)
      return (
        <div className="bg-white w-full h-full p-16 text-slate-800 font-serif leading-relaxed text-justify relative shadow-sm border border-gray-100 flex flex-col min-h-[297mm]">
           <Header />
           <div className="space-y-6 text-sm text-slate-700 flex-1">
              <DataSection />
              <div className="mb-8">
                 <h2 className="text-lg font-bold text-slate-900 mb-2">2. JUSTIFICATIVA</h2>
                 <p className="bg-slate-50 p-6 rounded border-l-4 border-slate-300 whitespace-pre-wrap">{content.parts[0]}</p>
              </div>
           </div>
           <FooterSignature />
        </div>
      );
  } else {
      // Renderização Duas Páginas
      return (
        <div className="flex flex-col gap-8 bg-gray-100/50 p-4"> {/* Wrapper externo para visualização */}
            {/* PÁGINA 1 */}
            <div className="bg-white w-full max-w-[210mm] min-h-[297mm] p-16 text-slate-800 font-serif leading-relaxed text-justify relative shadow-sm border border-gray-100 flex flex-col">
               <Header />
               <div className="space-y-6 text-sm text-slate-700 flex-1">
                  <DataSection />
                  <div>
                     <h2 className="text-lg font-bold text-slate-900 mb-2">2. JUSTIFICATIVA</h2>
                     <p className="bg-slate-50 p-6 rounded-t border-l-4 border-slate-300 whitespace-pre-wrap border-b-0 pb-12">
                        {content.parts[0]}
                        <br/><br/>
                        <span className="text-slate-400 italic text-xs block text-right">(Continua na próxima página...)</span>
                     </p>
                  </div>
               </div>
               <div className="text-right text-xs text-slate-400 mt-4">Página 1 de 2</div>
            </div>

            {/* PÁGINA 2 */}
            <div className="bg-white w-full max-w-[210mm] min-h-[297mm] p-16 text-slate-800 font-serif leading-relaxed text-justify relative shadow-sm border border-gray-100 flex flex-col">
               <Header />
               <div className="space-y-6 text-sm text-slate-700 flex-1">
                  <div>
                     <h2 className="text-lg font-bold text-slate-900 mb-2 text-slate-400">2. JUSTIFICATIVA (Continuação)</h2>
                     <p className="bg-slate-50 p-6 rounded-b border-l-4 border-slate-300 whitespace-pre-wrap pt-4">
                        <span className="text-slate-400 italic text-xs block mb-4">(...Continuação)</span>
                        {content.parts[1]}
                     </p>
                  </div>
               </div>
               <FooterSignature />
               <div className="text-right text-xs text-slate-400 mt-4">Página 2 de 2</div>
            </div>
        </div>
      );
  }
};

// --- 3. CERTIDÃO DE ATESTO (GESTOR) ---
export const AttestationTemplate: React.FC<DocumentProps> = ({ data, user, gestor }) => {
    const managerName = data.manager_name || gestor?.full_name || 'GESTOR NÃO IDENTIFICADO';
    const location = user.municipio ? `COMARCA DE ${user.municipio.toUpperCase()}` : 'BELÉM';

    return (
        <div className="bg-white w-full h-full p-20 text-black font-serif relative shadow-sm border border-gray-100 flex flex-col items-center min-h-[297mm]">
            <div className="text-center mb-10 w-full border-b border-black pb-4">
                <h2 className="text-xl font-bold uppercase">CERTIDÃO DE ATESTO DA CHEFIA IMEDIATA</h2>
                <p className="text-sm text-gray-500 mt-1 uppercase">Nº {data.process_number}</p>
            </div>
            <div className="w-full text-justify text-base leading-8 space-y-8">
                <p>
                    <strong>CERTIFICO</strong> que a despesa pretendida pelo servidor <strong>{data.beneficiary.toUpperCase()}</strong> no valor de <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.value)}</strong> reveste-se de interesse público e atende aos critérios de conveniência e oportunidade desta unidade judiciária.
                </p>
                <p>
                    Encaminhe-se ao <strong>SOSFU</strong> para análise técnica.
                </p>
            </div>
            <div className="mt-auto pt-16 text-center w-full">
                <p className="uppercase font-medium mb-12">{location}, {new Date().toLocaleDateString('pt-BR')}.</p>
                <div className="inline-block border-t border-black pt-4 px-12">
                    <p className="font-bold text-gray-900 uppercase">{managerName}</p>
                    <p className="text-sm text-gray-600">Gestor Responsável</p>
                </div>
            </div>
        </div>
    );
};

// --- 4. ATO DE CONCESSÃO (PORTARIA) - SEFIN ---
export const GrantActTemplate: React.FC<DocumentProps> = ({ data, user, signer }) => {
    return (
        <div className="bg-white w-full h-full p-20 text-black font-serif relative shadow-sm border border-gray-100 flex flex-col items-center min-h-[297mm]">
            <div className="text-center mb-12">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/217479058_brasao-tjpa.png" alt="Brasão" className="h-16 mx-auto mb-4" />
                <h1 className="text-lg font-bold uppercase">Tribunal de Justiça do Estado do Pará</h1>
                <h2 className="text-sm font-semibold uppercase text-gray-600">Secretaria de Finanças - SEFIN</h2>
            </div>
            <div className="text-center mb-8 w-full">
                <h2 className="text-2xl font-bold uppercase">ATO DE CONCESSÃO Nº {data.process_number.split('/')[1]}/2025</h2>
            </div>
            <div className="w-full text-justify text-base leading-8 space-y-6">
                <p>O <strong>ORDENADOR DE DESPESA</strong>, no uso de suas atribuições legais, <strong>RESOLVE:</strong></p>
                <p><strong>CONCEDER</strong> suprimento de fundos ao servidor(a) <strong>{data.beneficiary.toUpperCase()}</strong>, lotado(a) em {user.lotacao || data.unit}, no valor de <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.value)}</strong>, para atender despesas de caráter extraordinário.</p>
                <p>Prazo de aplicação: 60 (sessenta) dias.</p>
            </div>
            <div className="mt-auto pt-16 text-center w-full">
                <p className="uppercase font-medium mb-12">Belém, {new Date().toLocaleDateString('pt-BR')}.</p>
                <div className="inline-block border-t border-black pt-4 px-12">
                    <p className="font-bold text-gray-900 uppercase">{signer?.full_name || 'MIGUEL LUCIVALDO ALVES SANTOS'}</p>
                    <p className="text-sm text-gray-700">Ordenador de Despesa - SEFIN</p>
                </div>
            </div>
        </div>
    );
};

// --- 5. CERTIDÃO DE REGULARIDADE (SOSFU) ---
export const RegularityCertificateTemplate: React.FC<DocumentProps> = ({ data, user }) => {
    return (
        <div className="bg-white w-full h-full p-20 text-black font-serif relative shadow-sm border border-gray-100 flex flex-col items-center min-h-[297mm]">
            <div className="text-center mb-10 w-full border-b border-black pb-4">
                <h2 className="text-xl font-bold uppercase">CERTIDÃO DE REGULARIDADE</h2>
                <p className="text-sm text-gray-500 mt-1">SOSFU - Serviço de Orientação e Suprimento de Fundos</p>
            </div>
            <div className="w-full text-justify text-base leading-8 space-y-6">
                <p>
                    <strong>CERTIFICO</strong>, para os devidos fins, que o servidor <strong>{data.beneficiary.toUpperCase()}</strong>, requerente no processo <strong>{data.process_number}</strong>:
                </p>
                <ul className="list-disc pl-8 space-y-2">
                    <li>Não possui pendências em prestações de contas anteriores (Art. 68 da LC 101/2000).</li>
                    <li>Não foi declarado em alcance.</li>
                    <li>Possui vínculo funcional ativo com este Poder Judiciário.</li>
                    <li>A despesa solicitada enquadra-se nos elementos de despesa passíveis de Suprimento de Fundos.</li>
                </ul>
                <p className="mt-8">
                    Nestes termos, opinamos pelo <strong>DEFERIMENTO</strong> da concessão.
                </p>
            </div>
            <div className="mt-auto pt-16 text-center w-full">
                <p className="uppercase font-medium mb-12">Belém, {new Date().toLocaleDateString('pt-BR')}.</p>
                <div className="inline-block border-t border-black pt-4 px-12">
                    <p className="font-bold text-gray-900 uppercase">Técnico Analista</p>
                    <p className="text-sm text-gray-700">SOSFU / TJPA</p>
                </div>
            </div>
        </div>
    );
};

// --- 6. NOTA DE EMPENHO (SOSFU -> SEFIN) ---
export const CommitmentNoteTemplate: React.FC<DocumentProps> = ({ data, user, signer }) => {
    return (
        <div className="bg-white w-full h-full p-12 text-xs font-mono relative shadow-sm border border-gray-100 flex flex-col min-h-[297mm]">
            <div className="border border-black p-4 mb-4">
                <h1 className="text-lg font-bold text-center">NOTA DE EMPENHO</h1>
                <p className="text-center">TJPA - Tribunal de Justiça do Estado do Pará</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border border-black p-4 mb-4">
                <div>
                    <p><strong>NÚMERO:</strong> 2026NE{data.process_number.split('/')[1]}</p>
                    <p><strong>DATA:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
                    <p><strong>TIPO:</strong> Ordinário</p>
                </div>
                <div>
                    <p><strong>PROCESSO:</strong> {data.process_number}</p>
                    <p><strong>UNIDADE GESTORA:</strong> 030001 - TRIBUNAL DE JUSTIÇA</p>
                    <p><strong>GESTÃO:</strong> 00001 - TESOURO</p>
                </div>
            </div>

            <div className="border border-black p-4 mb-4">
                <p><strong>FAVORECIDO:</strong> {data.beneficiary.toUpperCase()}</p>
                <p><strong>CPF:</strong> {user.cpf || '000.000.000-00'}</p>
                <p><strong>ENDEREÇO:</strong> {user.lotacao || 'TJPA'}</p>
            </div>

            <div className="border border-black p-4 mb-4">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-black">
                            <th>FONTE</th>
                            <th>NATUREZA</th>
                            <th>VALOR</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>0100000000</td>
                            <td>{data.unit?.match(/ND: ([\d.]+)/)?.[1] || '3.3.90.39'}</td>
                            <td>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.value)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between mt-auto pt-12 px-8">
                <div className="text-center">
                    <p className="border-t border-black pt-2 w-48">Emissor (SOSFU)</p>
                </div>
                <div className="text-center">
                    <p className="border-t border-black pt-2 w-48 font-bold">{signer?.full_name || 'ORDENADOR DE DESPESA'}</p>
                    <p>Autorizador</p>
                </div>
            </div>
        </div>
    );
};

// --- 7. DOCUMENTO DE LIQUIDAÇÃO E ORDEM BANCÁRIA ---
export const BankOrderTemplate: React.FC<DocumentProps> = ({ data, user }) => {
    return (
        <div className="bg-white w-full h-full p-16 text-black font-serif relative shadow-sm border border-gray-100 flex flex-col min-h-[297mm]">
             <div className="text-center mb-8 border-b-2 border-black pb-4">
                <h2 className="text-2xl font-bold uppercase">ORDEM BANCÁRIA</h2>
                <p className="text-sm font-bold">Nº 2026OB{Math.floor(Math.random() * 10000)}</p>
            </div>

            <div className="space-y-6 text-sm">
                <div className="grid grid-cols-2 gap-8">
                    <div className="border p-4">
                        <p className="font-bold mb-2">PAGADOR</p>
                        <p>Tribunal de Justiça do Estado do Pará</p>
                        <p>CNPJ: 05.054.868/0001-65</p>
                        <p>Banco: BANPARÁ (037)</p>
                    </div>
                    <div className="border p-4">
                        <p className="font-bold mb-2">FAVORECIDO</p>
                        <p>{data.beneficiary}</p>
                        <p>CPF: {user.cpf || '***.***.***-**'}</p>
                        <p>Banco: {user.banco || 'BANPARA'}</p>
                        <p>Ag: {user.agencia} / CC: {user.conta_corrente}</p>
                    </div>
                </div>

                <div className="border p-4 text-center bg-gray-50">
                    <p className="text-xs uppercase text-gray-500">Valor Líquido</p>
                    <p className="text-3xl font-bold font-mono">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.value)}</p>
                </div>

                <p className="text-justify italic">
                    Determino ao Banco do Estado do Pará que efetue o pagamento da importância acima discriminada ao favorecido indicado, debitando a conta deste Tribunal.
                </p>
            </div>

            <div className="mt-auto pt-12 flex justify-between">
                <div className="text-center">
                    <p className="border-t border-black pt-2 w-40 text-xs">Gestor Financeiro</p>
                </div>
                <div className="text-center">
                    <p className="border-t border-black pt-2 w-40 text-xs">Ordenador de Despesa</p>
                </div>
            </div>
        </div>
    );
};