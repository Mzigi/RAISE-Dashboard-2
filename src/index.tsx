import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './components/app';

import '../assets/main.css';

let rootElement: HTMLElement | null = document.getElementById('root');

if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);

    root.render(<App />);
}