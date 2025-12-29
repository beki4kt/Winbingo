
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  // Hide loader after React has started rendering
  if (typeof (window as any).hideAppLoader === 'function') {
    (window as any).hideAppLoader();
  }
}
