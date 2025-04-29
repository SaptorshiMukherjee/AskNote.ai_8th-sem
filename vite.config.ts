import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Tell Vite to prefix URLs with your repo name on GH Pages:
  base: mode === "production" ? "/ASKNOTE_AI_8TH-SEM/" : "/",

  server: {
    host: "::",
    port: 8080,
  },

  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  optimizeDeps: {
    include: ['react-pdf', 'pdfjs-dist'],
    esbuildOptions: {
      target: 'esnext',
    },
  },

  build: {
    commonjsOptions: {
      include: [/react-pdf/, /pdfjs-dist/],
      transform: {
        include: [/react-pdf/, /pdfjs-dist/],
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'pdfjs': ['pdfjs-dist'],
        },
      },
    },
  },
}));
