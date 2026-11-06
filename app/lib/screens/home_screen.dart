import 'package:flutter/material.dart';

import '../core/models.dart';
import '../core/scheduler.dart';
import '../data/app_store.dart';
import '../theme/bambi_theme.dart';
import '../widgets/bambi_card.dart';
import 'lesson_note_screen.dart';
import 'notes_list_screen.dart';
import 'settings_screen.dart';
import 'support_sheets_screen.dart';
import 'timetable_screen.dart';
import 'week_setup_screen.dart';

/// 🌸 لوحة القيادة الأسبوعية (الشاشة الرئيسية).
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _store = AppStore();
  AppData? _data;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  Future<void> _reload() async {
    final data = await _store.load();
    if (!mounted) return;
    setState(() => _data = data);
  }

  Future<void> _open(Widget page) async {
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));
    await _reload();
  }

  Future<void> _changeWeek(int delta) async {
    final data = _data;
    if (data == null) return;
    data.currentWeek = (data.currentWeek + delta).clamp(1, kTotalWeeks).toInt();
    await _store.save(data);
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final data = _data;
    return Scaffold(
      appBar: AppBar(
        title: const Text('🌸 مكتب نهاد'),
        actions: [
          IconButton(
            tooltip: 'الإعدادات',
            icon: const Text('🦋', style: TextStyle(fontSize: 22)),
            onPressed: () => _open(const SettingsScreen()),
          ),
        ],
      ),
      body: data == null
          ? const Center(child: CircularProgressIndicator())
          : _buildBody(data),
    );
  }

  Widget _buildBody(AppData data) {
    final plan = buildPlan(data);
    final week = data.currentWeek;
    final status = data.statusOf(week);
    final occurrences = plan.inWeek(week);
    final sheets = data.sheets.where((s) => s.week == week).toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            IconButton(
              tooltip: 'الأسبوع السابق',
              onPressed: week > 1 ? () => _changeWeek(-1) : null,
              icon: const Icon(Icons.remove_circle_outline),
            ),
            Text(
              'الأسبوع $week / $kTotalWeeks',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            IconButton(
              tooltip: 'الأسبوع التالي',
              onPressed: week < kTotalWeeks ? () => _changeWeek(1) : null,
              icon: const Icon(Icons.add_circle_outline),
            ),
          ],
        ),
        const SizedBox(height: 8),
        BambiCard(
          emoji: '🎈',
          title: 'حالة الأسبوع',
          color: BambiColors.butter,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(weekStatusLabel(status)),
              for (final w in plan.warnings)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text('⚠️ $w'),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        BambiCard(
          emoji: '📅',
          title: 'حصص الأسبوع',
          color: BambiColors.blue,
          child: occurrences.isEmpty
              ? const Text('القالب الأسبوعي فارغ. أضيفي الحصص من الجدول والمنهج.')
              : status == WeekStatus.paused || status == WeekStatus.assessment
                  ? Text(
                      status == WeekStatus.paused
                          ? 'أسبوع متوقف، لا تُولَّد فيه حصص.'
                          : 'أسبوع تقويم، تتوقف فيه تحضيرات الدروس.',
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        for (final o in occurrences)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Text(
                              '${kWeekdays[o.day]} · ${o.subject} — '
                              '${_occurrenceText(o)}',
                            ),
                          ),
                      ],
                    ),
        ),
        const SizedBox(height: 12),
        BambiCard(
          emoji: '🌈',
          title: 'أوراق الدعم',
          color: BambiColors.lavender,
          child: Text(
            sheets.isEmpty
                ? 'لا توجد أوراق دعم لهذا الأسبوع.'
                : '${sheets.length} ورقة دعم لهذا الأسبوع.',
          ),
        ),
        const SizedBox(height: 12),
        BambiCard(
          emoji: '⭐',
          title: 'المذكرات',
          color: BambiColors.mint,
          child: Text('عدد المذكرات المحفوظة: ${data.notes.length}'),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            FilledButton(
              onPressed: () => _open(const LessonNoteScreen()),
              child: const Text('مذكرة جديدة 📝'),
            ),
            OutlinedButton(
              onPressed: () => _open(WeekSetupScreen(week: week)),
              child: const Text('أيام غير دراسية وحالة الأسبوع'),
            ),
            OutlinedButton(
              onPressed: () => _open(const TimetableScreen()),
              child: const Text('الجدول والمنهج 🗓️'),
            ),
            OutlinedButton(
              onPressed: () => _open(const SupportSheetsScreen()),
              child: const Text('أوراق الدعم 🌈'),
            ),
            OutlinedButton(
              onPressed: () => _open(const NotesListScreen()),
              child: const Text('كل المذكرات ⭐'),
            ),
          ],
        ),
      ],
    );
  }
}

String _occurrenceText(Occurrence o) => switch (o.state) {
      OccurrenceState.lesson =>
        '${o.lessonTitle}${o.delayed ? ' (مُؤجَّل)' : ''}',
      OccurrenceState.lost => 'يوم غير دراسي',
      OccurrenceState.free => 'بلا درس، لم يبقَ دروس لهذه المادة',
      OccurrenceState.unavailable => 'متوقفة أو تقويم',
    };
