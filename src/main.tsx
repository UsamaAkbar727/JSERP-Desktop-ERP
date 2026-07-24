import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initWebMockApi } from "./lib/web-mock-api";

// Initialize mock API fallback for web mode (Vercel)
initWebMockApi();

// Global error handlers for debugging

// Catch unhandled errors
window.addEventListener('error', (event) => {
  console.error('❌ [Global Error]', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
  });
});

// Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ [Unhandled Promise Rejection]', {
    reason: event.reason,
    promise: event.promise,
  });
});

createRoot(document.getElementById("root")!).render(<App />);
