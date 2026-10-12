import React from 'react';
import { createRoot } from 'react-dom/client';
import ChatWidget from './ChatWidget';

import tailwindStyles from '../app/globals.css?raw'; 

const container = document.getElementById('huna-ai-root');

if (container) {
  const shadowRoot = container.attachShadow({ mode: 'open' });
  
  const reactRoot = document.createElement('div');
  reactRoot.id = 'huna-react-root';
  shadowRoot.appendChild(reactRoot);

  const styleTag = document.createElement('style');
  
  styleTag.innerHTML = tailwindStyles;
  
  shadowRoot.appendChild(styleTag);

  const root = createRoot(reactRoot);
  root.render(<ChatWidget />);
} else {
  console.error("Huna AI Hatası: 'huna-ai-root' id'li div HTML içinde bulunamadı.");
}