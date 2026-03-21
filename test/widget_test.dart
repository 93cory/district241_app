import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:pnpi/main.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  testWidgets('Login screen shows connexion form', (WidgetTester tester) async {
    await tester.binding.setSurfaceSize(const Size(1440, 3000));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(const PnpiApp());
    await tester.pump(const Duration(seconds: 1));

    // LoginScreen should display the sign-in button
    expect(find.text('Se connecter'), findsOneWidget);
    // Should have username and password fields
    expect(find.byType(TextField), findsWidgets);
  });
}
