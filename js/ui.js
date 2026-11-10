// الشاشات والتوجيه. كل شاشة تعيد رسم #app كاملاً، وتربط أحداثها بعد الرسم.

import {
  TOTAL_WEEKS, WEEKDAYS, DURATIONS, WEEK_STATUSES, WEEK_STATUS_LABELS, PHASE_NAMES, LEVEL,
  statusOf, lostIn, subjectsOf, newId, emptyData, seedTemplate, seedCurriculum,
} from './model.js';
import { buildPlan, inWeek } from './scheduler.js';
import { saveData, exportBackup, readBackupFile, requestPersistence } from './store.js';
import { checkIndicators, getKey, setKey, deleteKey } from './gemini.js';
import { esc, noteDoc, noteFileDoc, worksheetDoc, timetableDoc } from './print.js';
import { getTheme, setTheme } from './theme.js';
import { putPdf, getPdf, deletePdf } from './appendix.js';
import { UNITS, unitOfWeek } from './model.js';

const app = document.getElementById('app');
const modal = document.getElementById('modal');
const toastEl = document.getElementById('toast');

let data = emptyData();

// ---------- أدوات عامة ----------

function save() {
  try {
    saveData(data);
    return true;
  } catch (e) {
    toast(e.message);
    return false;
  }
}

function toast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (toastEl.hidden = true), 3500);
}

function go(hash) {
  location.hash = hash;
}

const NAV = [
  { id: 'home', hash: '#/home', icon: '🌸', label: 'الرئيسية' },
  { id: 'timetable', hash: '#/timetable', icon: '🗓️', label: 'الجدول' },
  { id: 'sheets', hash: '#/sheets', icon: '🧩', label: 'الدعم' },
  { id: 'notes', hash: '#/notes', icon: '⭐', label: 'المذكرات' },
  { id: 'settings', hash: '#/settings', icon: '🦋', label: 'الإعدادات' },
];

function page({ title, body, active, back }) {
  const backBtn = back ? `<a class="back" href="${back}" aria-label="رجوع">→</a>` : '';
  app.innerHTML = `
    <header class="top">${backBtn}<h1>${esc(title)}</h1></header>
    <main>${body}</main>
    <nav class="bottom" aria-label="التنقل">
      ${NAV.map((n) => `
        <a href="${n.hash}" class="${n.id === active ? 'active' : ''}">
          <span class="ico">${n.icon}</span><span>${n.label}</span>
        </a>`).join('')}
    </nav>`;
  window.scrollTo(0, 0);
}

function occurrenceText(o) {
  if (o.state === 'lesson') return `${o.lessonTitle}${o.delayed ? ' (مُؤجَّل)' : ''}`;
  if (o.state === 'lost') return 'يوم غير دراسي';
  if (o.state === 'free') return 'بلا درس';
  return 'متوقفة أو تقويم';
}

const PAGE_PX = 1030; // الارتفاع المتاح لصفحة A4 بعد الهوامش (≈ 273mm)
const PAGE_WIDTH_PX = 703; // عرض الصفحة بعد الهوامش (186mm)

/** يصغّر خط كل مذكرة حتى تتسع في صفحة واحدة، ثم يكبّرها على الشاشة لتناسب عرض المعاينة. */
function fitNotes(root) {
  if (!root) return;
  const available = root.clientWidth || PAGE_WIDTH_PX;
  root.querySelectorAll('.doc.fill').forEach((doc) => {
    doc.style.zoom = '';
    let k = 1;
    doc.style.setProperty('--fit', k);
    while (doc.offsetHeight > PAGE_PX && k > 0.5) {
      k = Math.round((k - 0.04) * 100) / 100;
      doc.style.setProperty('--fit', k);
    }
    const zoom = Math.min(1, (available - 8) / PAGE_WIDTH_PX);
    if (zoom < 1) doc.style.zoom = zoom.toFixed(3);
  });
}

function refitOpenPreview() {
  if (!modal.hidden) fitNotes(document.getElementById('print-root'));
}
window.addEventListener('beforeprint', refitOpenPreview);
window.addEventListener('resize', refitOpenPreview);

/** نافذة معاينة للـ PDF: الطباعة من حوار المتصفح، والرجوع للتعديل. */
function preview(html) {
  modal.innerHTML = `
    <div class="sheet-modal">
      <div class="modal-bar no-print">
        <button class="btn primary" id="p-print">🖨️ طباعة / حفظ PDF</button>
        <button class="btn" id="p-back">رجوع للتعديل</button>
      </div>
      <div id="print-root">${html}</div>
    </div>`;
  modal.hidden = false;
  fitNotes(document.getElementById('print-root'));
  document.getElementById('p-print').onclick = () => window.print();
  document.getElementById('p-back').onclick = closeModal;
}

function closeModal() {
  modal.hidden = true;
  modal.innerHTML = '';
}

function showCheckResults(results) {
  const items = results.map((r) => `
    <li class="${r.ok ? 'ok' : 'bad'}">
      ${r.ok ? '✅' : '⚠️'} ${esc(r.text)}
      ${r.ok ? '' : `<div class="problem">${esc(r.problem)}</div>`}
    </li>`).join('');
  modal.innerHTML = `
    <div class="sheet-modal small">
      <h2>فحص مؤشرات الانطلاق</h2>
      <ul class="check-list">${items}</ul>
      <p class="muted">التطبيق يُنبّه فقط، والنص لم يتغيّر.</p>
      <button class="btn primary block" id="c-close">إغلاق</button>
    </div>`;
  modal.hidden = false;
  document.getElementById('c-close').onclick = closeModal;
}

// ---------- الرئيسية ----------

let homeDay = null;

function viewHome() {
  const plan = buildPlan(data);
  const w = data.currentWeek;
  const status = statusOf(data, w);
  const occ = inWeek(plan, w);
  const sheets = data.sheets.filter((s) => s.week === w);
  const teaching = status === 'study' || status === 'integration';
  const dash = data.dashboards[w] ?? { wins: '', difficulties: '', nextWeek: '', general: '' };

  if (homeDay === null) {
    const today = new Date().getDay();
    homeDay = today <= 4 ? today : 0;
  }

  let lessons;
  if (!occ.length) {
    lessons = '<p>القالب فارغ. أضيفي الحصص من شاشة الجدول.</p>';
  } else if (!teaching) {
    lessons = `<p>${status === 'paused'
      ? 'أسبوع متوقف، لا تُولَّد فيه حصص.'
      : 'أسبوع تقويم، تتوقف فيه تحضيرات الدروس.'}</p>`;
  } else {
    const dayItems = occ.filter((o) => o.day === homeDay);
    lessons = `
      <div class="day-tabs">
        ${WEEKDAYS.map((d, i) => {
          const n = occ.filter((o) => o.day === i && o.state === 'lesson').length;
          return `<button class="day-tab ${i === homeDay ? 'on' : ''}" data-day="${i}">${d}<small>${n} درس</small></button>`;
        }).join('')}
      </div>
      <div class="day-list">
        ${dayItems.length ? dayItems.map((o) => `
          <div class="slot ${o.state}">
            <strong>${esc(o.subject)} <small>${o.minutes} د</small></strong>
            <span>${esc(occurrenceText(o))}</span>
          </div>`).join('') : '<p class="muted">لا حصص في هذا اليوم.</p>'}
      </div>`;
  }

  const appendixCount = (data.appendix || []).length;

  page({
    title: '🌸 مكتب المعلم',
    active: 'home',
    body: `
      <section class="week-nav">
        <button class="round" data-week="-1" ${w <= 1 ? 'disabled' : ''} aria-label="الأسبوع السابق">−</button>
        <strong>الأسبوع ${w} / ${TOTAL_WEEKS}</strong>
        <button class="round" data-week="1" ${w >= TOTAL_WEEKS ? 'disabled' : ''} aria-label="الأسبوع التالي">+</button>
      </section>

      <section class="card blue">
        <h2>🎛️ لوحة القيادة</h2>
        <p class="muted">${WEEK_STATUS_LABELS[status]}</p>
        ${plan.warnings.map((x) => `<p class="warn">⚠️ ${esc(x)}</p>`).join('')}
        ${lessons}
      </section>

      <section class="card butter">
        <h2>✏️ لوحة الأسبوع القابلة للتعديل</h2>
        <p class="muted">تُملأ عادةً في عطلة نهاية الأسبوع، وتُحفظ لكل أسبوع على حدة.</p>
        <label class="field">إنجازات الأسبوع<textarea id="d-wins" rows="3">${esc(dash.wins)}</textarea></label>
        <label class="field">صعوبات تحتاج دعماً<textarea id="d-difficulties" rows="3">${esc(dash.difficulties)}</textarea></label>
        <label class="field">مهام الأسبوع القادم<textarea id="d-next" rows="3">${esc(dash.nextWeek)}</textarea></label>
        <label class="field">ملاحظات عامة<textarea id="d-general" rows="3">${esc(dash.general)}</textarea></label>
        <button class="btn primary block" id="d-save">حفظ لوحة الأسبوع</button>
      </section>

      <section class="card lavender">
        <h2>🧩 أوراق الدعم</h2>
        <p>${sheets.length ? `${sheets.length} ورقة لهذا الأسبوع.` : 'لا توجد أوراق دعم لهذا الأسبوع.'}</p>
      </section>

      <section class="card mint">
        <h2>⭐ المذكرات</h2>
        <p>عدد المذكرات المحفوظة: ${data.notes.length}</p>
      </section>

      <section class="card pink">
        <h2>📚 الملاحق</h2>
        <p>الكتب المدرسية بصيغة PDF: ${appendixCount} ملف. تُستعمل مرجعاً عند إعداد المذكرات.</p>
        <a class="btn block" href="#/appendix">فتح الملاحق</a>
      </section>

      <div class="actions">
        <a class="btn primary" href="#/note/new">مذكرة جديدة 📝</a>
        <a class="btn" href="#/week/${w}">أيام غير دراسية وحالة الأسبوع</a>
        <a class="btn" href="#/timetable">الجدول والمنهج 🗓️</a>
        <a class="btn" href="#/curriculum">التدرج السنوي 📅</a>
        <a class="btn" href="#/sheets">أوراق الدعم 🧩</a>
        <a class="btn" href="#/notes">كل المذكرات ⭐</a>
      </div>`,
  });

  app.querySelectorAll('[data-day]').forEach((btn) => {
    btn.onclick = () => {
      homeDay = Number(btn.dataset.day);
      viewHome();
    };
  });

  app.querySelectorAll('[data-week]').forEach((btn) => {
    btn.onclick = () => {
      data.currentWeek = Math.min(Math.max(data.currentWeek + Number(btn.dataset.week), 1), TOTAL_WEEKS);
      if (save()) viewHome();
    };
  });

  document.getElementById('d-save').onclick = () => {
    data.dashboards[w] = {
      wins: document.getElementById('d-wins').value.trim(),
      difficulties: document.getElementById('d-difficulties').value.trim(),
      nextWeek: document.getElementById('d-next').value.trim(),
      general: document.getElementById('d-general').value.trim(),
    };
    if (save()) toast('تم حفظ لوحة الأسبوع');
  };
}

// ---------- الأسبوع ----------

function viewWeek(w) {
  if (!Number.isInteger(w) || w < 1 || w > TOTAL_WEEKS) return go('#/home');
  const status = statusOf(data, w);
  const lost = lostIn(data, w);

  page({
    title: `🎈 أسبوع ${w}`,
    active: 'home',
    back: '#/home',
    body: `
      <section class="card butter">
        <label class="field">حالة الأسبوع
          <select id="ws-status">
            ${WEEK_STATUSES.map((s) => `<option value="${s}" ${s === status ? 'selected' : ''}>${WEEK_STATUS_LABELS[s]}</option>`).join('')}
          </select>
        </label>
      </section>

      <section class="card blue">
        <h2>📅 أيام غير دراسية</h2>
        ${WEEKDAYS.map((d, i) => {
          const l = lost.find((x) => x.day === i);
          return `
            <div class="day-row">
              <label class="check"><input type="checkbox" data-day="${i}" ${l ? 'checked' : ''}> ${d}</label>
              <input type="text" class="reason" data-reason="${i}" placeholder="السبب (اختياري)"
                value="${esc(l ? l.reason : '')}" ${l ? '' : 'hidden'}>
            </div>`;
        }).join('')}
      </section>

      <button class="btn primary block" id="ws-save">حفظ</button>`,
  });

  app.querySelectorAll('[data-day]').forEach((cb) => {
    cb.onchange = () => {
      const reason = app.querySelector(`[data-reason="${cb.dataset.day}"]`);
      reason.hidden = !cb.checked;
    };
  });

  document.getElementById('ws-save').onclick = () => {
    data.weekStatus[w] = document.getElementById('ws-status').value;
    const others = data.lostDays.filter((l) => l.week !== w);
    const mine = [];
    app.querySelectorAll('[data-day]').forEach((cb) => {
      if (!cb.checked) return;
      const day = Number(cb.dataset.day);
      const reason = app.querySelector(`[data-reason="${day}"]`).value.trim();
      mine.push({ week: w, day, reason });
    });
    data.lostDays = [...others, ...mine];
    if (save()) go('#/home');
  };
}

// ---------- الجدول والمنهج ----------

let ttEdit = false;
const CHIP_CLASSES = ['c-pink', 'c-blue', 'c-mint', 'c-butter', 'c-lav'];
function chipClass(name) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CHIP_CLASSES[h % CHIP_CLASSES.length];
}

function viewTimetable() {
  const subjects = subjectsOf(data);

  page({
    title: '🗓️ الجدول والمنهج',
    active: 'timetable',
    body: `
      <section class="card blue">
        <div class="tt-head">
          <h2>القالب الأسبوعي</h2>
          <button class="btn small" id="tt-edit-toggle">${ttEdit ? 'تم' : '✏️ تعديل'}</button>
        </div>
        ${WEEKDAYS.map((d, i) => {
          const items = data.template.map((s, idx) => ({ s, idx })).filter((x) => x.s.day === i);
          const total = items.reduce((sum, x) => sum + x.s.minutes, 0);
          return `
            <div class="tt-day">
              <div class="tt-day-name">${d}<small>${items.length} حصص · ${total} د</small></div>
              <div class="tt-chips">${items.length
                ? items.map(({ s, idx }) => `
                    <span class="tt-chip ${chipClass(s.subject)}">
                      ${esc(s.subject)} <small>${s.minutes} د</small>
                      ${ttEdit ? `<button class="tt-x" data-del="${idx}" aria-label="حذف">✕</button>` : ''}
                    </span>`).join('')
                : '<span class="muted">لا حصص</span>'}</div>
            </div>`;
        }).join('')}
      </section>

      <details class="card blue">
        <summary><h2>➕ إضافة حصة</h2></summary>
        <form id="slot-form">
          <label class="field">اليوم
            <select name="day">${WEEKDAYS.map((d, i) => `<option value="${i}">${d}</option>`).join('')}</select>
          </label>
          <label class="field">المادة
            <input name="subject" list="subject-list" required autocomplete="off">
          </label>
          <datalist id="subject-list">${subjects.map((s) => `<option value="${esc(s)}"></option>`).join('')}</datalist>
          <label class="field">المدة
            <select name="minutes">${DURATIONS.map((m) => `<option value="${m}" ${m === 60 ? 'selected' : ''}>${m} دقيقة</option>`).join('')}</select>
          </label>
          <button class="btn primary block" type="submit">إضافة</button>
        </form>
      </details>

      <details class="card mint">
        <summary><h2>📚 المنهج</h2></summary>
        ${subjects.length
          ? subjects.map((s, i) => `
              <details>
                <summary>${esc(s)} · ${(data.curriculum[s] ?? []).length} درس</summary>
                <textarea rows="8" id="curr-${i}" placeholder="درس في كل سطر، بالترتيب">${esc((data.curriculum[s] ?? []).join('\n'))}</textarea>
                <button class="btn small" data-curr="${i}">حفظ دروس ${esc(s)}</button>
              </details>`).join('')
          : '<p class="muted">أضيفي حصصاً أولاً لتظهر المواد هنا.</p>'}
      </details>

      <button class="btn block" id="tt-preview">معاينة الجدول PDF</button>
      <button class="btn block danger" id="tt-reset">استعادة القالب والمنهج الأوليين</button>`,
  });

  document.getElementById('slot-form').onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const subject = String(f.get('subject')).trim();
    if (!subject) return toast('اكتبي اسم المادة');
    data.template.push({ day: Number(f.get('day')), subject, minutes: Number(f.get('minutes')) });
    if (save()) viewTimetable();
  };

  document.getElementById('tt-edit-toggle').onclick = () => {
    ttEdit = !ttEdit;
    viewTimetable();
  };

  app.querySelectorAll('[data-del]').forEach((btn) => {
    btn.onclick = () => {
      data.template.splice(Number(btn.dataset.del), 1);
      if (save()) viewTimetable();
    };
  });

  app.querySelectorAll('[data-curr]').forEach((btn) => {
    btn.onclick = () => {
      const i = Number(btn.dataset.curr);
      const subject = subjects[i];
      const lessons = document.getElementById(`curr-${i}`).value
        .split('\n').map((l) => l.trim()).filter(Boolean);
      data.curriculum[subject] = lessons;
      if (save()) {
        toast('تم حفظ الدروس');
        viewTimetable();
      }
    };
  });

  document.getElementById('tt-preview').onclick = () => preview(timetableDoc(data, data.profile));

  document.getElementById('tt-reset').onclick = () => {
    if (!confirm('سيستبدل القالب والمنهج الحاليين بالأصليين. متابعة؟')) return;
    data.template = seedTemplate();
    data.curriculum = seedCurriculum();
    if (save()) {
      toast('تم استعادة القالب الأصلي');
      viewTimetable();
    }
  };
}

// ---------- أوراق الدعم ----------

function viewSheets() {
  const sheets = [...data.sheets].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  page({
    title: '🧩 أوراق الدعم',
    active: 'sheets',
    body: `
      <a class="btn primary block" href="#/sheets/new">➕ ورقة دعم جديدة</a>
      ${sheets.length
        ? sheets.map((s) => `
            <section class="card lavender">
              <h2>${esc(s.subject)} · الأسبوع ${s.week}</h2>
              <p>مهارات: ${s.weakSkills.length} · تمارين: ${s.exercises.length}</p>
              <div class="actions">
                <button class="btn small" data-pdf="${s.id}">معاينة PDF</button>
                <button class="btn small danger" data-remove="${s.id}">حذف</button>
              </div>
            </section>`).join('')
        : '<p class="muted center">لا توجد أوراق دعم بعد. تُنشأ عند نهاية المقطع أو الأسبوع من النقائص التي تسجّلينها.</p>'}`,
  });

  app.querySelectorAll('[data-pdf]').forEach((btn) => {
    btn.onclick = () => {
      const s = data.sheets.find((x) => x.id === btn.dataset.pdf);
      if (s) preview(worksheetDoc(s, data.profile));
    };
  });
  app.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.onclick = () => {
      data.sheets = data.sheets.filter((x) => x.id !== btn.dataset.remove);
      if (save()) viewSheets();
    };
  });
}

function viewSheetNew() {
  const subjects = subjectsOf(data);
  page({
    title: '🧩 ورقة دعم جديدة',
    active: 'sheets',
    back: '#/sheets',
    body: subjects.length ? `
      <form id="sheet-form" class="card lavender">
        <label class="field">المادة
          <select name="subject">${subjects.map((s) => `<option>${esc(s)}</option>`).join('')}</select>
        </label>
        <label class="field">الأسبوع
          <select name="week">${Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1)
            .map((w) => `<option value="${w}" ${w === data.currentWeek ? 'selected' : ''}>الأسبوع ${w}</option>`).join('')}</select>
        </label>
        <label class="field">المدة
          <select name="minutes">${DURATIONS.map((m) => `<option value="${m}" ${m === 30 ? 'selected' : ''}>${m} دقيقة</option>`).join('')}</select>
        </label>
        <label class="field">المهارات غير المكتسبة (واحدة في كل سطر)
          <textarea name="skills" rows="5"></textarea>
        </label>
        <label class="field">التمارين من كتاب الأنشطة (صفحة وتمرين في كل سطر)
          <textarea name="exercises" rows="5" placeholder="مثال: ص 12 تمرين 3"></textarea>
        </label>
        <button class="btn primary block" type="submit">حفظ الورقة</button>
      </form>` : '<p class="muted">أضيفي حصص القالب أولاً من شاشة الجدول.</p>',
  });

  const form = document.getElementById('sheet-form');
  if (!form) return;
  form.onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const lines = (name) => String(f.get(name)).split('\n').map((l) => l.trim()).filter(Boolean);
    const skills = lines('skills');
    if (!skills.length) return toast('أدخلي مهارة واحدة على الأقل');
    data.sheets.push({
      id: newId(),
      createdAt: new Date().toISOString(),
      week: Number(f.get('week')),
      subject: String(f.get('subject')),
      minutes: Number(f.get('minutes')),
      weakSkills: skills,
      exercises: lines('exercises'),
    });
    if (save()) go('#/sheets');
  };
}

// ---------- التدرج السنوي (متابعة الدروس) ----------

function viewCurriculum() {
  const plan = buildPlan(data);
  const done = data.progress;
  let lessonsTotal = 0;
  let lessonsDone = 0;

  const weeks = Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map((w) => {
    const status = statusOf(data, w);
    const unit = unitOfWeek(w);
    const lessons = inWeek(plan, w).filter((o) => o.state === 'lesson');
    lessonsTotal += lessons.length;
    if (done[w]) lessonsDone += lessons.length;
    const body = lessons.length
      ? lessons.map((o) => `
          <div class="cur-row">
            <span>${esc(o.subject)}</span>
            <strong>${esc(o.lessonTitle)}${o.delayed ? ' <small>(مُؤجَّل)</small>' : ''}</strong>
          </div>`).join('')
      : `<p class="muted">${status === 'paused' ? 'أسبوع متوقف' : status === 'assessment' ? 'أسبوع تقويم' : status === 'integration' ? 'أسبوع إدماج' : 'لا دروس مجدولة'}</p>`;
    return `
      <details class="wk ${status}" ${w === data.currentWeek ? 'open' : ''}>
        <summary>
          <span class="wk-no">الأسبوع ${w}</span>
          <span class="wk-unit">${unit ? `المقطع ${unit.no} · ${esc(unit.name)}` : WEEK_STATUS_LABELS[status]}</span>
          <label class="wk-done" onclick="event.stopPropagation()">
            <input type="checkbox" data-done="${w}" ${done[w] ? 'checked' : ''}> تم
          </label>
        </summary>
        <div class="wk-body">${body}</div>
      </details>`;
  }).join('');

  page({
    title: '📅 التدرج السنوي',
    active: 'home',
    back: '#/home',
    body: `
      <section class="card blue">
        <h2>متابعة الدروس</h2>
        <p>أُنجز ${lessonsDone} من ${lessonsTotal} درساً مجدولاً.</p>
        <p class="muted">الأسابيع مفتوحة لعرض الدروس، وعلامة "تم" تحفظ تقدّمكِ.</p>
      </section>
      <section class="card mint"><div class="wk-list">${weeks}</div></section>`,
  });

  app.querySelectorAll('[data-done]').forEach((box) => {
    box.onchange = () => {
      const w = box.dataset.done;
      if (box.checked) data.progress[w] = true;
      else delete data.progress[w];
      save();
      viewCurriculum();
    };
  });
}

// ---------- الملاحق (الكتب المدرسية PDF) ----------

function viewAppendix() {
  const items = [...(data.appendix || [])].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  const subjects = subjectsOf(data);
  page({
    title: '📚 الملاحق',
    active: 'home',
    back: '#/home',
    body: `
      <section class="card blue">
        <h2>إضافة كتاب (PDF)</h2>
        <p class="muted">تُحفظ الملفات على هذا الهاتف، ولا تدخل في ملف النسخة الاحتياطية.</p>
        <label class="field">العنوان<input id="ap-title" placeholder="مثال: كتاب القراءة، الجزء الأول"></label>
        <label class="field">المادة
          <select id="ap-subject">
            <option value="">بدون مادة</option>
            ${subjects.map((s) => `<option>${esc(s)}</option>`).join('')}
          </select>
        </label>
        <label class="field">ملف PDF<input id="ap-file" type="file" accept="application/pdf"></label>
        <button class="btn primary block" id="ap-add">حفظ الملف</button>
      </section>

      <section class="card mint">
        <h2>الكتب المحفوظة (${items.length})</h2>
        ${items.length ? items.map((a) => `
          <div class="appx">
            <div>
              <strong>${esc(a.title)}</strong>
              <small>${esc(a.subject || 'بدون مادة')} · ${(a.size / 1048576).toFixed(1)} MB</small>
            </div>
            <div class="appx-actions">
              <button class="btn small" data-open="${a.id}">فتح</button>
              <button class="btn small danger" data-rm="${a.id}">حذف</button>
            </div>
          </div>`).join('') : '<p class="muted">لا توجد كتب بعد.</p>'}
      </section>`,
  });

  document.getElementById('ap-add').onclick = async () => {
    const title = document.getElementById('ap-title').value.trim();
    const file = document.getElementById('ap-file').files[0];
    if (!title) return toast('اكتبي عنوان الكتاب');
    if (!file) return toast('اختاري ملف PDF');
    try {
      const id = newId();
      await putPdf(id, file);
      data.appendix.push({
        id,
        title,
        subject: document.getElementById('ap-subject').value,
        size: file.size,
        addedAt: new Date().toISOString(),
      });
      if (save()) {
        toast('تم حفظ الكتاب');
        viewAppendix();
      }
    } catch {
      toast('تعذّر حفظ الملف على هذا المتصفح');
    }
  };

  app.querySelectorAll('[data-open]').forEach((btn) => {
    btn.onclick = async () => {
      const blob = await getPdf(btn.dataset.open).catch(() => null);
      if (!blob) return toast('الملف غير موجود على هذا الهاتف');
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    };
  });

  app.querySelectorAll('[data-rm]').forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm('حذف هذا الكتاب من الهاتف؟')) return;
      await deletePdf(btn.dataset.rm).catch(() => {});
      data.appendix = data.appendix.filter((a) => a.id !== btn.dataset.rm);
      if (save()) viewAppendix();
    };
  });
}

// ---------- المذكرات ----------

function viewNotes() {
  const all = [...data.notes];
  const single = all.filter((n) => !n.fileId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const files = new Map();
  for (const n of all) {
    if (!n.fileId) continue;
    if (!files.has(n.fileId)) files.set(n.fileId, []);
    files.get(n.fileId).push(n);
  }
  const fileCards = [...files.entries()]
    .sort((a, b) => b[1][0].createdAt.localeCompare(a[1][0].createdAt))
    .map(([fid, list]) => `
      <section class="card blue">
        <h2>📂 ملف: ${list.length} مذكرات</h2>
        <p>${esc(list[0].noteNumber ? `الأسبوع ${list[0].noteNumber}` : '')} · ${esc(list[0].createdAt.slice(0, 10))}</p>
        ${list.map((n, i) => `
          <div class="appx">
            <div><strong>${i + 1}. ${esc(n.activity || 'بدون مادة')}</strong><small>${esc(n.topic || n.objective || '')}</small></div>
            <div class="appx-actions"><a class="btn small" href="#/note/${n.id}">تعديل</a></div>
          </div>`).join('')}
        <div class="actions">
          <button class="btn primary block" data-file="${fid}">معاينة الملف كاملاً PDF</button>
        </div>
      </section>`).join('');
  page({
    title: '⭐ المذكرات',
    active: 'notes',
    body: `
      <a class="btn primary block" href="#/note/new">➕ مذكرة جديدة</a>
      ${fileCards}
      ${single.length
        ? single.map((n) => `
            <section class="card mint">
              <h2>${esc(n.objective || 'مذكرة بلا هدف')}</h2>
              <p>${esc(n.unit)} · ${esc(n.createdAt.slice(0, 10))}</p>
              <div class="actions">
                <a class="btn small" href="#/note/${n.id}">تعديل</a>
                <button class="btn small" data-pdf="${n.id}">معاينة PDF</button>
              </div>
            </section>`).join('')
        : (files.size ? '' : '<p class="muted center">لا توجد مذكرات بعد.</p>')}`,
  });
  app.querySelectorAll('[data-pdf]').forEach((btn) => {
    btn.onclick = () => {
      const n = data.notes.find((x) => x.id === btn.dataset.pdf);
      if (n) preview(noteDoc(n, data.profile));
    };
  });
  app.querySelectorAll('[data-file]').forEach((btn) => {
    btn.onclick = () => {
      const list = data.notes.filter((n) => n.fileId === btn.dataset.file);
      if (list.length) preview(noteFileDoc(list, data.profile));
    };
  });
}

function readNoteForm(base) {
  const v = (name) => document.querySelector(`[name="${name}"]`).value.trim();
  return {
    id: base.id,
    createdAt: base.createdAt,
    fileId: base.fileId ?? null,
    domain: v('domain'),
    unit: v('unit'),
    activity: v('activity'),
    topic: v('topic'),
    session: v('session'),
    objective: v('objective'),
    competency: v('competency'),
    noteNumber: v('noteNumber'),
    level: LEVEL,
    resources: v('resources'),
    duration: v('duration'),
    phases: PHASE_NAMES.map((name, i) => ({
      name,
      situations: v(`situations-${i}`),
      indicators: v(`indicators-${i}`),
    })),
  };
}

const BATCH_KEY = 'mo3alem.draftBatch';
let noteBatch = null;

function loadBatch() {
  if (noteBatch === null) {
    try {
      noteBatch = JSON.parse(localStorage.getItem(BATCH_KEY) || '[]');
    } catch {
      noteBatch = [];
    }
  }
  return noteBatch;
}

function saveBatch() {
  try {
    localStorage.setItem(BATCH_KEY, JSON.stringify(noteBatch));
  } catch {
    /* المسودة اختيارية */
  }
}

function clearBatch() {
  noteBatch = [];
  try {
    localStorage.removeItem(BATCH_KEY);
  } catch {
    /* لا شيء */
  }
}

function viewNoteEdit(id, carry = null) {
  const existing = id === 'new' ? null : data.notes.find((n) => n.id === id);
  if (id !== 'new' && !existing) return go('#/notes');
  const batch = id === 'new' ? loadBatch() : [];
  const n = existing ?? {
    id: newId(),
    createdAt: new Date().toISOString(),
    domain: carry?.domain ?? '', unit: carry?.unit ?? '', activity: '', topic: '', session: '',
    objective: '', competency: '',
    noteNumber: carry?.noteNumber ?? '', resources: '', duration: carry?.duration ?? '',
    phases: PHASE_NAMES.map((name) => ({ name, situations: '', indicators: '' })),
  };
  const field = (label, name, value, rows = 0) => `
    <label class="field">${label}
      ${rows
        ? `<textarea name="${name}" rows="${rows}">${esc(value)}</textarea>`
        : `<input name="${name}" value="${esc(value)}" autocomplete="off">`}
    </label>`;

  page({
    title: existing ? '📝 تعديل المذكرة' : '📝 مذكرات الملف',
    active: 'notes',
    back: '#/notes',
    body: `
      ${batch.length ? `
      <section class="card butter">
        <h2>📂 في هذا الملف (${batch.length} مذكرة محفوظة مؤقتاً)</h2>
        ${batch.map((b, i) => `
          <div class="appx">
            <div><strong>${esc(b.activity || 'بدون مادة')}</strong><small>${esc(b.topic || '—')}</small></div>
            <div class="appx-actions"><button class="btn small danger" data-bdel="${i}">حذف</button></div>
          </div>`).join('')}
      </section>` : ''}

      <section class="card pink">
        <h2>🌸 رأس المذكرة</h2>
        ${field('الميدان', 'domain', n.domain)}
        ${field('المقطع التعلمي', 'unit', n.unit)}
        ${field('النشاط', 'activity', n.activity ?? '')}
        ${field('الموضوع', 'topic', n.topic ?? '')}
        ${field('الحصة', 'session', n.session ?? '')}
        ${field('الهدف التعلمي', 'objective', n.objective, 2)}
        ${field('الكفاءة المستهدفة', 'competency', n.competency, 2)}
      </section>

      <section class="card blue">
        <h2>🎈 جانب المذكرة</h2>
        ${field('الأسبوع رقم', 'noteNumber', n.noteNumber)}
        <label class="field">المستوى<input value="${LEVEL}" disabled></label>
        ${field('الوسائل', 'resources', n.resources, 2)}
        ${field('المدة الزمنية', 'duration', n.duration)}
      </section>

      <section class="card mint">
        <h2>⭐ مراحل الدرس</h2>
        <p class="muted">التطبيق لا يكتب المراحل. تكتبينها أنتِ، والتطبيق ينظّم ويفحص ويُخرج PDF.</p>
        ${n.phases.map((p, i) => `
          <div class="phase">
            <h3>${esc(p.name)}</h3>
            <label class="field">الوضعيات التعلمية
              <textarea name="situations-${i}" rows="4">${esc(p.situations)}</textarea>
            </label>
            <label class="field">مؤشرات التقويم
              <textarea name="indicators-${i}" rows="3">${esc(p.indicators)}</textarea>
            </label>
          </div>`).join('')}
      </section>

      <div class="actions">
        ${existing ? '' : '<button class="btn block" id="n-next">التالي: مذكرة أخرى في نفس الملف ➜</button>'}
        <button class="btn primary block" id="n-save">${existing ? 'حفظ المذكرة' : 'حفظ الملف كاملاً'}</button>
        <button class="btn block" id="n-check">فحص مؤشرات الانطلاق 🌟 (Gemini)</button>
        <button class="btn block" id="n-pdf">معاينة PDF</button>
        ${existing ? '<button class="btn danger block" id="n-delete">حذف المذكرة</button>' : ''}
      </div>`,
  });

  app.querySelectorAll('[data-bdel]').forEach((btn) => {
    btn.onclick = () => {
      loadBatch().splice(Number(btn.dataset.bdel), 1);
      saveBatch();
      viewNoteEdit('new');
    };
  });

  if (!existing) {
    document.getElementById('n-next').onclick = () => {
      const note = readNoteForm(n);
      if (!note.activity && !note.topic && !note.objective) {
        return toast('اكتبي المادة أو الموضوع أو الهدف أولاً');
      }
      loadBatch().push(note);
      saveBatch();
      toast('أُضيفت إلى الملف، والمذكرة التالية أمامكِ');
      viewNoteEdit('new', { noteNumber: note.noteNumber });
    };
  }

  document.getElementById('n-save').onclick = () => {
    const note = readNoteForm(n);
    if (existing) {
      const idx = data.notes.findIndex((x) => x.id === note.id);
      data.notes[idx] = note;
    } else {
      const current = note.activity || note.topic || note.objective ? [note] : [];
      const fileId = newId();
      for (const item of [...loadBatch(), ...current]) {
        data.notes.push({ ...item, fileId });
      }
      clearBatch();
    }
    if (save()) {
      toast('تم حفظ المذكرات على الهاتف 🦋');
      go('#/notes');
    }
  };

  document.getElementById('n-check').onclick = async () => {
    const lines = document.querySelector('[name="indicators-0"]').value
      .split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return toast('اكتبي مؤشرات الانطلاق أولاً');
    try {
      toast('جارٍ الفحص…');
      showCheckResults(await checkIndicators(lines));
    } catch (e) {
      toast(e.message);
    }
  };

  document.getElementById('n-pdf').onclick = () => preview(noteDoc(readNoteForm(n), data.profile));

  const del = document.getElementById('n-delete');
  if (del) {
    del.onclick = () => {
      if (!confirm('حذف هذه المذكرة نهائياً؟')) return;
      data.notes = data.notes.filter((x) => x.id !== n.id);
      if (save()) go('#/notes');
    };
  }
}

// ---------- الإعدادات ----------

function viewSettings() {
  const hasKey = Boolean(getKey());
  page({
    title: '🦋 الإعدادات',
    active: 'settings',
    body: `
      <section class="card blue">
        <h2>🌓 المظهر</h2>
        <label class="field">الوضع
          <select id="s-theme">
            <option value="system" ${getTheme() === 'system' ? 'selected' : ''}>حسب الهاتف</option>
            <option value="light" ${getTheme() === 'light' ? 'selected' : ''}>فاتح ☀️</option>
            <option value="dark" ${getTheme() === 'dark' ? 'selected' : ''}>ليلي 🌙</option>
          </select>
        </label>
      </section>

      <section class="card blue">
        <h2>🏫 بيانات الوثائق المطبوعة</h2>
        <label class="field">اسم الأستاذة<input id="p-teacher" value="${esc(data.profile.teacher)}"></label>
        <label class="field">المدرسة<input id="p-school" value="${esc(data.profile.school)}"></label>
        <label class="field">المقاطعة<input id="p-zone" value="${esc(data.profile.zone)}"></label>
        <label class="field">مديرية التربية<input id="p-district" value="${esc(data.profile.district)}"></label>
        <label class="field">السنة الدراسية<input id="p-year" value="${esc(data.profile.year)}"></label>
        <button class="btn primary block" id="p-save">حفظ بيانات الوثائق</button>
      </section>

      <section class="card pink">
        <h2>💾 النسخ الاحتياطي</h2>
        <p>تُصدَّر بياناتك إلى ملف على الهاتف. احفظيه في مكان آمن.</p>
        <button class="btn primary block" id="s-export">تصدير نسخة احتياطية</button>
        <label class="field">استيراد نسخة احتياطية
          <input type="file" id="s-import" accept="application/json,.json">
        </label>
        <p class="muted">الاستيراد يستبدل كل البيانات الحالية.</p>
      </section>

      <section class="card lavender">
        <h2>🔑 مفتاح Gemini</h2>
        <p>${hasKey ? 'المفتاح مضاف على هذا الهاتف ✅' : 'لم يُضَف المفتاح بعد. يُستعمل لفحص المؤشرات فقط.'}</p>
        <label class="field">المفتاح
          <input type="password" id="s-key" autocomplete="off">
        </label>
        <button class="btn primary block" id="s-key-save">حفظ المفتاح</button>
        ${hasKey ? '<button class="btn danger block" id="s-key-del">حذف المفتاح</button>' : ''}
        <p class="muted">يُحفظ على هذا المتصفح فقط، ولا يُرفع إلى أي مكان.</p>
      </section>`,
  });

  document.getElementById('s-theme').onchange = (e) => setTheme(e.target.value);

  document.getElementById('s-export').onclick = () => exportBackup(data);

  document.getElementById('p-save').onclick = () => {
    data.profileVersion = 2;
    data.profile = {
      teacher: document.getElementById('p-teacher').value.trim(),
      school: document.getElementById('p-school').value.trim(),
      zone: document.getElementById('p-zone').value.trim(),
      district: document.getElementById('p-district').value.trim(),
      year: document.getElementById('p-year').value.trim(),
    };
    if (save()) toast('تم حفظ بيانات الوثائق');
  };

  document.getElementById('s-import').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('الاستيراد يستبدل كل البيانات الحالية. متابعة؟')) {
      e.target.value = '';
      return;
    }
    try {
      data = await readBackupFile(file);
      if (save()) {
        toast('تم استيراد النسخة الاحتياطية');
        go('#/home');
      }
    } catch (err) {
      toast(`تعذّر الاستيراد: ${err.message}`);
    }
  };

  document.getElementById('s-key-save').onclick = () => {
    const key = document.getElementById('s-key').value.trim();
    if (!key) return toast('أدخلي المفتاح أولاً');
    setKey(key);
    toast('تم حفظ المفتاح على هذا الهاتف 🔒');
    viewSettings();
  };

  const del = document.getElementById('s-key-del');
  if (del) {
    del.onclick = () => {
      deleteKey();
      toast('تم حذف المفتاح');
      viewSettings();
    };
  }
}

// ---------- التوجيه ----------

function route() {
  const [name, arg] = (location.hash || '#/home').slice(2).split('/');
  modal.hidden = true;
  switch (name) {
    case 'week': return viewWeek(Number(arg));
    case 'timetable': return viewTimetable();
    case 'sheets': return arg === 'new' ? viewSheetNew() : viewSheets();
    case 'notes': return viewNotes();
    case 'note': return viewNoteEdit(arg ?? 'new');
    case 'settings': return viewSettings();
    case 'appendix': return viewAppendix();
    case 'curriculum': return viewCurriculum();
    default: return viewHome();
  }
}

export function init(loaded, loadError) {
  data = loaded;
  if (loadError) toast(loadError);
  requestPersistence();

  // روابط data-... تعمل حتى داخل المحتوى المُعاد رسمه.
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#/"]');
    if (link && link.getAttribute('href') === location.hash) {
      route();
    }
  });
  window.addEventListener('hashchange', route);
  route();
}

