import React from 'react';

// Interfaces
interface DocumentProps {
  data: any; // Dados da solicitação
  user: any; // Dados do perfil do usuário (Suprido)
  gestor?: any; // Dados do perfil do gestor (opcional)
  signer?: any; // Dados do assinante (Ordenador/SEFIN)
  content?: string; // Conteúdo manual para documentos genéricos
  subType?: string; // Subtipo (Memorando, Ofício, etc)
  document?: any; // O objeto do documento completo (DB) para acessar metadados
  comarcaData?: any; // Dados bancários da comarca (conta institucional para Extra-Júri)
}

// --- HELPER DE DATA E LOCAL ---
const getFormattedDate = (municipio?: string) => {
    const city = municipio || 'Belém';
    const cityFormatted = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
    
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = now.toLocaleDateString('pt-BR', { month: 'long' });
    const monthFormatted = month.charAt(0).toUpperCase() + month.slice(1);
    const year = now.getFullYear();

    return `${cityFormatted}-PA, ${day} de ${month.toLowerCase()} de ${year}`;
};

// --- LAYOUT BASE PADRONIZADO ---
const BaseDocumentLayout: React.FC<{ children: React.ReactNode; docId?: string }> = ({ children, docId }) => {
    return (
        <div className="bg-white w-full h-auto p-[20mm] flex flex-col text-slate-900 font-serif relative shadow-sm border border-gray-100 min-h-[297mm]">
            {/* Header */}
            <div className="flex flex-col items-center mb-12">
                <img 
                    src="/assets/brasao-tjpa.png" 
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

// Helper function to determine process type more robustly based on Process Number
const getProcessType = (data: any) => {
    const procNum = (data?.process_number || '').toUpperCase();
    const unit = (data?.unit || '').toUpperCase();

    // Prioridade: Prefixo do Número do Processo (Padrão Novo)
    if (procNum.includes('TJPA-JUR')) return 'EXTRA-JÚRI';
    if (procNum.includes('TJPA-EXT')) return 'EXTRA-EMERGENCIAL';
    if (procNum.includes('TJPA-ORD')) return 'ORDINÁRIO';

    // Fallback: Análise da Unidade (Legado)
    if (unit.includes('JÚRI') || unit.includes('JURI') || unit.includes('PROCESSO:')) {
        return 'EXTRA-JÚRI';
    }
    return 'EXTRA-EMERGENCIAL';
};

// Helper: Resolve bank account based on process type
// EXTRA-JÚRI → Conta da Comarca | EXTRA-EMERGENCIAL → Conta do Suprido
const getBankInfo = (data: any, user: any, comarcaData?: any) => {
    const processType = getProcessType(data);
    const isJuri = processType === 'EXTRA-JÚRI';

    if (isJuri && comarcaData?.conta_corrente) {
        return {
            label: 'Conta Institucional da Comarca',
            banco: comarcaData.nome_banco || comarcaData.cod_banco || '---',
            agencia: comarcaData.agencia || '---',
            conta_corrente: comarcaData.conta_corrente || '---',
            isComarca: true,
        };
    }

    return {
        label: 'Conta do Suprido',
        banco: user?.nome_banco || user?.banco || '---',
        agencia: user?.agencia || '---',
        conta_corrente: user?.conta_corrente || '---',
        isComarca: false,
    };
};

// --- 1. CAPA DO PROCESSO ---
export const ProcessCoverTemplate: React.FC<DocumentProps> = ({ data }) => {
  const processType = getProcessType(data);

  return (
    <BaseDocumentLayout>
          <div className="border-y-2 border-black py-8 text-center mb-16 mt-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-2">Número Único de Protocolo</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">
                {data.process_number}
            </h1>
          </div>

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
export const RequestTemplate: React.FC<DocumentProps> = ({ data, user, document }) => {
  const processType = getProcessType(data);
  const customContent = document?.metadata?.content;
  const dateLocation = getFormattedDate(user.municipio);

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

        {customContent ? (
            <div className="text-justify leading-relaxed whitespace-pre-wrap font-serif text-base">
                {customContent}
            </div>
        ) : (
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
        )}

        <div className="mt-20 text-center">
            <p className="font-medium mb-8">{dateLocation}.</p>
            <div className="inline-block border-t border-black pt-2 px-12">
                <p className="font-bold text-gray-900 uppercase">{data.beneficiary}</p>
                <p className="text-sm text-gray-600">Requerente / Suprido</p>
                <p className="text-[10px] text-gray-400 mt-1">Assinado digitalmente via SOSFU</p>
            </div>
        </div>
    </BaseDocumentLayout>
  );
};

// --- 3. CERTIDÃO DE ATESTO (GESTOR) ---
export const AttestationTemplate: React.FC<DocumentProps> = ({ data, user, gestor, document }) => {
    const managerName = data.manager_name || gestor?.full_name || 'GESTOR DA UNIDADE';
    const customContent = document?.metadata?.content;
    const dateLocation = getFormattedDate(user.municipio);
    const isDraft = document?.metadata?.is_draft === true;

    return (
        <BaseDocumentLayout docId={`CERT-${data.process_number.replace(/\D/g,'')}`}>
            {/* Marca d'água MINUTA para documentos em rascunho */}
            {isDraft && (
                <>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                        <span className="text-[120px] font-black text-amber-200/30 uppercase tracking-[0.3em] -rotate-45 select-none whitespace-nowrap">
                            MINUTA
                        </span>
                    </div>
                    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-center relative z-10">
                        <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                            ⚠ Minuta — Documento pendente de assinatura do Gestor
                        </span>
                    </div>
                </>
            )}

            <div className={`text-center mb-12 ${isDraft ? 'relative z-10' : ''}`}>
                <h2 className="text-2xl font-bold uppercase tracking-wide">CERTIDÃO DE ATESTO DA CHEFIA IMEDIATA</h2>
                <p className="text-sm font-bold text-gray-600 mt-2">Processo Nº {data.process_number}</p>
            </div>

            {customContent ? (
                <div className={`text-justify text-lg leading-relaxed font-serif space-y-8 px-4 whitespace-pre-wrap ${isDraft ? 'relative z-10' : ''}`}>
                    {customContent}
                </div>
            ) : (
                <div className={`text-justify text-lg leading-relaxed font-serif space-y-8 px-4 ${isDraft ? 'relative z-10' : ''}`}>
                    <p>
                        <strong>CERTIFICO</strong>, no uso das minhas atribuições legais e em conformidade com o Regulamento de Suprimento de Fundos do Tribunal de Justiça do Estado do Pará, que a despesa pretendida pelo servidor <strong>{data.beneficiary.toUpperCase()}</strong> no processo <strong>{data.process_number}</strong> reveste-se de interesse público e atende aos critérios de conveniência e oportunidade desta unidade judiciária.
                    </p>
                    <p>
                        <strong>DECLARO</strong> que verifiquei a adequação dos itens solicitados às necessidades do serviço.
                    </p>
                    <p>
                        <strong>ATESTO</strong>, ainda, a impossibilidade de atendimento da demanda via fluxo normal de compras/licitação em tempo hábil, caracterizando a necessidade emergencial/excepcional que justifica a concessão do suprimento de fundos.
                    </p>
                </div>
            )}

            <div className={`mt-20 text-center ${isDraft ? 'relative z-10' : ''}`}>
                <p className="font-medium mb-12">{dateLocation}.</p>
                <div className="inline-block border-t border-black pt-4 px-12">
                    <p className="font-bold text-gray-900 uppercase text-lg">{managerName}</p>
                    <p className="text-base text-gray-700 italic">Gestor / Magistrado Responsável</p>
                    <p className="text-[10px] text-gray-400 mt-2 font-sans">
                        {isDraft ? 'Pendente de Assinatura Digital' : 'Assinatura Digital - Token de Validação'}
                    </p>
                </div>
            </div>
        </BaseDocumentLayout>
    );
};

// --- 4. PORTARIA (ATO DE CONCESSÃO) ---
export const GrantActTemplate: React.FC<DocumentProps> = ({ data, user, document, comarcaData }) => {
    // Número da Portaria
    const portariaNum = document?.metadata?.doc_number || Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const year = new Date().getFullYear();
    const dateLocation = getFormattedDate('Belém'); 
    
    // Elemento de Despesa (Enriched Data)
    const elementCode = data.elementCode || '3.3.90.30.99';
    const elementDesc = data.elementDesc || 'Despesas Variáveis';

    // Resolve conta bancária (Júri→Comarca, Emergencial→Suprido)
    const bankInfo = getBankInfo(data, user, comarcaData);

    // Cálculo de Prazos (Regra: Emissão da Portaria -> Fim do Evento + 15 dias)
    // 1. Data de Início = Data de Emissão da Portaria
    const emissionDate = document?.created_at ? new Date(document.created_at) : new Date();
    
    // 2. Data Final = Data Fim do Evento (do formulário) + 15 dias
    // Parsing manual para evitar problemas de timezone com strings 'YYYY-MM-DD'
    let eventEnd = new Date();
    if (data.event_end_date) {
        const [y, m, d] = data.event_end_date.split('-').map(Number);
        eventEnd = new Date(y, m - 1, d); // Mês é 0-indexed
    }
    
    const deadlineDate = new Date(eventEnd);
    deadlineDate.setDate(deadlineDate.getDate() + 15);

    const periodString = `${emissionDate.toLocaleDateString('pt-BR')} até ${deadlineDate.toLocaleDateString('pt-BR')}`;

    return (
        <BaseDocumentLayout docId={`PORT-${portariaNum}-${year}`}>
            <div className="mb-12">
                <h2 className="text-2xl font-bold uppercase text-slate-900">PORTARIA SF Nº {portariaNum} /{year}-SEPLAN/TJE</h2>
            </div>

            <div className="text-justify text-base leading-loose font-serif space-y-6">
                <p>
                    Secretário de Planejamento, Coordenação e Finanças do Tribunal de Justiça do Estado do Pará, no exercício das suas atribuições, estabelecidas na Portaria nº XXXX/{year}-GP,
                </p>

                <h3 className="font-bold uppercase my-4 text-lg">RESOLVE:</h3>

                <p>
                    <strong>Art. 1º</strong> AUTORIZAR a concessão de Suprimento de Fundos ao servidor <strong>{user.full_name?.toUpperCase()}</strong>, portador do CPF <strong>{user.cpf || '000.000.000-00'}</strong>, lotado na <strong>{user.lotacao?.toUpperCase() || 'UNIDADE JUDICIÁRIA'}</strong>.
                </p>

                <p>
                    <strong>Art. 2º</strong> O valor total do presente Suprimento de Fundos é de <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.value)}</strong>, e deverá atender às despesas miúdas de pronto pagamento e ser creditado na conta corrente, abaixo:
                </p>

                <div className="pl-8 py-3 text-sm border-l-4 border-slate-300 bg-slate-50 rounded-r">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{bankInfo.label}</p>
                    Dados bancários para crédito: Banco <strong>{bankInfo.banco}</strong>, Agência <strong>{bankInfo.agencia}</strong>, Conta Corrente <strong>{bankInfo.conta_corrente}</strong>.
                </div>

                <p>
                    <strong>Art. 3º</strong> A despesa a que se refere o item anterior ocorrerá por conta de recursos próprios do Tribunal de Justiça do Estado - TJE/PA e terá a classificação PTRES <strong>8727</strong> e Dotação <strong>162</strong>, nos seguintes elementos:
                </p>

                <div className="border border-red-500 p-4 font-bold text-lg text-center my-4 uppercase bg-white">
                    I – {elementCode} – {elementDesc}: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.value)}
                </div>

                <p>
                    <strong>Art. 4º</strong> A aplicação e a prestação de contas do valor referido no Artigo 2º desta Portaria deverão ser realizadas no seguinte prazo:
                </p>

                <div className="border border-red-500 p-4 font-bold text-center my-4 bg-white text-lg">
                    Parágrafo único – Prazo de Aplicação e Prestação de Contas:<br/>
                    {periodString}.
                </div>

                <p>
                    <strong>Registre-se e Cumpra-se.</strong>
                </p>
                
                <p>{dateLocation}.</p>
            </div>

            <div className="mt-24 text-center">
                <div className="inline-block border-t border-black pt-4 px-12">
                    <p className="font-bold text-gray-900 uppercase">Ordenador de Despesa</p>
                    <p className="text-sm text-gray-600">Secretaria de Planejamento, Coordenação e Finanças</p>
                </div>
            </div>
        </BaseDocumentLayout>
    );
};

// --- 5. CERTIDÃO DE REGULARIDADE ---
export const RegularityCertificateTemplate: React.FC<DocumentProps> = ({ data, user, document }) => {
    const certNum = document?.metadata?.doc_number || Math.floor(Math.random() * 9000).toString();
    const year = new Date().getFullYear();
    const dateLocation = getFormattedDate('Belém');

    return (
        <BaseDocumentLayout docId={`REG-${certNum}-${year}`}>
            <div className="text-center mb-8">
                <h2 className="text-3xl font-serif text-slate-900 tracking-wide uppercase font-medium">CERTIDÃO DE REGULARIDADE</h2>
                <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">CERTIDAO_REGULARIDADE</p>
            </div>

            <div className="text-center mb-12">
                <h3 className="text-2xl font-bold font-serif">CERTIDÃO Nº <span className="text-3xl">{certNum}</span> /{year}-SOSFU/TJE</h3>
            </div>

            <div className="text-justify text-lg leading-loose font-serif space-y-8 px-4">
                <p>
                    CERTIFICO, para os devidos fins, que consultadas as bases de dados do Sistema de Suprimento de Fundos (SISUP) do Tribunal de Justiça do Estado do Pará, foi verificado que o(a) servidor(a) <strong>{user.full_name?.toUpperCase()}</strong>, lotado(a) na <strong>{user.lotacao?.toUpperCase() || 'UNIDADE JUDICIÁRIA'}</strong>, encontra-se <span className="font-bold text-green-700">REGULAR</span> perante este Tribunal, no tocante a prestações de contas de suprimentos de fundos anteriormente concedidos.
                </p>

                <p>
                    Assim, não há impedimentos para a concessão de novo suprimento de fundos ao(à) referido(a) servidor(a), conforme solicitado no processo <strong>{data.process_number}</strong>, no valor de <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.value)}</strong>.
                </p>

                <p>
                    A presente certidão é expedida com base nas informações constantes nos sistemas de controle interno, não se responsabilizando este órgão por eventuais omissões de informações não registradas nos referidos sistemas, nos termos da Resolução CNJ nº 169/2013.
                </p>
            </div>

            <div className="mt-12 mx-4 border border-slate-200 bg-slate-50 p-6 rounded-lg">
                <p className="text-xs font-bold uppercase text-slate-500 mb-1">VALIDADE DA CERTIDÃO</p>
                <p className="text-sm text-slate-700">Esta certidão tem validade de <strong>30 (trinta) dias</strong> a contar da data de sua emissão.</p>
            </div>

            <div className="mt-12 text-right px-4 font-serif text-slate-800">
                {dateLocation}.
            </div>

            <div className="mt-20 text-center">
                <div className="inline-block border-t border-black pt-4 px-12">
                    <p className="font-bold text-gray-900 uppercase">Ordenador de Despesa</p>
                    <p className="text-sm text-gray-600">Secretaria de Planejamento, Coordenação e Finanças</p>
                </div>
            </div>
            
            <div className="mt-16 text-center text-[10px] text-gray-400 italic">
                Documento gerado eletronicamente pelo Sistema SISUP.<br/>
                A autenticidade pode ser verificada através do ID: {data.id.split('-')[0]}-AUTH
            </div>
        </BaseDocumentLayout>
    );
};

// --- 6. NOTA DE EMPENHO ---
export const CommitmentNoteTemplate: React.FC<DocumentProps> = ({ data, user, document, comarcaData }) => {
    const neNum = document?.metadata?.doc_number || Math.floor(Math.random() * 100000).toString();
    const year = new Date().getFullYear();
    const dateLocation = getFormattedDate('Belém');
    // Classificação Orçamentária Simulada ou Enriched
    const elementCode = data.elementCode || '3.3.90.30.99';

    // Resolve conta bancária (Júri→Comarca, Emergencial→Suprido)
    const bankInfo = getBankInfo(data, user, comarcaData);

    return (
        <BaseDocumentLayout docId={`NE-${neNum}/${year}`}>
            <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4">
                <div>
                    <h2 className="text-2xl font-bold uppercase">NOTA DE EMPENHO</h2>
                    <p className="text-sm font-mono">NE Nº {year}NE{neNum.padStart(6, '0')}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold uppercase">Tipo de Empenho</p>
                    <p className="text-lg">ORDINÁRIO / ESTIMATIVO</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm font-sans mb-8">
                <div className="border p-4">
                    <p className="font-bold text-xs text-gray-500 uppercase">Unidade Gestora</p>
                    <p>040001 - TRIBUNAL DE JUSTIÇA DO ESTADO</p>
                </div>
                <div className="border p-4">
                    <p className="font-bold text-xs text-gray-500 uppercase">Gestão</p>
                    <p>00001 - TESOURO ESTADUAL</p>
                </div>
            </div>

            <div className="mb-8 font-sans">
                <h3 className="font-bold bg-gray-100 p-2 text-sm uppercase mb-2">Classificação da Despesa</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                        <p className="font-bold text-xs text-gray-500">Programa de Trabalho</p>
                        <p>02.122.0001.2001</p>
                    </div>
                    <div>
                        <p className="font-bold text-xs text-gray-500">Natureza da Despesa</p>
                        <p>{elementCode}</p>
                    </div>
                    <div>
                        <p className="font-bold text-xs text-gray-500">Fonte de Recursos</p>
                        <p>0101000000</p>
                    </div>
                </div>
            </div>

            <div className="mb-8 font-sans">
                <h3 className="font-bold bg-gray-100 p-2 text-sm uppercase mb-2">Credor / Favorecido</h3>
                <p className="text-lg font-bold">{data.beneficiary.toUpperCase()}</p>
                <p className="text-sm">CPF: {user.cpf || '000.000.000-00'}</p>
                <p className="text-sm">
                    <span className="text-[10px] text-gray-400 uppercase font-bold mr-1">[{bankInfo.label}]</span>
                    Banco: {bankInfo.banco} | Ag: {bankInfo.agencia} | CC: {bankInfo.conta_corrente}
                </p>
            </div>

            <div className="mb-12 font-sans border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-sm font-bold uppercase">Valor do Empenho</p>
                    <p className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.value)}</p>
                </div>
                <p className="text-justify text-sm italic">
                    Histórico: Valor que se empenha para atender despesas com suprimento de fundos, conforme Portaria de Concessão anexa aos autos do processo {data.process_number}.
                </p>
            </div>

            <div className="mt-auto text-center">
                <p className="text-sm mb-12">{dateLocation}</p>
                <div className="grid grid-cols-2 gap-12">
                    <div className="border-t border-black pt-2">
                        <p className="font-bold text-xs uppercase">Emitido Por</p>
                        <p className="text-xs">Sistema SIAFE/TJPA</p>
                    </div>
                    <div className="border-t border-black pt-2">
                        <p className="font-bold text-xs uppercase">Ordenador de Despesa</p>
                        <p className="text-xs">Assinatura Digital</p>
                    </div>
                </div>
            </div>
        </BaseDocumentLayout>
    );
};


// --- 7. NOTA DE LIQUIDAÇÃO ---
export const LiquidationNoteTemplate: React.FC<DocumentProps> = ({ data, user, document }) => {
    const nlNum = document?.metadata?.doc_number || Math.floor(Math.random() * 100000).toString();
    const year = new Date().getFullYear();
    const dateLocation = getFormattedDate('Belém');

    return (
        <BaseDocumentLayout docId={`NL-${nlNum}/${year}`}>
            <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4">
                <div>
                    <h2 className="text-2xl font-bold uppercase">NOTA DE LIQUIDAÇÃO</h2>
                    <p className="text-sm font-mono">NL Nº {year}NL{nlNum.padStart(6, '0')}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold uppercase">Status</p>
                    <p className="text-lg text-green-700 font-bold">LIQUIDADO</p>
                </div>
            </div>

            <div className="space-y-6 font-sans text-sm">
                <div className="bg-gray-50 p-4 rounded border">
                    <p className="font-bold text-xs text-gray-500">Referência Nota de Empenho</p>
                    <p className="text-lg font-mono">{year}NE{Math.floor(Math.random() * 100000).toString().padStart(6, '0')}</p>
                </div>

                <div>
                    <h3 className="font-bold border-b pb-1 mb-2">DADOS DO FAVORECIDO</h3>
                    <p><strong>Nome:</strong> {data.beneficiary.toUpperCase()}</p>
                    <p><strong>CPF:</strong> {user.cpf}</p>
                </div>

                <div>
                    <h3 className="font-bold border-b pb-1 mb-2">VALORES</h3>
                    <div className="flex justify-between items-center py-2 border-b border-dashed">
                        <span>Valor Bruto</span>
                        <span className="font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.value)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-dashed">
                        <span>Descontos / Retenções</span>
                        <span>R$ 0,00</span>
                    </div>
                    <div className="flex justify-between items-center py-2 text-lg font-bold bg-gray-100 px-2 mt-2">
                        <span>Valor Líquido a Pagar</span>
                        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.value)}</span>
                    </div>
                </div>

                <div className="pt-8 text-justify">
                    <p className="mb-4">
                        Atesto, para os devidos fins, que os serviços foram prestados e/ou os materiais foram entregues, conforme documentação anexa ao Processo Administrativo nº {data.process_number}, estando a despesa em condições de pagamento.
                    </p>
                </div>
            </div>

            <div className="mt-20 text-center">
                <p className="text-sm mb-12">{dateLocation}</p>
                <div className="inline-block border-t border-black pt-4 px-12">
                    <p className="font-bold text-gray-900 uppercase">Responsável pela Liquidação</p>
                    <p className="text-xs text-gray-600">Setor de Contabilidade / SOSFU</p>
                </div>
            </div>
        </BaseDocumentLayout>
    );
};

// --- 8. ORDEM BANCÁRIA ---
export const BankOrderTemplate: React.FC<DocumentProps> = ({ data, user, document, comarcaData }) => {
    const obNum = document?.metadata?.doc_number || Math.floor(Math.random() * 100000).toString();
    const year = new Date().getFullYear();
    const dateLocation = getFormattedDate('Belém');

    // Resolve conta bancária (Júri→Comarca, Emergencial→Suprido)
    const bankInfo = getBankInfo(data, user, comarcaData);

    return (
        <BaseDocumentLayout docId={`OB-${obNum}/${year}`}>
            <div className="border-4 border-double border-gray-800 p-8 h-full flex flex-col">
                <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
                    <h2 className="text-3xl font-black uppercase tracking-widest">ORDEM BANCÁRIA</h2>
                    <p className="font-mono text-xl mt-2">{year}OB{obNum.padStart(6, '0')}</p>
                </div>

                <div className="flex-1 space-y-8 font-mono">
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="text-xs font-bold uppercase mb-1">Unidade Gestora Emitente</p>
                            <div className="border p-2 bg-gray-50">040001 - TJPA</div>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase mb-1">Data de Emissão</p>
                            <div className="border p-2 bg-gray-50">{new Date().toLocaleDateString()}</div>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-bold uppercase mb-1">Favorecido</p>
                        <div className="border p-2 bg-gray-50">
                            {data.beneficiary.toUpperCase()} <br/>
                            CPF: {user.cpf}
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-bold uppercase mb-1">Dados Bancários de Destino</p>
                        <div className="border p-2 bg-gray-50">
                            <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">{bankInfo.label}</p>
                            <div className="grid grid-cols-3 gap-4">
                                <div><span className="text-[10px] text-gray-500 block">BANCO</span>{bankInfo.banco}</div>
                                <div><span className="text-[10px] text-gray-500 block">AGÊNCIA</span>{bankInfo.agencia}</div>
                                <div><span className="text-[10px] text-gray-500 block">CONTA</span>{bankInfo.conta_corrente}</div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-bold uppercase mb-1">Valor do Pagamento</p>
                        <div className="border p-4 bg-gray-100 text-2xl font-bold text-right">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.value)}
                        </div>
                        <p className="text-xs text-right mt-1 italic">({data.value} reais)</p>
                    </div>

                    <div>
                        <p className="text-xs font-bold uppercase mb-1">Finalidade</p>
                        <div className="border p-2 text-sm">
                            Crédito de Suprimento de Fundos - Processo {data.process_number}
                        </div>
                    </div>
                </div>

                <div className="mt-12 flex justify-between items-end">
                    <div className="text-center w-1/3">
                        <div className="border-b border-black mb-2"></div>
                        <p className="text-xs font-bold">Gerente Financeiro</p>
                    </div>
                    <div className="text-center w-1/3">
                        <div className="border-b border-black mb-2"></div>
                        <p className="text-xs font-bold">Ordenador de Despesa</p>
                    </div>
                </div>
            </div>
        </BaseDocumentLayout>
    );
};


// --- DOCUMENTO GENÉRICO (NOVOS DOCS) ---
export const GenericDocumentTemplate: React.FC<DocumentProps> = ({ data, user, content, subType, document }) => {
    // Para documentos genéricos, o conteúdo vem de document.metadata.content se existir, ou do prop content
    const finalContent = document?.metadata?.content || content;
    const finalSubType = document?.metadata?.subType || subType;
    const dateLocation = getFormattedDate(user.municipio);

    return (
        <BaseDocumentLayout>
            <div className="text-center mb-10 border-b border-black pb-4">
                <h2 className="text-2xl font-bold uppercase">{finalSubType || 'DOCUMENTO DIVERSO'}</h2>
                <p className="text-sm text-gray-500 mt-1 uppercase">Ref. Processo: {data.process_number}</p>
            </div>

            <div className="w-full text-justify text-base leading-relaxed whitespace-pre-wrap font-serif min-h-[300px]">
                {finalContent || '(Documento sem conteúdo)'}
            </div>

            <div className="mt-20 text-center">
                <p className="font-medium mb-12">{dateLocation}.</p>
                <div className="inline-block border-t border-black pt-4 px-12">
                    <p className="font-bold text-gray-900 uppercase">{user.full_name}</p>
                    <p className="text-sm text-gray-700">{user.cargo || 'Servidor TJPA'}</p>
                </div>
            </div>
        </BaseDocumentLayout>
    );
};