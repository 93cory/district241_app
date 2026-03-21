import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';

import 'src/l10n/l10n.dart';
import 'src/providers/auth_provider.dart';
import 'src/providers/connectivity_provider.dart';
import 'src/providers/notifications_provider.dart';
import 'src/screens/login_screen.dart';
import 'src/theme/pnpi_theme.dart';

void main() {
  runApp(const PnpiApp());
}

class PnpiApp extends StatelessWidget {
  const PnpiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => NotificationsProvider()),
        ChangeNotifierProvider(create: (_) => ConnectivityProvider()),
      ],
      child: MaterialApp(
        title: 'PNPI | Plateforme Nationale de Suivi et Tracabilite Industrielle',
        theme: PnpiTheme.light,
        darkTheme: PnpiTheme.dark,
        themeMode: ThemeMode.system,
        debugShowCheckedModeBanner: false,
        locale: const Locale('fr'),
        supportedLocales: PnpiLocalizations.supportedLocales,
        localizationsDelegates: const [
          PnpiLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: const LoginScreen(),
      ),
    );
  }
}
