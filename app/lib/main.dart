import 'package:flutter/material.dart';

import 'screens/home_screen.dart';
import 'theme/bambi_theme.dart';

void main() {
  runApp(const MoAllemApp());
}

class MoAllemApp extends StatelessWidget {
  const MoAllemApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'مكتب نهاد',
      debugShowCheckedModeBanner: false,
      theme: BambiTheme.build(),
      builder: (context, child) => Directionality(
        textDirection: TextDirection.rtl,
        child: child ?? const SizedBox.shrink(),
      ),
      home: const HomeScreen(),
    );
  }
}
