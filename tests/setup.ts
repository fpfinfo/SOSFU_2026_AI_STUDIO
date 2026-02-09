import '@testing-library/jest-dom';

// Mock import.meta.env for tests
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_KEY: 'test-key',
    VITE_GEMINI_API_KEY: 'test-gemini-key',
    MODE: 'test',
    DEV: true,
    PROD: false,
  },
  writable: true,
});
