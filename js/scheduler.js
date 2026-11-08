// محرك الجدولة: نقل مباشر لقواعد النسخة Flutter (app/lib/core/scheduler.dart).
// القواعد:
// - القالب ثابت، وكل أسبوع يولّد نسخة منه، إلا المتوقف والتقويم.
// - الدروس تُسنَد بالترتيب داخل كل مادة، ولا تنتقل إلى مادة أخرى أبداً.
// - اليوم غير الدراسي يؤخر درس مادته إلى حصتها التالية.
// - يومان ضائعان في أسبوع الإدماج يُنبَّه إلى إعادة جدولة الوحدة من بداية الأسبوع التالي.
// - أسابيع التقويم والتوقف تجمّد التقدم.

import { TOTAL_WEEKS, defaultWeekStatus, statusOf, lostIn } from './model.js';

export function buildPlan(data) {
  const template = data.template;
  const order = template
    .map((_, i) => i)
    .sort((a, b) => template[a].day - template[b].day || a - b);

  // 1) الخطة الأصلية بلا تعطيل، لنعرف أي الدروس تأخرت.
  const baseline = {};
  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    if (defaultWeekStatus(w) === 'assessment') continue;
    for (const i of order) {
      (baseline[template[i].subject] ??= []).push(`${w}-${i}`);
    }
  }

  // 2) الجدول الفعلي.
  const lostKeys = new Set(data.lostDays.map((l) => `${l.week}-${l.day}`));
  const pointer = {};
  const occurrences = [];

  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    const status = statusOf(data, w);
    const frozen = status === 'paused' || status === 'assessment';
    for (const i of order) {
      const slot = template[i];
      const occ = {
        week: w,
        day: slot.day,
        slotIndex: i,
        subject: slot.subject,
        minutes: slot.minutes,
        weekStatus: status,
        state: 'unavailable',
        lessonIndex: null,
        lessonTitle: null,
        delayed: false,
      };

      if (frozen) {
        occ.state = 'unavailable';
      } else if (lostKeys.has(`${w}-${slot.day}`)) {
        occ.state = 'lost';
      } else {
        const queue = data.curriculum[slot.subject] ?? [];
        const p = pointer[slot.subject] ?? 0;
        if (p < queue.length) {
          occ.state = 'lesson';
          occ.lessonIndex = p;
          occ.lessonTitle = queue[p];
          pointer[slot.subject] = p + 1;
          const planned = baseline[slot.subject];
          occ.delayed = !planned || p >= planned.length || planned[p] !== `${w}-${i}`;
        } else {
          occ.state = 'free';
        }
      }
      occurrences.push(occ);
    }
  }

  // 3) التنبيهات.
  const warnings = [];
  const unplaced = {};
  for (const [subject, queue] of Object.entries(data.curriculum)) {
    const left = queue.length - (pointer[subject] ?? 0);
    if (left > 0) {
      unplaced[subject] = left;
      warnings.push(`بقيت ${left} حصة من ${subject} بلا فتحة حتى نهاية السنة`);
    }
  }
  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    if (statusOf(data, w) !== 'integration') continue;
    const lostCount = new Set(lostIn(data, w).map((l) => l.day)).size;
    if (lostCount >= 2) {
      warnings.push(
        `ضاع يومان أو أكثر من أسبوع الإدماج (${w})، تُعاد جدولة الوحدة الحالية من بداية الأسبوع التالي`,
      );
    }
  }

  return { occurrences, warnings, unplaced };
}

export function inWeek(plan, week) {
  return plan.occurrences.filter((o) => o.week === week);
}
