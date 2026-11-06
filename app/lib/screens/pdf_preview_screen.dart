import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:printing/printing.dart';

/// معاينة الـ PDF قبل الطباعة. الرجوع يتيح التعديل ثم إعادة المعاينة.
class PdfPreviewScreen extends StatelessWidget {
  const PdfPreviewScreen({
    super.key,
    required this.title,
    required this.makePdf,
  });

  final String title;
  final Future<Uint8List> Function() makePdf;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: PdfPreview(
        build: (_) => makePdf(),
        canChangePageFormat: false,
        canChangeOrientation: false,
        canDebug: false,
        pdfFileName: '${title.replaceAll(' ', '_')}.pdf',
      ),
    );
  }
}
