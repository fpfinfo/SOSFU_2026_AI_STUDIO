import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Centralized Gemini AI helper (Official SDK: @google/generative-ai)
 * All components should use this instead of instantiating GoogleGenerativeAI directly.
 */

// Use 1.5-flash as primary for OCR/Document tasks - highly stable
const GEMINI_MODEL = 'gemini-1.5-flash';
// 1.5-flash-8b is even faster and has higher limits, perfect for simple OCR
const RESILIENT_MODEL = 'gemini-1.5-flash-8b';
const FALLBACK_MODEL = 'gemini-2.0-flash'; 

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
  // Ordered sequence for maximum resilience: Standard Flash -> High-Quota Flash -> New Flash
  const models = [GEMINI_MODEL, RESILIENT_MODEL, FALLBACK_MODEL];
  
  for (const modelName of models) {
    for (let i = 0; i < retries; i++) {
        try {
          console.log(`[Gemini] Attempting ${modelName} (Try ${i + 1})...`);
          return await fn(modelName);
        } catch (error: any) {
          lastError = error;
          const errorMsg = error?.message || '';
          const isQuotaError = errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED');
          const isNotFoundError = errorMsg.includes('404') || errorMsg.includes('not found');
          
          if (isQuotaError && i < retries - 1) {
            console.warn(`[Gemini] Quota hit for ${modelName}, retrying in 2s...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }

          if (isNotFoundError) {
              console.warn(`[Gemini] Model ${modelName} not found or unsupported. Trying next...`);
              break; // Try next model immediately
          }

          if (isQuotaError) {
              console.warn(`[Gemini] Quota exhausted for ${modelName}. Trying next model...`);
              break; // Try next model
          }

          // Other errors (400, 500 etc) - try next model
          console.error(`[Gemini] Error with ${modelName}:`, errorMsg);
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
