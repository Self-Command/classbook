import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toast } from '@heroui/react';
import App from './App';
import { AuthProvider } from './lib/auth';
import { NotificationsProvider } from './lib/notifications';
import { ThemeProvider } from './lib/theme';
import { ToastProvider } from './components/Toast';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <NotificationsProvider>
            <ToastProvider>
              <App />
              <Toast.Provider placement="top end" />
            </ToastProvider>
          </NotificationsProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
