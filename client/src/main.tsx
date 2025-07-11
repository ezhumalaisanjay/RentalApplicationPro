import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handler to suppress browser extension errors
window.addEventListener('error', function(event) {
  const message = event.message || '';
  const filename = event.filename || '';
  
  // Suppress browser extension errors
  if (
    message.includes('message port closed') ||
    message.includes('WebSocket connection to ws://localhost:8098/') ||
    message.includes('inject.bundle.js') ||
    message.includes('runtime.lastError') ||
    filename.includes('chrome-extension://') ||
    filename.includes('moz-extension://') ||
    filename.includes('safari-extension://') ||
    filename.includes('ms-browser-extension://') ||
    filename.includes('inject.bundle.js')
  ) {
    event.preventDefault();
    return false;
  }
});

// Suppress unhandled promise rejections from extensions
window.addEventListener('unhandledrejection', function(event) {
  const message = event.reason?.message || event.reason || '';
  
  if (
    message.includes('message port closed') ||
    message.includes('WebSocket connection to ws://localhost:8098/') ||
    message.includes('inject.bundle.js') ||
    message.includes('runtime.lastError')
  ) {
    event.preventDefault();
    return false;
  }
});

createRoot(document.getElementById("root")!).render(<App />);
