import { GoogleGenAI } from '@google/genai';

/**
 * Centralized Gemini AI helper.
 * All components should use this instead of instantiating GoogleGenAI directly.
 */

const GEMINI_MODEL = 'gemini-2.0-flash';
const FALLBACK_MODEL = 'gemini-1.5-flash';

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

/** Create a GoogleGenAI instance */
export const getGeminiClient = (): GoogleGenAI => {
  return new GoogleGenAI({ apiKey: getApiKey() });
};

/** 
 * Wrapper to handle retries and fallback if quota is exhausted
 */
const callWithRetry = async (fn: (modelName: string) => Promise<any>, retries = 2): Promise<any> => {
  let lastError: any;
  
  // Try with Primary Model (2.0)
  for (let i = 0; i < retries; i++) {
    try {
      return await fn(GEMINI_MODEL);
    } catch (error: any) {
      lastError = error;
      const isQuotaError = error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED';
      
      if (isQuotaError && i < retries - 1) {
        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      break;
    }
  }

  // If failed with 2.0, try Fallback Model (1.5)
  try {
    console.warn(`[Gemini] Falling back to ${FALLBACK_MODEL} due to 2.0 quota exhaustion.`);
    const result = await fn(FALLBACK_MODEL);
    return result;
  } catch (error: any) {
    throw lastError || error;
  }
};

/** Generate text content using Gemini */
export const generateText = async (prompt: string): Promise<string> => {
  const ai = getGeminiClient();
  const response = await callWithRetry((model) => 
    ai.models.generateContent({
      model: model,
      contents: prompt,
    })
  );
  return response.text?.trim() || '';
};

/** Generate content with structured parts (e.g., image + text for OCR) */
export const generateWithParts = async (
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>
): Promise<string> => {
  const ai = getGeminiClient();
  const result = await callWithRetry((model) => 
    (ai as any).models.generateContent({
      model: model,
      contents: { parts },
    })
  );

  const text = result.text || result.response?.text?.() || result.response?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text?.trim() || '';
};

/** Generate content with role-based message format */
export const generateWithRole = async (prompt: string): Promise<string> => {
  const ai = getGeminiClient();
  const result = await callWithRetry((model) => 
    (ai as any).models.generateContent({
      model: model,
      contents: {
        role: 'user',
        parts: [{ text: prompt }],
      },
    })
  );

  const text = result.text || result.response?.text?.() || result.response?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text?.trim() || '';
};

export { GEMINI_MODEL };
