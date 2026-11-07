// The shop's own Karvio backend (Google Apps Script web app). Products, prices and stock come from there.
export const API_URL = import.meta.env.VITE_API_URL
  || 'https://script.google.com/macros/s/AKfycbxG_OORWKQAVW8S4Oxf3LoQ3Pukazszssd5gNimviRr9qLwjriURhsaw8CyoW_LDB4wlg/exec';
// Product pictures are Google Drive files shared view-by-link.
export const IMAGE_BASE = import.meta.env.VITE_IMAGE_BASE || 'https://lh3.googleusercontent.com/d/';
