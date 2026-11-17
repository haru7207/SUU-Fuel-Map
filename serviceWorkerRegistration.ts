export function register() {
  unregister();
}

export function unregister() {
  if ('caches' in window) {
    caches
      .keys()
      .then((keys) => {
        keys.forEach((key) => {
          if (key.startsWith('suu-fuel-map')) {
            caches.delete(key);
          }
        });
      })
      .catch(() => {});
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      })
      .catch(() => {});
  }
}
