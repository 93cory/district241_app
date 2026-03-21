import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  Map<String, dynamic>? _profile;
  bool _isLoading = false;
  String? _error;

  Map<String, dynamic>? get profile => _profile;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _profile != null;
  String? get error => _error;
  String get username => _profile?['username'] ?? '';
  String get fullName => _profile?['full_name'] ?? '';
  List<String> get roles => List<String>.from(_profile?['roles'] ?? []);

  bool _requires2FA = false;
  bool get requires2FA => _requires2FA;

  /// Attempts login. Returns the raw result from ApiService so that callers
  /// can check `result?['requires_2fa']` and redirect to the 2FA screen.
  Future<Map<String, dynamic>?> login({required String username, required String password}) async {
    _isLoading = true;
    _error = null;
    _requires2FA = false;
    notifyListeners();
    try {
      final result = await ApiService.instance.login(username: username, password: password);
      if (result != null && result['requires_2fa'] == true) {
        _requires2FA = true;
        _isLoading = false;
        notifyListeners();
        return result;
      }
      _profile = await ApiService.instance.fetchCurrentUser(forceRefresh: true).then((u) => {
        'username': u.username,
        'full_name': u.fullName,
        'roles': u.roles,
      });
      _error = null;
      return result;
    } catch (e) {
      _error = e.toString();
      _profile = null;
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    ApiService.instance.logout();
    _profile = null;
    _error = null;
    notifyListeners();
  }

  Future<void> refreshProfile() async {
    try {
      final u = await ApiService.instance.fetchCurrentUser(forceRefresh: true);
      _profile = {
        'username': u.username,
        'full_name': u.fullName,
        'roles': u.roles,
      };
      notifyListeners();
    } catch (_) {}
  }
}
