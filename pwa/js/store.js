// التخزين المحلي في متصفح الهاتف. لا شيء يُرسل إلى أي خادم.
// النسخ الاحتياطي: تصدير الملف إلى الهاتف، واستيراده عند الحاجة.

import { normalize, emptyData } from './model.js';

const KEY = 'mo3alem.data.v1';

export function loadData() {
  let raw;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return { data: emptyData(), error: 'المتصفح يمنع التخزين المحلي. افتحي التطبيق في متصفح عادي.' };
  }
  if (!raw) return { data: emptyData(), error: null };
  try {
    return { data: normalize(JSON.parse(raw)), error: null };
  } catch {
    // لا نكتب فوق بيانات تالفة: نحفظها جانباً ونبدأ من جديد.
    try {
      localStorage.setItem(`${KEY}.corrupt-${Date.now()}`, raw);
    } catch {
      /* لا شيء أكثر يمكن فعله */
    }
    return {
      data: emptyData(),
      error: 'تعذّر قراءة البيانات المحفوظة، وحُفظت نسختها التالفة جانباً.',
    };
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    throw new Error('تعذّر الحفظ: مساحة التخزين ممتلئة أو المتصفح يمنع التخزين.');
  }
}

export function exportBackup(data) {
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mo3alem_backup_${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readBackupFile(file) {
  const text = await file.text();
  return normalize(JSON.parse(text));
}

/** يطلب من المتصفح عدم حذف البيانات تلقائياً عند نقص المساحة. */
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch {
    /* اختياري */
  }
}
