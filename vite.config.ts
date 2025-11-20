import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon-192.png", "icon-512.png"],
      manifest: {
        name: "Y2J Commissary",
        short_name: "Y2J",
        description: "Commissary order management system",
        theme_color: "#1a1f2e",
        background_color: "#1a1f2e",
        display: "standalone",
        scope: "/",
        start_url: "/",
        orientation: "portrait",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "any"
          }
        ]
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: null,
        maximumFileSizeToCacheInBytes: 5000000, // 5MB limit per file
        runtimeCaching: [
          {
            urlPattern: /\.html$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "html-cache",
              networkTimeoutSeconds: 2,
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 12 // 12 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.css$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "css-cache",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.js$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "js-cache",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 15,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/(themes|app_settings).*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "supabase-theme-settings-cache",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              plugins: [
                {
                  cacheKeyWillBeUsed: async ({ request }) => {
                    const url = new URL(request.url);
                    return url.origin + url.pathname + url.search;
                  }
                }
              ]
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes for other API calls
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    cssCodeSplit: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core vendors - loaded on all pages
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-core';
            }
            if (id.includes('react-router-dom')) {
              return 'router';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query';
            }
            if (id.includes('@supabase/supabase-js')) {
              return 'supabase';
            }
            
            // Radix UI components - split by usage frequency
            if (id.includes('@radix-ui/react-dialog') || 
                id.includes('@radix-ui/react-dropdown-menu') ||
                id.includes('@radix-ui/react-toast')) {
              return 'radix-common';
            }
            if (id.includes('@radix-ui')) {
              return 'radix-extended';
            }
            
            // Charts and visualization
            if (id.includes('recharts')) {
              return 'charts';
            }
            
            // Map libraries
            if (id.includes('mapbox')) {
              return 'mapbox';
            }
            
            // Other large libraries
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            if (id.includes('date-fns')) {
              return 'date-utils';
            }
            
            // Everything else from node_modules
            return 'vendor';
          }
          
          // Route-based code splitting
          if (id.includes('/src/pages/')) {
            // Admin pages
            if (id.includes('/pages/admin/')) {
              return 'admin-pages';
            }
            // Analytics pages
            if (id.includes('Analytics') || id.includes('ProductPerformance')) {
              return 'analytics-pages';
            }
            // GPS/Fleet pages
            if (id.includes('GPS') || id.includes('Fleet') || id.includes('Geofencing')) {
              return 'gps-pages';
            }
            // Inventory pages
            if (id.includes('Inventory') || id.includes('StockTake') || id.includes('PurchaseOrders')) {
              return 'inventory-pages';
            }
            // Order pages
            if (id.includes('Orders') || id.includes('ProcessedOrders')) {
              return 'order-pages';
            }
            // Receipt pages
            if (id.includes('Receipt')) {
              return 'receipt-pages';
            }
          }
          
          // Component-based splitting
          if (id.includes('/src/components/')) {
            // Admin components
            if (id.includes('/components/admin/')) {
              return 'admin-components';
            }
            // Analytics components
            if (id.includes('/components/analytics/')) {
              return 'analytics-components';
            }
            // Inventory components
            if (id.includes('/components/inventory/')) {
              return 'inventory-components';
            }
            // Receipt components
            if (id.includes('/components/receipts/')) {
              return 'receipt-components';
            }
          }
        },
      },
    },
  },
}));
