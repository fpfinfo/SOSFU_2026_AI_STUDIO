import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Centralized Gemini AI helper (Official SDK: @google/generative-ai)
 * All components should use this instead of instantiating GoogleGenerativeAI directly.
 */

// Use 1.5-flash as primary for OCR/Document tasks as it has higher free tier limits (15 RPM)
const GEMINI_MODEL = 'gemini-1.5-flash';
const FALLBACK_MODEL = 'gemini-1.5-pro'; // Try Pro if Flash fails or for higher quality

/** Get the API key from Vite environment */
const getApiKey = (): string => {
  const env = (import.meta as any).env;
  const key = env.VITE_GEMINI_API_KEY || env.VITE_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '');
  
  if (!key) {
    throw new Error(
      '⚠️ Chave da IA não encontrada. Verifique se VITE_GEMINI_API_KEY está definida no seu arquivo .env e REINICIE o servidor (npm run dev).'
    );
  }
  return key;
};

/** Create a GoogleGenerativeAI instance */
export const getGeminiClient = (): GoogleGenerativeAI => {
  return new GoogleGenerativeAI(getApiKey());
};

/** 
 * Wrapper to handle retries and fallback if quota is exhausted
 */
const callWithRetry = async (fn: (modelName: string) => Promise<any>, retries = 2): Promise<any> => {
  let lastError: any;
  const models = [GEMINI_MODEL, 'gemini-2.0-flash', FALLBACK_MODEL];
  
  for (const modelName of models) {
    for (let i = 0; i < retries; i++) {
        try {
          return await fn(modelName);
        } catch (error: any) {
          lastError = error;
          const isQuotaError = error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED';
          
          if (isQuotaError && i < retries - 1) {
            // Wait 2 seconds before retry on the same model
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          // If it's not a quota error or we're out of retries for this model, try next model
          break;
        }
    }
  }

  throw lastError;
};

/** Generate text content using Gemini */
export const generateText = async (prompt: string): Promise<string> => {
  const genAI = getGeminiClient();
  const response = await callWithRetry(async (modelName) => {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    return result.response;
  });
  return response.text()?.trim() || '';
};

/** Generate content with structured parts (e.g., image + text for OCR) */
export const generateWithParts = async (
  parts: any[]
): Promise<string> => {
  const genAI = getGeminiClient();
  const response = await callWithRetry(async (modelName) => {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
    return result.response;
  });

  return response.text()?.trim() || '';
};

/** Generate content with role-based message format */
export const generateWithRole = async (prompt: string): Promise<string> => {
  const genAI = getGeminiClient();
  const response = await callWithRetry(async (modelName) => {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    return result.response;
  });

  return response.text()?.trim() || '';
};

export { GEMINI_MODEL };
