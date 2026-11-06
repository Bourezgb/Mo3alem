import 'package:flutter/material.dart';

/// ألوان وأنماط تصميم بامبي، انظر docs/design.md
class BambiColors {
  static const pink = Color(0xFFFFD6E7);
  static const blue = Color(0xFFCFEBFF);
  static const mint = Color(0xFFD5F5E3);
  static const butter = Color(0xFFFFF3BF);
  static const lavender = Color(0xFFE6DBFF);
  static const plum = Color(0xFF5B4A6E);
  static const background = Color(0xFFFFFBFE);
}

class BambiTheme {
  static const _font = 'Tajawal';

  static ThemeData build() {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: BambiColors.pink,
        primary: BambiColors.plum,
        surface: BambiColors.background,
      ),
      scaffoldBackgroundColor: BambiColors.background,
      fontFamily: _font,
    );

    return base.copyWith(
      appBarTheme: const AppBarTheme(
        backgroundColor: BambiColors.background,
        foregroundColor: BambiColors.plum,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          fontFamily: _font,
          fontSize: 22,
          fontWeight: FontWeight.w700,
          color: BambiColors.plum,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: BambiColors.pink,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(48, 48),
          backgroundColor: BambiColors.plum,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
      textTheme: base.textTheme.apply(
        fontFamily: _font,
        bodyColor: BambiColors.plum,
        displayColor: BambiColors.plum,
      ),
    );
  }
}
