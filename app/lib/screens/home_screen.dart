import 'package:flutter/material.dart';

import '../theme/bambi_theme.dart';
import '../widgets/bambi_card.dart';
import 'lesson_note_screen.dart';
import 'settings_screen.dart';

/// 🌸 لوحة القيادة الأسبوعية (الشاشة الرئيسية)
/// الأرقام والنصوص هنا تجريبية، وستُربط بالبيانات المحلية لاحقاً.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('🌸 مكتب نهاد'),
        actions: [
          IconButton(
            tooltip: 'الإعدادات',
            icon: const Text('🦋', style: TextStyle(fontSize: 22)),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const SettingsScreen()),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          BambiCard(
            emoji: '🎈',
            title: 'حالة الأسبوع',
            color: BambiColors.butter,
            child: Text('الأسبوع 1 · دراسي'),
          ),
          SizedBox(height: 12),
          BambiCard(
            emoji: '📅',
            title: 'حصص الأسبوع',
            color: BambiColors.blue,
            child: Text('لا توجد حصص مسجلة بعد.'),
          ),
          SizedBox(height: 12),
          BambiCard(
            emoji: '🌈',
            title: 'أوراق الدعم',
            color: BambiColors.lavender,
            child: Text('لا توجد نقائص مسجلة لهذا الأسبوع.'),
          ),
          SizedBox(height: 12),
          BambiCard(
            emoji: '⭐',
            title: 'المذكرات',
            color: BambiColors.mint,
            child: Text('المذكرة الأولى جاهزة للكتابة.'),
          ),
          SizedBox(height: 16),
          FilledButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const LessonNoteScreen()),
            ),
            child: const Text('افتح المذكرة الجديدة 📝'),
          ),
        ],
      ),
    );
  }
}
