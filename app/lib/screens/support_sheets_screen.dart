import 'package:flutter/material.dart';

import '../core/models.dart';
import '../data/app_store.dart';
import '../pdf/pdf_builder.dart';
import '../theme/bambi_theme.dart';
import 'pdf_preview_screen.dart';

/// 🌈 أوراق الدعم الاستثنائية: قائمة، وإنشاء من النقائص المسجّلة.
class SupportSheetsScreen extends StatefulWidget {
  const SupportSheetsScreen({super.key});

  @override
  State<SupportSheetsScreen> createState() => _SupportSheetsScreenState();
}

class _SupportSheetsScreenState extends State<SupportSheetsScreen> {
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

  Future<void> _createSheet() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const _NewSupportSheetScreen()),
    );
    if (created == true) await _load();
  }

  Future<void> _delete(SupportSheet sheet) async {
    final data = _data;
    if (data == null) return;
    data.sheets.removeWhere((s) => s.id == sheet.id);
    await _store.save(data);
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final data = _data;
    final sheets = data == null
        ? <SupportSheet>[]
        : (List<SupportSheet>.of(data.sheets)
          ..sort((a, b) => b.createdAt.compareTo(a.createdAt)));

    return Scaffold(
      appBar: AppBar(title: const Text('🌈 أوراق الدعم')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _createSheet,
        icon: const Icon(Icons.add),
        label: const Text('ورقة دعم جديدة'),
      ),
      body: data == null
          ? const Center(child: CircularProgressIndicator())
          : sheets.isEmpty
              ? const Padding(
                  padding: EdgeInsets.all(24),
                  child: Text(
                    'لا توجد أوراق دعم بعد. تُنشأ عند نهاية المقطع أو الأسبوع '
                    'من النقائص التي تسجّلينها.',
                    textAlign: TextAlign.center,
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: sheets.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, i) {
                    final s = sheets[i];
                    return Card(
                      color: BambiColors.lavender,
                      child: ListTile(
                        title: Text('${s.subject} · الأسبوع ${s.week}'),
                        subtitle: Text(
                          'مهارات: ${s.weakSkills.length} · تمارين: ${s.exercises.length}',
                        ),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => PdfPreviewScreen(
                              title: 'ورقة دعم ${s.subject}',
                              makePdf: () => buildWorksheetPdf(s),
                            ),
                          ),
                        ),
                        trailing: IconButton(
                          tooltip: 'حذف',
                          icon: const Icon(Icons.delete_outline),
                          onPressed: () => _delete(s),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}

class _NewSupportSheetScreen extends StatefulWidget {
  const _NewSupportSheetScreen();

  @override
  State<_NewSupportSheetScreen> createState() => _NewSupportSheetScreenState();
}

class _NewSupportSheetScreenState extends State<_NewSupportSheetScreen> {
  final _store = AppStore();
  final _skills = TextEditingController();
  final _exercises = TextEditingController();
  AppData? _data;
  String? _subject;
  late int _week;
  int _minutes = 30;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final data = await _store.load();
    if (!mounted) return;
    setState(() {
      _data = data;
      _week = data.currentWeek;
      _subject = data.subjects.isEmpty ? null : data.subjects.first;
    });
  }

  @override
  void dispose() {
    _skills.dispose();
    _exercises.dispose();
    super.dispose();
  }

  List<String> _lines(TextEditingController c) => c.text
      .split('\n')
      .map((l) => l.trim())
      .where((l) => l.isNotEmpty)
      .toList();

  Future<void> _save() async {
    final data = _data;
    final subject = _subject;
    final skills = _lines(_skills);
    if (data == null || subject == null || skills.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('اختاري المادة وأدخلي مهارة واحدة على الأقل')),
      );
      return;
    }
    data.sheets.add(SupportSheet(
      id: DateTime.now().microsecondsSinceEpoch.toString(),
      createdAt: DateTime.now(),
      week: _week,
      subject: subject,
      weakSkills: skills,
      exercises: _lines(_exercises),
      minutes: _minutes,
    ));
    await _store.save(data);
    if (mounted) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final data = _data;
    return Scaffold(
      appBar: AppBar(title: const Text('🌈 ورقة دعم جديدة')),
      body: data == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (data.subjects.isEmpty)
                  const Text('أضيفي حصص القالب أولاً من شاشة الجدول والمنهج.')
                else
                  DropdownButton<String>(
                    value: _subject,
                    isExpanded: true,
                    items: [
                      for (final s in data.subjects)
                        DropdownMenuItem(value: s, child: Text(s)),
                    ],
                    onChanged: (v) => setState(() => _subject = v),
                  ),
                DropdownButton<int>(
                  value: _week,
                  isExpanded: true,
                  items: [
                    for (var w = 1; w <= kTotalWeeks; w++)
                      DropdownMenuItem(value: w, child: Text('الأسبوع $w')),
                  ],
                  onChanged: (v) => setState(() => _week = v ?? _week),
                ),
                DropdownButton<int>(
                  value: _minutes,
                  isExpanded: true,
                  items: [
                    for (final m in kDurations)
                      DropdownMenuItem(value: m, child: Text('المدة: $m دقيقة')),
                  ],
                  onChanged: (v) => setState(() => _minutes = v ?? _minutes),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _skills,
                  maxLines: 5,
                  decoration: const InputDecoration(
                    labelText: 'المهارات غير المكتسبة (واحدة في كل سطر)',
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _exercises,
                  maxLines: 5,
                  decoration: const InputDecoration(
                    labelText: 'التمارين من كتاب الأنشطة (صفحة وتمرين في كل سطر)',
                    hintText: 'مثال: ص 12 تمرين 3',
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton(onPressed: _save, child: const Text('حفظ الورقة')),
              ],
            ),
    );
  }
}
