import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { removeLegacy } from './core/storage/storage';
import '@fontsource-variable/inter';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/cormorant-garamond/600-italic.css';
import './index.css';

// The app used to be called "Deck Hub" and saved games in progress (with their undo history).
// Games are no longer saved; clear everything stored under the old name.
removeLegacy('deck-hub:');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
