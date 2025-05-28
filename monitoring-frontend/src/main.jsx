// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { StoreContext, rootStore } from './stores';
import { BrowserRouter } from 'react-router-dom'; // <--- Імпорт BrowserRouter

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <StoreContext.Provider value={rootStore}>
            <BrowserRouter> {/* <--- Обгортаємо App у BrowserRouter */}
                <App />
            </BrowserRouter>
        </StoreContext.Provider>
    </React.StrictMode>
);