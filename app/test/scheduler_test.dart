import 'package:flutter_test/flutter_test.dart';
import 'package:mo3alem_nihad/core/models.dart';
import 'package:mo3alem_nihad/core/scheduler.dart';

AppData sampleData() {
  return AppData(
    template: [
      TemplateSlot(day: 0, subject: 'عربية', minutes: 60),
      TemplateSlot(day: 0, subject: 'رياضيات', minutes: 60),
      TemplateSlot(day: 1, subject: 'عربية', minutes: 60),
    ],
    curriculum: {
      'عربية': ['د1', 'د2', 'د3'],
      'رياضيات': ['م1'],
    },
  );
}

void main() {
  test('بلا تعطيل: الدروس تُسنَد بالترتيب ولا تتأخر', () {
    final plan = buildPlan(sampleData());
    final first = plan.occurrences.firstWhere(
      (o) => o.week == 1 && o.subject == 'عربية' && o.state == OccurrenceState.lesson,
    );
    expect(first.lessonTitle, 'د1');
    expect(first.delayed, isFalse);
  });

  test('يوم غير دراسي يؤخر درس المادة نفسها فقط', () {
    final data = sampleData()..lostDays.add(LostDay(week: 1, day: 0));
    final plan = buildPlan(data);

    final arabicWeek1 = plan.inWeek(1).where((o) => o.subject == 'عربية').toList();
    expect(arabicWeek1[0].state, OccurrenceState.lost);
    expect(arabicWeek1[1].state, OccurrenceState.lesson);
    expect(arabicWeek1[1].lessonTitle, 'د1');
    expect(arabicWeek1[1].delayed, isTrue);

    final math = plan.inWeek(1).firstWhere((o) => o.subject == 'رياضيات');
    expect(math.state, OccurrenceState.lost);
    expect(plan.unplaced['رياضيات'] ?? 0, 0);
  });

  test('الأسبوع المتوقف لا تُسنَد فيه حصص', () {
    final data = sampleData()..weekStatus[2] = WeekStatus.paused;
    final plan = buildPlan(data);
    final week2 = plan.inWeek(2);
    expect(week2.every((o) => o.state == OccurrenceState.unavailable), isTrue);
  });

  test('يومان ضائعان في الإدماج يُنبَّه إلى إعادة الجدولة', () {
    final data = sampleData()
      ..weekStatus[9] = WeekStatus.integration
      ..lostDays.add(LostDay(week: 9, day: 0))
      ..lostDays.add(LostDay(week: 9, day: 1));
    final plan = buildPlan(data);
    expect(
      plan.warnings.any((w) => w.contains('بداية الأسبوع التالي')),
      isTrue,
    );
  });
}
