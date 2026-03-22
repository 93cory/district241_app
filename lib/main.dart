import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';

import 'src/l10n/l10n.dart';
import 'src/providers/auth_provider.dart';
import 'src/providers/connectivity_provider.dart';
import 'src/providers/notifications_provider.dart';
import 'src/screens/login_screen.dart';
import 'src/services/deep_link_handler.dart';
import 'src/theme/pnpi_theme.dart';

void main() {
  runApp(const PnpiApp());
}

class PnpiApp extends StatefulWidget {
  const PnpiApp({super.key});

  @override
  State<PnpiApp> createState() => _PnpiAppState();
}

class _PnpiAppState extends State<PnpiApp> {
  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();

  @override
  void initState() {
    super.initState();
    DeepLinkHandler.instance.configure(_navigatorKey);
  }

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
        navigatorKey: _navigatorKey,
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
        onGenerateRoute: (settings) {
          // Handle named routes from deep links
          switch (settings.name) {
            case '/ati/detail':
              final args = settings.arguments as Map<String, dynamic>?;
              return MaterialPageRoute(
                builder: (_) => Scaffold(
                  appBar: AppBar(title: const Text('Detail ATI')),
                  body: Center(child: Text('ATI: ${args?['ati_id'] ?? ''}')),
                ),
              );
            case '/notifications':
              return MaterialPageRoute(
                builder: (_) => Scaffold(
                  appBar: AppBar(title: const Text('Notifications')),
                  body: const Center(child: Text('Notifications')),
                ),
              );
            case '/inspection/detail':
              final args = settings.arguments as Map<String, dynamic>?;
              return MaterialPageRoute(
                builder: (_) => Scaffold(
                  appBar: AppBar(title: const Text('Detail Inspection')),
                  body: Center(child: Text('Inspection: ${args?['inspection_id'] ?? ''}')),
                ),
              );
            case '/operateur/detail':
              final args = settings.arguments as Map<String, dynamic>?;
              return MaterialPageRoute(
                builder: (_) => Scaffold(
                  appBar: AppBar(title: const Text('Detail Operateur')),
                  body: Center(child: Text('Operateur: ${args?['operateur_id'] ?? ''}')),
                ),
              );
          }
          return null;
        },
      ),
    );
  }
}
