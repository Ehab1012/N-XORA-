import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Apply persistent theme before React renders
if (localStorage.getItem('theme') === 'light') {
  document.documentElement.classList.add('light-mode');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
