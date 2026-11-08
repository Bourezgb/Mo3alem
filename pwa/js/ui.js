// الشاشات والتوجيه. كل شاشة تعيد رسم #app كاملاً، وتربط أحداثها بعد الرسم.

import {
  TOTAL_WEEKS, WEEKDAYS, DURATIONS, WEEK_STATUSES, WEEK_STATUS_LABELS, PHASE_NAMES, LEVEL,
  statusOf, lostIn, subjectsOf, newId, emptyData,
} from './model.js';
import { buildPlan, inWeek } from './scheduler.js';
import { saveData, exportBackup, readBackupFile, requestPersistence } from './store.js';
import { checkIndicators, getKey, setKey, deleteKey } from './gemini.js';
import { esc, noteDoc, worksheetDoc, timetableDoc } from './print.js';

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
  if (o.state === 'free') return 'بلا درس، لم يبقَ دروس لهذه المادة';
  return 'متوقفة أو تقويم';
}

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

function viewHome() {
  const plan = buildPlan(data);
  const w = data.currentWeek;
  const status = statusOf(data, w);
  const occ = inWeek(plan, w);
  const sheets = data.sheets.filter((s) => s.week === w);
  const teaching = status === 'study' || status === 'integration';

  let slots;
  if (!occ.length) {
    slots = '<p>القالب فارغ. أضيفي الحصص من شاشة الجدول.</p>';
  } else if (!teaching) {
    slots = `<p>${status === 'paused'
      ? 'أسبوع متوقف، لا تُولَّد فيه حصص.'
      : 'أسبوع تقويم، تتوقف فيه تحضيرات الدروس.'}</p>`;
  } else {
    slots = occ.map((o) => `
      <div class="slot ${o.state}">
        <strong>${WEEKDAYS[o.day]} · ${esc(o.subject)}</strong>
        <span>${esc(occurrenceText(o))}</span>
      </div>`).join('');
  }

  page({
    title: '🌸 مكتب المعلم',
    active: 'home',
    body: `
      <section class="week-nav">
        <button class="round" data-week="-1" ${w <= 1 ? 'disabled' : ''} aria-label="الأسبوع السابق">−</button>
        <strong>الأسبوع ${w} / ${TOTAL_WEEKS}</strong>
        <button class="round" data-week="1" ${w >= TOTAL_WEEKS ? 'disabled' : ''} aria-label="الأسبوع التالي">+</button>
      </section>

      <section class="card butter">
        <h2>🎈 حالة الأسبوع: ${WEEK_STATUS_LABELS[status]}</h2>
        ${plan.warnings.map((x) => `<p class="warn">⚠️ ${esc(x)}</p>`).join('')}
      </section>

      <section class="card blue">
        <h2>📅 حصص الأسبوع</h2>
        ${slots}
      </section>

      <section class="card lavender">
        <h2>🧩 أوراق الدعم</h2>
        <p>${sheets.length ? `${sheets.length} ورقة لهذا الأسبوع.` : 'لا توجد أوراق دعم لهذا الأسبوع.'}</p>
      </section>

      <section class="card mint">
        <h2>⭐ المذكرات</h2>
        <p>عدد المذكرات المحفوظة: ${data.notes.length}</p>
      </section>

      <div class="actions">
        <a class="btn primary" href="#/note/new">مذكرة جديدة 📝</a>
        <a class="btn" href="#/week/${w}">أيام غير دراسية وحالة الأسبوع</a>
        <a class="btn" href="#/timetable">الجدول والمنهج 🗓️</a>
        <a class="btn" href="#/sheets">أوراق الدعم 🧩</a>
        <a class="btn" href="#/notes">كل المذكرات ⭐</a>
      </div>`,
  });

  app.querySelectorAll('[data-week]').forEach((btn) => {
    btn.onclick = () => {
      data.currentWeek = Math.min(Math.max(data.currentWeek + Number(btn.dataset.week), 1), TOTAL_WEEKS);
      if (save()) viewHome();
    };
  });
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

function viewTimetable() {
  const subjects = subjectsOf(data);

  page({
    title: '🗓️ الجدول والمنهج',
    active: 'timetable',
    body: `
      <section class="card blue">
        <h2>القالب الأسبوعي</h2>
        ${WEEKDAYS.map((d, i) => {
          const items = data.template.map((s, idx) => ({ s, idx })).filter((x) => x.s.day === i);
          return `<h3>${d}</h3>` + (items.length
            ? items.map(({ s, idx }) => `
                <div class="row">
                  <span>${esc(s.subject)} · ${s.minutes} د</span>
                  <button class="btn small danger" data-del="${idx}">حذف</button>
                </div>`).join('')
            : '<p class="muted">لا حصص</p>');
        }).join('')}
      </section>

      <section class="card blue">
        <h2>➕ إضافة حصة</h2>
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
      </section>

      <section class="card mint">
        <h2>📚 المنهج</h2>
        ${subjects.length
          ? subjects.map((s, i) => `
              <details>
                <summary>${esc(s)} · ${(data.curriculum[s] ?? []).length} درس</summary>
                <textarea rows="8" id="curr-${i}" placeholder="درس في كل سطر، بالترتيب">${esc((data.curriculum[s] ?? []).join('\n'))}</textarea>
                <button class="btn small" data-curr="${i}">حفظ دروس ${esc(s)}</button>
              </details>`).join('')
          : '<p class="muted">أضيفي حصصاً أولاً لتظهر المواد هنا.</p>'}
      </section>

      <button class="btn block" id="tt-preview">معاينة الجدول PDF</button>`,
  });

  document.getElementById('slot-form').onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const subject = String(f.get('subject')).trim();
    if (!subject) return toast('اكتبي اسم المادة');
    data.template.push({ day: Number(f.get('day')), subject, minutes: Number(f.get('minutes')) });
    if (save()) viewTimetable();
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

  document.getElementById('tt-preview').onclick = () => preview(timetableDoc(data));
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
      if (s) preview(worksheetDoc(s));
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

// ---------- المذكرات ----------

function viewNotes() {
  const notes = [...data.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  page({
    title: '⭐ المذكرات',
    active: 'notes',
    body: `
      <a class="btn primary block" href="#/note/new">➕ مذكرة جديدة</a>
      ${notes.length
        ? notes.map((n) => `
            <section class="card mint">
              <h2>${esc(n.objective || 'مذكرة بلا هدف')}</h2>
              <p>${esc(n.unit)} · ${esc(n.createdAt.slice(0, 10))}</p>
              <div class="actions">
                <a class="btn small" href="#/note/${n.id}">تعديل</a>
                <button class="btn small" data-pdf="${n.id}">معاينة PDF</button>
              </div>
            </section>`).join('')
        : '<p class="muted center">لا توجد مذكرات بعد.</p>'}`,
  });
  app.querySelectorAll('[data-pdf]').forEach((btn) => {
    btn.onclick = () => {
      const n = data.notes.find((x) => x.id === btn.dataset.pdf);
      if (n) preview(noteDoc(n));
    };
  });
}

function readNoteForm(base) {
  const v = (name) => document.querySelector(`[name="${name}"]`).value.trim();
  return {
    id: base.id,
    createdAt: base.createdAt,
    domain: v('domain'),
    unit: v('unit'),
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

function viewNoteEdit(id) {
  const existing = id === 'new' ? null : data.notes.find((n) => n.id === id);
  if (id !== 'new' && !existing) return go('#/notes');
  const n = existing ?? {
    id: newId(),
    createdAt: new Date().toISOString(),
    domain: '', unit: '', objective: '', competency: '',
    noteNumber: '', resources: '', duration: '',
    phases: PHASE_NAMES.map((name) => ({ name, situations: '', indicators: '' })),
  };
  const field = (label, name, value, rows = 0) => `
    <label class="field">${label}
      ${rows
        ? `<textarea name="${name}" rows="${rows}">${esc(value)}</textarea>`
        : `<input name="${name}" value="${esc(value)}" autocomplete="off">`}
    </label>`;

  page({
    title: existing ? '📝 تعديل المذكرة' : '📝 مذكرة جديدة',
    active: 'notes',
    back: '#/notes',
    body: `
      <section class="card pink">
        <h2>🌸 رأس المذكرة</h2>
        ${field('الميدان', 'domain', n.domain)}
        ${field('المقطع التعلمي', 'unit', n.unit)}
        ${field('الهدف التعلمي', 'objective', n.objective, 2)}
        ${field('الكفاءة المستهدفة', 'competency', n.competency, 2)}
      </section>

      <section class="card blue">
        <h2>🎈 جانب المذكرة</h2>
        ${field('رقم المذكرة', 'noteNumber', n.noteNumber)}
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
        <button class="btn primary block" id="n-save">حفظ المذكرة</button>
        <button class="btn block" id="n-check">فحص مؤشرات الانطلاق 🌟 (Gemini)</button>
        <button class="btn block" id="n-pdf">معاينة PDF</button>
        ${existing ? '<button class="btn danger block" id="n-delete">حذف المذكرة</button>' : ''}
      </div>`,
  });

  document.getElementById('n-save').onclick = () => {
    const note = readNoteForm(n);
    const idx = data.notes.findIndex((x) => x.id === note.id);
    if (idx === -1) data.notes.push(note);
    else data.notes[idx] = note;
    if (save()) {
      toast('تم حفظ المذكرة على الهاتف 🦋');
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

  document.getElementById('n-pdf').onclick = () => preview(noteDoc(readNoteForm(n)));

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

  document.getElementById('s-export').onclick = () => exportBackup(data);

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

