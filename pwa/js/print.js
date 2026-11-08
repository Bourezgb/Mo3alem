// قوالب الطباعة. تُعرض في المعاينة، ثم تُطبع أو تُحفظ PDF من حوار الطباعة في المتصفح.
// المتصفح يعالج العربية والخط والصفحات بشكل سليم.

import { WEEKDAYS, LEVEL } from './model.js';

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

export function noteDoc(n) {
  const rows = n.phases.map((p) => `
    <tr>
      <th>${esc(p.name)}</th>
      <td>${multiline(p.situations)}</td>
      <td>${multiline(p.indicators)}</td>
    </tr>`).join('');
  return `
  <article class="doc">
    <h1>مذكرة يومية</h1>
    <dl class="kv">
      <dt>الميدان</dt><dd>${esc(n.domain)}</dd>
      <dt>المقطع التعلمي</dt><dd>${esc(n.unit)}</dd>
      <dt>الهدف التعلمي</dt><dd>${multiline(n.objective)}</dd>
      <dt>الكفاءة المستهدفة</dt><dd>${multiline(n.competency)}</dd>
      <dt>رقم المذكرة</dt><dd>${esc(n.noteNumber)}</dd>
      <dt>المستوى</dt><dd>${esc(LEVEL)}</dd>
      <dt>الوسائل</dt><dd>${multiline(n.resources)}</dd>
      <dt>المدة الزمنية</dt><dd>${esc(n.duration)}</dd>
    </dl>
    <table class="grid">
      <thead><tr><th>المراحل</th><th>الوضعيات التعلمية</th><th>مؤشرات التقويم</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </article>`;
}

export function worksheetDoc(s) {
  const skills = s.weakSkills.map((x) => `<li>${esc(x)}</li>`).join('');
  const exercises = s.exercises.map((x, i) => `<li>${i + 1}. ${esc(x)}</li>`).join('');
  return `
  <article class="doc">
    <h1>ورقة دعم · ${esc(s.subject)}</h1>
    <p class="center">الأسبوع ${s.week} · المدة ${s.minutes} دقيقة</p>
    <p>الاسم واللقب: ........................................</p>
    <h2>المهارات المستهدفة</h2>
    <ul>${skills}</ul>
    <h2>تمارين الدعم</h2>
    <ol class="plain">${exercises}</ol>
  </article>`;
}

export function timetableDoc(data) {
  const rows = WEEKDAYS.map((day, d) => {
    const slots = data.template.filter((s) => s.day === d);
    const text = slots.length
      ? slots.map((s) => `${esc(s.subject)} (${s.minutes} د)`).join(' · ')
      : '—';
    return `<tr><th>${day}</th><td>${text}</td></tr>`;
  }).join('');
  return `
  <article class="doc landscape">
    <h1>الجدول الأسبوعي</h1>
    <table class="grid">
      <thead><tr><th>اليوم</th><th>الحصص</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </article>`;
}
