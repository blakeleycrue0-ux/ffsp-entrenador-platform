import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ClubProvider } from '@/store/store';
import { ToastProvider } from '@/components/ui/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import './styles/index.css';

/* Dos redes, no una. La de dentro (en AppShell) atrapa el fallo de una
   pantalla y deja el menú en pie; ésta es la última, para lo que se rompa por
   encima de todo eso. Sin ella, cualquier fallo ahí arriba vuelve a dejar la
   página en blanco. */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ClubProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </ClubProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
