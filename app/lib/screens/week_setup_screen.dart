import 'package:flutter/material.dart';

import '../core/models.dart';
import '../data/app_store.dart';
import '../theme/bambi_theme.dart';
import '../widgets/bambi_card.dart';

/// 🎈 تسجيل حالة الأسبوع والأيام غير الدراسية كلما ظهرت.
class WeekSetupScreen extends StatefulWidget {
  const WeekSetupScreen({super.key, required this.week});

  final int week;

  @override
  State<WeekSetupScreen> createState() => _WeekSetupScreenState();
}

class _WeekSetupScreenState extends State<WeekSetupScreen> {
  final _store = AppStore();
  AppData? _data;
  WeekStatus _status = WeekStatus.study;
  final Set<int> _lost = {};
  final Map<int, TextEditingController> _reasons = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final data = await _store.load();
    if (!mounted) return;
    setState(() {
      _data = data;
      _status = data.statusOf(widget.week);
      for (final l in data.lostIn(widget.week)) {
        _lost.add(l.day);
        _reasons[l.day] = TextEditingController(text: l.reason);
      }
    });
  }

  TextEditingController _reasonFor(int day) =>
      _reasons.putIfAbsent(day, () => TextEditingController());

  @override
  void dispose() {
    for (final c in _reasons.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    final data = _data;
    if (data == null) return;
    data.weekStatus[widget.week] = _status;
    data.lostDays.removeWhere((l) => l.week == widget.week);
    for (final day in _lost) {
      data.lostDays.add(LostDay(
        week: widget.week,
        day: day,
        reason: _reasonFor(day).text.trim(),
      ));
    }
    await _store.save(data);
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('🎈 أسبوع ${widget.week}')),
      body: _data == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                BambiCard(
                  emoji: '🌸',
                  title: 'حالة الأسبوع',
                  color: BambiColors.butter,
                  child: DropdownButton<WeekStatus>(
                    value: _status,
                    isExpanded: true,
                    items: [
                      for (final s in WeekStatus.values)
                        DropdownMenuItem(
                          value: s,
                          child: Text(weekStatusLabel(s)),
                        ),
                    ],
                    onChanged: (v) {
                      if (v != null) setState(() => _status = v);
                    },
                  ),
                ),
                const SizedBox(height: 12),
                BambiCard(
                  emoji: '📅',
                  title: 'أيام غير دراسية',
                  color: BambiColors.blue,
                  child: Column(
                    children: [
                      for (var day = 0; day < kWeekdays.length; day++) ...[
                        CheckboxListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(kWeekdays[day]),
                          value: _lost.contains(day),
                          onChanged: (checked) => setState(() {
                            if (checked == true) {
                              _lost.add(day);
                            } else {
                              _lost.remove(day);
                            }
                          }),
                        ),
                        if (_lost.contains(day))
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: TextField(
                              controller: _reasonFor(day),
                              decoration: const InputDecoration(
                                labelText: 'السبب (اختياري)',
                                filled: true,
                                fillColor: Colors.white,
                                border: OutlineInputBorder(
                                  borderSide: BorderSide.none,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _save,
                  child: const Text('حفظ'),
                ),
              ],
            ),
    );
  }
}
