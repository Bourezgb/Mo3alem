// ملفات الكتب المدرسية (PDF) تُحفظ في IndexedDB على الهاتف، لأنها أكبر من حد localStorage.
// بيانات كل ملف (العنوان والمادة) تبقى في البيانات الرئيسية.

const DB_NAME = 'mo3alem-files';
const STORE = 'pdfs';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run(mode, action) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const request = action(t.objectStore(STORE));
    t.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
  });
}

export const putPdf = (id, blob) => run('readwrite', (s) => s.put(blob, id));
export const getPdf = (id) => run('readonly', (s) => s.get(id));
export const deletePdf = (id) => run('readwrite', (s) => s.delete(id));
