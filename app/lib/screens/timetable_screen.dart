import 'package:flutter/material.dart';

import '../core/models.dart';
import '../data/app_store.dart';
import '../pdf/pdf_builder.dart';
import '../theme/bambi_theme.dart';
import '../widgets/bambi_card.dart';
import 'pdf_preview_screen.dart';

/// 🗓️ القالب الأسبوعي الثابت، والمنهج لكل مادة.
class TimetableScreen extends StatefulWidget {
  const TimetableScreen({super.key});

  @override
  State<TimetableScreen> createState() => _TimetableScreenState();
}

class _TimetableScreenState extends State<TimetableScreen> {
  final _store = AppStore();
  AppData? _data;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final data = await _store.load();
    if (!mounted) return;
    setState(() => _data = data);
  }

  Future<void> _persist() async {
    final data = _data;
    if (data == null) return;
    await _store.save(data);
    if (mounted) setState(() {});
  }

  Future<void> _addSlot() async {
    final slot = await showDialog<TemplateSlot>(
      context: context,
      builder: (ctx) {
        var day = 0;
        var minutes = 60;
        final subject = TextEditingController();
        return StatefulBuilder(
          builder: (ctx, setDialog) => AlertDialog(
            title: const Text('إضافة حصة إلى القالب'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButton<int>(
                  value: day,
                  isExpanded: true,
                  items: [
                    for (var d = 0; d < kWeekdays.length; d++)
                      DropdownMenuItem(value: d, child: Text(kWeekdays[d])),
                  ],
                  onChanged: (v) => setDialog(() => day = v ?? day),
                ),
                TextField(
                  controller: subject,
                  decoration: const InputDecoration(labelText: 'المادة'),
                ),
                DropdownButton<int>(
                  value: minutes,
                  isExpanded: true,
                  items: [
                    for (final m in kDurations)
                      DropdownMenuItem(value: m, child: Text('$m دقيقة')),
                  ],
                  onChanged: (v) => setDialog(() => minutes = v ?? minutes),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('إلغاء'),
              ),
              FilledButton(
                onPressed: () {
                  final name = subject.text.trim();
                  if (name.isEmpty) return;
                  Navigator.pop(
                    ctx,
                    TemplateSlot(day: day, subject: name, minutes: minutes),
                  );
                },
                child: const Text('إضافة'),
              ),
            ],
          ),
        );
      },
    );
    if (slot == null || _data == null) return;
    _data!.template.add(slot);
    await _persist();
  }

  Future<void> _editLessons(String subject) async {
    final data = _data;
    if (data == null) return;
    final controller = TextEditingController(
      text: (data.curriculum[subject] ?? const <String>[]).join('\n'),
    );
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('دروس $subject'),
        content: SizedBox(
          width: double.maxFinite,
          child: TextField(
            controller: controller,
            maxLines: 14,
            decoration: const InputDecoration(
              hintText: 'درس في كل سطر، بالترتيب',
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('حفظ'),
          ),
        ],
      ),
    );
    if (saved == true) {
      final lessons = controller.text
          .split('\n')
          .map((l) => l.trim())
          .where((l) => l.isNotEmpty)
          .toList();
      data.curriculum[subject] = lessons;
      await _persist();
    }
    controller.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final data = _data;
    return Scaffold(
      appBar: AppBar(
        title: const Text('🗓️ الجدول والمنهج'),
        actions: [
          if (data != null)
            IconButton(
              tooltip: 'معاينة الجدول PDF',
              icon: const Icon(Icons.picture_as_pdf_outlined),
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => PdfPreviewScreen(
                    title: 'الجدول الأسبوعي',
                    makePdf: () => buildTimetablePdf(data),
                  ),
                ),
              ),
            ),
        ],
      ),
      floatingActionButton: data == null
          ? null
          : FloatingActionButton.extended(
              onPressed: _addSlot,
              icon: const Icon(Icons.add),
              label: const Text('حصة'),
            ),
      body: data == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                BambiCard(
                  emoji: '🌈',
                  title: 'القالب الأسبوعي',
                  color: BambiColors.blue,
                  child: data.template.isEmpty
                      ? const Text('لا توجد حصص. اضغطي "حصة" للإضافة.')
                      : Column(
                          children: [
                            for (var day = 0; day < kWeekdays.length; day++)
                              ..._daySection(data, day),
                          ],
                        ),
                ),
                const SizedBox(height: 12),
                BambiCard(
                  emoji: '📚',
                  title: 'المنهج لكل مادة',
                  color: BambiColors.mint,
                  child: data.subjects.isEmpty
                      ? const Text('أضيفي حصصاً أولاً لتظهر المواد هنا.')
                      : Column(
                          children: [
                            for (final subject in data.subjects)
                              ListTile(
                                contentPadding: EdgeInsets.zero,
                                title: Text(subject),
                                subtitle: Text(
                                  '${(data.curriculum[subject] ?? const []).length} درس',
                                ),
                                trailing: const Icon(Icons.edit_outlined),
                                onTap: () => _editLessons(subject),
                              ),
                          ],
                        ),
                ),
              ],
            ),
    );
  }

  List<Widget> _daySection(AppData data, int day) {
    final indexes = [
      for (var i = 0; i < data.template.length; i++)
        if (data.template[i].day == day) i,
    ];
    if (indexes.isEmpty) return const [];
    return [
      Padding(
        padding: const EdgeInsets.only(top: 8, bottom: 4),
        child: Text(
          kWeekdays[day],
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      for (final i in indexes)
        ListTile(
          contentPadding: EdgeInsets.zero,
          dense: true,
          title: Text(data.template[i].subject),
          subtitle: Text('${data.template[i].minutes} دقيقة'),
          trailing: IconButton(
            tooltip: 'حذف الحصة',
            icon: const Icon(Icons.delete_outline),
            onPressed: () async {
              data.template.removeAt(i);
              await _persist();
            },
          ),
        ),
    ];
  }
}
