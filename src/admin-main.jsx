import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Admin from './pages/Admin';
import './styles-startech.css';
import './styles.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><div className="admin-standalone"><main className="wrap"><Admin /></main></div></BrowserRouter></React.StrictMode>);
