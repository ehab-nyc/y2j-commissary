import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('PWA service worker registered:', registration);
      },
      (error) => {
        console.log('PWA service worker registration failed:', error);
      }
    );
  });
}

createRoot(document.getElementById("root")!).render(<App />);
