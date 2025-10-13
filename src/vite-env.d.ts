// This file provides TypeScript definitions for Vite's `import.meta.env` feature.
// It tells TypeScript about the environment variables exposed by Vite, resolving 
// type errors in files like `src/services/dbService.ts`.

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
