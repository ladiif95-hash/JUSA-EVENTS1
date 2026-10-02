import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import './styles/index.css';
import './styles/pages.css';
import './styles/admin.css';
import './styles/ticket.css';
import './styles/login.css';
import './styles/design-system.css';
import './styles/polish.css';
import './styles/admin-extra.css';
import './styles/catalogue.css';
import './styles/toast.css';
import './styles/sidebar.css';
import './styles/vote.css';
import './styles/home.css';
import './styles/theme.css';
import './styles/auth.css';
import './styles/dark.css';
import './styles/features.css';
import './styles/navbar.css';
import './styles/seminar.css';
import './styles/ui.css';
import './styles/dashboard.css';
import './styles/admin-shell.css';
import { PreferencesProvider } from './context/PreferencesContext';
import { installIconTooltips } from './utils/iconTooltips';
import { installResponsiveTables } from './utils/responsiveTables';

installIconTooltips();
installResponsiveTables();

createRoot(document.getElementById('root')!).render(
  <StrictMode><PreferencesProvider><BrowserRouter><AuthProvider><ToastProvider><App /></ToastProvider></AuthProvider></BrowserRouter></PreferencesProvider></StrictMode>,
);
