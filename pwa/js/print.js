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
function page({ title, subtitle = '', profile, body, landscape = false }) {
  const p = profileOf(profile);
  return `
  <article class="doc${landscape ? ' landscape' : ''}">
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
    <h1 class="doc-title">${esc(title)}</h1>
    ${subtitle ? `<p class="doc-sub">${esc(subtitle)}</p>` : ''}
    ${body}
    <footer class="doc-foot">
      <span>الأستاذة: ${esc(p.teacher)}</span>
      <span>${esc(title)}</span>
    </footer>
  </article>`;
}

export function noteDoc(n, profile) {
  const phases = n.phases.map((ph, i) => `
    <tr>
      <td class="ph ph-${i % 3}">${esc(ph.name)}</td>
      <td>${multiline(ph.situations)}</td>
      <td>${multiline(ph.indicators)}</td>
    </tr>`).join('');
  const info = [
    ['الميدان', n.domain], ['المقطع التعلمي', n.unit],
    ['رقم المذكرة', n.noteNumber], ['المدة الزمنية', n.duration],
  ];
  const infoCells = info.map(([k, v]) => `<th>${k}</th><td>${esc(v)}</td>`);
  const pairs = [];
  for (let i = 0; i < infoCells.length; i += 2) {
    pairs.push(`<tr>${infoCells[i]}${infoCells[i + 1]}</tr>`);
  }
  const body = `
    <table class="info">
      ${pairs.join('')}
      <tr><th>المستوى</th><td colspan="3">${esc(LEVEL)}</td></tr>
      <tr><th>الهدف التعلمي</th><td colspan="3">${multiline(n.objective)}</td></tr>
      <tr><th>الكفاءة المستهدفة</th><td colspan="3">${multiline(n.competency)}</td></tr>
      <tr><th>الوسائل</th><td colspan="3">${multiline(n.resources)}</td></tr>
    </table>
    <h2>سير الحصة</h2>
    <table>
      <thead><tr><th>المرحلة</th><th>الوضعيات التعلمية</th><th>مؤشرات التقويم</th></tr></thead>
      <tbody>${phases}</tbody>
    </table>
    <div class="sign">
      <span>توقيع الأستاذة: ..........................</span>
      <span>ملاحظة المدير(ة): ..........................</span>
    </div>`;
  return page({ title: 'مذكرة يومية', subtitle: n.unit ? `المقطع: ${n.unit}` : '', profile, body });
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
