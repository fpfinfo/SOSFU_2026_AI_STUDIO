import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Centralized Gemini AI helper (Official SDK: @google/generative-ai)
 */

// Use stable, well-known internal model names
const PRIMARY_MODEL = 'gemini-1.5-flash';
const SECONDARY_MODEL = 'gemini-1.5-flash-latest';
const TERTIARY_MODEL = 'gemini-2.0-flash-exp'; // Try experimental 2.0 as last resort

/** Get the API key from Vite environment */
const getApiKey = (): string => {
  const env = (import.meta as any).env;
  const key = env.VITE_GEMINI_API_KEY || env.VITE_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '');
  
  if (!key) {
    throw new Error('⚠️ Chave API não encontrada. Verifique o seu arquivo .env e reinicie o servidor.');
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
          console.log(`[Sentinela IA] Orchestrator: Tentando ${modelName}...`);
          return await fn(modelName);
        } catch (error: any) {
          lastError = error;
          const errorMsg = error?.message?.toLowerCase() || '';
          
          // Se o modelo não for encontrado (404), pula pro próximo imediatamente
          if (errorMsg.includes('404') || errorMsg.includes('not found')) {
            console.warn(`[Sentinela IA] Modelo ${modelName} não disponível. Pulando...`);
            break; 
          }

          // Se for erro de quota (429), tenta o próximo modelo
          if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('resource_exhausted')) {
            console.warn(`[Sentinela IA] Cota atingida para ${modelName}. Tentando alternativa...`);
            break; 
          }

          // Outros erros: faz um retry curto no mesmo modelo
          if (i < retries - 1) {
            console.log(`[Sentinela IA] Erro temporário em ${modelName}. Re-tentando em 1s...`);
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
          break;
        }
    }
  }

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
