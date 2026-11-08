import 'dart:typed_data';

import 'package:flutter/services.dart' show rootBundle;
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../core/models.dart';
import '../models/lesson_note.dart';

/// الخط العربي من assets. إن لم يوجد الملف يُستعمل الخط الافتراضي.
/// ملاحظة: يجب اختبار شكل العربية في الـ PDF على الجهاز قبل الاعتماد عليه.
Future<pw.ThemeData> _theme() async {
  try {
    final regular =
        pw.Font.ttf(await rootBundle.load('assets/fonts/Tajawal-Regular.ttf'));
    final bold =
        pw.Font.ttf(await rootBundle.load('assets/fonts/Tajawal-Bold.ttf'));
    return pw.ThemeData.withFont(base: regular, bold: bold);
  } catch (_) {
    return pw.ThemeData.base();
  }
}

pw.Widget _cell(String text, {bool bold = false}) => pw.Padding(
      padding: const pw.EdgeInsets.all(6),
      child: pw.Text(
        text,
        style: pw.TextStyle(fontWeight: bold ? pw.FontWeight.bold : null),
      ),
    );

pw.Widget _line(String label, String value) => pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 4),
      child: pw.Text('$label: $value'),
    );

/// 📝 مذكرة يومية بالشكل الرسمي: رأس، وجانب، وجدول بالمراحل الثلاث.
Future<Uint8List> buildLessonNotePdf(LessonNote note) async {
  final doc = pw.Document(theme: await _theme());
  doc.addPage(
    pw.Page(
      pageFormat: PdfPageFormat.a4,
      textDirection: pw.TextDirection.rtl,
      margin: const pw.EdgeInsets.all(28),
      build: (context) => pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.stretch,
        children: [
          pw.Text(
            'مذكرة يومية',
            style: const pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold),
            textAlign: pw.TextAlign.center,
          ),
          pw.SizedBox(height: 12),
          _line('الميدان', note.domain),
          _line('المقطع التعلمي', note.unit),
          _line('الهدف التعلمي', note.objective),
          _line('الكفاءة المستهدفة', note.competency),
          pw.SizedBox(height: 8),
          _line('رقم المذكرة', note.noteNumber),
          _line('المستوى', note.level),
          _line('الوسائل', note.resources),
          _line('المدة الزمنية', note.duration),
          pw.SizedBox(height: 12),
          pw.Table(
            border: pw.TableBorder.all(),
            columnWidths: {
              0: const pw.FlexColumnWidth(1),
              1: const pw.FlexColumnWidth(2),
              2: const pw.FlexColumnWidth(2),
            },
            children: [
              pw.TableRow(children: [
                _cell('المراحل', bold: true),
                _cell('الوضعيات التعلمية', bold: true),
                _cell('مؤشرات التقويم', bold: true),
              ]),
              for (final p in note.phases)
                pw.TableRow(children: [
                  _cell(p.name, bold: true),
                  _cell(p.situations),
                  _cell(p.indicators),
                ]),
            ],
          ),
        ],
      ),
    ),
  );
  return doc.save();
}

/// 🌈 ورقة دعم: المهارات المستهدفة والتمارين المختارة من الكتاب.
Future<Uint8List> buildWorksheetPdf(SupportSheet sheet) async {
  final doc = pw.Document(theme: await _theme());
  doc.addPage(
    pw.Page(
      pageFormat: PdfPageFormat.a4,
      textDirection: pw.TextDirection.rtl,
      margin: const pw.EdgeInsets.all(28),
      build: (context) => pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.stretch,
        children: [
          pw.Text(
            'ورقة دعم · ${sheet.subject}',
            style: const pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold),
            textAlign: pw.TextAlign.center,
          ),
          pw.SizedBox(height: 6),
          pw.Text(
            'الأسبوع ${sheet.week} · المدة ${sheet.minutes} دقيقة',
            textAlign: pw.TextAlign.center,
          ),
          pw.SizedBox(height: 12),
          pw.Text('الاسم واللقب: ........................................'),
          pw.SizedBox(height: 12),
          pw.Text('المهارات المستهدفة',
              style: const pw.TextStyle(fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 4),
          for (final s in sheet.weakSkills) pw.Text('• $s'),
          pw.SizedBox(height: 12),
          pw.Text('تمارين الدعم',
              style: const pw.TextStyle(fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 4),
          for (var i = 0; i < sheet.exercises.length; i++)
            pw.Padding(
              padding: const pw.EdgeInsets.only(bottom: 4),
              child: pw.Text('${i + 1}. ${sheet.exercises[i]}'),
            ),
        ],
      ),
    ),
  );
  return doc.save();
}

/// 🗓️ الجدول الأسبوعي الثابت، صفحة واحدة.
Future<Uint8List> buildTimetablePdf(AppData data) async {
  final doc = pw.Document(theme: await _theme());
  final rows = <pw.TableRow>[
    pw.TableRow(children: [
      _cell('اليوم', bold: true),
      _cell('الحصص', bold: true),
    ]),
  ];
  for (var day = 0; day < kWeekdays.length; day++) {
    final slots = data.template.where((s) => s.day == day).toList();
    final text = slots.isEmpty
        ? '—'
        : slots.map((s) => '${s.subject} (${s.minutes} د)').join('  ·  ');
    rows.add(pw.TableRow(children: [
      _cell(kWeekdays[day], bold: true),
      _cell(text),
    ]));
  }

  doc.addPage(
    pw.Page(
      pageFormat: PdfPageFormat.a4.landscape,
      textDirection: pw.TextDirection.rtl,
      margin: const pw.EdgeInsets.all(28),
      build: (context) => pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.stretch,
        children: [
          pw.Text(
            'الجدول الأسبوعي',
            style: const pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold),
            textAlign: pw.TextAlign.center,
          ),
          pw.SizedBox(height: 12),
          pw.Table(
            border: pw.TableBorder.all(),
            columnWidths: {
              0: const pw.FlexColumnWidth(1),
              1: const pw.FlexColumnWidth(4),
            },
            children: rows,
          ),
        ],
      ),
    ),
  );
  return doc.save();
}
