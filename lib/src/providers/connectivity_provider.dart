import 'dart:async';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../services/offline_queue.dart';

class ConnectivityProvider extends ChangeNotifier {
  bool _isOnline = true;
  Timer? _timer;

  bool get isOnline => _isOnline;

  ConnectivityProvider() {
    _check();
    _timer = Timer.periodic(const Duration(seconds: 15), (_) => _check());
  }

  Future<void> _check() async {
    try {
      // Try to reach the backend health endpoint
      final uri = Uri.parse('${const String.fromEnvironment('PNPI_API_URL', defaultValue: 'http://localhost:8000')}/health');
      final response = await http.get(uri).timeout(const Duration(seconds: 5));
      _setOnline(response.statusCode == 200);
    } catch (_) {
      _setOnline(false);
    }
  }

  void _setOnline(bool value) {
    if (_isOnline != value) {
      final wasOffline = !_isOnline;
      _isOnline = value;
      notifyListeners();
      // Auto-sync queued actions when coming back online
      if (_isOnline && wasOffline) {
        OfflineQueue.instance.syncAll();
      }
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
