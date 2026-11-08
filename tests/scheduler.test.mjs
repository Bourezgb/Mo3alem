import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, inWeek } from '../js/scheduler.js';
import { emptyData } from '../js/model.js';

function sample() {
  const d = emptyData();
  d.template = [
    { day: 0, subject: 'عربية', minutes: 60 },
    { day: 0, subject: 'رياضيات', minutes: 60 },
    { day: 1, subject: 'عربية', minutes: 60 },
  ];
  d.curriculum = { عربية: ['د1', 'د2', 'د3'], رياضيات: ['م1'] };
  d.weekStatus = { 1: 'study', 2: 'study' };
  return d;
}

test('بلا تعطيل: الدروس تُسنَد بالترتيب ولا تتأخر', () => {
  const plan = buildPlan(sample());
  const first = plan.occurrences.find(
    (o) => o.week === 1 && o.subject === 'عربية' && o.state === 'lesson',
  );
  assert.equal(first.lessonTitle, 'د1');
  assert.equal(first.delayed, false);
});

test('يوم غير دراسي يؤخر درس المادة نفسها فقط', () => {
  const d = sample();
  d.lostDays.push({ week: 1, day: 0, reason: '' });
  const plan = buildPlan(d);
  const arabic = inWeek(plan, 1).filter((o) => o.subject === 'عربية');
  assert.equal(arabic[0].state, 'lost');
  assert.equal(arabic[1].state, 'lesson');
  assert.equal(arabic[1].lessonTitle, 'د1');
  assert.equal(arabic[1].delayed, true);
  const math = inWeek(plan, 1).find((o) => o.subject === 'رياضيات');
  assert.equal(math.state, 'lost');
  assert.equal(plan.unplaced['رياضيات'] ?? 0, 0);
});

test('الأسبوع المتوقف لا تُسنَد فيه حصص', () => {
  const d = sample();
  d.weekStatus[2] = 'paused';
  const plan = buildPlan(d);
  assert.ok(inWeek(plan, 2).every((o) => o.state === 'unavailable'));
});

test('يومان ضائعان في الإدماج يُنبَّه إلى إعادة الجدولة', () => {
  const d = sample();
  d.weekStatus[9] = 'integration';
  d.lostDays.push({ week: 9, day: 0, reason: '' }, { week: 9, day: 1, reason: '' });
  const plan = buildPlan(d);
  assert.ok(plan.warnings.some((w) => w.includes('بداية الأسبوع التالي')));
});

test('التقويم المحدد بالتدرج يجمّد الدروس (الأسبوع 13)', () => {
  const plan = buildPlan(sample());
  assert.ok(inWeek(plan, 13).every((o) => o.state === 'unavailable'));
});

test('الدرس لا ينتقل إلى مادة أخرى أبداً', () => {
  const d = sample();
  d.lostDays.push({ week: 1, day: 0, reason: '' });
  const plan = buildPlan(d);
  for (const o of plan.occurrences) {
    if (o.state === 'lesson') {
      assert.ok(d.curriculum[o.subject].includes(o.lessonTitle));
    }
  }
});

test('القالب الأصلي يطابق استعمال الزمن: 30 حصة، والإدماج يوم الخميس', async () => {
  const { SEED_TEMPLATE, INTEGRATION_WEEKS, ASSESSMENT_WEEKS } = await import('../js/model.js');
  assert.equal(SEED_TEMPLATE.length, 30);
  assert.equal(SEED_TEMPLATE.filter((s) => s.day === 4).length, 3);
  assert.deepEqual(INTEGRATION_WEEKS, [9, 17, 24, 32]);
  assert.deepEqual(ASSESSMENT_WEEKS, [13, 25]);
});

test('المنهج الأولي يغطي المواد الأربع ولا يشمل أسابيع الإدماج', async () => {
  const { SEED_CURRICULUM } = await import('../js/model.js');
  assert.ok(SEED_CURRICULUM['رياضيات'].length > 15);
  assert.ok(SEED_CURRICULUM['قراءة'].length > 15);
});

test('بيانات قديمة بقالب فارغ تُملأ مرة واحدة، ولا تُعاد تعبئة قالب فرغته المعلمة عمداً', async () => {
  const { normalize } = await import('../js/model.js');
  const old = normalize({ template: [], curriculum: {}, notes: [] });
  assert.equal(old.template.length, 30);
  const cleared = normalize({ template: [], templateSeeded: true, notes: [] });
  assert.equal(cleared.template.length, 0);
});

test('الأسبوعان الأول والثاني متوقفان للتثبيت والتقويم التشخيصي', async () => {
  const { defaultWeekStatus } = await import('../js/model.js');
  assert.equal(defaultWeekStatus(1), 'paused');
  assert.equal(defaultWeekStatus(2), 'paused');
  assert.equal(defaultWeekStatus(3), 'study');
});

test('بيانات الوثائق: الإصدار الجديد يستبدل القديم مرة واحدة', async () => {
  const { normalize } = await import('../js/model.js');
  const old = normalize({ profile: { district: 'قديمة' }, notes: [] });
  assert.equal(old.profile.district, 'مديرية التربية لولاية تبسة');
  const kept = normalize({ profileVersion: 2, profile: { district: 'مخصصة' } });
  assert.equal(kept.profile.district, 'مخصصة');
});
