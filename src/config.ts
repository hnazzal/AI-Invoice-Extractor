// This file centralizes access to environment variables in the most robust way possible,
// preventing the application from crashing if Vite's `import.meta.env` is not available
// at the moment the script is loaded.

let SUPABASE_URL: string | undefined;
let SUPABASE_ANON_KEY: string | undefined;
let API_KEY: string | undefined;

try {
  // This try-catch block is the ultimate safeguard. If `import.meta.env` is
  // inaccessible for any reason (e.g., non-Vite environment, build issue),
  // the app will not crash.
  SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  API_KEY = import.meta.env.VITE_API_KEY;
} catch (error) {
  console.warn(
    'Could not read environment variables from import.meta.env.',
    'This is expected in some environments. The app will fall back to the configuration error screen.',
    error
  );
}

export const config = {
  supabaseUrl: SUPABASE_URL,
  supabaseAnonKey: SUPABASE_ANON_KEY,
  apiKey: API_KEY,
};

// Export individual flags for checking configuration status throughout the app.
export const isDbConfigured = !!config.supabaseUrl && !!config.supabaseAnonKey;
export const isAiConfigured = !!config.apiKey;
