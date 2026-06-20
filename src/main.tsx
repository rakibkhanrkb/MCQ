import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { safeCloneForSerialization } from './lib/safe-stringify.ts';

// Safeguard console listeners from circular structures (e.g. Firebase internal states)
const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;

console.error = function (...args: any[]) {
  const safeArgs = args.map(arg => {
    try {
      return safeCloneForSerialization(arg);
    } catch (e) {
      return `[Serialization Failed: ${e instanceof Error ? e.message : String(e)}]`;
    }
  });
  originalError.apply(console, safeArgs);
};

console.warn = function (...args: any[]) {
  const safeArgs = args.map(arg => {
    try {
      return safeCloneForSerialization(arg);
    } catch (e) {
      return `[Serialization Failed: ${e instanceof Error ? e.message : String(e)}]`;
    }
  });
  originalWarn.apply(console, safeArgs);
};

console.log = function (...args: any[]) {
  const safeArgs = args.map(arg => {
    try {
      return safeCloneForSerialization(arg);
    } catch (e) {
      return `[Serialization Failed: ${e instanceof Error ? e.message : String(e)}]`;
    }
  });
  originalLog.apply(console, safeArgs);
};

// Root rendering
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
