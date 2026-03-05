import 'package:flutter/material.dart';

import 'src/screens/login_screen.dart';
import 'src/theme/pnpi_theme.dart';

void main() {
  runApp(const PnpiApp());
}

class PnpiApp extends StatelessWidget {
  const PnpiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PNPI | Plateforme Nationale de Suivi et Tracabilite Industrielle',
      theme: PnpiTheme.light,
      debugShowCheckedModeBanner: false,
      home: const LoginScreen(),
    );
  }
}
