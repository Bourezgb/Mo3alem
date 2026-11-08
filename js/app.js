import { init } from './ui.js';
import { loadData } from './store.js';
import { applyTheme } from './theme.js';

applyTheme();

const { data, error } = loadData();
init(data, error);

if ('serviceWorker' in navigator) {
  // عند تحديث الخدمة يُعاد تحميل الصفحة مرة واحدة حتى يظهر الكود الجديد فوراً.
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    location.reload();
  });
  navigator.serviceWorker
    .register('sw.js')
    .then((reg) => reg.update())
    .catch(() => {
      /* التطبيق يعمل بدون التخزين دون اتصال */
    });
}
