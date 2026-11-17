import React from 'react';
import ReactDOM from 'react-dom/client';
import MainApp from './MainApp';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// Unregister any stale service workers and clear legacy module caches before mounting
serviceWorkerRegistration.unregister();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <MainApp />
  </React.StrictMode>
);
