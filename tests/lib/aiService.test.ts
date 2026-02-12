import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Must import after mocking
import { generateText, generateWithRole, generateWithParts } from '../../lib/aiService';

describe('aiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateText', () => {
    it('should call OpenRouter API and return generated text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '  Resposta gerada  ' } }],
        }),
      });

      const result = await generateText('Analise este processo');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toBe('Resposta gerada');
    });

    it('should trim whitespace from response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '\n  Texto com espacos  \n' } }],
        }),
      });

      const result = await generateText('prompt');
      expect(result).toBe('Texto com espacos');
    });

    it('should throw error on HTTP failure and no fallback', async () => {
      // Primary model fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'Rate limited' } }),
      });
      // Fallback model also fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'Rate limited again' } }),
      });

      await expect(generateText('prompt')).rejects.toThrow();
    });

    it('should retry with fallback model on first failure', async () => {
      // Primary fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'Service unavailable' } }),
      });
      // Fallback succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Fallback response' } }],
        }),
      });

      const result = await generateText('prompt');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toBe('Fallback response');
    });
  });

  describe('generateWithRole', () => {
    it('should include system prompt in messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Resposta com role' } }],
        }),
      });

      await generateWithRole('Analise', 'Voce e um assistente juridico.');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages).toHaveLength(2);
      expect(callBody.messages[0].role).toBe('system');
      expect(callBody.messages[0].content).toBe('Voce e um assistente juridico.');
      expect(callBody.messages[1].role).toBe('user');
    });

    it('should use default system prompt when none provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Ok' } }],
        }),
      });

      await generateWithRole('prompt');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages[0].content).toContain('Sentinela IA');
    });
  });

  describe('generateWithParts', () => {
    it('should combine string parts into single prompt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Combined result' } }],
        }),
      });

      const result = await generateWithParts(['Parte 1', 'Parte 2']);
      expect(result).toBe('Combined result');
    });

    it('should handle text objects', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Object result' } }],
        }),
      });

      const result = await generateWithParts([{ text: 'Texto A' }, { text: 'Texto B' }]);
      expect(result).toBe('Object result');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages[0].content).toContain('Texto A');
      expect(callBody.messages[0].content).toContain('Texto B');
    });
  });
});
