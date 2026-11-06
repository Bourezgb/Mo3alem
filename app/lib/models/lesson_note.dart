/// مرحلة واحدة من مراحل المذكرة (الانطلاق، بناء التعلمات، الاستثمار).
class LessonPhase {
  LessonPhase({
    required this.name,
    this.situations = '',
    this.indicators = '',
  });

  final String name;
  String situations;
  String indicators;

  Map<String, dynamic> toJson() => {
        'name': name,
        'situations': situations,
        'indicators': indicators,
      };

  factory LessonPhase.fromJson(Map<String, dynamic> json) => LessonPhase(
        name: json['name'] as String? ?? '',
        situations: json['situations'] as String? ?? '',
        indicators: json['indicators'] as String? ?? '',
      );
}

/// مذكرة يومية كاملة.
class LessonNote {
  LessonNote({
    required this.id,
    required this.createdAt,
    this.domain = '',
    this.unit = '',
    this.objective = '',
    this.competency = '',
    this.noteNumber = '',
    this.level = 'الثانية ابتدائي',
    this.resources = '',
    this.duration = '',
    required this.phases,
  });

  final String id;
  final DateTime createdAt;
  String domain;
  String unit;
  String objective;
  String competency;
  String noteNumber;
  final String level;
  String resources;
  String duration;
  List<LessonPhase> phases;

  Map<String, dynamic> toJson() => {
        'id': id,
        'createdAt': createdAt.toIso8601String(),
        'domain': domain,
        'unit': unit,
        'objective': objective,
        'competency': competency,
        'noteNumber': noteNumber,
        'level': level,
        'resources': resources,
        'duration': duration,
        'phases': phases.map((p) => p.toJson()).toList(),
      };

  factory LessonNote.fromJson(Map<String, dynamic> json) => LessonNote(
        id: json['id'] as String,
        createdAt: DateTime.parse(json['createdAt'] as String),
        domain: json['domain'] as String? ?? '',
        unit: json['unit'] as String? ?? '',
        objective: json['objective'] as String? ?? '',
        competency: json['competency'] as String? ?? '',
        noteNumber: json['noteNumber'] as String? ?? '',
        level: json['level'] as String? ?? 'الثانية ابتدائي',
        resources: json['resources'] as String? ?? '',
        duration: json['duration'] as String? ?? '',
        phases: (json['phases'] as List<dynamic>? ?? [])
            .map((p) => LessonPhase.fromJson(p as Map<String, dynamic>))
            .toList(),
      );
}
