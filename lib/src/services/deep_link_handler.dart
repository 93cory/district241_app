import 'package:flutter/material.dart';

/// Handles deep links for the PNPI mobile app.
/// Supports:
///   pnpi://ati/{id}        -> Open ATI detail
///   pnpi://notification/{id} -> Open notification
///   pnpi://inspection/{id}  -> Open inspection detail
///   pnpi://operateur/{id}   -> Open operator detail
class DeepLinkHandler {
  static final DeepLinkHandler instance = DeepLinkHandler._();
  DeepLinkHandler._();

  GlobalKey<NavigatorState>? navigatorKey;

  void configure(GlobalKey<NavigatorState> key) {
    navigatorKey = key;
  }

  /// Parse and navigate to a deep link URI.
  void handleUri(Uri uri) {
    final navigator = navigatorKey?.currentState;
    if (navigator == null) return;

    final segments = uri.pathSegments;
    if (segments.length < 2) return;

    final type = segments[0];
    final id = segments[1];

    switch (type) {
      case 'ati':
        navigator.pushNamed('/ati/detail', arguments: {'ati_id': id});
        break;
      case 'notification':
        navigator.pushNamed('/notifications', arguments: {'highlight_id': id});
        break;
      case 'inspection':
        navigator.pushNamed('/inspection/detail', arguments: {'inspection_id': id});
        break;
      case 'operateur':
        navigator.pushNamed('/operateur/detail', arguments: {'operateur_id': id});
        break;
    }
  }

  /// Build a deep link URI for sharing.
  static Uri buildAtiLink(String atiId) => Uri.parse('pnpi://ati/$atiId');
  static Uri buildInspectionLink(String inspId) =>
      Uri.parse('pnpi://inspection/$inspId');
  static Uri buildOperateurLink(String opId) =>
      Uri.parse('pnpi://operateur/$opId');
}
