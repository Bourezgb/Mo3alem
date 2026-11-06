import 'package:flutter/material.dart';

import '../theme/bambi_theme.dart';

/// بطاقة بامبي: زوايا دائرية، لون خلفية، رمز في الأعلى وعنوان.
class BambiCard extends StatelessWidget {
  const BambiCard({
    super.key,
    required this.emoji,
    required this.title,
    required this.child,
    this.color = BambiColors.pink,
  });

  final String emoji;
  final String title;
  final Widget child;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: color,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(emoji, style: const TextStyle(fontSize: 26)),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}
