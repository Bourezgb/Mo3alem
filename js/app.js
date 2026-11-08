import { init } from './ui.js';
import { loadData } from './store.js';

const { data, error } = loadData();
init(data, error);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {
    /* التطبيق يعمل بدون التخزين دون اتصال */
  });
}
