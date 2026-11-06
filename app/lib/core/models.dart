import '../models/lesson_note.dart';

/// عدد أسابيع السنة البيداغوجية.
const int kTotalWeeks = 32;

/// أسابيع الإدماج حسب التدرج السنوي.
const List<int> kIntegrationWeeks = [9, 17, 24];

/// أسابيع التقويم حسب التدرج السنوي (تُجمَّد فيها تحضيرات الدروس).
/// الأسابيع الافتراضية، والمعلمة تغيّرها من شاشة الأسبوع متى أعلنت الوزارة تواريخها.
const List<int> kAssessmentWeeks = [13, 25, 32];

/// أيام الأسبوع الدراسي (الأحد إلى الخميس). الفهرس هو قيمة day في كل حصة.
const List<String> kWeekdays = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
];

/// مدد الحصص المسموح بها (بالدقائق).
const List<int> kDurations = [30, 60, 90];

enum WeekStatus { study, integration, assessment, paused }

String weekStatusLabel(WeekStatus status) => switch (status) {
      WeekStatus.study => 'دراسي',
      WeekStatus.integration => 'إدماج',
      WeekStatus.assessment => 'تقويم',
      WeekStatus.paused => 'متوقف',
    };

/// الحالة الافتراضية لأسبوع حسب التدرج السنوي، قبل أي تعديل من المعلمة.
WeekStatus defaultWeekStatus(int week) {
  if (kIntegrationWeeks.contains(week)) return WeekStatus.integration;
  if (kAssessmentWeeks.contains(week)) return WeekStatus.assessment;
  return WeekStatus.study;
}

/// حصة في القالب الأسبوعي الثابت.
class TemplateSlot {
  TemplateSlot({
    required this.day,
    required this.subject,
    required this.minutes,
  });

  /// 0 = الأحد ... 4 = الخميس.
  final int day;
  final String subject;
  final int minutes;

  Map<String, dynamic> toJson() => {
        'day': day,
        'subject': subject,
        'minutes': minutes,
      };

  factory TemplateSlot.fromJson(Map<String, dynamic> json) => TemplateSlot(
        day: json['day'] as int,
        subject: json['subject'] as String,
        minutes: json['minutes'] as int,
      );
}

/// يوم غير دراسي سجّلته المعلمة في أسبوع معيّن.
class LostDay {
  LostDay({required this.week, required this.day, this.reason = ''});

  final int week;
  final int day;
  final String reason;

  Map<String, dynamic> toJson() => {
        'week': week,
        'day': day,
        'reason': reason,
      };

  factory LostDay.fromJson(Map<String, dynamic> json) => LostDay(
        week: json['week'] as int,
        day: json['day'] as int,
        reason: json['reason'] as String? ?? '',
      );
}

/// ورقة دعم استثنائية، تُبنى من النقائص التي أدخلتها المعلمة.
class SupportSheet {
  SupportSheet({
    required this.id,
    required this.createdAt,
    required this.week,
    required this.subject,
    required this.weakSkills,
    required this.exercises,
    this.minutes = 30,
  });

  final String id;
  final DateTime createdAt;
  final int week;
  final String subject;
  final List<String> weakSkills;
  final List<String> exercises;
  final int minutes;

  Map<String, dynamic> toJson() => {
        'id': id,
        'createdAt': createdAt.toIso8601String(),
        'week': week,
        'subject': subject,
        'weakSkills': weakSkills,
        'exercises': exercises,
        'minutes': minutes,
      };

  factory SupportSheet.fromJson(Map<String, dynamic> json) => SupportSheet(
        id: json['id'] as String,
        createdAt: DateTime.parse(json['createdAt'] as String),
        week: json['week'] as int,
        subject: json['subject'] as String,
        weakSkills: (json['weakSkills'] as List<dynamic>)
            .map((e) => e as String)
            .toList(),
        exercises: (json['exercises'] as List<dynamic>)
            .map((e) => e as String)
            .toList(),
        minutes: json['minutes'] as int? ?? 30,
      );
}

/// كل بيانات التطبيق في ملف واحد، ليسهل التصدير والنسخ الاحتياطي.
class AppData {
  AppData({
    List<LessonNote>? notes,
    List<TemplateSlot>? template,
    Map<String, List<String>>? curriculum,
    Map<int, WeekStatus>? weekStatus,
    List<LostDay>? lostDays,
    List<SupportSheet>? sheets,
    this.currentWeek = 1,
  })  : notes = notes ?? [],
        template = template ?? [],
        curriculum = curriculum ?? {},
        weekStatus = weekStatus ?? {},
        lostDays = lostDays ?? [],
        sheets = sheets ?? [];

  final List<LessonNote> notes;

  /// القالب الأسبوعي الثابت، وترتيب الإدراج فيه هو ترتيب الحصص داخل اليوم.
  final List<TemplateSlot> template;

  /// المنهج: لكل مادة قائمة دروس مرتبة. الدرس الأول يُسنَد لأول حصة متاحة للمادة.
  final Map<String, List<String>> curriculum;

  /// تعديلات المعلمة على حالة الأسابيع فقط. الباقي يُحسب من التدرج السنوي.
  final Map<int, WeekStatus> weekStatus;

  final List<LostDay> lostDays;
  final List<SupportSheet> sheets;

  int currentWeek;

  WeekStatus statusOf(int week) => weekStatus[week] ?? defaultWeekStatus(week);

  List<LostDay> lostIn(int week) =>
      lostDays.where((l) => l.week == week).toList();

  /// المواد المستعملة في القالب، بترتيب ظهورها.
  List<String> get subjects {
    final seen = <String>[];
    for (final slot in template) {
      if (!seen.contains(slot.subject)) seen.add(slot.subject);
    }
    return seen;
  }

  Map<String, dynamic> toJson() => {
        'version': 1,
        'notes': notes.map((n) => n.toJson()).toList(),
        'template': template.map((t) => t.toJson()).toList(),
        'curriculum': curriculum,
        'weekStatus': {
          for (final e in weekStatus.entries) '${e.key}': e.value.name,
        },
        'lostDays': lostDays.map((l) => l.toJson()).toList(),
        'sheets': sheets.map((s) => s.toJson()).toList(),
        'currentWeek': currentWeek,
      };

  factory AppData.fromJson(Map<String, dynamic> json) {
    final curriculumRaw = (json['curriculum'] as Map<String, dynamic>?) ?? {};
    final statusRaw = (json['weekStatus'] as Map<String, dynamic>?) ?? {};
    return AppData(
      notes: (json['notes'] as List<dynamic>? ?? [])
          .map((e) => LessonNote.fromJson(e as Map<String, dynamic>))
          .toList(),
      template: (json['template'] as List<dynamic>? ?? [])
          .map((e) => TemplateSlot.fromJson(e as Map<String, dynamic>))
          .toList(),
      curriculum: curriculumRaw.map(
        (k, v) => MapEntry(k, (v as List<dynamic>).map((e) => e as String).toList()),
      ),
      weekStatus: statusRaw.map(
        (k, v) => MapEntry(int.parse(k), WeekStatus.values.byName(v as String)),
      ),
      lostDays: (json['lostDays'] as List<dynamic>? ?? [])
          .map((e) => LostDay.fromJson(e as Map<String, dynamic>))
          .toList(),
      sheets: (json['sheets'] as List<dynamic>? ?? [])
          .map((e) => SupportSheet.fromJson(e as Map<String, dynamic>))
          .toList(),
      currentWeek: json['currentWeek'] as int? ?? 1,
    );
  }
}
