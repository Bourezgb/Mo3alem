import { init } from './ui.js';
import { loadData } from './store.js';
import { applyTheme } from './theme.js';

applyTheme();

const { data, error } = loadData();
init(data, error);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {
    /* التطبيق يعمل بدون التخزين دون اتصال */
  });
}
