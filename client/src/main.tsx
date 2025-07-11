import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// AGGRESSIVE ERROR SUPPRESSION - RUNS IMMEDIATELY
(function() {
  'use strict';
  
  // Store original methods
  const originalMethods = {
    error: console.error,
    warn: console.warn,
    log: console.log,
    WebSocket: window.WebSocket
  };
  
  // Enhanced message filter
  function shouldBlock(message: string): boolean {
    const msg = String(message).toLowerCase();
    const blockedPatterns = [
      'message port closed',
      'websocket connection to ws://localhost:8098/',
      'inject.bundle.js',
      'runtime.lasterror',
      'chrome-extension://',
      'moz-extension://',
      'safari-extension://',
      'ms-browser-extension://',
      'extension://',
      'localhost:8098',
      'injected css loaded successfully',
      'unchecked runtime.lasterror',
      'multi-tabs.js',
      'hook.js'
    ];
    
    return blockedPatterns.some(pattern => msg.includes(pattern));
  }
  
  // Override console methods with more aggressive filtering
  console.error = function(...args: any[]) {
    const message = args.join(' ');
    if (shouldBlock(message)) {
      return; // Completely block
    }
    originalMethods.error.apply(console, args);
  };
  
  console.warn = function(...args: any[]) {
    const message = args.join(' ');
    if (shouldBlock(message)) {
      return; // Completely block
    }
    originalMethods.warn.apply(console, args);
  };
  
  console.log = function(...args: any[]) {
    const message = args.join(' ');
    if (shouldBlock(message)) {
      return; // Block extension-related logs
    }
    originalMethods.log.apply(console, args);
  };
  
  // Block ALL WebSocket connections to localhost
  const OriginalWebSocket = window.WebSocket;
  (window as any).WebSocket = function(url: string | URL, protocols?: string | string[]) {
    if (url && (String(url).includes('localhost:8098') || String(url).includes('ws://localhost:8098'))) {
      // Return a completely inert WebSocket
      const dummySocket = {
        readyState: 3, // CLOSED
        url: url,
        protocol: protocols || '',
        extensions: '',
        bufferedAmount: 0,
        onopen: null,
        onclose: null,
        onmessage: null,
        onerror: null,
        send: function() { /* do absolutely nothing */ },
        close: function() { /* do absolutely nothing */ },
        addEventListener: function() { /* do absolutely nothing */ },
        removeEventListener: function() { /* do absolutely nothing */ },
        dispatchEvent: function() { return false; }
      };
      
      // Prevent any events from firing
      setTimeout(() => {
        if (dummySocket.onerror) {
          try {
            dummySocket.onerror(new Event('error'));
          } catch (e) {
            // Ignore any errors from the error handler
          }
        }
      }, 0);
      
      return dummySocket;
    }
    return new OriginalWebSocket(url, protocols);
  };
  
  // Block all error events
  window.addEventListener('error', function(event: ErrorEvent) {
    const message = String(event.message || '');
    const filename = String(event.filename || '');
    if (shouldBlock(message) || shouldBlock(filename)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return false;
    }
  }, true);
  
  // Block all unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event: PromiseRejectionEvent) {
    const message = String(event.reason?.message || event.reason || '');
    if (shouldBlock(message)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return false;
    }
  }, true);
  
  // Block security policy violations
  window.addEventListener('securitypolicyviolation', function(event: SecurityPolicyViolationEvent) {
    if (shouldBlock(event.violatedDirective) || shouldBlock(event.blockedURI)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return false;
    }
  }, true);
  
  // Block beforeunload events from extensions
  window.addEventListener('beforeunload', function(event: BeforeUnloadEvent) {
    if (shouldBlock(event.type)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return false;
    }
  }, true);
  
  // Log success message
  originalMethods.log('🛡️ Advanced error suppression system activated - all extension noise blocked');
  
})();

createRoot(document.getElementById("root")!).render(<App />);
