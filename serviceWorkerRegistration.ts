
export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Use relative path './sw.js' instead of absolute '/sw.js'
      // This ensures it works in subdirectories or preview environments where the app root isn't the domain root.
      const swUrl = './sw.js';
      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        })
        .catch((error) => {
          console.warn('ServiceWorker registration failed: ', error);
        });
    });
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
