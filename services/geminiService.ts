
import { GoogleGenAI, Type } from "@google/genai";

// Corrigido para padrão Vite import.meta.env com objeto de configuração
const aiInstance = () => new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });

export const scanReceipt = async (base64Image: string) => {
  const ai = aiInstance();
  const model = 'gemini-3-flash-preview';
  
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
          },
        },
        {
          text: "Analise este recibo de despesa do Tribunal de Justiça. Extraia o valor total, a categoria (Alimentação, Transporte, Hospedagem, Outros), a data (YYYY-MM-DD) e o nome do estabelecimento. Retorne APENAS o JSON.",
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          amount: { type: Type.NUMBER, description: "O valor total da despesa." },
          category: { type: Type.STRING, description: "Categoria da despesa." },
          date: { type: Type.STRING, description: "Data no formato YYYY-MM-DD." },
          merchant: { type: Type.STRING, description: "Nome do estabelecimento." },
        },
        required: ["amount", "category", "date", "merchant"]
      }
    }
  });

  try {
    // Fix: Access response.text property directly (not a method)
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return null;
  }
};

/**
 * Realiza auditoria automática de despesas usando Gemini 3 Flash
 */
export const auditExpense = async (expense: { amount: string, category: string, merchant: string }) => {
  const ai = aiInstance();
  const model = 'gemini-3-flash-preview';
  
  const response = await ai.models.generateContent({
    model,
    contents: `Realize uma auditoria técnica de conformidade para esta despesa do Tribunal de Justiça:
    Estabelecimento: ${expense.merchant}
    Categoria: ${expense.category}
    Valor: R$ ${expense.amount}
    
    Analise se o valor está compatível com a categoria e se o estabelecimento parece legítimo para o serviço público.
    Retorne APENAS o JSON com os campos 'analysis' (texto curto explicativo) e 'status' ('Aprovado', 'Rejeitado' ou 'Atenção').`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis: { type: Type.STRING, description: "Análise curta da conformidade." },
          status: { type: Type.STRING, description: "Status: Aprovado, Rejeitado ou Atenção." },
        },
        required: ["analysis", "status"]
      }
    }
  });

  try {
    // Fix: Access response.text property directly
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Failed to parse audit response", e);
    return { analysis: "Erro ao processar auditoria automática.", status: "Atenção" };
  }
};

/**
 * Geração de documentos formais com Agent ÁGIL IA
 */
export const generateFormalDocument = async (prompt: string, context: any) => {
  const ai = aiInstance();
  const model = 'gemini-3-flash-preview';
  const fullPrompt = `Como um assistente jurídico inteligente do Tribunal de Justiça do Pará (Sistema ÁGIL), gere o conteúdo textual para um novo documento oficial para ser anexado ao dossiê.
  
  DADOS DO PROCESSO:
  NUP: ${context.nup}
  Tipo de Solicitação: ${context.title}
  Interessado: ${context.userProfile?.fullName}
  Lotação: ${context.userProfile?.unit}
  Valor do Pedido: R$ ${context.totalValue}
  
  SOLICITAÇÃO DO USUÁRIO: "${prompt}"
  
  REQUISITOS:
  1. Use linguagem jurídica formal e técnica.
  2. Siga o padrão de redação oficial (impessoalidade, clareza, concisão).
  3. Estruture o documento com Título, Referência e Texto.
  4. Retorne APENAS o texto do corpo do documento.
  5. Não inclua placeholders como "[Seu Nome]", use os nomes fornecidos no contexto quando apropriado.`;

  const response = await ai.models.generateContent({
    model,
    contents: fullPrompt,
  });

  return response.text;
};

/**
 * Edição de imagem usando Gemini 2.5 Flash Image
 */
export const editImageWithAi = async (base64Image: string, prompt: string) => {
  const ai = aiInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image,
            mimeType: 'image/jpeg',
          },
        },
        {
          text: prompt,
        },
      ],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return part.inlineData.data; // Retorna o base64 da imagem editada
    }
  }
  return null;
};

/**
 * Sugere o formulário correto com base no cenário descrito pelo usuário
 */
export const suggestForm = async (scenario: string) => {
  const ai = aiInstance();
  const model = 'gemini-3-flash-preview';
  
  const response = await ai.models.generateContent({
    model,
    contents: `Um servidor do Tribunal de Justiça descreveu a seguinte situação: "${scenario}". 
    Identifique qual é o formulário administrativo mais adequado entre: 'Extra-Emergencial', 'Extra-Júri', 'Diárias e Passagens' ou 'Ressarcimento'. 
    Retorne APENAS o JSON com 'formName' e uma 'explanation' curta do porquê.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          formName: { type: Type.STRING, description: "Nome do formulário sugerido." },
          explanation: { type: Type.STRING, description: "Breve explicação da escolha." },
        },
        required: ["formName", "explanation"]
      }
    }
  });

  try {
    // Fix: Access response.text property directly
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Failed to parse suggestion response", e);
    return null;
  }
};

export const generateJustification = async (details: string, category: string, merchant: string, type: string = 'Ressarcimento') => {
  const ai = aiInstance();
  const model = 'gemini-3-flash-preview';
  let contextPrompt = "";

  switch (type) {
    case 'Extra-Júri':
      contextPrompt = "Justificativa para custeio de alimentação de jurados e oficiais em sessão do Tribunal do Júri. Mencione o dever institucional de prover alimentação durante o isolamento do conselho de sentença.";
      break;
    case 'Extra-Emergencial':
      contextPrompt = "Justificativa para despesa emergencial imprevista. Enfatize a urgência e o risco de interrupção do serviço judiciário caso a despesa não seja realizada imediatamente.";
      break;
    case 'Diárias e Passagens':
      contextPrompt = "Justificativa para deslocamento a serviço (viagem institucional). Mencione a necessidade de participação em diligência, evento ou correição externa conforme designação superior.";
      break;
    default:
      contextPrompt = "Justificativa formal para ressarcimento de despesa realizada com recursos próprios em caráter excepcional.";
  }

  const prompt = `Como um servidor do Tribunal de Justiça do Pará, escreva uma justificativa formal, técnica e impessoal para uma solicitação de ${type}. 
  Contexto: ${contextPrompt}
  Dados do usuário: "${details}". 
  Estabelecimento/Item: ${merchant}.
  A justificativa deve seguir as normas de redação oficial, ser concisa e fundamentada na necessidade do serviço público.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  // Fix: Access response.text property directly
  return response.text;
};

/**
 * Geração de vídeo com Veo 3.1
 */
export const startVeoGeneration = async (imageB64: string | null, prompt: string, aspectRatio: '16:9' | '9:16' = '16:9') => {
  const ai = aiInstance();
  const generationParams: any = {
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio
    }
  };

  if (imageB64) {
    generationParams.image = {
      imageBytes: imageB64,
      mimeType: 'image/jpeg',
    };
  }

  return await ai.models.generateVideos(generationParams);
};

export const getVeoStatus = async (operation: any) => {
  const ai = aiInstance();
  return await ai.operations.getVideosOperation({ operation });
};

/**
 * Análise técnica automatizada do processo para o Analista SOSFU
 */
export const analyzeRequestProcess = async (context: any) => {
  const ai = aiInstance();
  const model = 'gemini-3-flash-preview';
  
  const prompt = `Como um Analista Sênior de Finanças (SOSFU) do Tribunal de Justiça do Pará, realize uma análise técnica minuciosa deste processo:
  
  DADOS DO PROCESSO:
  NUP: ${context.nup}
  Tipo: ${context.type}
  Solicitante: ${context.userProfile?.fullName}
  Justificativa do Usuário: "${context.justification}"
  Valor Total: R$ ${context.totalValue}
  Itens/Despesas: ${JSON.stringify(context.items)}
  
  REGRAS INSTITUCIONAIS:
  - Limite para despesa extraordinária (CNJ): R$ 15.000,00.
  - Verifique se os elementos de despesa estão corretos para o tipo de pedido.
  - Analise a coerência entre a justificativa e os itens solicitados.
  
  OBJETIVO:
  Forneça um parecer técnico fundamentado. 
  Retorne APENAS o JSON com:
  - 'conformityScore': 0 a 100
  - 'summary': resumo crítico de 2-3 parágrafos
  - 'recommendation': 'Aprovação', 'Ajuste Necessário' ou 'Rejeição'
  - 'checks': lista de pontos verificados (ex: [ { item: "Limite Galhardo", pass: true } ])`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          conformityScore: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          recommendation: { type: Type.STRING },
          checks: { 
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                item: { type: Type.STRING },
                pass: { type: Type.BOOLEAN }
              }
            }
          }
        },
        required: ["conformityScore", "summary", "recommendation", "checks"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Failed to parse process analysis response", e);
    return { 
      conformityScore: 0, 
      summary: "Erro ao realizar análise automatizada.", 
      recommendation: "Ajuste Necessário",
      checks: []
    };
  }
};
