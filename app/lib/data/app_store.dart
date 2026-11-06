import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';

import '../core/models.dart';

/// تخزين كل بيانات التطبيق في ملف JSON واحد على الهاتف.
/// لا يُرسل شيء إلى أي خادم.
class AppStore {
  static const _folder = 'mo3alem';
  static const _fileName = 'mo3alem_data.json';

  Future<File> _file() async {
    final dir = await getApplicationDocumentsDirectory();
    final folder = Directory('${dir.path}/$_folder');
    await folder.create(recursive: true);
    return File('${folder.path}/$_fileName');
  }

  Future<AppData> load() async {
    final file = await _file();
    if (!await file.exists()) return AppData();
    final raw = await file.readAsString();
    if (raw.trim().isEmpty) return AppData();
    return AppData.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  }

  /// الكتابة في ملف مؤقت ثم استبدال الأصل، لتفادي تلف البيانات عند الانقطاع.
  Future<void> save(AppData data) async {
    final file = await _file();
    final tmp = File('${file.path}.tmp');
    await tmp.writeAsString(jsonEncode(data.toJson()), flush: true);
    await tmp.rename(file.path);
  }

  /// نسخة من ملف البيانات في مجلد مؤقت، لمشاركتها عبر تطبيقات الهاتف.
  Future<File> exportBackup() async {
    final source = await _file();
    if (!await source.exists()) await save(AppData());
    final dir = await getTemporaryDirectory();
    final stamp = DateTime.now().toIso8601String().split('T').first;
    return source.copy('${dir.path}/mo3alem_backup_$stamp.json');
  }
}
