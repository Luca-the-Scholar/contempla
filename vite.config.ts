import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

function parseDotEnv(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    // Strip surrounding quotes
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function readLocalEnvFile(): Record<string, string> {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    const contents = fs.readFileSync(envPath, "utf8");
    return parseDotEnv(contents);
  } catch {
    return {};
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Ensure dev + production builds always receive the required public backend env vars.
  // In some environments these may be available with or without the VITE_ prefix.
  const fileEnv = loadEnv(mode, process.cwd(), "");
  const dotEnv = readLocalEnvFile();

  const projectId =
    fileEnv.VITE_SUPABASE_PROJECT_ID ||
    dotEnv.VITE_SUPABASE_PROJECT_ID ||
    process.env.VITE_SUPABASE_PROJECT_ID;

  const supabaseUrl =
    fileEnv.VITE_SUPABASE_URL ||
    dotEnv.VITE_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    fileEnv.SUPABASE_URL ||
    dotEnv.SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    (projectId ? `https://${projectId}.supabase.co` : undefined);

  const supabasePublishableKey =
    fileEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
    dotEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    fileEnv.SUPABASE_PUBLISHABLE_KEY ||
    dotEnv.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    fileEnv.SUPABASE_ANON_KEY ||
    dotEnv.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

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
