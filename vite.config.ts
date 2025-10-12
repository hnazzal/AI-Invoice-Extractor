import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // In Netlify's build environment, environment variables are directly available on `process.env`.
  // Using `process.env` directly is more reliable than `loadEnv` for CI/CD environments.
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY),
      'process.env.SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
    }
  }
})
