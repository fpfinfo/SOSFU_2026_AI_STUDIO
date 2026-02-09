import { describe, it, expect, vi } from 'vitest';

// Mock the @google/genai module
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn().mockResolvedValue({
        text: 'Resposta mockada da IA',
      }),
    },
  })),
}));

describe('lib/gemini', () => {
  it('should export generateText function', async () => {
    const { generateText } = await import('../../lib/gemini');
    expect(typeof generateText).toBe('function');
  });

  it('should export generateFromImage function', async () => {
    const { generateFromImage } = await import('../../lib/gemini');
    expect(typeof generateFromImage).toBe('function');
  });

  it('generateText should return trimmed text', async () => {
    const { generateText } = await import('../../lib/gemini');
    const result = await generateText({ prompt: 'Teste' });
    expect(result).toBe('Resposta mockada da IA');
  });

  it('generateFromImage should return trimmed text', async () => {
    const { generateFromImage } = await import('../../lib/gemini');
    const result = await generateFromImage({
      prompt: 'Analise esta imagem',
      imageBase64: 'base64data',
      mimeType: 'image/png',
    });
    expect(result).toBe('Resposta mockada da IA');
  });
});
