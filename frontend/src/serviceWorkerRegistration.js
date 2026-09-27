// src/serviceWorkerRegistration.js
// تسجيل الـ Service Worker لتفعيل وضع الـ PWA والعمل بدون إنترنت

export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL || ''}/sw.js`;

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.info('✅ تم تفعيل الـ Service Worker ووضع Offline بنجاح:', registration.scope);

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) return;

            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.info('يوجد إصدار جديد من التطبيق جاهز للاستخدام.');
                } else {
                  console.info('تم حفظ محتويات التطبيق للعمل بدون إنترنت.');
                }
              }
            };
          };
        })
        .catch((error) => {
          console.warn('تحذير أثناء تسجيل Service Worker:', error.message);
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
