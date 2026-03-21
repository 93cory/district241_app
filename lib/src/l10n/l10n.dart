import 'package:flutter/material.dart';
import 'app_fr.dart';
import 'app_en.dart';

class PnpiLocalizations {
  final Locale locale;

  PnpiLocalizations(this.locale);

  static PnpiLocalizations of(BuildContext context) {
    return Localizations.of<PnpiLocalizations>(context, PnpiLocalizations)!;
  }

  static const LocalizationsDelegate<PnpiLocalizations> delegate = _PnpiLocalizationsDelegate();

  static const List<Locale> supportedLocales = [
    Locale('fr'),
    Locale('en'),
  ];

  late final Map<String, String> _strings = locale.languageCode == 'en' ? enUS : frFR;

  String tr(String key) => _strings[key] ?? key;
}

class _PnpiLocalizationsDelegate extends LocalizationsDelegate<PnpiLocalizations> {
  const _PnpiLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => ['fr', 'en'].contains(locale.languageCode);

  @override
  Future<PnpiLocalizations> load(Locale locale) async => PnpiLocalizations(locale);

  @override
  bool shouldReload(_PnpiLocalizationsDelegate old) => false;
}

/// Shorthand for accessing translations
extension L10nExtension on BuildContext {
  String tr(String key) => PnpiLocalizations.of(this).tr(key);
}
