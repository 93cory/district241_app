import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

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
        home: const LoginScreen(),
      ),
    );
  }
}
