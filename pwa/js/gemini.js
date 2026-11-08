// خدمة Gemini. المفتاح يبقى في متصفح الهاتف فقط، ولا يدخل الكود أو المستودع.
// تُرسل نصوص المؤشرات فقط، دون أي بيانات عن التلاميذ.

const MODEL = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const KEY_NAME = 'mo3alem.gemini';

export function getKey() {
  try {
    return localStorage.getItem(KEY_NAME) || '';
  } catch {
    return '';
  }
}

export function setKey(key) {
  localStorage.setItem(KEY_NAME, key.trim());
}

export function deleteKey() {
  localStorage.removeItem(KEY_NAME);
}

/** يفحص أن كل مؤشر بالمضارع وقابل للقياس. لا يعدّل النص، ويكتفي بالتنبيه. */
export async function checkIndicators(indicators) {
  const key = getKey();
  if (!key) throw new Error('لم يُضَف مفتاح Gemini بعد، أضيفيه من الإعدادات.');

  const numbered = indicators.map((t, i) => `${i}: ${t}`).join('\n');
  const prompt = `أنت مفتش تربوي متخصص في التعليم الابتدائي بالجزائر.
راجع مؤشرات الانطلاق التالية، وتحقّق لكل مؤشر من أمرين فقط:
1) هل الصياغة بالفعل المضارع؟
2) هل الفعل قابل للملاحظة والقياس (يمكن للمعلمة أن تتحقق منه)؟
لا تعدّل النص. أعد النتيجة بصيغة JSON فقط بهذا الشكل:
{"results":[{"index":0,"ok":true,"problem":""}]}
إذا كان المؤشر سليماً فاجعل problem نصاً فارغاً، وإلا اشرح المشكلة في جملة قصيرة.

المؤشرات:
${numbered}`;

  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });
  } catch {
    throw new Error('تعذّر الاتصال بـ Gemini. تحققي من الإنترنت.');
  }
  if (!response.ok) throw new Error(`تعذّر الاتصال بـ Gemini (رمز ${response.status}).`);

  const body = await response.json();
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('ردّ Gemini بشكل غير متوقع.');
  const parsed = JSON.parse(text);

  return (parsed.results ?? [])
    .filter((r) => Number.isInteger(r.index) && r.index >= 0 && r.index < indicators.length)
    .map((r) => ({
      text: indicators[r.index],
      ok: r.ok === true,
      problem: r.problem ?? '',
    }));
}
