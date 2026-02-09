/**
 * Serviço centralizado para chamadas à API Google Gemini.
 *
 * IMPORTANTE - SEGURANÇA:
 * Em produção, estas chamadas devem ser feitas via backend (Supabase Edge Function
 * ou Vercel API Route) para evitar exposição da API key no client-side.
 *
 * TODO: Migrar para Supabase Edge Function:
 *   supabase functions new gemini-proxy
 *   supabase functions deploy gemini-proxy
 */
import { GoogleGenAI } from '@google/genai';

function getGeminiApiKey(): string {
  const key =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.API_KEY) ||
    '';
  return key as string;
}

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY não configurada. Adicione VITE_GEMINI_API_KEY ao arquivo .env e reinicie o servidor.'
    );
  }
  if (!_client) {
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

export interface GeminiTextRequest {
  prompt: string;
  model?: string;
}

export interface GeminiVisionRequest {
  prompt: string;
  imageBase64: string;
  mimeType?: string;
  model?: string;
}

/**
 * Gera conteúdo textual via Gemini.
 */
export async function generateText({
  prompt,
  model = 'gemini-2.0-flash',
}: GeminiTextRequest): Promise<string> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });
  return response.text?.trim() ?? '';
}

/**
 * Gera conteúdo a partir de imagem (OCR, análise de comprovantes, etc).
 */
export async function generateFromImage({
  prompt,
  imageBase64,
  mimeType = 'image/jpeg',
  model = 'gemini-2.0-flash',
}: GeminiVisionRequest): Promise<string> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { data: imageBase64, mimeType } },
        ],
      },
    ],
  });
  return response.text?.trim() ?? '';
}
