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

/**
 * المنهج الأولي من المخطط السنوي (قراءة من الصورة). الأسابيع 1-2 و13 و25 والإدماج (9 و17 و24 و32) مستبعدة.
 * تُملأ فقط عندما يكون المنهج فارغاً؛ يمكن تعديلها من شاشة الجدول والمنهج.
 */
export const SEED_CURRICULUM = {
  'رياضيات': [
    'عد كميات صغيرة وجمعها وطرحها ومتتالية الأعداد 0 إلى 29',
    'الجدول ذو المدخلين ومقارنة الأعداد 0 إلى 29',
    'وضعيات جمعية وطرحية ونقل رسم على مرصوفة',
    'الأعداد إلى 69: الوحدات والعشرات',
    'تفكيك الأعداد إلى 69',
    'إتمام العشرة من 70 إلى 99 والتعرف على استقامية الأشياء',
    'قياس الأطوال 1 وشريط الأعداد حتى 100',
    'جمع عددين حتى 100 وقياس الأطوال 2',
    'المضاعفات: الضعف والنصف والجمع دون احتفاظ',
    'متتالية الأعداد إلى 199 والزاوية القائمة',
    'الجمع بالاحتفاظ ومتتالية الأعداد إلى 999 (1)',
    'العملة: استخراج المعطيات 2',
    'الساعة والتعرف على الشكل المستوي ومتتالية الأعداد إلى 999 (2)',
    'طرح عدد ذي رقمين وقياس المدة',
    'رسم شكل هندسي ومتتالية الأعداد إلى 999 (3)',
    'التمثيل البياني ومتتالية الأعداد إلى 999 (4)',
    'وضع عملية الطرح بالاستعارة',
    'تكبير رسم على مرصوفة ومحور التناظر',
    'الضرب: جدول الضرب في 5 والتناظر المحوري',
    'ضرب عدد في 3 والتعرف على بعض المجسمات (1)',
    'ضرب عدد ذي رقمين في عدد ذي رقم واحد',
    'الحاسبة ومشكلات ضربية وجمعية وطرحية وبعض المجسمات (2)',
  ],
  'ألعاب رياضياتية': [
    'إيجاد الدخيل', 'مهمة التشفير', 'الربط التسلسلي للأرقام', 'أعواد الثقاب',
    'مسابقة في متاهة', 'هرم الأعداد', 'لعبة الفروق', 'أحسب وألوّن',
    'فك التشفير للحساب', 'لعبة سودوكو', 'الأرقام المتقاطعة', 'البحث عن الشكل الصحيح',
    'لعبة الاسبلدال', 'تطابق الشكل مع العدد', 'الأشكال المتداخلة', 'لعبة النرد',
    'التمييز والتصنيف', 'العثور على القطعة الناقصة', 'تحدي التحفة', 'التصنيف',
    'اختيار الجواب الصحيح', 'تتبع النمط', 'لعبة التطابق', 'العدد الناقص',
  ],
  'تربية فنية': [
    'أصوات من البيئة المحيطة', 'خامات الرسم والتلوين', 'جملة موسيقية: لحن معين (أداء البيت 2 من النشيد الوطني)',
    'خامات الرسم والتلوين', 'جملة موسيقية محلية (أداء البيت 3 من النشيد الوطني)', 'خامات الرسم والتلوين',
    'تقنيات خامات الرسم والتلوين', 'الجملة الموسيقية العربية: مدرستي الحبيبة',
    'الصرت الحاد والصرت الغليظ (أنشودة دق الجرس)', 'خصائص ومميزات الخامات',
    'الصوت الطويل والصوت القصير (أنشودة أركان الإسلام)', 'الألوان الأساسية',
    'الجملة الموسيقية الطويلة والقصيرة (أنشودة من جبالنا)', 'الألوان الثانوية',
    'الجملة الموسيقية الغليظة والحادة (من جبالنا)', 'الجملة الموسيقية الصاعدة والنازلة (أنشودة الممرضة)',
    'الخامات المسترجعة', 'الجملة الموسيقية المكررة (الممرضة)',
    'عائلة الآلات الموسيقية: هيا نلعب', 'الخامات المسترجعة',
    'آلة الطبل التقليدي (سفينة الهوى)', 'آلة الغيطة والعود (سفينة الهوى والفلاح الصغير)',
    'الألوان الثانوية',
  ],
  'قراءة': [
    'اليوم تعود إلى المدرسة', 'ساحة المدرسة', 'في القسم', 'زفاف أختي',
    'اليوم ننظف بيتنا', 'عائلتي تحتفل بالاستقلال', 'بين المدينة والريف', 'من خيرات الريف',
    'في المحلات الكبرى', 'مرآة حاسمة', 'هواياتي', 'أصدقاء الكتاب',
    'نظافة الحي', 'لا أبذر الماء', 'واحة ساحرة', 'فطور الصباح',
    'صحتي في غذائي', 'أحافظ على صحة أسناني', 'مفاجأة سارة', 'حصتي المفضلة',
    'بحث في الانترنت', 'زيارة المتحف', 'الاحتفال بالعام الأمازيغي (يناير)', 'عيد الزربية',
  ],
};

export function seedCurriculum() {
  const out = {};
  for (const [k, v] of Object.entries(SEED_CURRICULUM)) out[k] = [...v];
  return out;
}

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

/** بيانات رأس الوثائق المطبوعة. قابلة للتعديل من الإعدادات. */
export const DEFAULT_PROFILE = {
  teacher: 'درباسي نهاد',
  school: 'الحاج أحمد سبدو',
  zone: 'المقاطعة 1: درمام سبدو',
  district: 'مديرية التربية لولاية تلمسان',
  year: '2026/2027',
};

export function emptyData() {
  return {
    profile: { ...DEFAULT_PROFILE },
    templateSeeded: true,
    notes: [],
    template: seedTemplate(),
    curriculum: seedCurriculum(),
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
  // بيانات قديمة حُفظت بقالب فارغ قبل إدخال القالب الأصلي: تُملأ مرة واحدة فقط.
  const needsSeed = raw.templateSeeded !== true
    && (!Array.isArray(raw.template) || raw.template.length === 0);
  const data = {
    templateSeeded: true,
    profile: { ...DEFAULT_PROFILE, ...(raw.profile && typeof raw.profile === 'object' ? raw.profile : {}) },
    notes: Array.isArray(raw.notes) ? raw.notes : base.notes,
    template: needsSeed ? seedTemplate() : (Array.isArray(raw.template) ? raw.template : []),
    curriculum: raw.curriculum && typeof raw.curriculum === 'object' && Object.keys(raw.curriculum).length && !needsSeed ? raw.curriculum : base.curriculum,
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
