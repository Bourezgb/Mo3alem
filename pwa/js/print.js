// قوالب الطباعة الرسمية. تُعرض في المعاينة، ثم تُطبع أو تُحفظ PDF من حوار الطباعة في المتصفح.

import { WEEKDAYS, LEVEL, DEFAULT_PROFILE } from './model.js';

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function multiline(value) {
  return String(value ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map(esc)
    .join('<br>');
}

function profileOf(profile) {
  return { ...DEFAULT_PROFILE, ...(profile || {}) };
}

/** الصفحة بكاملها: رأس رسمي، عنوان، محتوى، وتذييل باسم الأستاذة. */
function page({ title, subtitle = '', profile, body, landscape = false, fill = false, bare = false, mono = false }) {
  const p = profileOf(profile);
  return `
  <article class="doc${landscape ? ' landscape' : ''}${fill ? ' fill' : ''}${mono ? ' mono' : ''}">
    <header class="doc-head">
      <div class="org">
        <p class="ministry">${esc(p.district)}</p>
        <p>${esc(p.zone)}</p>
        <p>المدرسة: ${esc(p.school)}</p>
      </div>
      <div class="year">
        <p>السنة الدراسية</p>
        <strong>${esc(p.year)}</strong>
        <p>${esc(LEVEL)}</p>
      </div>
    </header>
    ${bare ? '' : `<h1 class="doc-title">${esc(title)}</h1>`}
    ${!bare && subtitle ? `<p class="doc-sub">${esc(subtitle)}</p>` : ''}
    ${body}
    ${bare ? '' : `<footer class="doc-foot">
      <span>الأستاذة: ${esc(p.teacher)}</span>
      <span>${esc(title)}</span>
    </footer>`}
  </article>`;
}

export function noteDoc(n, profile) {
  const phases = n.phases.map((ph) => `
    <tr>
      <td class="ph">${esc(ph.name)}</td>
      <td>${multiline(ph.situations)}</td>
      <td>${multiline(ph.indicators)}</td>
    </tr>`).join('');
  const body = `
    <div class="note-sheet">
      <div class="note-head">
        <div class="note-right">
          <p><span>المقطع التعلمي:</span> ${esc(n.unit)}</p>
          <p><span>الميدان:</span> ${esc(n.domain)}</p>
          <p><span>النشاط:</span> ${esc(n.activity)}</p>
          <p><span>الموضوع:</span> ${esc(n.topic)}</p>
        </div>
        <div class="note-left">
          <p><span>الأسبوع</span> ${esc(n.noteNumber)}</p>
          <p><span>الحصة</span> ${esc(n.session)}</p>
          <p><span>المدة</span> ${esc(n.duration)}</p>
        </div>
      </div>
      <p class="note-objective"><span>الهدف التعلمي:</span> ${multiline(n.objective)}</p>
      <div class="phases-wrap">
        <table class="phases">
          <thead><tr><th>المراحل</th><th>الوضعيات التعلمية</th><th>مؤشرات التقويم</th></tr></thead>
          <tbody>${phases}</tbody>
        </table>
      </div>
      <div class="sign">
        <span>توقيع الأستاذة: ..........................</span>
      </div>
    </div>`;
  return page({ title: 'مذكرة يومية', profile, body, fill: true, bare: true, mono: true });
}

/** ملف يضم عدة مذكرات: كل مذكرة في صفحة مستقلة. */
export function noteFileDoc(notes, profile) {
  return notes.map((n) => noteDoc(n, profile)).join('');
}

export function worksheetDoc(s, profile) {
  const skills = s.weakSkills.map((x) => `<li><span class="box"></span>${esc(x)}</li>`).join('');
  const exercises = s.exercises.map((x, i) => `
    <li>
      <div><span class="n">${i + 1}</span> ${esc(x)}</div>
      <div class="line"></div><div class="line"></div>
    </li>`).join('');
  const body = `
    <div class="fields">
      <div><span>الاسم واللقب:</span></div>
      <div><span>التاريخ:</span></div>
      <div><span>الأسبوع:</span> ${s.week}</div>
    </div>
    <p class="doc-sub left">المادة: <strong>${esc(s.subject)}</strong> · المدة: ${s.minutes} دقيقة</p>
    <h2>المهارات المستهدفة</h2>
    <ul class="checks">${skills}</ul>
    <h2>تمارين الدعم</h2>
    <ul class="ex">${exercises || '<li>—</li>'}</ul>`;
  return page({ title: `ورقة دعم · ${s.subject}`, profile, body });
}

export function timetableDoc(data, profile) {
  const rows = WEEKDAYS.map((day, d) => {
    const slots = data.template.filter((s) => s.day === d);
    const total = slots.reduce((sum, s) => sum + s.minutes, 0);
    const cells = slots.length
      ? slots.map((s) => `<span class="chip">${esc(s.subject)} <small>${s.minutes} د</small></span>`).join('')
      : '—';
    return `<tr><th>${day}</th><td>${cells}</td><td class="num">${total} د</td></tr>`;
  }).join('');

  const totals = new Map();
  for (const s of data.template) {
    const t = totals.get(s.subject) || { count: 0, minutes: 0 };
    t.count += 1;
    t.minutes += s.minutes;
    totals.set(s.subject, t);
  }
  const summary = [...totals.entries()].map(([name, t]) => `
    <tr><td>${esc(name)}</td><td class="num">${t.count}</td><td class="num">${t.minutes} د</td></tr>`).join('');

  const body = `
    <h2>القالب الأسبوعي</h2>
    <table>
      <thead><tr><th>اليوم</th><th>الحصص بالترتيب</th><th>المجموع</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <h2>حصيلة الأسبوع لكل مادة</h2>
    <table class="narrow">
      <thead><tr><th>المادة</th><th>عدد الحصص</th><th>المدة الأسبوعية</th></tr></thead>
      <tbody>${summary || '<tr><td colspan="3">لا توجد حصص</td></tr>'}</tbody>
    </table>`;
  return page({ title: 'الجدول الأسبوعي', profile, body, landscape: true });
}
