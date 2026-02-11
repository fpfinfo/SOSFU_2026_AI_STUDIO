/**
 * Centralized AI Service (OpenRouter Unified Gateway)
 * Matches the TJPA premium institutional tone.
 */

const OPENROUTER_API_KEY = "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";
const DEFAULT_MODEL = "openrouter/pony-alpha";
const FALLBACK_MODEL = "anthropic/claude-3-haiku";

/**
 * Call OpenRouter with retry logic
 */
async function callOpenRouter(messages: any[], model = DEFAULT_MODEL): Promise<string> {
    try {
        console.log(`[Sentinela IA] Orchestrator: Chamando OpenRouter (${model})...`);
        
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://sosfu.tjpa.jus.br", // Institutional referer
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
        
        // Se falhou no modelo principal e não é o fallback, tenta o fallback
        if (model === DEFAULT_MODEL) {
            console.warn("[Sentinela IA] Tentando fallback com Claude 3 Haiku...");
            return callOpenRouter(messages, FALLBACK_MODEL);
        }
        
        throw error;
    }
}

/**
 * Single prompt text generation
 */
export const generateText = async (prompt: string): Promise<string> => {
    return callOpenRouter([{ role: "user", content: prompt }]);
};

/**
 * Multi-part content generation (handled as joined text or structured content)
 */
export const generateWithParts = async (parts: any[]): Promise<string> => {
    const content = parts.map(p => {
        if (typeof p === 'string') return p;
        if (p.text) return p.text;
        // In case of inlineData (Gemini format for images), we might need more logic
        // for now, let's focus on text
        return "";
    }).join("\n");
    
    return callOpenRouter([{ role: "user", content: content }]);
};

/**
 * Role-based generation (System + User)
 */
export const generateWithRole = async (prompt: string, systemPrompt = "Você é o Sentinela IA do TJPA, um assistente jurídico sênior focado em conformidade financeira."): Promise<string> => {
    return callOpenRouter([
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
    ]);
};

// Aliases for legacy compatibility during migration
export const GEMINI_MODEL = DEFAULT_MODEL;
