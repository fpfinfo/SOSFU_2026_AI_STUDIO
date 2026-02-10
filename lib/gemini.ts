import { GoogleGenAI } from '@google/genai';

/**
 * Centralized Gemini AI helper.
 * All components should use this instead of instantiating GoogleGenAI directly.
 * The API key is read from import.meta.env.VITE_GEMINI_API_KEY (Vite standard).
 */

const GEMINI_MODEL = 'gemini-2.0-flash';

/** Get the API key from Vite environment */
const getApiKey = (): string => {
  const key = (import.meta as any).env.VITE_GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      '⚠️ VITE_GEMINI_API_KEY não configurada. Adicione ao .env e reinicie o servidor.'
    );
  }
  return key;
};

/** Create a GoogleGenAI instance */
export const getGeminiClient = (): GoogleGenAI => {
  return new GoogleGenAI({ apiKey: getApiKey() });
};

/** Generate text content using Gemini */
export const generateText = async (prompt: string): Promise<string> => {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  });
  return response.text?.trim() || '';
};

/** Generate content with structured parts (e.g., image + text for OCR) */
export const generateWithParts = async (
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>
): Promise<string> => {
  const ai = getGeminiClient();
  const result = await (ai as any).models.generateContent({
    model: GEMINI_MODEL,
    contents: { parts },
  });

  // Handle multiple response patterns from the SDK
  const text = result.text || result.response?.text?.() || result.response?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text?.trim() || '';
};

/** Generate content with role-based message format */
export const generateWithRole = async (prompt: string): Promise<string> => {
  const ai = getGeminiClient();
  const result = await (ai as any).models.generateContent({
    model: GEMINI_MODEL,
    contents: {
      role: 'user',
      parts: [{ text: prompt }],
    },
  });

  const text = result.text || result.response?.text?.() || result.response?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text?.trim() || '';
};

export { GEMINI_MODEL };
