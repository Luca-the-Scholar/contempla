import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Ensure production builds receive the required public backend env vars.
  // Depending on environment, these may be available as SUPABASE_* (without VITE_ prefix).
  const fileEnv = loadEnv(mode, process.cwd(), "");

  const projectId =
    fileEnv.VITE_SUPABASE_PROJECT_ID ||
    process.env.VITE_SUPABASE_PROJECT_ID ||
    fileEnv.SUPABASE_PROJECT_ID ||
    process.env.SUPABASE_PROJECT_ID;

  let supabaseUrl =
    fileEnv.VITE_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    fileEnv.SUPABASE_URL ||
    process.env.SUPABASE_URL;

  if (!supabaseUrl && projectId) {
    supabaseUrl = `https://${projectId}.supabase.co`;
  }

  // Last-resort fallback for misconfigured build environments (publishable values only).
  if (!supabaseUrl) {
    supabaseUrl = "https://zlrgwfvqhxpfnuvxpyce.supabase.co";
  }

  let supabasePublishableKey =
    fileEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    fileEnv.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    fileEnv.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabasePublishableKey) {
    supabasePublishableKey =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpscmd3ZnZxaHhwZm51dnhweWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTE5NzYsImV4cCI6MjA3OTE2Nzk3Nn0.GgvoaIukTth0yHj5m_ZR2SJk_l12vprGXvDEF6mavIQ";
  }

  // Populate VITE_* so Vite's env replacement can also work.
  if (!process.env.VITE_SUPABASE_URL && supabaseUrl) process.env.VITE_SUPABASE_URL = supabaseUrl;
  if (!process.env.VITE_SUPABASE_PUBLISHABLE_KEY && supabasePublishableKey) {
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = supabasePublishableKey;
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    define: {
      ...(supabaseUrl ? { "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl) } : {}),
      ...(supabasePublishableKey
        ? { "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey) }
        : {}),
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png"],
        manifest: {
          name: "Contempla — Contemplative Practice with Friends",
          short_name: "Contempla",
          description: "Contemplative practice with friends. Track your meditation, explore techniques, and grow together.",
          theme_color: "#2F6FAF",
          background_color: "#0a0a0f",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "gstatic-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
