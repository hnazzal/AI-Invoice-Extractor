// FIX: Add reference to vite/client to provide types for import.meta.env.
// This resolves the "Property 'env' does not exist on type 'ImportMeta'" error
// in other files like `src/services/dbService.ts`.
/// <reference types="vite/client" />
