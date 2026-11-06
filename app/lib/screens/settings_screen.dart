import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

import '../data/note_repository.dart';
import '../theme/bambi_theme.dart';
import '../widgets/bambi_card.dart';

/// 🦋 شاشة الإعدادات: النسخ الاحتياطي.
/// الملف يُصدَّر إلى الهاتف فقط، عبر المشاركة، ولا يُرفع إلى أي خادم.
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _repository = NoteRepository();
  bool _exporting = false;

  Future<void> _exportBackup() async {
    setState(() => _exporting = true);
    try {
      final file = await _repository.exportBackup();
      await Share.shareXFiles(
        [XFile(file.path)],
        text: 'نسخة احتياطية من مكتب نهاد',
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('تعذر التصدير، حاولي مرة أخرى: $e')),
      );
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('🦋 الإعدادات')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          BambiCard(
            emoji: '💾',
            title: 'النسخ الاحتياطي',
            color: BambiColors.pink,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'تُصدَّر بياناتك إلى ملف على الهاتف. احفظيه في مكان آمن '
                  '(مثلاً الذاكرة الخارجية أو تطبيق تخزين تختارينه).',
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: _exporting ? null : _exportBackup,
                  child: Text(_exporting ? 'جارٍ التحضير…' : 'تصدير نسخة احتياطية'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
