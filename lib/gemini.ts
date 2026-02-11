/**
 * Legacy Gemini Bridge (Proxying to aiService.ts)
 * This allows all existing code to use OpenRouter without changing every import.
 */
import * as aiService from './aiService';

export const generateText = aiService.generateText;
export const generateWithParts = aiService.generateWithParts;
export const generateWithRole = aiService.generateWithRole;
export const GEMINI_MODEL = aiService.GEMINI_MODEL;

// Re-export the client getter just in case (though it won't be used for actual generation)
export const getGeminiClient = () => {
    console.warn("getGeminiClient called in OpenRouter mode. Returning null.");
    return null;
};
