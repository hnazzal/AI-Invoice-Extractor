// This file provides TypeScript definitions for Vite's `import.meta.env` feature.
// The original `/// <reference types="vite/client" />` was failing, likely due to a
// project setup issue. This manual definition achieves the same goal: it tells
// TypeScript about the environment variables exposed by Vite, resolving type errors
// in files like `src/services/dbService.ts`.

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
