
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

console.log("Addis Bingo: Initializing game engine...");

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("FATAL ERROR: Could not find root element.");
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
  }
}
