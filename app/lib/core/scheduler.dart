import 'models.dart';

/// حالة حصة واحدة في الجدول الفعلي.
enum OccurrenceState {
  /// فيها درس مُسنَد.
  lesson,

  /// يوم غير دراسي سجّلته المعلمة.
  lost,

  /// حصة متاحة لكن لم يبقَ للمادة دروس.
  free,

  /// أسبوع متوقف أو تقويم: لا تُولَّد فيه حصص.
  unavailable,
}

/// حصة مولّدة من القالب في أسبوع معيّن.
class Occurrence {
  const Occurrence({
    required this.week,
    required this.day,
    required this.slotIndex,
    required this.subject,
    required this.minutes,
    required this.weekStatus,
    required this.state,
    this.lessonIndex,
    this.lessonTitle,
    this.delayed = false,
  });

  final int week;
  final int day;
  final int slotIndex;
  final String subject;
  final int minutes;
  final WeekStatus weekStatus;
  final OccurrenceState state;

  /// ترتيب الدرس داخل مادته (يبدأ من 0).
  final int? lessonIndex;
  final String? lessonTitle;

  /// هل وصل هذا الدرس متأخراً عن موضعه الأصلي في الخطة؟
  final bool delayed;
}

class SchedulePlan {
  const SchedulePlan({
    required this.occurrences,
    required this.warnings,
    required this.unplaced,
  });

  final List<Occurrence> occurrences;

  /// تنبيهات تُعرض للمعلمة (أيام ضائعة في الإدماج، دروس بلا فتحة...).
  final List<String> warnings;

  /// عدد الدروس التي لم تجد حصة حتى نهاية السنة، لكل مادة.
  final Map<String, int> unplaced;

  List<Occurrence> inWeek(int week) =>
      occurrences.where((o) => o.week == week).toList();
}

/// يبني الجدول الفعلي من القالب والمنهج والأيام غير الدراسية وحالات الأسابيع.
///
/// القواعد:
/// - القالب ثابت، وكل أسبوع يولّد نسخة منه، إلا الأسابيع المتوقفة أو التقويم.
/// - الدروس تُسنَد بالترتيب داخل كل مادة، ولا تنتقل إلى مادة أخرى أبداً.
/// - اليوم غير الدراسي يُفوِّت حصص ذلك اليوم، فيتقدم درس المادة إلى الحصة التالية لها.
/// - أسبوع الإدماج يمتص التأخر، وإن ضاع فيه يومان فأكثر تُعاد جدولة الوحدة من بداية الأسبوع التالي.
/// - أسابيع التقويم والتوقف تجمّد التقدم: لا تُسنَد فيها دروس.
SchedulePlan buildPlan(AppData data) {
  final template = data.template;

  // ترتيب الحصص زمنياً داخل الأسبوع: اليوم أولاً، ثم ترتيب الإدراج.
  final order = List<int>.generate(template.length, (i) => i)
    ..sort((a, b) {
      final byDay = template[a].day.compareTo(template[b].day);
      return byDay != 0 ? byDay : a.compareTo(b);
    });

  // 1) الخطة الأصلية بلا أي تعطيل. نحتاجها لنعرف أي الدروس تأخرت.
  //    مفتاح الحصة: "الأسبوع-فهرسها في القالب".
  final baseline = <String, List<String>>{};
  for (var w = 1; w <= kTotalWeeks; w++) {
    if (defaultWeekStatus(w) == WeekStatus.assessment) continue;
    for (final i in order) {
      baseline.putIfAbsent(template[i].subject, () => []).add('$w-$i');
    }
  }

  // 2) الجدول الفعلي.
  final lostKeys = {for (final l in data.lostDays) '${l.week}-${l.day}'};
  final pointer = <String, int>{};
  final occurrences = <Occurrence>[];

  for (var w = 1; w <= kTotalWeeks; w++) {
    final status = data.statusOf(w);
    for (final i in order) {
      final slot = template[i];
      final frozen =
          status == WeekStatus.paused || status == WeekStatus.assessment;

      var state = OccurrenceState.unavailable;
      int? lessonIndex;
      String? lessonTitle;
      var delayed = false;

      if (frozen) {
        state = OccurrenceState.unavailable;
      } else if (lostKeys.contains('$w-${slot.day}')) {
        state = OccurrenceState.lost;
      } else {
        final queue = data.curriculum[slot.subject] ?? const <String>[];
        final p = pointer[slot.subject] ?? 0;
        if (p < queue.length) {
          state = OccurrenceState.lesson;
          lessonIndex = p;
          lessonTitle = queue[p];
          pointer[slot.subject] = p + 1;

          final planned = baseline[slot.subject];
          delayed = planned == null ||
              p >= planned.length ||
              planned[p] != '$w-$i';
        } else {
          state = OccurrenceState.free;
        }
      }

      occurrences.add(Occurrence(
        week: w,
        day: slot.day,
        slotIndex: i,
        subject: slot.subject,
        minutes: slot.minutes,
        weekStatus: status,
        state: state,
        lessonIndex: lessonIndex,
        lessonTitle: lessonTitle,
        delayed: delayed,
      ));
    }
  }

  // 3) التنبيهات.
  final warnings = <String>[];
  final unplaced = <String, int>{};

  for (final entry in data.curriculum.entries) {
    final left = entry.value.length - (pointer[entry.key] ?? 0);
    if (left > 0) {
      unplaced[entry.key] = left;
      warnings.add(
        'بقيت $left حصة من ${entry.key} بلا فتحة حتى نهاية السنة',
      );
    }
  }

  for (var w = 1; w <= kTotalWeeks; w++) {
    if (data.statusOf(w) != WeekStatus.integration) continue;
    final lostCount = data.lostIn(w).map((l) => l.day).toSet().length;
    if (lostCount >= 2) {
      warnings.add(
        'ضاع يومان أو أكثر من أسبوع الإدماج ($w)، '
        'تُعاد جدولة الوحدة الحالية من بداية الأسبوع التالي',
      );
    }
  }

  return SchedulePlan(
    occurrences: occurrences,
    warnings: warnings,
    unplaced: unplaced,
  );
}
