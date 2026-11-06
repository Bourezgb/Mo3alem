import 'package:flutter/material.dart';

import '../data/note_repository.dart';
import '../models/lesson_note.dart';
import '../theme/bambi_theme.dart';
import '../widgets/bambi_card.dart';

/// 📝 شاشة المذكرة اليومية
/// الحقول الثلاثة: رأس المذكرة (أعلى)، وجانب المذكرة، والجدول بالمراحل الثلاث.
/// الحفظ على الجهاز ومعاينة PDF يُضافان في الخطوة التالية.
class LessonNoteScreen extends StatefulWidget {
  const LessonNoteScreen({super.key});

  @override
  State<LessonNoteScreen> createState() => _LessonNoteScreenState();
}

class _LessonNoteScreenState extends State<LessonNoteScreen> {
  static const _phases = ['الانطلاق', 'بناء التعلمات', 'الاستثمار'];

  final _repository = NoteRepository();
  final _id = DateTime.now().microsecondsSinceEpoch.toString();
  final _createdAt = DateTime.now();
  bool _saving = false;

  final _domain = TextEditingController();
  final _unit = TextEditingController();
  final _objective = TextEditingController();
  final _competency = TextEditingController();
  final _noteNumber = TextEditingController();
  final _resources = TextEditingController();
  final _duration = TextEditingController();

  late final List<TextEditingController> _situations =
      List.generate(_phases.length, (_) => TextEditingController());
  late final List<TextEditingController> _indicators =
      List.generate(_phases.length, (_) => TextEditingController());

  @override
  void dispose() {
    for (final c in [
      _domain,
      _unit,
      _objective,
      _competency,
      _noteNumber,
      _resources,
      _duration,
      ..._situations,
      ..._indicators,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    final note = LessonNote(
      id: _id,
      createdAt: _createdAt,
      domain: _domain.text.trim(),
      unit: _unit.text.trim(),
      objective: _objective.text.trim(),
      competency: _competency.text.trim(),
      noteNumber: _noteNumber.text.trim(),
      resources: _resources.text.trim(),
      duration: _duration.text.trim(),
      phases: [
        for (var i = 0; i < _phases.length; i++)
          LessonPhase(
            name: _phases[i],
            situations: _situations[i].text.trim(),
            indicators: _indicators[i].text.trim(),
          ),
      ],
    );

    try {
      await _repository.save(note);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تم حفظ المذكرة على الهاتف 🦋')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('تعذر الحفظ، حاولي مرة أخرى: $e')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _field(String label, TextEditingController c, {int lines = 1}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: c,
        maxLines: lines,
        decoration: InputDecoration(
          labelText: label,
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none,
          ),
        ),
      ),
    );
  }

  Widget _phaseTable() {
    return Table(
      border: TableBorder.all(color: BambiColors.plum.withValues(alpha: 0.2)),
      columnWidths: const {
        0: FlexColumnWidth(1),
        1: FlexColumnWidth(2),
        2: FlexColumnWidth(2),
      },
      children: [
        const TableRow(
          decoration: BoxDecoration(color: BambiColors.butter),
          children: [
            _Cell('المراحل', bold: true),
            _Cell('الوضعيات التعلمية', bold: true),
            _Cell('مؤشرات التقويم', bold: true),
          ],
        ),
        for (var i = 0; i < _phases.length; i++)
          TableRow(
            children: [
              _Cell(_phases[i], bold: true),
              _InputCell(_situations[i]),
              _InputCell(_indicators[i]),
            ],
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('📝 المذكرة اليومية')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          BambiCard(
            emoji: '🌸',
            title: 'رأس المذكرة',
            color: BambiColors.pink,
            child: Column(
              children: [
                _field('الميدان', _domain),
                _field('المقطع التعلمي', _unit),
                _field('الهدف التعلمي', _objective, lines: 2),
                _field('الكفاءة المستهدفة', _competency, lines: 2),
              ],
            ),
          ),
          const SizedBox(height: 12),
          BambiCard(
            emoji: '🎈',
            title: 'جانب المذكرة',
            color: BambiColors.blue,
            child: Column(
              children: [
                _field('رقم المذكرة', _noteNumber),
                const TextField(
                  enabled: false,
                  decoration: InputDecoration(
                    labelText: 'المستوى',
                    hintText: 'الثانية ابتدائي',
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                _field('الوسائل', _resources, lines: 2),
                _field('المدة الزمنية', _duration),
              ],
            ),
          ),
          const SizedBox(height: 12),
          BambiCard(
            emoji: '⭐',
            title: 'مراحل الدرس',
            color: BambiColors.mint,
            child: _phaseTable(),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _saving ? null : _save,
            child: Text(_saving ? 'جارٍ الحفظ…' : 'حفظ المذكرة'),
          ),
        ],
      ),
    );
  }
}

class _Cell extends StatelessWidget {
  const _Cell(this.text, {this.bold = false});

  final String text;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(8),
      child: Text(
        text,
        style: TextStyle(fontWeight: bold ? FontWeight.w700 : FontWeight.w400),
      ),
    );
  }
}

class _InputCell extends StatelessWidget {
  const _InputCell(this.controller);

  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(4),
      child: TextField(
        controller: controller,
        maxLines: null,
        decoration: const InputDecoration(
          isDense: true,
          border: InputBorder.none,
        ),
      ),
    );
  }
}
