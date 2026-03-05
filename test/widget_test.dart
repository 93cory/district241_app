import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:pnpi/main.dart';

void main() {
  testWidgets('Landing screen shows hero and navigation', (WidgetTester tester) async {
    await tester.binding.setSurfaceSize(const Size(1440, 3000));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(const PnpiApp());
    await tester.pump(const Duration(seconds: 1));

    expect(find.text('Dashboard Ministere'), findsOneWidget);
    expect(find.text('PNPI - Pilotage National'), findsOneWidget);
    expect(find.byIcon(Icons.dashboard_rounded), findsOneWidget);
    expect(find.byType(BottomNavigationBar), findsOneWidget);
  });
}
