import {create} from 'zustand';
const KEY='electronics_ecommerce_wishlist';
function saved(){try{return JSON.parse(localStorage.getItem(KEY))||[]}catch{return []}}
export const useFavorites=create((set,get)=>({ids:saved(),toggle(id){const ids=get().ids.includes(id)?get().ids.filter(x=>x!==id):[...get().ids,id];try{localStorage.setItem(KEY,JSON.stringify(ids))}catch{}set({ids})},clear(){try{localStorage.removeItem(KEY)}catch{}set({ids:[]})}}));
