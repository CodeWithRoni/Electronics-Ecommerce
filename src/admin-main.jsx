import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Admin from './pages/Admin';
import './styles-startech.css';
import './styles.css';
import './styles-admin.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><div className="admin-standalone"><Admin /></div></BrowserRouter></React.StrictMode>);
