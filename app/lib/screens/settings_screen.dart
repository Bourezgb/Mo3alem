import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

import '../data/app_store.dart';
import '../services/gemini_service.dart';
import '../theme/bambi_theme.dart';
import '../widgets/bambi_card.dart';

/// 🦋 الإعدادات: النسخ الاحتياطي ومفتاح Gemini.
/// كل شيء يبقى على الهاتف، ولا يُرفع إلى أي خادم إلا طلبات Gemini التي تطلبها المعلمة.
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _store = AppStore();
  final _gemini = GeminiService();
  final _keyController = TextEditingController();
  bool _exporting = false;
  bool _hasKey = false;

  @override
  void initState() {
    super.initState();
    _refreshKeyState();
  }

  @override
  void dispose() {
    _keyController.dispose();
    super.dispose();
  }

  Future<void> _refreshKeyState() async {
    final key = await _gemini.readKey();
    if (!mounted) return;
    setState(() => _hasKey = key != null);
  }

  void _snack(String text) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  Future<void> _exportBackup() async {
    setState(() => _exporting = true);
    try {
      final file = await _store.exportBackup();
      await Share.shareXFiles(
        [XFile(file.path)],
        text: 'نسخة احتياطية من مكتب نهاد',
      );
    } catch (e) {
      _snack('تعذّر التصدير، حاولي مرة أخرى: $e');
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  Future<void> _saveKey() async {
    final key = _keyController.text.trim();
    if (key.isEmpty) {
      _snack('أدخلي المفتاح أولاً');
      return;
    }
    await _gemini.saveKey(key);
    _keyController.clear();
    _snack('تم حفظ المفتاح على هذا الهاتف فقط 🔒');
    await _refreshKeyState();
  }

  Future<void> _deleteKey() async {
    await _gemini.deleteKey();
    _snack('تم حذف المفتاح من الهاتف');
    await _refreshKeyState();
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
                  '(الذاكرة الخارجية أو تطبيق تخزين تختارينه).',
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: _exporting ? null : _exportBackup,
                  child: Text(_exporting ? 'جارٍ التحضير…' : 'تصدير نسخة احتياطية'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          BambiCard(
            emoji: '🔑',
            title: 'مفتاح Gemini',
            color: BambiColors.lavender,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  _hasKey
                      ? 'المفتاح مضاف على هذا الهاتف ✅'
                      : 'لم يُضَف المفتاح بعد. يُستعمل لفحص المؤشرات فقط.',
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _keyController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'المفتاح',
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 12),
                FilledButton(onPressed: _saveKey, child: const Text('حفظ المفتاح')),
                if (_hasKey) ...[
                  const SizedBox(height: 8),
                  OutlinedButton(onPressed: _deleteKey, child: const Text('حذف المفتاح')),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
