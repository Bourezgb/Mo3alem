import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

/// نتيجة فحص مؤشر واحد.
class IndicatorCheck {
  const IndicatorCheck({
    required this.text,
    required this.ok,
    required this.problem,
  });

  final String text;
  final bool ok;
  final String problem;
}

/// خدمة Gemini. المفتاح يُحفظ على الهاتف فقط، ولا يدخل الكود أو المستودع.
/// تُرسل نصوص المؤشرات فقط، دون أي بيانات عن التلاميذ.
class GeminiService {
  static const _keyName = 'gemini_api_key';
  static const _model = 'gemini-2.5-flash';
  static const _endpoint =
      'https://generativelanguage.googleapis.com/v1beta/models/$_model:generateContent';

  final _storage = const FlutterSecureStorage();

  Future<String?> readKey() async {
    final key = await _storage.read(key: _keyName);
    return (key == null || key.isEmpty) ? null : key;
  }

  Future<void> saveKey(String key) =>
      _storage.write(key: _keyName, value: key.trim());

  Future<void> deleteKey() => _storage.delete(key: _keyName);

  /// يفحص أن كل مؤشر بصيغة المضارع وقابل للقياس. لا يعدّل النص، ويكتفي بالتنبيه.
  Future<List<IndicatorCheck>> checkIndicators(List<String> indicators) async {
    final key = await readKey();
    if (key == null) {
      throw StateError('لم يُضَف مفتاح Gemini بعد، أضيفيه من الإعدادات');
    }

    final numbered = [
      for (var i = 0; i < indicators.length; i++) '$i: ${indicators[i]}',
    ].join('\n');

    final prompt = '''
أنت مفتش تربوي متخصص في التعليم الابتدائي بالجزائر.
راجع مؤشرات الانطلاق التالية، وتحقّق لكل مؤشر من أمرين فقط:
1) هل الصياغة بالفعل المضارع؟
2) هل الفعل قابل للملاحظة والقياس (يمكن للمعلمة أن تتحقق منه)؟
لا تعدّل النص. أعد النتيجة بصيغة JSON فقط بهذا الشكل:
{"results":[{"index":0,"ok":true,"problem":""}]}
إذا كان المؤشر سليماً فاجعل problem نصاً فارغاً، وإلا اشرح المشكلة في جملة قصيرة.

المؤشرات:
$numbered
''';

    final response = await http
        .post(
          Uri.parse(_endpoint),
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key,
          },
          body: jsonEncode({
            'contents': [
              {
                'parts': [
                  {'text': prompt}
                ]
              }
            ],
            'generationConfig': {'responseMimeType': 'application/json'},
          }),
        )
        .timeout(const Duration(seconds: 40));

    if (response.statusCode != 200) {
      throw StateError('تعذّر الاتصال بـ Gemini (رمز ${response.statusCode})');
    }

    final body = jsonDecode(utf8.decode(response.bodyBytes))
        as Map<String, dynamic>;
    final text = body['candidates'][0]['content']['parts'][0]['text'] as String;
    final parsed = jsonDecode(text) as Map<String, dynamic>;
    final results = parsed['results'] as List<dynamic>;

    final checks = <IndicatorCheck>[];
    for (final r in results) {
      final map = r as Map<String, dynamic>;
      final index = map['index'] as int;
      if (index < 0 || index >= indicators.length) continue;
      checks.add(IndicatorCheck(
        text: indicators[index],
        ok: map['ok'] as bool? ?? false,
        problem: map['problem'] as String? ?? '',
      ));
    }
    return checks;
  }
}
