
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

console.log("Addis Bingo: Initializing game engine...");

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("FATAL ERROR: Could not find root element to mount the Addis Bingo application.");
} else {
  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Addis Bingo: React root successfully rendered.");
  } catch (error) {
    console.error("Addis Bingo: Mounting Failed:", error);
    rootElement.innerHTML = `
      <div style="color: white; padding: 40px; font-family: sans-serif; text-align: center; background: #a28cd1; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px;"></i>
        <h2 style="font-weight: 900; text-transform: uppercase;">Mounting Error</h2>
        <p style="opacity: 0.8; max-width: 300px;">The game engine failed to start. This usually happens if file extensions are missing or the browser blocked a script.</p>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 12px 24px; background: white; color: #a28cd1; border: none; border-radius: 12px; font-weight: 900; cursor: pointer;">RETRY</button>
      </div>
    `;
  }
}
