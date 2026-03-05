import 'package:flutter/material.dart';

/// Palette revisitee pour donner une direction visuelle premium au projet PNPI.
class PnpiColors {
  static const Color deepSpace = Color(0xFF051B36);
  static const Color lagoon = Color(0xFF006233);
  static const Color oceanPulse = Color(0xFF0C7EB4);
  static const Color luminousGold = Color(0xFFF5D30F);
  static const Color slateLight = Color(0xFFF6F8FB);
  static const Color slateDark = Color(0xFF1B2635);
}

/// Theme principal utilise a travers le projet mobile PNPI.
class PnpiTheme {
  static const Duration motionFast = Duration(milliseconds: 180);
  static const Duration motionMedium = Duration(milliseconds: 320);
  static const Duration motionSlow = Duration(milliseconds: 520);

  static const LinearGradient heroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      PnpiColors.deepSpace,
      PnpiColors.oceanPulse,
    ],
  );

  static const LinearGradient cardGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      PnpiColors.oceanPulse,
      PnpiColors.lagoon,
    ],
  );

  static const List<BoxShadow> softShadows = [
    BoxShadow(
      color: Color(0x24000000),
      blurRadius: 24,
      offset: Offset(0, 16),
    ),
  ];

  static final TextTheme _textTheme = Typography.blackMountainView.copyWith(
    displayLarge: const TextStyle(
      color: PnpiColors.slateDark,
      fontWeight: FontWeight.w700,
      fontSize: 32,
    ),
    headlineLarge: const TextStyle(
      color: PnpiColors.slateDark,
      fontWeight: FontWeight.w600,
    ),
    titleLarge: const TextStyle(
      color: PnpiColors.slateDark,
      fontWeight: FontWeight.w600,
    ),
    bodyLarge: const TextStyle(color: PnpiColors.slateDark),
    labelLarge: const TextStyle(color: PnpiColors.slateDark),
  );

  static final ThemeData light = ThemeData(
    brightness: Brightness.light,
    primaryColor: PnpiColors.lagoon,
    scaffoldBackgroundColor: PnpiColors.slateLight,
    colorScheme: const ColorScheme(
      brightness: Brightness.light,
      primary: PnpiColors.lagoon,
      onPrimary: Colors.white,
      secondary: PnpiColors.oceanPulse,
      onSecondary: Colors.white,
      error: Colors.redAccent,
      onError: Colors.white,
      surface: Colors.white,
      onSurface: PnpiColors.slateDark,
    ),
    fontFamily: 'Montserrat',
    textTheme: _textTheme,
    appBarTheme: const AppBarTheme(
      backgroundColor: PnpiColors.deepSpace,
      elevation: 0,
      centerTitle: false,
      iconTheme: IconThemeData(color: Colors.white),
      titleTextStyle: TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.w700,
        color: Colors.white,
      ),
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: PnpiColors.oceanPulse,
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      selectedItemColor: PnpiColors.luminousGold,
      unselectedItemColor: PnpiColors.slateDark,
      backgroundColor: Colors.white,
      selectedIconTheme: IconThemeData(size: 26),
      landscapeLayout: BottomNavigationBarLandscapeLayout.spread,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: PnpiColors.lagoon,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    ),
    cardTheme: const CardThemeData(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(20)),
      ),
      elevation: 4,
    ),
    visualDensity: VisualDensity.adaptivePlatformDensity,
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: PnpiColors.lagoon,
    ),
  );
}

Color colorWithOpacity(Color color, double opacity) {
  final adjustedAlpha = (color.a * opacity).clamp(0.0, 1.0);
  return color.withValues(alpha: adjustedAlpha);
}
