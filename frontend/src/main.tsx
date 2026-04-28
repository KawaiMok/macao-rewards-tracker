import { GoogleOAuthProvider } from '@react-oauth/google';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { requiredEnv } from './env';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={requiredEnv('VITE_GOOGLE_CLIENT_ID')}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
