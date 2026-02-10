import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Centralized Gemini AI helper (Official SDK: @google/generative-ai)
 */

// We prioritize 1.5-flash because it has a massive daily limit (1500 requests/day free)
const PRIMARY_MODEL = 'gemini-1.5-flash';
const SECONDARY_MODEL = 'gemini-1.5-flash-002'; // Specific version often has separate quota
const TERTIARY_MODEL = 'gemini-1.5-flash-8b';

/** Get the API key from Vite environment */
const getApiKey = (): string => {
  const env = (import.meta as any).env;
  const key = env.VITE_GEMINI_API_KEY || env.VITE_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '');
  
  if (!key) {
    throw new Error('⚠️ Chave API não encontrada. Reinicie o servidor após configurar o .env.');
  }
  return key;
};

export const getGeminiClient = (): GoogleGenerativeAI => {
  return new GoogleGenerativeAI(getApiKey());
};

const callWithRetry = async (fn: (modelName: string) => Promise<any>, retries = 2): Promise<any> => {
  let lastError: any;
  const models = [PRIMARY_MODEL, SECONDARY_MODEL, TERTIARY_MODEL];
  
  for (const modelName of models) {
    for (let i = 0; i < retries; i++) {
        try {
          console.log(`[Sentinela IA] Tentando modelo: ${modelName} (Tentativa ${i + 1})`);
          return await fn(modelName);
        } catch (error: any) {
          lastError = error;
          const errorMsg = error?.message || '';
          
          // Se for erro de quota (429), tenta o próximo modelo imediatamente
          if (errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
            console.warn(`[Sentinela IA] Cota excedida para ${modelName}. Pulando para o próximo...`);
            break; 
          }

          // Para outros erros, espera um pouco e tenta de novo o mesmo modelo
          if (i < retries - 1) {
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
          break;
        }
    }
  }

  // Se chegar aqui, todos falharam. Mostra o erro do primeiro modelo que é o principal
  throw lastError;
};

export const generateText = async (prompt: string): Promise<string> => {
  const genAI = getGeminiClient();
  const response = await callWithRetry(async (modelName) => {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    return result.response;
  });
  return response.text()?.trim() || '';
};

export const generateWithParts = async (parts: any[]): Promise<string> => {
  const genAI = getGeminiClient();
  const response = await callWithRetry(async (modelName) => {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
    return result.response;
  });
  return response.text()?.trim() || '';
};

export const generateWithRole = async (prompt: string): Promise<string> => {
  const genAI = getGeminiClient();
  const response = await callWithRetry(async (modelName) => {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    return result.response;
  });
  return response.text()?.trim() || '';
};

export { PRIMARY_MODEL as GEMINI_MODEL };
