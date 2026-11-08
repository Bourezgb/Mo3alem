// المظهر: تلقائي (حسب الهاتف) أو فاتح أو ليلي. يُحفظ على هذا المتصفح فقط.

const KEY = 'mo3alem.theme';

export function getTheme() {
  try {
    return localStorage.getItem(KEY) || 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(theme = getTheme()) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
  else delete root.dataset.theme;
}

export function setTheme(theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* التطبيق يعمل بالمظهر الحالي */
  }
  applyTheme(theme);
}
