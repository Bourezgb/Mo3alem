// الثوابت والنماذج الأساسية. لا يعتمد هذا الملف على المتصفح، فيُختبر بـ Node.

export const TOTAL_WEEKS = 32;
export const INTEGRATION_WEEKS = [9, 17, 24, 32];
export const ASSESSMENT_WEEKS = [13, 25];
export const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
export const DURATIONS = [30, 60, 90];
export const LEVEL = 'الثانية ابتدائي';
export const PHASE_NAMES = ['الانطلاق', 'بناء التعلمات', 'الاستثمار'];
export const WEEK_STATUSES = ['study', 'integration', 'assessment', 'paused'];
export const WEEK_STATUS_LABELS = {
  study: 'دراسي',
  integration: 'إدماج',
  assessment: 'تقويم',
  paused: 'متوقف',
};

/** الحالة الافتراضية لأسبوع حسب التدرج السنوي. */
export function defaultWeekStatus(week) {
  if (INTEGRATION_WEEKS.includes(week)) return 'integration';
  if (ASSESSMENT_WEEKS.includes(week)) return 'assessment';
  return 'study';
}

/** القالب الأسبوعي الأصلي من استعمال الزمن (2026/2027)، مرتب حسب الوقت داخل كل يوم. */
export const SEED_TEMPLATE = [
  // الأحد
  { day: 0, subject: 'فهم المنطوق', minutes: 30 },
  { day: 0, subject: 'تعبير شفوي', minutes: 30 },
  { day: 0, subject: 'تربية إسلامية', minutes: 30 },
  { day: 0, subject: 'تربية فنية', minutes: 30 },
  { day: 0, subject: 'تربية بدنية', minutes: 60 },
  { day: 0, subject: 'قراءة', minutes: 60 },
  { day: 0, subject: 'كتابة', minutes: 30 },
  { day: 0, subject: 'إملاء', minutes: 30 },
  // الاثنين
  { day: 1, subject: 'إنتاج شفوي', minutes: 60 },
  { day: 1, subject: 'محفوظات', minutes: 30 },
  { day: 1, subject: 'رياضيات', minutes: 60 },
  { day: 1, subject: 'تربية إسلامية', minutes: 30 },
  { day: 1, subject: 'رياضيات', minutes: 30 },
  { day: 1, subject: 'قراءة', minutes: 60 },
  { day: 1, subject: 'إملاء', minutes: 30 },
  // الثلاثاء
  { day: 2, subject: 'قراءة', minutes: 60 },
  { day: 2, subject: 'كتابة', minutes: 30 },
  { day: 2, subject: 'إملاء', minutes: 30 },
  { day: 2, subject: 'تربية فنية', minutes: 30 },
  { day: 2, subject: 'تربية إسلامية', minutes: 30 },
  // الأربعاء
  { day: 3, subject: 'رياضيات', minutes: 60 },
  { day: 3, subject: 'تربية فنية', minutes: 30 },
  { day: 3, subject: 'قراءة', minutes: 60 },
  { day: 3, subject: 'إملاء', minutes: 30 },
  { day: 3, subject: 'تربية بدنية', minutes: 60 },
  { day: 3, subject: 'رياضيات', minutes: 30 },
  { day: 3, subject: 'محفوظات', minutes: 30 },
  // الخميس
  { day: 4, subject: 'رياضيات', minutes: 90 },
  { day: 4, subject: 'ألعاب رياضياتية', minutes: 30 },
  { day: 4, subject: 'إدماج', minutes: 60 },
];

export function seedTemplate() {
  return SEED_TEMPLATE.map((s) => ({ ...s }));
}

/** حالة الأسبوع بعد تعديلات المعلمة. */
export function statusOf(data, week) {
  return data.weekStatus[week] ?? defaultWeekStatus(week);
}

export function lostIn(data, week) {
  return data.lostDays.filter((l) => l.week === week);
}

/** المواد الموجودة في القالب، بترتيب ظهورها. */
export function subjectsOf(data) {
  const seen = [];
  for (const slot of data.template) {
    if (!seen.includes(slot.subject)) seen.push(slot.subject);
  }
  return seen;
}

export function emptyData() {
  return {
    notes: [],
    template: seedTemplate(),
    curriculum: {},
    weekStatus: {},
    lostDays: [],
    sheets: [],
    currentWeek: 1,
  };
}

/** يملأ أي بيانات مستوردة أو مخزّنة بالحقول الناقصة، ويتحقق من الشكل الأساسي. */
export function normalize(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('ملف البيانات غير صالح');
  const base = emptyData();
  const data = {
    notes: Array.isArray(raw.notes) ? raw.notes : base.notes,
    template: Array.isArray(raw.template) ? raw.template : seedTemplate(),
    curriculum: raw.curriculum && typeof raw.curriculum === 'object' ? raw.curriculum : base.curriculum,
    weekStatus: raw.weekStatus && typeof raw.weekStatus === 'object' ? raw.weekStatus : base.weekStatus,
    lostDays: Array.isArray(raw.lostDays) ? raw.lostDays : base.lostDays,
    sheets: Array.isArray(raw.sheets) ? raw.sheets : base.sheets,
    currentWeek: Number.isInteger(raw.currentWeek) ? raw.currentWeek : 1,
  };
  data.currentWeek = Math.min(Math.max(data.currentWeek, 1), TOTAL_WEEKS);
  return data;
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
