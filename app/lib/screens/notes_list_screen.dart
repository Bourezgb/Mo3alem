import 'package:flutter/material.dart';

import '../data/app_store.dart';
import '../models/lesson_note.dart';
import '../pdf/pdf_builder.dart';
import '../theme/bambi_theme.dart';
import 'lesson_note_screen.dart';
import 'pdf_preview_screen.dart';

/// ⭐ قائمة المذكرات المحفوظة، مرتبة من الأحدث.
class NotesListScreen extends StatefulWidget {
  const NotesListScreen({super.key});

  @override
  State<NotesListScreen> createState() => _NotesListScreenState();
}

class _NotesListScreenState extends State<NotesListScreen> {
  final _store = AppStore();
  List<LessonNote>? _notes;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final data = await _store.load();
    if (!mounted) return;
    final notes = List<LessonNote>.of(data.notes)
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    setState(() => _notes = notes);
  }

  Future<void> _newNote() async {
    await Navigator.of(context)
        .push(MaterialPageRoute(builder: (_) => const LessonNoteScreen()));
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final notes = _notes;
    return Scaffold(
      appBar: AppBar(title: const Text('⭐ المذكرات')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _newNote,
        icon: const Icon(Icons.add),
        label: const Text('مذكرة جديدة'),
      ),
      body: notes == null
          ? const Center(child: CircularProgressIndicator())
          : notes.isEmpty
              ? const Padding(
                  padding: EdgeInsets.all(24),
                  child: Text(
                    'لا توجد مذكرات بعد.',
                    textAlign: TextAlign.center,
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: notes.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, i) {
                    final n = notes[i];
                    final title = n.objective.isEmpty ? 'مذكرة بلا هدف' : n.objective;
                    return Card(
                      color: BambiColors.mint,
                      child: ListTile(
                        title: Text(
                          title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text(
                          '${n.unit} · ${n.createdAt.toIso8601String().split('T').first}',
                        ),
                        trailing: IconButton(
                          tooltip: 'معاينة PDF',
                          icon: const Icon(Icons.picture_as_pdf_outlined),
                          onPressed: () => Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => PdfPreviewScreen(
                                title: 'مذكرة يومية',
                                makePdf: () => buildLessonNotePdf(n),
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
