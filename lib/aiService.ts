import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Centralized AI Service (OpenRouter Primary)
 * Switched to OpenRouter as primary provider per user request.
 */

// Production OpenRouter Key (Updated 2026-02-11)
const OPENROUTER_API_KEY = "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";
const DEFAULT_OPENROUTER_MODEL = "openrouter/pony-alpha"; // Can be swapped to "anthropic/claude-3-haiku" or "google/gemini-pro" via OpenRouter if needed
const FALLBACK_OPENROUTER_MODEL = "anthropic/claude-3-haiku";

// Gemini Configuration (Secondary/Fallback)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";

// Initialize Gemini Client
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

/**
 * Call OpenRouter with retry logic (Primary)
 */
async function callOpenRouter(messages: any[], model = DEFAULT_OPENROUTER_MODEL): Promise<string> {
    try {
        console.log(`[Sentinela IA] Orchestrator: Chamando OpenRouter (${model})...`);
        
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://sosfu.tjpa.jus.br",
                "X-Title": "SISUP TJPA",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData?.error?.message || `Erro HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content?.trim() || "";
    } catch (error: any) {
        console.error(`[Sentinela IA] Erro no OpenRouter (${model}):`, error);
        
        if (model === DEFAULT_OPENROUTER_MODEL) {
            console.warn("[Sentinela IA] Tentando fallback OpenRouter final com Claude 3 Haiku...");
            return callOpenRouter(messages, FALLBACK_OPENROUTER_MODEL);
        }
        
        throw error;
    }
}

/**
 * Call Gemini (Fallback)
 */
async function callGemini(prompt: string, systemInstruction?: string): Promise<string> {
    if (!genAI) {
        throw new Error("Gemini API Key não configurada.");
    }

    try {
        console.log(`[Sentinela IA] Fallback: Chamando Google Gemini (${DEFAULT_GEMINI_MODEL})...`);
        const model = genAI.getGenerativeModel({ 
            model: DEFAULT_GEMINI_MODEL,
            systemInstruction: systemInstruction ? { role: "system", parts: [{ text: systemInstruction }] } : undefined
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error: any) {
        console.error("[Sentinela IA] Erro no Gemini:", error);
        throw error;
    }
}

/**
 * Single prompt text generation
 */
export const generateText = async (prompt: string): Promise<string> => {
    try {
        // Tenta OpenRouter (Principal)
        return await callOpenRouter([{ role: "user", content: prompt }]);
    } catch (error) {
        console.warn("[Sentinela IA] Falha no OpenRouter, tentando fallback Gemini...");
        if (GEMINI_API_KEY) {
            return await callGemini(prompt, "Você é um assistente do Tribunal de Justiça do Pará.");
        }
        throw error;
    }
};

/**
 * Multi-part content generation
 */
export const generateWithParts = async (parts: any[]): Promise<string> => {
    // Combine parts into text for compatibility
    const content = parts.map(p => {
        if (typeof p === 'string') return p;
        if (p.text) return p.text;
        return "";
    }).join("\n");
    
    return generateText(content);
};

/**
 * Role-based generation (System + User)
 */
export const generateWithRole = async (prompt: string, systemPrompt = "Você é o Sentinela IA do TJPA, um assistente jurídico sênior focado em conformidade financeira."): Promise<string> => {
    try {
        // Tenta OpenRouter (Principal)
         return await callOpenRouter([
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
        ]);
    } catch (error) {
        console.warn("[Sentinela IA] Falha no OpenRouter, tentando fallback Gemini...");
        if (GEMINI_API_KEY) {
            return await callGemini(prompt, systemPrompt);
        }
        throw error;
    }
};

// Aliases for legacy compatibility
export const GEMINI_MODEL = DEFAULT_OPENROUTER_MODEL;
