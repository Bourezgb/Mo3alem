import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';

import '../models/lesson_note.dart';

/// تخزين المذكرات محلياً في ملف JSON واحد على الهاتف.
/// لا يُرسل شيء إلى أي خادم.
class NoteRepository {
  static const _folder = 'mo3alem';
  static const _fileName = 'notes.json';

  Future<File> _file() async {
    final dir = await getApplicationDocumentsDirectory();
    final folder = Directory('${dir.path}/$_folder');
    await folder.create(recursive: true);
    return File('${folder.path}/$_fileName');
  }

  Future<List<LessonNote>> loadAll() async {
    final file = await _file();
    if (!await file.exists()) return [];
    final raw = await file.readAsString();
    if (raw.trim().isEmpty) return [];
    final list = jsonDecode(raw) as List<dynamic>;
    return list
        .map((e) => LessonNote.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// يضيف المذكرة أو يحدّثها إن كان معرّفها موجوداً.
  /// الكتابة تتم في ملف مؤقت ثم يُستبدل الأصل، لتفادي تلف البيانات عند الانقطاع.
  Future<void> save(LessonNote note) async {
    final notes = await loadAll();
    final index = notes.indexWhere((n) => n.id == note.id);
    if (index == -1) {
      notes.add(note);
    } else {
      notes[index] = note;
    }

    final file = await _file();
    final tmp = File('${file.path}.tmp');
    await tmp.writeAsString(
      jsonEncode(notes.map((n) => n.toJson()).toList()),
      flush: true,
    );
    await tmp.rename(file.path);
  }

  /// يُرجع نسخة من ملف البيانات لتصديرها (مثلاً عبر المشاركة إلى التخزين أو Drive).
  Future<File> exportBackup() async {
    final source = await _file();
    final dir = await getTemporaryDirectory();
    final stamp = DateTime.now().toIso8601String().split('T').first;
    final target = File('${dir.path}/mo3alem_backup_$stamp.json');
    return source.copy(target.path);
  }
}
