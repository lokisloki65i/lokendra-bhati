import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ImageProvider } from './image';
import { ThemeProvider } from './services/ThemeContext';
import { OwnerProvider } from './services/OwnerContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OwnerProvider>
      <ThemeProvider>
        <ImageProvider>
          <App />
        </ImageProvider>
      </ThemeProvider>
    </OwnerProvider>
  </StrictMode>,
);
