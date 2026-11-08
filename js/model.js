// الثوابت والنماذج الأساسية. لا يعتمد هذا الملف على المتصفح، فيُختبر بـ Node.

export const TOTAL_WEEKS = 32;
export const INTEGRATION_WEEKS = [9, 17, 24];
export const ASSESSMENT_WEEKS = [13, 25, 32];
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
    template: [],
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
    template: Array.isArray(raw.template) ? raw.template : base.template,
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
